/**
 * 3단계 서류 업로드 및 제출.
 *
 * 두배적금은 보완 요청이 없는 사업이다. 제출한 뒤에 미비를 알려 주면 이미 늦다.
 * 그래서 이 화면은 "올리는 순간, 그 칸에서 알려 준다"에 걸려 있다.
 *
 *   근로유형 선택 → 본인에게 필요한 서류만 남는다
 *   칸마다  ① 서류에 적힌 발급일 → ② 파일 선택(끌어다 놓기)
 *   고른 즉시 그 칸에 파일과 진행 상태가 보이고, 결과는 올리기 응답으로 바로 그린다
 *
 * 서버는 서류를 읽는 동안 다른 요청에 답하지 못한다. 그래서 올리기 요청은 한 번에 하나만 보내고
 * (upload-queue.ts), 그동안 조회 요청도 보내지 않는다. 대기열이 비면 목록과 제출 준비를 한 번 다시 읽는다.
 * 근로유형 변경 · 남은 쪽 삭제 · 제출은 이전처럼 화면 전체를 잠그고 하나씩 처리한다.
 */

import { useCallback, useEffect, useReducer, useRef, useState, type DragEvent, type ReactNode } from 'react'
import * as pdfjs from 'pdfjs-dist'

import {
  deleteDocument,
  fetchChecklist,
  fetchFinalCheck,
  submitApplication,
  putDocContext,
  uploadDocumentWithProgress,
  type Checklist,
  type DocContext,
  type DocRequirementRow,
  type UploadedDocument,
  type SubmitResult,
  type FinalCheck,
  type Blocker,
} from '../../api.ts'
import ConfirmDialog from '../../components/ConfirmDialog.tsx'
import FilePreview from '../../components/FilePreview.tsx'
import Icon from '../../components/Icon.tsx'
import Modal from '../../components/Modal.tsx'
import Notice from '../../components/Notice.tsx'
import PdfPages from '../../components/PdfPages.tsx'
import PhoneLink from '../../components/PhoneLink.tsx'
import ProgressBar from '../../components/ProgressBar.tsx'
import { Skeleton, SkeletonCard, SkeletonLine } from '../../components/Skeleton.tsx'
import Spinner from '../../components/Spinner.tsx'
import StatusBadge from '../../components/StatusBadge.tsx'
import { DateTriple } from '../../forms/FormSheet.tsx'
import { EMPTY_YMD, isCompleteYMD, ymdToISO, type YMD } from '../../forms/ymd.ts'
import useBeforeUnload from '../../hooks/useBeforeUnload.ts'
import useDelayedFlag from '../../hooks/useDelayedFlag.ts'
import useElapsed from '../../hooks/useElapsed.ts'
import { friendlyError } from '../../lib/error-copy.ts'
import { fileExtension, precheckFile, type PdfProbe } from '../../lib/file-precheck.ts'
import { formatBytes, formatDate, formatDuration } from '../../lib/format.ts'
import { estimateSeconds, rememberObservation, slowThresholdSec, type Observation } from '../../lib/upload-estimate.ts'
import { issuerLink, reuploadFindings, REUPLOAD_GUIDANCE } from './reupload-guidance.ts'
import { isActive, nextRunnable, queueReducer, slotItem, type QueueItem } from './upload-queue.ts'
import './document-upload.css'

const WORKPLACE_COUNTS = ['1개', '2개', '3개'] as const

const UPLOAD_FAILED_COPY = '파일을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.'
const SUBMIT_FAILED_COPY = '신청을 제출하지 못했습니다. 잠시 후 다시 시도해 주세요.'
const LOAD_FAILED_COPY = '서류 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
const CONTEXT_FAILED_COPY = '선택을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'
const REMOVE_FAILED_COPY = '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'

/** PDF를 여는 데 이 시간을 넘기면 쪽수 확인을 건너뛰고 그대로 올린다. */
const PROBE_TIMEOUT_MS = 2500

/** 이번 접속에서 실제로 걸린 시간. 예상 시간을 맞추는 데만 쓴다. */
let estimateHistory: Observation[] = []

/** 저장소를 쓸 수 없는 브라우저에서도 같은 창 안에서는 안내가 되풀이해 열리지 않게 한다. */
const seenIssuesFallback = new Map<number, string[]>()

/**
 * 파일 확인 전용 pdf.js 작업자. 문서마다 새로 띄우면 그 시간만큼 올리기가 늦어지므로
 * 화면이 열릴 때 한 번 띄워 두고 함께 쓴다. 화면을 떠나면 잠시 뒤에 거둔다.
 */
let probeWorker: pdfjs.PDFWorker | null = null
let probeWorkerRelease = 0

function warmProbeWorker(): pdfjs.PDFWorker | undefined {
  window.clearTimeout(probeWorkerRelease)
  try {
    if (!probeWorker || probeWorker.destroyed) probeWorker = new pdfjs.PDFWorker()
    return probeWorker
  } catch {
    return undefined
  }
}

function releaseProbeWorkerSoon(): void {
  window.clearTimeout(probeWorkerRelease)
  probeWorkerRelease = window.setTimeout(() => {
    const worker = probeWorker
    probeWorker = null
    if (!worker) return
    worker.promise.catch(() => undefined)
    try { worker.destroy() } catch { /* 이미 거둔 작업자다. */ }
  }, 1000)
}

/** PDF의 쪽수와 첫 쪽에 글자가 들어 있는지(발급처 원본인지 스캔인지)를 이 기기에서 확인한다. */
const probePdf: PdfProbe = async (file) => {
  const task = pdfjs.getDocument({ data: await file.arrayBuffer(), worker: warmProbeWorker() })
  let timer = 0
  try {
    return await Promise.race([
      (async () => {
        const doc = await task.promise
        const text = await (await doc.getPage(1)).getTextContent()
        const hasText = text.items.some((entry) => 'str' in entry && entry.str.trim().length > 0)
        return { pages: doc.numPages, hasText }
      })(),
      new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error('probe timeout')), PROBE_TIMEOUT_MS)
      }),
    ])
  } finally {
    window.clearTimeout(timer)
    void task.destroy().catch(() => undefined)
  }
}

// ── 창(탭) 저장소: 적어 둔 발급일, 이미 보여 준 재업로드 안내 ─────────────────────

const declaredKey = (applicationId: number) => `applicant.declaredDates.${applicationId}`
const seenIssuesKey = (applicationId: number) => `applicant.seenReupload.${applicationId}`

function loadDeclared(applicationId: number): Record<string, YMD> {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(declaredKey(applicationId)) ?? '{}')
    if (parsed === null || typeof parsed !== 'object') return {}
    const result: Record<string, YMD> = {}
    for (const [slot, value] of Object.entries(parsed as Record<string, Partial<YMD> | null>)) {
      const digits = (part: unknown, length: number) => (typeof part === 'string' ? part.replace(/\D/g, '').slice(0, length) : '')
      const ymd = { y: digits(value?.y, 4), m: digits(value?.m, 2), d: digits(value?.d, 2) }
      if (ymd.y || ymd.m || ymd.d) result[slot] = ymd
    }
    return result
  } catch {
    return {}
  }
}

function saveDeclared(applicationId: number, value: Record<string, YMD>): void {
  try {
    const filled = Object.fromEntries(Object.entries(value).filter(([, ymd]) => ymd.y || ymd.m || ymd.d))
    if (Object.keys(filled).length === 0) window.sessionStorage.removeItem(declaredKey(applicationId))
    else window.sessionStorage.setItem(declaredKey(applicationId), JSON.stringify(filled))
  } catch { /* 저장소를 쓸 수 없으면 이번 화면에서만 기억한다. */ }
}

function loadSeenIssues(applicationId: number): string[] {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(seenIssuesKey(applicationId)) ?? 'null')
    if (Array.isArray(parsed)) return parsed.filter((entry): entry is string => typeof entry === 'string')
  } catch { /* 아래 기억으로 대신한다. */ }
  return seenIssuesFallback.get(applicationId) ?? []
}

function saveSeenIssues(applicationId: number, keys: string[]): void {
  seenIssuesFallback.set(applicationId, keys)
  try {
    window.sessionStorage.setItem(seenIssuesKey(applicationId), JSON.stringify(keys))
  } catch { /* 위 기억으로 대신한다. */ }
}

// ── 표시용 작은 함수들 ───────────────────────────────────────────────────

