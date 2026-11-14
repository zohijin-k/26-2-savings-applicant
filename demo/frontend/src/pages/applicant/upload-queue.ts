/**
 * 서류 올리기 대기열.
 *
 * 서버는 서류를 읽는 동안 다른 요청에 답하지 못하므로 올리기 요청은 한 번에 하나만 보낸다.
 * 민원인은 그동안에도 다른 칸의 파일을 골라 둘 수 있고, 고른 파일은 여기서 차례를 기다린다.
 *
 *   queued(대기) → sending(보내는 중) → reading(서버가 읽고 확인하는 중) → 끝나면 목록에서 빠진다
 *                                                            ↘ failed(요청 실패) → retry → queued
 *
 * 칸 하나에는 항목이 하나만 있다. 결과(업로드 완료 · 다시 올려 주세요)는 대기열이 아니라 체크리스트에 담긴다.
 */
import type { FileKind } from '../../lib/file-precheck.ts'

export type QueueStatus = 'queued' | 'sending' | 'reading' | 'failed'

export interface QueueItem {
  id: string
  slotKey: string
  file: File
  /** 민원인이 적은 발급일(YYYY-MM-DD). 없으면 빈 문자열. */
  declared: string
  status: QueueStatus
  sent: number
  total: number
  enqueuedAt: number
  startedAt: number | null
  /** 파일을 모두 보낸 시각. 이때부터가 서버가 읽고 확인하는 시간이다. */
  sentAt: number | null
  finishedAt: number | null
  estimateSec: number | null
  pages: number | null
  kind: FileKind
  /** 이 기기에서 바로 보여 주는 미리보기 주소. */
  previewUrl: string
  /** 올리기 전에 알려 둘 말(예: 파일이 커서 시간이 더 걸릴 수 있음). */
  hint?: string
  error?: string
}

export type NewQueueItem = Pick<QueueItem, 'id' | 'slotKey' | 'file' | 'declared' | 'estimateSec' | 'pages' | 'kind' | 'previewUrl' | 'hint'>

export type QueueAction =
  | { type: 'enqueue'; item: NewQueueItem; now: number }
  | { type: 'start'; id: string; now: number }
  | { type: 'progress'; id: string; sent: number; total: number }
  | { type: 'sent'; id: string; now: number }
  | { type: 'succeed'; id: string }
  | { type: 'fail'; id: string; error: string; now: number }
  | { type: 'cancel'; id: string }
  | { type: 'retry'; id: string; now: number; estimateSec?: number | null }
  | { type: 'clearSlot'; slotKey: string }

function inFlightStatus(status: QueueStatus): boolean {
  return status === 'sending' || status === 'reading'
}

function waiting(item: NewQueueItem, now: number): QueueItem {
  return {
    ...item,
    status: 'queued',
    sent: 0,
    total: item.file.size,
    enqueuedAt: now,
    startedAt: null,
    sentAt: null,
    finishedAt: null,
  }
}

function update(state: QueueItem[], id: string, change: (item: QueueItem) => QueueItem | null): QueueItem[] {
  const index = state.findIndex((item) => item.id === id)
  if (index < 0) return state
  const next = change(state[index])
  if (next === state[index]) return state
  return next === null
    ? [...state.slice(0, index), ...state.slice(index + 1)]
    : [...state.slice(0, index), next, ...state.slice(index + 1)]
}

export function queueReducer(state: QueueItem[], action: QueueAction): QueueItem[] {
  switch (action.type) {
    case 'enqueue': {
      const existing = state.find((item) => item.slotKey === action.item.slotKey)
      // 보내는 중이거나 읽는 중인 칸에는 새 파일을 넣을 수 없다.
      if (existing && inFlightStatus(existing.status)) return state
      if (state.some((item) => item.id === action.item.id)) return state
      return [...state.filter((item) => item !== existing), waiting(action.item, action.now)]
    }
    case 'start':
      // 이미 나가 있는 요청이 있으면 시작하지 않는다.
      if (inFlight(state)) return state
      return update(state, action.id, (item) => (item.status === 'queued'
        ? { ...item, status: 'sending', startedAt: action.now, sent: 0 }
        : item))
    case 'progress':
      return update(state, action.id, (item) => {
        if (item.status !== 'sending') return item
        const total = action.total > 0 ? action.total : item.total
        const sent = Math.min(Math.max(action.sent, item.sent), total)
        return sent === item.sent && total === item.total ? item : { ...item, sent, total }
      })
    case 'sent':
      return update(state, action.id, (item) => (item.status === 'sending'
        ? { ...item, status: 'reading', sent: item.total, sentAt: action.now }
        : item))
    case 'succeed':
      return update(state, action.id, (item) => (inFlightStatus(item.status) ? null : item))
    case 'fail':
      return update(state, action.id, (item) => (inFlightStatus(item.status)
        ? { ...item, status: 'failed', finishedAt: action.now, error: action.error }
        : item))
    case 'cancel':
      return update(state, action.id, (item) => (item.status === 'queued' ? null : item))
    case 'retry': {
      const failed = state.find((item) => item.id === action.id)
      if (!failed || failed.status !== 'failed') return state
      const again: QueueItem = {
        ...failed,
        error: undefined,
        status: 'queued',
        sent: 0,
        enqueuedAt: action.now,
        startedAt: null,
        sentAt: null,
        finishedAt: null,
        estimateSec: action.estimateSec === undefined ? failed.estimateSec : action.estimateSec,
      }
      // 다시 시도하는 파일은 줄의 맨 뒤에 선다.
      return [...state.filter((item) => item !== failed), again]
    }
    case 'clearSlot': {
      const next = state.filter((item) => item.slotKey !== action.slotKey || inFlightStatus(item.status))
      return next.length === state.length ? state : next
    }
  }
}

/** 지금 서버로 나가 있는 항목(보내는 중 · 읽는 중). 많아야 하나다. */
export function inFlight(state: readonly QueueItem[]): QueueItem | null {
  return state.find((item) => inFlightStatus(item.status)) ?? null
}

/** 다음에 보낼 항목. 나가 있는 요청이 있으면 없다. */
export function nextRunnable(state: readonly QueueItem[]): QueueItem | null {
  if (inFlight(state)) return null
  return state.find((item) => item.status === 'queued') ?? null
}

/** 이 칸의 항목(대기 · 보내는 중 · 읽는 중 · 실패). */
export function slotItem(state: readonly QueueItem[], slotKey: string): QueueItem | null {
  return state.findLast((item) => item.slotKey === slotKey) ?? null
}

/** 처리할 일이 남아 있는지(대기 · 보내는 중 · 읽는 중). 실패한 항목은 세지 않는다. */
export function isActive(state: readonly QueueItem[]): boolean {
  return state.some((item) => item.status !== 'failed')
}

/** 처리 중인 항목 수. */
export function activeCount(state: readonly QueueItem[]): number {
  return state.filter((item) => item.status !== 'failed').length
}
