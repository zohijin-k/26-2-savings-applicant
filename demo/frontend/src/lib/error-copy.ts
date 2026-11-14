/**
 * 오류를 민원인이 읽을 문장으로 바꾼다.
 * 주소·요청 방식·브라우저 내부 문구가 화면에 나가지 않게 하는 마지막 관문이다.
 */

export const NETWORK_ERROR_COPY = '인터넷 연결을 확인한 뒤 다시 시도해 주세요.'
export const SERVER_ERROR_COPY = '일시적인 문제로 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
export const NOT_FOUND_COPY = '신청 정보를 찾을 수 없습니다. 처음부터 다시 시작해 주세요.'
export const GENERIC_ERROR_COPY = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'

const TECHNICAL = /\/api|\b(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|fetch|https?:\/\/|traceback|exception|\bat\s+\S+\s+\(/i
const HANGUL = /[가-힣]/

/** 서버가 준 안내로 그대로 보여 줘도 되는 문장인지. 한글 안내만 받고 기술 문구가 섞이면 버린다. */
export function isCitizenSafe(text: unknown): text is string {
  if (typeof text !== 'string') return false
  const trimmed = text.trim()
  return trimmed.length > 0 && trimmed.length <= 300 && HANGUL.test(trimmed) && !TECHNICAL.test(trimmed)
}

/** 응답 상태만으로 정해지는 문장. 정해진 문장이 없는 상태는 null. (0은 통신 실패) */
export function messageForStatus(status: number): string | null {
  if (status === 0) return NETWORK_ERROR_COPY
  if (status >= 500) return SERVER_ERROR_COPY
  if (status === 403 || status === 404) return NOT_FOUND_COPY
  return null
}

function looksLikeNetworkFailure(err: unknown): boolean {
  if (err instanceof TypeError) return true
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  return /failed to fetch|networkerror|load failed|network request failed/i.test(message)
}

/**
 * 화면에 보여 줄 오류 문장.
 * 1) 서버가 준 안내(`detail`)가 있으면 그 문장, 2) 통신 실패, 3) 서버 오류(5xx),
 * 4) 신청을 찾을 수 없음(403·404), 5) 그 밖에는 `fallback`.
 */
export function friendlyError(err: unknown, fallback: string): string {
  const safeFallback = isCitizenSafe(fallback) ? fallback : GENERIC_ERROR_COPY
  if (err !== null && typeof err === 'object') {
    const { detail, status } = err as { detail?: unknown; status?: unknown }
    if (isCitizenSafe(detail)) return detail.trim()
    if (typeof status === 'number') return messageForStatus(status) ?? safeFallback
  }
  if (looksLikeNetworkFailure(err)) return NETWORK_ERROR_COPY
  return safeFallback
}