/** 파일 형식 표시(PDF · JPG · PNG). */
function formatLabel(name: string): string {
  const extension = fileExtension(name).toUpperCase()
  return extension === 'JPEG' ? 'JPG' : extension.slice(0, 4) || '파일'
}

function isPdfName(name: string): boolean {
  return fileExtension(name) === 'pdf'
}

function isPdfDocument(doc: UploadedDocument): boolean {
  return (doc.file_format || doc.file_name).toLowerCase().endsWith('pdf')
}

/** 문장 안의 `2026-03-03`을 `2026. 3. 3.`로 바꾼다. 다른 글자는 건드리지 않는다. */
function humanDates(text: string): string {
  return text.replace(/\d{4}-\d{2}-\d{2}/g, (iso) => formatDate(iso))
}

function isPeriodNote(note: string): boolean {
  return note.startsWith('조회기간에 ') || note.startsWith('최근 ')
}

function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function slotStatus(item: DocRequirementRow): 'empty' | 'uploaded' | 'reupload' {
  if (item.documents.length === 0) return 'empty'
  return item.documents.some((doc) => doc.status === 'REUPLOAD_REQUIRED') ? 'reupload' : 'uploaded'
}

/**
 * 제출을 막는 항목의 안내에서, 앞에 굵게 보여 주는 이름과 똑같이 되풀이되는 머리 부분을 뺀다.
 * 예) 이름 `주민등록초본`, 안내 `'주민등록초본'을(를) 아직 올리지 않았습니다.` → `아직 올리지 않았습니다.`
 * 화면에 보이는 글만 다듬고 서버가 준 값은 바꾸지 않는다.
 */
function blockerMessage(label: string, message: string): string {
  for (const head of [`'${label}'`, label]) {
    if (!label || !message.startsWith(head)) continue
    const particle = /^(?:을\(를\)|은\(는\)|이\(가\)|의|에)\s+/.exec(message.slice(head.length))
    if (particle) return message.slice(head.length + particle[0].length)
  }
  return message
}

/** 움직임 줄이기를 켠 기기에서는 부드럽게 미끄러지지 않고 바로 옮긴다. */
function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

// ── 파일 한 줄 ─────────────────────────────────────────────────────────

/**
 * 56×76 미리보기. 그림을 못 그리면 파일 아이콘과 형식 이름만 보인다.
 * `hold`인 동안은 그리기를 미룬다(올리기 전 파일 확인이 PDF 그리기에 밀리지 않게).
 */
function FileThumb({ url, pdf, name, onOpen, hold = false }: {
  url: string
  pdf: boolean
  name: string
  onOpen?: () => void
  hold?: boolean
}) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const content = (
    <>
      {!failed && !hold && (pdf ? (
        <PdfPages
          url={url}
          width={56}
          maxHeight={76}
          maxPages={1}
          className="dthumb__pages"
          onReady={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      ) : (
        <img className="dthumb__image" src={url} alt="" onLoad={() => setReady(true)} onError={() => setFailed(true)} />
      ))}
      {(!ready || failed) && <span className="dthumb__fallback"><Icon name="file" size={24} /></span>}
      <span className="dthumb__kind">{formatLabel(name)}</span>
    </>
  )
  return onOpen ? (
    <button type="button" className="dthumb dthumb--button" onClick={onOpen} aria-label={`${name} 크게 보기`}>{content}</button>
  ) : (
    <span className="dthumb" aria-hidden="true">{content}</span>
  )
}

function FileRow({ thumb, name, meta, actions, children }: {
  thumb: ReactNode
  name: string
  meta?: string
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="dfile">
      {thumb}
      <div className="dfile__main">
        <p className="dfile__name">{name}</p>
        {meta && <p className="dfile__meta">{meta}</p>}
        {children}
      </div>
      {actions && <div className="dfile__actions">{actions}</div>}
    </div>
  )
}

function localMeta(file: File, pages: number | null): string {
  return [formatLabel(file.name), pages ? `${pages}쪽` : '', formatBytes(file.size)].filter(Boolean).join(' · ')
}

/** 파일을 다 보낸 뒤 서버가 읽고 확인하는 동안. 지어낸 퍼센트 대신 흐른 시간과 예상 시간을 보여 준다. */
function ReadingStatus({ item, label }: { item: QueueItem; label: string }) {
  const elapsed = useElapsed(item.sentAt)
  const estimate = item.estimateSec ?? estimateSeconds(item.kind, item.pages, [])
  const slow = elapsed >= slowThresholdSec(estimate)
  return (
    <>
      <ProgressBar indeterminate label={`${label} 읽고 확인하는 중`} className="dfile__bar" />
      <p className="dfile__status">
        <span>서류를 읽고 확인하고 있습니다.</span>
        <span className="dfile__time">
          {elapsed}초 경과{!slow && (item.kind === 'pdf-text' ? ' · 곧 끝납니다.' : ` · 예상 ${formatDuration(estimate)}`)}
        </span>
      </p>
      {slow && (
        <Notice tone="info" role="status" className="dfile__notice">
          평소보다 오래 걸리고 있습니다. 창을 닫지 말고 기다려 주세요. 다른 서류의 발급일을 먼저 적어 두셔도 됩니다.
        </Notice>
      )}
    </>
  )
}

// ── 요건 보기 ──────────────────────────────────────────────────────────

/** "요건 보기"에 보여 줄 내용이 하나라도 있는지. 없으면 버튼을 띄우지 않는다. */
function hasInfo(item: DocRequirementRow): boolean {
  return (
    item.doc_type_choices.length > 1 ||
    item.required_fields.length > 0 ||
    item.notes.length > 0 ||
    item.alternatives.length > 0 ||
    item.warnings.length > 0
  )
}

/** 카드에서 뺀 요건 설명을 모아 보여 주는 대화상자. 발급처 링크는 카드에 남겨 새 창으로 바로 열리게 한다. */
function SlotInfoModal({ item, onClose }: { item: DocRequirementRow; onClose: () => void }) {
  return (
    <Modal title={item.label} onClose={onClose} footer={<button type="button" className="btn" onClick={onClose}>닫기</button>}>
      <div className="dinfo">
        {item.doc_type_choices.length > 1 && (
          <section className="dinfo__section">
            <h3>인정되는 서류</h3>
            <p>{item.doc_type_choices.join(' 또는 ')} 중 하나만 올리면 됩니다.</p>
          </section>
        )}
        {item.required_fields.length > 0 && (
          <section className="dinfo__section">
            <h3>반드시 있어야 하는 표기</h3>
            <p>{item.required_fields.join('·')} 표기가 반드시 있어야 인정됩니다.</p>
          </section>
        )}
        {item.notes.length > 0 && (
          <section className="dinfo__section">
            <h3>안내</h3>
            <ul>{item.notes.map((note) => <li key={note}>{humanDates(note)}</li>)}</ul>
          </section>
        )}
        {item.alternatives.length > 0 && (
          <section className="dinfo__section">
            <h3>대체 가능</h3>
            <ul>{item.alternatives.map((note) => <li key={note}>{humanDates(note)}</li>)}</ul>
          </section>
        )}
        {item.warnings.length > 0 && (
          <section className="dinfo__section">
            <h3>자주 틀리는 부분</h3>
            <ul>{item.warnings.map((note) => <li key={note}>{humanDates(note)}</li>)}</ul>
          </section>
        )}
      </div>
    </Modal>
  )
}

// ── 서류 한 칸 ─────────────────────────────────────────────────────────

/** 고른 파일을 이 기기에서 확인하는 짧은 동안(형식 · 빈 파일 · PDF 암호). */
interface PendingPick {
  token: number
  file: File
  previewUrl: string
}

/** 방금 올린 파일의 이 기기 미리보기. 같은 서류가 목록에 있는 동안만 쓴다. */
interface LocalPreview {
  documentId: number
  url: string
  pdf: boolean
}

type SlotPhase = 'empty' | 'replace' | 'checking' | 'queued' | 'sending' | 'reading' | 'failed' | 'uploaded' | 'reupload'

