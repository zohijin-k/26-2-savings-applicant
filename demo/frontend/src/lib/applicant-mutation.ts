/** Applicant-only presentation: never expose exception bodies or change policy decisions. */
export function httpStatus(error: unknown): number | null {
  if (typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number') return error.status
  return null
}
export function mutationError(error: unknown, fallback: string): string {
  const status = httpStatus(error)
  if (status === 401) return '인증을 확인할 수 없습니다. 다시 본인인증한 뒤 신청 상태를 확인해 주세요.'
  if (status === 403) return '이 신청을 변경할 권한이 없습니다. 신청 정보를 확인해 주세요.'
  if (status === 404) return '신청 정보를 확인할 수 없습니다. 접근 권한과 신청 상태를 확인해 주세요.'
  if (status === 409) return '현재 신청 상태에서는 변경할 수 없습니다. 최신 신청 상태를 확인해 주세요.'
  if (status === 400 || status === 422) return '입력값과 선택한 서류 종류를 확인해 주세요.'
  if (status === 503) return '서버가 일시적으로 요청을 처리하지 못했습니다. 인증 만료가 아닙니다. 잠시 후 상태를 확인해 주세요.'
  if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) return '응답을 기다리는 시간이 초과되었거나 전송이 중단되었습니다. 서버의 처리 결과를 먼저 확인해 주세요.'
  if (status === 0 || error instanceof TypeError) return '인터넷 연결을 확인해 주세요. 서버의 처리 결과를 먼저 확인한 뒤 다시 시도해 주세요.'
  return fallback
}
export function slotChange(before: number | null, after: readonly { document_id: number }[]): 'changed' | 'unchanged' {
  return after.some((doc) => doc.document_id !== before) ? 'changed' : 'unchanged'
}
export function isSubmitted(status: { status: string; submitted_at: string | null }): boolean {
  return status.status !== 'draft' && !!status.submitted_at
}
