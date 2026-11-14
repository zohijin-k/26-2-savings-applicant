/**
 * 서류를 읽고 확인하는 데 걸릴 시간의 추정.
 *
 * 기본값은 파일 종류별 측정치(글자 PDF 약 1초, 사진 약 3초, 스캔 PDF 쪽당 약 4초)이고,
 * 이번 접속에서 실제로 걸린 시간이 있으면 절반씩 섞는다. 화면에는 "예상"이라고 밝혀서 보여 준다.
 */
import type { FileKind } from './file-precheck.ts'

export interface Observation {
  kind: FileKind
  /** 쪽수. 모르면 1로 적는다. */
  pages: number
  /** 파일을 다 보낸 뒤 결과가 올 때까지 걸린 시간. */
  ms: number
}

/** 단위(글자 PDF·사진은 파일 하나, 스캔 PDF는 한 쪽)마다 걸리는 기본 시간(초). */
export const DEFAULT_SECONDS: Record<FileKind, number> = { 'pdf-text': 1, image: 3, 'pdf-scan': 4 }

export const MIN_ESTIMATE_SEC = 1
export const MAX_ESTIMATE_SEC = 180
export const MAX_OBSERVATIONS = 20

/** 스캔 PDF만 쪽수에 비례한다. 쪽수를 모르면 한 쪽으로 본다. */
function units(kind: FileKind, pages: number | null): number {
  if (kind !== 'pdf-scan') return 1
  return typeof pages === 'number' && Number.isFinite(pages) && pages >= 1 ? Math.floor(pages) : 1
}

export function estimateSeconds(kind: FileKind, pages: number | null, history: readonly Observation[]): number {
  const base = DEFAULT_SECONDS[kind]
  const seen = history.filter((entry) => entry.kind === kind && Number.isFinite(entry.ms) && entry.ms >= 0)
  let perUnit = base
  if (seen.length > 0) {
    const mean = seen.reduce((sum, entry) => sum + entry.ms / 1000 / units(kind, entry.pages), 0) / seen.length
    perUnit = (base + mean) / 2
  }
  const total = Math.round(perUnit * units(kind, pages))
  return Math.min(MAX_ESTIMATE_SEC, Math.max(MIN_ESTIMATE_SEC, total))
}

/** 이 시간을 넘기면 "평소보다 오래 걸리고 있습니다" 안내로 바꾼다. */
export function slowThresholdSec(estimate: number): number {
  return Math.max(10, estimate * 1.5)
}

/** 최근 관측만 남긴 새 배열을 돌려준다(원본은 바꾸지 않는다). */
export function rememberObservation(history: readonly Observation[], entry: Observation, limit = MAX_OBSERVATIONS): Observation[] {
  return [...history, entry].slice(-limit)
}