function SlotCard({
  item, pending, queued, pickError, replacing, declared, localPreview, announcement, callCenter,
  onDeclaredChange, onPick, onCancelQueued, onRetrySame, onChooseOther, onReplace, onLeaveReplace,
}: {
  item: DocRequirementRow
  pending: PendingPick | null
  queued: QueueItem | null
  pickError: string
  replacing: boolean
  declared: YMD
  localPreview: LocalPreview | null
  announcement: string
  callCenter?: string
  onDeclaredChange: (value: YMD) => void
  onPick: (file: File) => void
  onCancelQueued: () => void
  onRetrySame: () => void
  onChooseOther: () => void
  onReplace: () => void
  onLeaveReplace: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const acted = useRef(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const doc = item.documents[0] as UploadedDocument | undefined
  const docStatus = slotStatus(item)
  const phase: SlotPhase = pending ? 'checking'
    : queued ? queued.status
      : doc && !replacing ? docStatus as 'uploaded' | 'reupload'
        : doc ? 'replace' : 'empty'

  // 누른 버튼이 화면에서 사라져 포커스가 갈 곳을 잃으면 이 칸의 제목으로 옮긴다. 다른 곳에 입력 중이면 건드리지 않는다.
  useEffect(() => {
    if (!acted.current) return
    // 결과가 나올 때까지(확인 · 대기 · 올리는 중 · 읽는 중)는 이 칸에서 시작한 일로 기억해 둔다.
    if (phase !== 'checking' && phase !== 'queued' && phase !== 'sending' && phase !== 'reading') acted.current = false
    const focused = document.activeElement
    if (focused && focused !== document.body) return
    if (title.current && !title.current.closest('[inert]')) title.current.focus({ preventScroll: true })
  }, [phase])

  const act = (run: () => void) => () => { acted.current = true; run() }

  // 발급일 직접 입력이 있는 서류는 날짜를 먼저 받아야 올리는 즉시 날짜를 대조할 수 있다.
  const basisLabel = item.date_basis_label || '발급일'
  const dateFilled = !!(declared.y && declared.m && declared.d)
  const dateComplete = isCompleteYMD(declared)
  const dateReady = !item.check_declared_date || dateComplete
  const issueISO = dateComplete ? ymdToISO(declared) : ''
  const dateError = dateFilled && !dateComplete
    ? `${basisLabel}을 다시 확인해 주세요. 연도 네 자리와 달력에 있는 날짜를 입력해 주세요.`
    : ''
  const dateWarning = issueISO && issueISO > todayISO()
    ? `${basisLabel}이 오늘 이후입니다. 다시 확인해 주세요.`
    : issueISO && item.min_issue_date && issueISO < item.min_issue_date
      ? `이 사업은 ${formatDate(item.min_issue_date)} 이후 ${basisLabel}만 인정합니다. 서류를 확인해 주세요.`
      : ''
  const dateMessageId = `declared-${item.slot_key}-message`

  const link = issuerLink(item)
  const criteria = [...new Set([item.issue_rule_label, ...item.notes.filter(isPeriodNote)].filter(Boolean))].map(humanDates).join(' · ')
  const findings = doc ? reuploadFindings(doc.findings) : []
  const preview = doc && localPreview?.documentId === doc.document_id ? localPreview : null
  const viewUrl = doc ? preview?.url ?? doc.file_url : ''
  const viewPdf = doc ? preview?.pdf ?? isPdfDocument(doc) : false

  const takeFiles = (files: FileList | null | undefined) => {
    const file = files?.[0]
    if (!file) return
    acted.current = true
    onPick(file)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
    if (dateReady) takeFiles(event.dataTransfer.files)
  }

  // 새 파일을 보내는 동안에는 이전 결과 표시를 내리고 진행 상태만 보여 준다.
  const settledPhase = phase === 'uploaded' || phase === 'reupload' || phase === 'replace' || phase === 'failed'
  const chip = settledPhase && docStatus === 'uploaded' ? <StatusBadge status="UPLOADED" />
    : settledPhase && docStatus === 'reupload' ? <StatusBadge status="REUPLOAD_REQUIRED" />
      : phase === 'queued' ? <span className="badge badge--neutral"><Icon name="clock" size={16} />대기 중</span>
        : phase === 'checking' || phase === 'sending' || phase === 'reading'
          ? <span className="badge badge--info"><span className="spinner spinner--sm dslot__chip-spinner" aria-hidden="true" />확인 중</span>
          : null

  const picker = (
    <div className={item.check_declared_date ? 'dslot__picker dslot__picker--dated' : 'dslot__picker'}>
      <input
        ref={input}
        className="dslot__file"
        type="file"
        hidden
        accept={item.accept.map((format) => `.${format}`).join(',')}
        onChange={(event) => {
          takeFiles(event.target.files)
          event.target.value = ''
        }}
      />
      {item.check_declared_date && (
        <div className="field dslot__date">
          <span className="field__label"><span className="dslot__step" aria-hidden="true">1</span>서류에 적힌 {basisLabel}</span>
          <DateTriple
            variant="ui"
            value={declared}
            onChange={onDeclaredChange}
            ariaPrefix={`${item.label} ${basisLabel}`}
            idPrefix={`declared-${item.slot_key}`}
            invalid={!!dateError}
            describedBy={dateError || dateWarning ? dateMessageId : undefined}
          />
          {dateError && <p className="field__error" id={dateMessageId}><Icon name="alertCircle" size={18} />{dateError}</p>}
          {!dateError && dateWarning && (
            <p className="field__hint dslot__date-warning" id={dateMessageId} role="status"><Icon name="alert" size={18} />{dateWarning}</p>
          )}
        </div>
      )}
      <div className="field dslot__pick">
        {item.check_declared_date && (
          <span className="field__label"><span className="dslot__step" aria-hidden="true">2</span>파일 올리기</span>
        )}
        <div
          className={`dzone${dateReady ? '' : ' dzone--disabled'}${dragOver && dateReady ? ' dzone--over' : ''}`}
          onDragEnter={(event) => { event.preventDefault(); setDragOver(true) }}
          onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = dateReady ? 'copy' : 'none' }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false) }}
          onDrop={onDrop}
        >
          <Icon name="upload" size={24} className="dzone__icon" />
          <div className="dzone__copy">
            <p className="dzone__text">{dateReady ? '파일을 여기에 끌어다 놓거나' : `${basisLabel}을 먼저 입력해 주세요.`}</p>
            <p className="dzone__caption">PDF 권장 · JPG, PNG 가능</p>
          </div>
          <button
            type="button"
            className="btn dzone__button"
            id={`upload-${item.slot_key}`}
            disabled={!dateReady}
            onClick={() => input.current?.click()}
          >
            파일 선택
          </button>
        </div>
      </div>
      {pickError && <Notice tone="danger" role="alert" className="dslot__picker-notice">{pickError}</Notice>}
    </div>
  )

  const failure = queued && queued.status === 'failed' && (
    <>
      <FileRow
        thumb={<FileThumb key={queued.previewUrl} url={queued.previewUrl} pdf={isPdfName(queued.file.name)} name={queued.file.name} />}
        name={queued.file.name}
        meta={localMeta(queued.file, queued.pages)}
      />
      <Notice tone="danger" role="alert" title="파일을 올리지 못했습니다">
        <p>{queued.error || UPLOAD_FAILED_COPY}</p>
        <div className="dslot__notice-actions">
          <button type="button" className="btn btn--primary btn--small" onClick={act(onRetrySame)}>
            <Icon name="refresh" size={18} />같은 파일로 다시 시도
          </button>
          <button type="button" className="btn btn--small" onClick={act(onChooseOther)}>다른 파일 선택</button>
        </div>
      </Notice>
    </>
  )

  const result = doc && (
    <FileRow
      thumb={<FileThumb key={viewUrl} url={viewUrl} pdf={viewPdf} name={doc.file_name} onOpen={() => setViewing(true)} />}
      name={doc.file_name}
      meta={formatLabel(doc.file_name)}
      actions={(
        <>
          <button type="button" className="btn btn--small" onClick={() => setViewing(true)}><Icon name="eye" size={18} />미리보기</button>
          {phase === 'uploaded' && (
            <button type="button" className="btn btn--small" onClick={act(onReplace)}>다른 파일로 바꾸기</button>
          )}
        </>
      )}
    >
      {(Object.keys(doc.extracted).length > 0 || (docStatus === 'reupload' && doc.detected_doc_type)) && (
        <dl className="dl-inline dfile__extract">
          {Object.entries(doc.extracted).map(([key, value]) => (
            <div key={key}><dt>{key}</dt><dd>{humanDates(value)}</dd></div>
          ))}
          {/* 다시 올려야 할 때에만 읽은 서류 종류를 함께 보여 준다. */}
          {docStatus === 'reupload' && doc.detected_doc_type && (
            <div><dt>읽은 서류 종류</dt><dd>{doc.detected_doc_type}</dd></div>
          )}
        </dl>
      )}
    </FileRow>
  )

  return (
    <li className={`card dslot dslot--${phase}`} id={`slot-${item.slot_key}`}>
      <div className="dslot__head">
        <div className="dslot__heading">
          <h3 className="dslot__label" ref={title} tabIndex={-1}>{item.label}</h3>
          {item.required && <span className="badge badge--brand">필수</span>}
          {chip}
        </div>
        <div className="dslot__links">
          {hasInfo(item) && (
            <button type="button" className="btn btn--quiet btn--small" onClick={() => setInfoOpen(true)} aria-label={`${item.label} 요건 보기`}>
              <Icon name="info" size={18} />요건 보기
            </button>
          )}
          {link && (
            <a className="link link--external dslot__issuer" href={link} target="_blank" rel="noreferrer">
              {item.issuer}에서 발급받기<span className="sr-only"> (새 창)</span>
            </a>
          )}
        </div>
      </div>
      {criteria && <p className="dslot__criteria">{criteria}</p>}

      <div className="dslot__body">
        {phase === 'empty' && picker}

        {phase === 'replace' && doc && (
          <>
            <p className="dslot__current">
              <Icon name="file" size={18} />
              <span>현재 파일: <strong>{doc.file_name}</strong></span>
              <button type="button" className="btn btn--quiet btn--small" onClick={act(onLeaveReplace)}>취소</button>
            </p>
            {picker}
          </>
        )}

        {phase === 'checking' && pending && (
          <FileRow
            thumb={<FileThumb key={pending.previewUrl} url={pending.previewUrl} pdf={isPdfName(pending.file.name)} name={pending.file.name} hold={isPdfName(pending.file.name)} />}
            name={pending.file.name}
            meta={localMeta(pending.file, null)}
          >
            <p className="dfile__status"><span className="spinner-row"><Spinner small />파일을 확인하고 있습니다.</span></p>
          </FileRow>
        )}

        {queued && phase !== 'failed' && phase !== 'checking' && (
          <FileRow
            thumb={<FileThumb key={queued.previewUrl} url={queued.previewUrl} pdf={isPdfName(queued.file.name)} name={queued.file.name} />}
            name={queued.file.name}
            meta={localMeta(queued.file, queued.pages)}
            actions={phase === 'queued' ? (
              <button type="button" className="btn btn--quiet btn--small" onClick={act(onCancelQueued)} aria-label={`${item.label} 올리기 취소`}>취소</button>
            ) : undefined}
          >
            {phase === 'queued' && <p className="dfile__status">대기 중 — 앞 서류 확인이 끝나면 바로 시작합니다.</p>}
            {phase === 'sending' && (() => {
              const percent = queued.total > 0 ? Math.round((queued.sent / queued.total) * 100) : 0
              return (
                <>
                  <ProgressBar value={queued.sent} max={queued.total || 1} label={`${item.label} 올리는 중`} valueText={`${percent}%`} className="dfile__bar" />
                  <p className="dfile__status">올리는 중 {percent}%</p>
                </>
              )
            })()}
            {phase === 'reading' && <ReadingStatus item={queued} label={item.label} />}
            {queued.hint && <p className="field__hint dfile__hint">{queued.hint}</p>}
          </FileRow>
        )}

        {phase === 'failed' && (
          <>
            {doc && (
              <p className="dslot__current">
                <Icon name="file" size={18} />
                <span>현재 파일: <strong>{doc.file_name}</strong></span>
              </p>
            )}
            {failure}
          </>
        )}

        {(phase === 'uploaded' || phase === 'reupload') && result}

        {phase === 'reupload' && (
          <Notice tone="danger" className="dslot__guide">
            {findings.map((finding) => {
              const copy = REUPLOAD_GUIDANCE[finding.code]
              return (
                <div key={finding.code} className="dslot__reason">
                  <p className="dslot__reason-title">{copy.title}</p>
                  <p>{copy.reason}</p>
                  <p>{copy.fix}</p>
                </div>
              )
            })}
            {link && (
              <p><a className="link link--external" href={link} target="_blank" rel="noreferrer">{item.issuer || '발급처'} 바로가기 (새 창)</a></p>
            )}
            <p className="dslot__auto">
              자동 확인 결과입니다. 올바른 서류를 올렸는데도 같은 안내가 계속되면{' '}
              {callCenter ? <><PhoneLink number={callCenter} />(으)로 문의해 주세요.</> : '문의해 주세요.'}
            </p>
            <div className="dslot__notice-actions">
              <button type="button" className="btn btn--primary btn--small" onClick={act(onReplace)}>
                <Icon name="upload" size={18} />다시 올리기
              </button>
            </div>
          </Notice>
        )}
      </div>

      {/* 진행 · 완료 · 반려를 한 번씩 읽어 주는 자리. 늘 화면에 있어야 바뀐 말이 읽힌다. */}
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>

      {viewing && doc && (
        <FilePreview url={viewUrl} name={doc.file_name} kind={viewPdf ? 'pdf' : 'image'} onClose={() => setViewing(false)} />
      )}
      {infoOpen && <SlotInfoModal item={item} onClose={() => setInfoOpen(false)} />}
    </li>
  )
}

// ── 화면 ──────────────────────────────────────────────────────────────

function omit<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record
  const rest = { ...record }
  delete rest[key]
  return rest
}

export default function DocumentUpload({ applicationId, onProgress, onBusyChange, onForms, onBeforeSubmit, onSubmitted, callCenter }: {
  applicationId: number
  onProgress: (uploaded: number, total: number) => void
  onBusyChange: (busy: boolean) => void
  onForms: () => void
  onBeforeSubmit: () => Promise<void>
  onSubmitted: (result: SubmitResult) => void
  /** 사업 문의 전화. 자동 확인 결과가 잘못됐다고 느낄 때 연락할 곳으로 안내한다. */
  callCenter?: string
}) {
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [readiness, setReadiness] = useState<FinalCheck | null>(null)
  const [loadError, setLoadError] = useState('')
  const [readinessFailed, setReadinessFailed] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [foundBlockers, setFoundBlockers] = useState(false)
  const [contextError, setContextError] = useState('')
  const [leftoverError, setLeftoverError] = useState('')
  /** 화면 전체를 잠그는 작업(근로유형 변경 · 남은 쪽 삭제 · 제출 준비 다시 확인)의 이름. */
  const [busyScope, setBusyScope] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [queue, dispatch] = useReducer(queueReducer, [])
  const [checking, setChecking] = useState<Record<string, PendingPick>>({})
  const [pickErrors, setPickErrors] = useState<Record<string, string>>({})
  const [declared, setDeclared] = useState<Record<string, YMD>>(() => loadDeclared(applicationId))
  const [replacing, setReplacing] = useState<Record<string, boolean>>({})
  const [localPreviews, setLocalPreviews] = useState<Record<string, LocalPreview>>({})
  const [announcements, setAnnouncements] = useState<Record<string, string>>({})

  const [pendingContext, setPendingContext] = useState<Partial<DocContext> | null>(null)
  const [contextConfirm, setContextConfirm] = useState<{ patch: Partial<DocContext>; docs: UploadedDocument[] } | null>(null)
  const [confirmingSubmit, setConfirmingSubmit] = useState(false)
  const [reuploadOpen, setReuploadOpen] = useState(false)

  const latestRequest = useRef(0)
  const active = useRef(false)
  /** 화면 전체를 잠그는 작업이 진행 중인지. */
  const mutation = useRef(false)
  /** 지금 서버로 나가 있는 올리기 요청의 항목 id. 없으면 null. */
  const running = useRef<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  /** 올리기가 있었고 아직 목록 · 제출 준비를 다시 읽지 않았는지. */
  const dirty = useRef(false)
  /** 올리기를 시작할 때 그 칸에 있던 서류 id(없으면 null). 응답을 못 받은 요청이 실제로는 처리됐는지 가릴 때 쓴다. */
  const attempts = useRef(new Map<string, number | null>())
  const pickSeq = useRef(0)
  const queueRef = useRef(queue)
  const checkingRef = useRef(checking)
  const checklistRef = useRef(checklist)
  const liveUrls = useRef(new Set<string>())
  const showChecklistSkeleton = useDelayedFlag(!checklist && !loadError)

  useEffect(() => {
    queueRef.current = queue
    checkingRef.current = checking
    checklistRef.current = checklist
  }, [queue, checking, checklist])

  const refresh = useCallback(async () => {
    const version = ++latestRequest.current
    const [next, ready] = await Promise.all([fetchChecklist(applicationId), fetchFinalCheck(applicationId)])
    if (active.current && version === latestRequest.current) {
      setChecklist(next)
      setReadiness(ready)
      setReadinessFailed(false)
      const ids = new Set(next.items.flatMap((item) => item.documents.map((doc) => doc.document_id)))
      setLocalPreviews((current) => {
        const kept = Object.entries(current).filter(([, preview]) => ids.has(preview.documentId))
        return kept.length === Object.keys(current).length ? current : Object.fromEntries(kept)
      })
    }
    return ready
  }, [applicationId])

  const load = useCallback(() => {
    setLoadError('')
    void refresh().catch((error: unknown) => {
      if (active.current) setLoadError(friendlyError(error, LOAD_FAILED_COPY))
    })
  }, [refresh])

  useEffect(() => {
    active.current = true
    mutation.current = false
    void refresh().catch((error: unknown) => {
      if (active.current) setLoadError(friendlyError(error, LOAD_FAILED_COPY))
    })
    return () => {
      active.current = false
      latestRequest.current += 1
      abort.current?.abort()
      abort.current = null
      running.current = null
    }
  }, [refresh])

  // 이 기기 미리보기 주소는 어디에서도 쓰지 않게 되면 바로 거둔다.
  useEffect(() => {
    const now = new Set<string>([
      ...queue.map((item) => item.previewUrl),
      ...Object.values(checking).map((pick) => pick.previewUrl),
      ...Object.values(localPreviews).map((preview) => preview.url),
    ])
    for (const url of liveUrls.current) if (!now.has(url)) URL.revokeObjectURL(url)
    liveUrls.current = now
  }, [queue, checking, localPreviews])

  useEffect(() => {
    warmProbeWorker()
    return () => {
      for (const url of liveUrls.current) URL.revokeObjectURL(url)
      liveUrls.current = new Set()
      releaseProbeWorkerSoon()
    }
  }, [])

  useEffect(() => { saveDeclared(applicationId, declared) }, [applicationId, declared])

  const queueBusy = isActive(queue) || Object.keys(checking).length > 0
  const locked = !!busyScope || submitting
  useBeforeUnload(queueBusy)

  useEffect(() => {
    onBusyChange(queueBusy || locked)
    return () => onBusyChange(false)
  }, [queueBusy, locked, onBusyChange])

  const announce = useCallback((slotKey: string, message: string) => {
    setAnnouncements((current) => (current[slotKey] === message ? current : { ...current, [slotKey]: message }))
  }, [])

  const labelOf = (slotKey: string) => checklistRef.current?.items.find((item) => item.slot_key === slotKey)?.label ?? '서류'

  // ── 올리기 대기열을 차례로 보낸다. 요청은 언제나 하나뿐이다. ──
  useEffect(() => {
    if (running.current || mutation.current || locked) return
    const next = nextRunnable(queue)
    if (!next) return
    running.current = next.id
    dirty.current = true
    // 올리기 시작과 함께 이전 제출 준비 결과는 믿지 않는다(진행 중이던 조회 결과도 버린다).
    latestRequest.current += 1
    const controller = new AbortController()
    abort.current = controller
    const label = labelOf(next.slotKey)
    attempts.current.set(next.id, checklistRef.current?.items.find((item) => item.slot_key === next.slotKey)?.documents[0]?.document_id ?? null)

    void (async () => {
      setReadiness(null)
      // 대기열이 끝나면 준비 상태를 다시 조회하므로, 이전 조회 실패 안내는 지운다.
      setReadinessFailed(false)
      setFoundBlockers(false)
      dispatch({ type: 'start', id: next.id, now: Date.now() })
      announce(next.slotKey, `${label} 올리는 중`)
      let sentAt: number | null = null
      let uploaded: UploadedDocument | null = null
      let failure = ''
      try {
        uploaded = await uploadDocumentWithProgress(applicationId, next.slotKey, next.file, next.declared, {
          onProgress: (sent, total) => { if (active.current) dispatch({ type: 'progress', id: next.id, sent, total }) },
          onSent: () => {
            sentAt = Date.now()
            if (active.current) dispatch({ type: 'sent', id: next.id, now: sentAt })
          },
          signal: controller.signal,
        })
      } catch (error: unknown) {
        if (controller.signal.aborted) return
        failure = friendlyError(error, UPLOAD_FAILED_COPY)
      }
      if (abort.current === controller) abort.current = null
      if (running.current === next.id) running.current = null
      if (!active.current) return

      if (!uploaded) {
        dispatch({ type: 'fail', id: next.id, error: failure, now: Date.now() })
        announce(next.slotKey, `${label} 올리지 못했습니다.`)
        return
      }

      const doc = uploaded
      attempts.current.delete(next.id)
      const waited = Date.now() - (sentAt ?? Date.now())
      estimateHistory = rememberObservation(estimateHistory, {
        kind: next.kind,
        pages: next.pages ?? 1,
        ms: Math.max(waited, doc.elapsed_ms ?? 0),
      })
      // 결과는 응답으로 바로 그린다. 서버 기준 목록은 대기열이 비면 다시 읽어 맞춘다.
      setChecklist((current) => current && {
        ...current,
        items: current.items.map((row) => (row.slot_key === next.slotKey ? { ...row, documents: [doc] } : row)),
      })
      setLocalPreviews((current) => ({
        ...current,
        [next.slotKey]: { documentId: doc.document_id, url: next.previewUrl, pdf: next.kind !== 'image' },
      }))
      setReplacing((current) => omit(current, next.slotKey))
      setDeclared((current) => omit(current, next.slotKey))
      setPickErrors((current) => omit(current, next.slotKey))
      dispatch({ type: 'succeed', id: next.id })
      announce(next.slotKey, doc.status === 'REUPLOAD_REQUIRED'
        ? `${label} 다시 올려야 합니다. 안내를 확인해 주세요.`
        : `${label} 업로드 완료`)
    })()
  }, [queue, locked, applicationId, announce])

  // ── 대기열이 비면 목록과 제출 준비를 한 번 다시 읽는다. ──
  useEffect(() => {
    if (queueBusy || !dirty.current || mutation.current) return
    dirty.current = false
    void refresh().catch(() => {
      if (active.current) setReadinessFailed(true)
    })
  }, [queueBusy, refresh])

  const uploadItems = checklist?.items.filter((item) => item.upload) ?? []
  const working = (slotKey: string) => !!checking[slotKey] || (slotItem(queue, slotKey)?.status ?? 'failed') !== 'failed'
  const settled = uploadItems.filter((item) => !working(item.slot_key))
  const doneCount = settled.filter((item) => slotStatus(item) === 'uploaded').length
  const reuploadCount = settled.filter((item) => slotStatus(item) === 'reupload').length
  const workingCount = uploadItems.length - settled.length
  const totalCount = uploadItems.length
  const hasChecklist = checklist !== null

  // 단계 표시의 숫자도 "업로드 완료"만 센다.
  useEffect(() => {
    if (hasChecklist) onProgress(doneCount, totalCount)
  }, [hasChecklist, doneCount, totalCount, onProgress])

  // 실패로 남은 항목을 서버 기준 목록과 맞춘다.
  useEffect(() => {
    if (!checklist) return
    for (const item of queue) {
      if (item.status !== 'failed') continue
      const row = checklist.items.find((candidate) => candidate.slot_key === item.slotKey)
      // 근로유형을 바꿔 사라진 칸이면 치운다.
      if (!row) { dispatch({ type: 'clearSlot', slotKey: item.slotKey }); continue }
      // 응답은 못 받았지만 서버에는 올라간 경우: 그 칸의 서류가 시도 전과 달라져 있다. 실패 표시를 거두고 결과를 보여 준다.
      const current = row.documents[0]
      if (!attempts.current.has(item.id) || !current || current.document_id === attempts.current.get(item.id)) continue
      attempts.current.delete(item.id)
      const { slotKey, previewUrl, kind } = item
      const reupload = current.status === 'REUPLOAD_REQUIRED'
      window.setTimeout(() => {
        if (!active.current) return
        setLocalPreviews((previews) => ({ ...previews, [slotKey]: { documentId: current.document_id, url: previewUrl, pdf: kind !== 'image' } }))
        setReplacing((slots) => omit(slots, slotKey))
        setDeclared((dates) => omit(dates, slotKey))
        dispatch({ type: 'clearSlot', slotKey })
        announce(slotKey, reupload ? `${row.label} 다시 올려야 합니다. 안내를 확인해 주세요.` : `${row.label} 업로드 완료`)
      }, 0)
    }
  }, [checklist, queue, announce])

  // ── 다시 올려야 할 서류 ──
  const issueItems = (checklist?.items ?? []).map((item) => ({
    item,
    findings: item.documents.flatMap((doc) => reuploadFindings(doc.findings))
      .filter((finding, index, all) => all.findIndex((other) => other.code === finding.code) === index),
  })).filter(({ findings }) => findings.length > 0)
  const issueFingerprint = JSON.stringify(issueItems.map(({ item, findings }) => [item.slot_key, item.documents.map((doc) => doc.document_id), findings.map((finding) => finding.code)]))
  const pageBusy = queueBusy || locked

  // 새 반려가 생겼을 때 한 번만 저절로 연다. 같은 반려 상태로 다시 들어오거나 새로 고쳐도 다시 열지 않는다.
  useEffect(() => {
    const issues = (JSON.parse(issueFingerprint) as unknown[]).map((issue) => JSON.stringify(issue))
    if (issues.length === 0) {
      const timer = window.setTimeout(() => setReuploadOpen(false), 0)
      return () => window.clearTimeout(timer)
    }
    if (pageBusy) return
    const seen = loadSeenIssues(applicationId)
    if (issues.every((issue) => seen.includes(issue))) return
    const open = () => {
      // 다른 대화상자가 열려 있으면 닫힐 때까지 기다린다.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return false
      saveSeenIssues(applicationId, [...new Set([...seen, ...issues])].slice(-50))
      setReuploadOpen(true)
      return true
    }
    let interval = 0
    const first = window.setTimeout(() => {
      if (!open()) interval = window.setInterval(() => { if (open()) window.clearInterval(interval) }, 400)
    }, 0)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(interval)
    }
  }, [issueFingerprint, pageBusy, applicationId])

  const openReupload = () => {
    const issues = (JSON.parse(issueFingerprint) as unknown[]).map((issue) => JSON.stringify(issue))
    saveSeenIssues(applicationId, [...new Set([...loadSeenIssues(applicationId), ...issues])].slice(-50))
    setReuploadOpen(true)
  }

  // ── 화면 전체를 잠그는 작업 ──
  const context = checklist?.context ?? {}
  const shownContext = pendingContext ? { ...context, ...pendingContext } : context

  const runMutation = async (scope: string, operation: () => Promise<void>, onError: (message: string) => void, fallback: string): Promise<boolean> => {
    if (mutation.current || running.current || isActive(queueRef.current) || Object.keys(checkingRef.current).length > 0) return false
    mutation.current = true
    latestRequest.current += 1
    setReadiness(null)
    setFoundBlockers(false)
    setBusyScope(scope)
    let ok = true
    try {
      await operation()
      await refresh()
      dirty.current = false
    } catch (error: unknown) {
      ok = false
      if (active.current) {
        onError(friendlyError(error, fallback))
        setReadiness(null)
      }
      // 실패한 요청도 서버 상태를 바꿨을 수 있다. 제출을 다시 열기 전에 한 번 더 읽는다.
      try { await refresh() } catch { if (active.current) setReadinessFailed(true) }
    } finally {
      mutation.current = false
      if (active.current) setBusyScope('')
    }
    return ok
  }

  const applyContext = async (patch: Partial<DocContext>, docs: UploadedDocument[]) => {
    await runMutation('work-context', async () => {
      for (const doc of docs) await deleteDocument(applicationId, doc.document_id)
      await putDocContext(applicationId, { ...context, ...patch })
    }, setContextError, CONTEXT_FAILED_COPY)
    // 성공하면 서버 값이 곧 고른 값이고, 실패하면 서버 값으로 되돌아간다.
    if (active.current) setPendingContext(null)
  }

  const changeContext = (patch: Partial<DocContext>) => {
    if (pageBusy || mutation.current) return
    const proofRows = checklist?.items.filter((item) => item.slot_key.startsWith('work_proof') || item.slot_key === 'labor_contract') ?? []
    const changedWork = (['work_category', 'workplace_count'] as const).some((key) => patch[key] !== undefined && patch[key] !== context[key])
    const changedAdmin = patch.admin_fixed_term !== undefined && patch.admin_fixed_term !== context.admin_fixed_term
    const proofDocs = proofRows.filter((item) => changedWork || (changedAdmin && item.slot_key === 'labor_contract')).flatMap((item) => item.documents)
    setContextError('')
    // 고른 값은 바로 보여 주고 저장은 뒤에서 한다.
    setPendingContext(patch)
    if (proofDocs.length > 0) { setContextConfirm({ patch, docs: proofDocs }); return }
    void applyContext(patch, [])
  }

  const recheck = () => {
    setSubmitError('')
    void runMutation('readiness', async () => {}, setSubmitError, SUBMIT_FAILED_COPY)
  }

  // ── 파일 고르기 ──
  const focusPicker = (slotKey: string) => {
    requestAnimationFrame(() => {
      const uploadControl = document.getElementById(`upload-${slotKey}`) as HTMLButtonElement | null
      const target = uploadControl && !uploadControl.disabled
        ? uploadControl
        : document.getElementById(`slot-${slotKey}`)?.querySelector<HTMLElement>('input:not([type="file"])') ?? uploadControl
      target?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' })
      target?.focus({ preventScroll: true })
    })
  }

  const pick = (item: DocRequirementRow, file: File) => {
    const slotKey = item.slot_key
    if (mutation.current || checkingRef.current[slotKey]) return
    const existing = slotItem(queueRef.current, slotKey)
    if (existing && (existing.status === 'sending' || existing.status === 'reading')) return
    const date = declared[slotKey] ?? EMPTY_YMD
    if (item.check_declared_date && !isCompleteYMD(date)) return
    const declaredISO = item.check_declared_date ? ymdToISO(date) : ''
    const previewUrl = URL.createObjectURL(file)
    const token = ++pickSeq.current
    setChecking((current) => ({ ...current, [slotKey]: { token, file, previewUrl } }))
    setPickErrors((current) => omit(current, slotKey))
    void precheckFile(file, probePdf, previewUrl).then((result) => {
      if (!active.current) { URL.revokeObjectURL(previewUrl); return }
      setChecking((current) => (current[slotKey]?.token === token ? omit(current, slotKey) : current))
      if (!result.ok) {
        setPickErrors((current) => ({ ...current, [slotKey]: result.message }))
        focusPicker(slotKey)
        return
      }
      dispatch({
        type: 'enqueue',
        now: Date.now(),
        item: {
          id: `${slotKey}:${token}`,
          slotKey,
          file,
          declared: declaredISO,
          kind: result.kind,
          pages: result.pages,
          estimateSec: estimateSeconds(result.kind, result.pages, estimateHistory),
          previewUrl,
          hint: result.hint,
        },
      })
    })
  }

  const startReplace = (item: DocRequirementRow) => {
    const slotKey = item.slot_key
    const doc = item.documents[0] as UploadedDocument | undefined
    dispatch({ type: 'clearSlot', slotKey })
    setPickErrors((current) => omit(current, slotKey))
    if (doc) setReplacing((current) => ({ ...current, [slotKey]: true }))
    const previous = doc?.declared_issue_date?.split('-')
    if (previous?.length === 3) {
      setDeclared((current) => {
        const typed = current[slotKey]
        if (typed && (typed.y || typed.m || typed.d)) return current
        return { ...current, [slotKey]: { y: previous[0], m: String(Number(previous[1])), d: String(Number(previous[2])) } }
      })
    }
    focusPicker(slotKey)
  }

  const goToBlocker = (blocker: Blocker) => {
    if (blocker.goto !== 'upload') { onForms(); return }
    // 아직 올리지 않은 칸이면 요건 보기 단추가 아니라 실제로 채울 발급일 · 파일 선택으로 보낸다.
    if (document.getElementById(`upload-${blocker.target}`)) { focusPicker(blocker.target); return }
    const target = document.getElementById(`slot-${blocker.target}`) ?? document.getElementById('work-context')
    target?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' })
    target?.querySelector<HTMLElement>('input:not([type="file"]):not(:disabled),button:not(:disabled),select:not(:disabled)')?.focus({ preventScroll: true })
  }

  // ── 제출 ──
  const submit = async () => {
    if (mutation.current || running.current || queueBusy || !readiness?.can_submit) return
    mutation.current = true
    setSubmitting(true)
    setSubmitError('')
    setFoundBlockers(false)
    try {
      await onBeforeSubmit()
      if (!active.current) return
      const latest = await refresh()
      if (!active.current) return
      if (!latest.can_submit) { setFoundBlockers(true); return }
      const result = await submitApplication(applicationId)
      if (active.current) onSubmitted(result)
    } catch (error: unknown) {
      if (active.current) setSubmitError(friendlyError(error, SUBMIT_FAILED_COPY))
      setReadiness(null)
      try { await refresh() } catch { if (active.current) setReadinessFailed(true) }
    } finally {
      mutation.current = false
      if (active.current) setSubmitting(false)
    }
  }

  if (loadError && !checklist) {
    return (
      <div className="dupload">
        <h2 className="dupload__title" tabIndex={-1}>서류 업로드 및 제출</h2>
        <Notice tone="danger" role="alert" title="서류 목록을 불러오지 못했습니다">
          <p>{loadError}</p>
          <div className="dslot__notice-actions">
            <button type="button" className="btn btn--small" onClick={load}><Icon name="refresh" size={18} />다시 시도</button>
          </div>
        </Notice>
      </div>
    )
  }

  if (!checklist) {
    return (
      <div className="dupload">
        <h2 className="dupload__title" tabIndex={-1}>서류 업로드 및 제출</h2>
        {showChecklistSkeleton && (
          <Skeleton className="dupload__skeleton" label="서류 목록을 불러오는 중">
            {Array.from({ length: 4 }, (_, index) => (
              <SkeletonCard key={index} className="dupload__skeleton-card">
                <SkeletonLine width="38%" />
                <SkeletonLine width="72%" />
                <SkeletonLine width="54%" />
              </SkeletonCard>
            ))}
          </Skeleton>
        )}
      </div>
    )
  }

  const onlineItems = checklist.items.filter((item) => !item.upload && item.slot_key !== 'admin_info_consent')
  const hasAdminConsent = checklist.items.some((item) => item.slot_key === 'admin_info_consent')
  const blockers = readiness?.blockers ?? []
  const formBlockers = blockers.filter((blocker) => blocker.goto !== 'upload')
  const uploadBlockers = blockers.filter((blocker) => blocker.goto === 'upload')
  const contextLocked = queueBusy || busyScope === 'work-context'
  const submitBlocked = !readiness?.can_submit || pageBusy || !!submitError || readinessFailed

  const blockerRows = (rows: Blocker[]) => (
    <ul className="dupload__blocker-list">
      {rows.map((blocker) => (
        <li key={`${blocker.kind}-${blocker.target}`}>
          <p><strong>{blocker.label}</strong> <span className="dupload__blocker-message">{blockerMessage(blocker.label, blocker.message)}</span></p>
          <button type="button" className="btn btn--quiet btn--small" disabled={pageBusy} onClick={() => goToBlocker(blocker)} aria-label={`${blocker.label} 바로 가기`}>
            바로 가기<Icon name="chevronRight" size={18} />
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <div
      className="dupload"
      aria-busy={locked}
      onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) event.preventDefault() }}
      onDrop={(event) => { if (event.dataTransfer.types.includes('Files')) event.preventDefault() }}
    >
      <h2 className="dupload__title" tabIndex={-1}>서류 업로드 및 제출</h2>

      <div className="dupload__work" inert={locked}>
        <Notice tone="info" title="올리기 전에 확인해 주세요">
          <ul>
            <li>발급처에서 받은 PDF 원본이 가장 빠르고 정확하게 확인됩니다.</li>
            <li>종이 서류를 찍을 때는 서류 전체가 보이게, 글자가 또렷하게 찍어 주세요.</li>
            <li>파일을 올리면 자동으로 서류 종류와 발급일 등을 확인합니다. 확인하는 동안 다른 서류를 계속 준비할 수 있습니다.</li>
          </ul>
        </Notice>

        {/* 근로유형에 따라 필요한 근로확인서류가 정해진다. */}
        {checklist.program.asks_work_category && (
          <section className="card dupload__context" id="work-context" aria-labelledby="work-context-title">
            <h3 id="work-context-title">근로유형</h3>
            <p className="dupload__hint">근로확인서류는 5종 중 1종만 내면 됩니다. 아래에서 고르면 본인에게 필요한 서류만 남습니다.</p>
            <fieldset className="dupload__worktypes" disabled={contextLocked}>
              <legend className="sr-only">근로유형 선택</legend>
              {checklist.work_categories.map((category, index) => {
                const id = `work-category-${applicationId}-${index}`
                return (
                  <label key={category} htmlFor={id} className={shownContext.work_category === category ? 'radio dupload__worktype is-selected' : 'radio dupload__worktype'}>
                    <input
                      id={id}
                      type="radio"
                      name={`work-category-${applicationId}`}
                      value={category}
                      checked={shownContext.work_category === category}
                      onChange={() => changeContext({ work_category: category })}
                    />
                    <span>{category}</span>
                  </label>
                )
              })}
            </fieldset>
            <div className="dupload__opts">
              {shownContext.work_category === '직장가입자' && (
                <label className="check">
                  <input
                    type="checkbox"
                    checked={!!shownContext.admin_fixed_term}
                    disabled={contextLocked}
                    onChange={(event) => changeContext({ admin_fixed_term: event.target.checked })}
                  />
                  <span>행정기관 기간제 근로자입니다 (근로계약서 사본 추가)</span>
                </label>
              )}
              <label className="dupload__count">
                <span className="field__label">근무 사업장 수</span>
                <select
                  className="select"
                  value={`${shownContext.workplace_count ?? 1}개`}
                  disabled={contextLocked}
                  onChange={(event) => changeContext({ workplace_count: Number(event.target.value[0]) })}
                >
                  {WORKPLACE_COUNTS.map((count) => <option key={count} value={count}>{count}</option>)}
                </select>
              </label>
            </div>
            {busyScope === 'work-context' && <p className="dupload__status"><Spinner small label="필요한 서류를 다시 정리하고 있습니다." /></p>}
            {queueBusy && <p className="field__hint">서류 확인이 끝나면 근로유형을 바꿀 수 있습니다.</p>}
            {contextError && <Notice tone="danger" role="alert">{contextError}</Notice>}
          </section>
        )}

        <section className="card dupload__summary" aria-label="제출 서류 진행 상황">
          <div className="dupload__summary-row">
            <h3 className="dupload__summary-title">제출 서류</h3>
            <p className="dupload__summary-text">
              <span><strong>{doneCount}종 완료</strong> · 전체 {totalCount}종</span>
              {reuploadCount > 0 && <span className="dupload__summary-issue"><Icon name="alertCircle" size={18} />다시 올릴 서류 {reuploadCount}종</span>}
              {workingCount > 0 && <span className="dupload__summary-working"><Spinner small />확인 중 {workingCount}종</span>}
            </p>
          </div>
          <ProgressBar value={doneCount} max={totalCount || 1} label="제출 서류" valueText={`전체 ${totalCount}종 중 ${doneCount}종 완료`} />
          {checklist.program.asks_work_category && !shownContext.work_category && (
            <p className="field__hint">근로유형을 고르면 서류가 1종 추가됩니다.</p>
          )}
        </section>

        <ul className="dslots">
          {uploadItems.map((item) => (
            <SlotCard
              key={item.slot_key}
              item={item}
              pending={checking[item.slot_key] ?? null}
              queued={slotItem(queue, item.slot_key)}
              pickError={pickErrors[item.slot_key] ?? ''}
              replacing={!!replacing[item.slot_key]}
              declared={declared[item.slot_key] ?? EMPTY_YMD}
              localPreview={localPreviews[item.slot_key] ?? null}
              announcement={announcements[item.slot_key] ?? ''}
              callCenter={callCenter}
              onDeclaredChange={(value) => setDeclared((current) => ({ ...current, [item.slot_key]: value }))}
              onPick={(file) => pick(item, file)}
              onCancelQueued={() => {
                const waiting = slotItem(queueRef.current, item.slot_key)
                if (waiting) dispatch({ type: 'cancel', id: waiting.id })
                focusPicker(item.slot_key)
              }}
              onRetrySame={() => {
                const failed = slotItem(queueRef.current, item.slot_key)
                if (failed) dispatch({ type: 'retry', id: failed.id, now: Date.now(), estimateSec: estimateSeconds(failed.kind, failed.pages, estimateHistory) })
              }}
              onChooseOther={() => startReplace(item)}
              onReplace={() => startReplace(item)}
              onLeaveReplace={() => {
                setReplacing((current) => omit(current, item.slot_key))
                setPickErrors((current) => omit(current, item.slot_key))
                setDeclared((current) => omit(current, item.slot_key))
              }}
            />
          ))}
        </ul>

        {(onlineItems.length > 0 || hasAdminConsent) && (
          <section className="dupload__online" aria-labelledby="online-documents-title">
            <h3 id="online-documents-title">업로드하지 않아도 되는 서류</h3>
            <ul>
              {onlineItems.map((item) => (
                <li key={item.slot_key}><Icon name="check" size={18} /><span><strong>{item.label}</strong> — {item.fulfilled_by}(으)로 대체되었습니다.</span></li>
              ))}
              {hasAdminConsent && (
                <li>
                  <Icon name="check" size={18} />
                  <span>
                    <strong>행정정보 공동이용 사전동의서 (서식5)</strong>
                    {' — '}{context.paper_forms?.['서식5'] ? '스캔본을 제출합니다.' : '온라인 작성 동의와 서명을 제출합니다.'}
                  </span>
                </li>
              )}
            </ul>
          </section>
        )}

        {checklist.unassigned.length > 0 && (
          <section className="card dupload__leftover" aria-labelledby="leftover-title">
            <h3 id="leftover-title">배정되지 않은 페이지</h3>
            <ul>
              {checklist.unassigned.map((doc) => (
                <li key={doc.document_id}>
                  <span>
                    {doc.file_name}
                    {doc.page_index !== null && ` (${doc.page_index + 1}쪽)`} — {doc.detected_doc_type ?? '서류 종류 확인 전'}
                  </span>
                  <button
                    type="button"
                    className="btn btn--small"
                    disabled={queueBusy}
                    onClick={() => {
                      setLeftoverError('')
                      void runMutation(doc.slot_key, async () => { await deleteDocument(applicationId, doc.document_id) }, setLeftoverError, REMOVE_FAILED_COPY)
                    }}
                  >
                    <Icon name="trash" size={18} />삭제
                  </button>
                </li>
              ))}
            </ul>
            {leftoverError && <Notice tone="danger" role="alert">{leftoverError}</Notice>}
          </section>
        )}
      </div>

      {issueItems.length > 0 && (
        <Notice tone="danger" title={`다시 올려야 할 서류가 ${issueItems.length}종 있습니다.`} className="dupload__reupload">
          <button type="button" id="reupload-guidance-trigger" className="btn btn--small" disabled={locked} onClick={openReupload}>
            다시 올릴 서류와 해결 방법 보기 ({issueItems.length}종)
          </button>
        </Notice>
      )}

      <section className="card dupload__submission" aria-labelledby="submission-heading">
        <h3 id="submission-heading">신청 제출</h3>
        <p className="dupload__lead">제출 후에는 신청 내용을 수정할 수 없습니다. 작성한 내용과 올린 파일을 확인해 주세요.</p>

        {blockers.length > 0 && (
          <div className="dupload__blockers">
            <h4>제출 전에 채워 주세요 ({blockers.length}건)</h4>
            {formBlockers.length > 0 && (
              <>
                <h5>서식 작성 ({formBlockers.length}건)</h5>
                {blockerRows(formBlockers)}
              </>
            )}
            {uploadBlockers.length > 0 && (
              <>
                <h5>서류 업로드 ({uploadBlockers.length}건)</h5>
                {blockerRows(uploadBlockers)}
              </>
            )}
          </div>
        )}

        {queueBusy && <p className="dupload__status"><Spinner small label="서류 확인이 끝나면 제출할 수 있습니다." /></p>}
        {!readiness && !pageBusy && !submitError && !readinessFailed && (
          <p className="dupload__status"><Spinner small label="제출에 필요한 항목을 확인하고 있습니다. 확인이 끝나면 제출할 수 있습니다." /></p>
        )}
        {foundBlockers && blockers.length > 0 && (
          <Notice tone="warning" role="alert">제출 전에 채워야 할 항목이 있습니다. 위 목록을 확인해 주세요.</Notice>
        )}
        {(submitError || readinessFailed) && (
          <Notice tone="danger" role="alert" title={submitError ? '신청을 제출하지 못했습니다' : '제출 준비 상태를 확인하지 못했습니다'}>
            <p>{submitError || '잠시 후 다시 확인해 주세요.'}</p>
            <div className="dslot__notice-actions">
              <button type="button" className="btn btn--small" disabled={pageBusy} onClick={recheck}>
                <Icon name="refresh" size={18} />제출 준비 다시 확인
              </button>
            </div>
          </Notice>
        )}

        <div className="flow__actions">
          <button type="button" className="btn" disabled={pageBusy} onClick={onForms}>서식 수정</button>
          <button
            type="button"
            id="submit-application"
            className={submitting ? 'btn btn--primary btn--lg btn--busy' : 'btn btn--primary btn--lg'}
            disabled={submitBlocked}
            onClick={() => setConfirmingSubmit(true)}
          >
            {submitting && <span className="spinner" aria-hidden="true" />}
            {submitting ? '제출하는 중' : readiness?.already_submitted ? '이미 제출된 신청입니다' : '신청 제출'}
          </button>
        </div>
      </section>

      {confirmingSubmit && (
        <ConfirmDialog
          size="md"
          title="신청을 제출할까요?"
          description="제출한 뒤에는 서식과 서류를 수정할 수 없습니다."
          confirmLabel="제출하기"
          cancelLabel="돌아가기"
          returnFocus={() => document.getElementById('submit-application')}
          onCancel={() => setConfirmingSubmit(false)}
          onConfirm={() => { setConfirmingSubmit(false); void submit() }}
        >
          <dl className="dupload__confirm">
            <div><dt>서식</dt><dd>작성 완료</dd></div>
            <div><dt>서류</dt><dd>{doneCount}종 업로드 완료</dd></div>
          </dl>
        </ConfirmDialog>
      )}

      {contextConfirm && (
        <ConfirmDialog
          title="선택을 바꾸시겠습니까?"
          description="올리신 근로확인서류가 빠집니다."
          confirmLabel="바꾸기"
          cancelLabel="취소"
          returnFocus={() => document.getElementById('work-context')?.querySelector<HTMLElement>('input:checked, input, select') ?? null}
          onCancel={() => { setContextConfirm(null); setPendingContext(null) }}
          onConfirm={() => {
            const { patch, docs } = contextConfirm
            setContextConfirm(null)
            void applyContext(patch, docs)
          }}
        />
      )}

      {reuploadOpen && issueItems.length > 0 && (
        <Modal
          title="다시 올려야 할 서류를 확인해 주세요"
          description="아래 서류의 안내를 확인하고 파일을 다시 올려 주세요. 모든 재업로드 항목이 해결되면 제출할 수 있습니다."
          variant="reupload"
          returnFocus={() => document.getElementById('reupload-guidance-trigger')}
          onClose={() => setReuploadOpen(false)}
          footer={<button type="button" className="btn" onClick={() => setReuploadOpen(false)}>닫기</button>}
        >
          {issueItems.map(({ item, findings }) => {
            const link = issuerLink(item)
            return (
              <section key={item.slot_key} className="reupload-doc" aria-labelledby={`reupload-${item.slot_key}`}>
                <h3 id={`reupload-${item.slot_key}`}>{item.label}</h3>
                {item.issue_rule_label && <p>발급일 안내: {humanDates(item.issue_rule_label)}</p>}
                {item.notes.filter(isPeriodNote).map((note) => <p key={note}>{humanDates(note)}</p>)}
                <ol>
                  {findings.map((finding) => {
                    const copy = REUPLOAD_GUIDANCE[finding.code]
                    return <li key={finding.code}><h4>{copy.title}</h4><p>{copy.reason}</p><p>{copy.fix}</p></li>
                  })}
                </ol>
                <div className="reupload-doc__actions">
                  {link && <a className="link link--external" href={link} target="_blank" rel="noreferrer">{item.issuer || '발급처'} 바로가기 (새 창)</a>}
                  <button type="button" className="btn btn--primary btn--small" onClick={() => { setReuploadOpen(false); startReplace(item) }}>
                    {item.label} 다시 올리기
                  </button>
                </div>
              </section>
            )
          })}
        </Modal>
      )}
    </div>
  )
}
