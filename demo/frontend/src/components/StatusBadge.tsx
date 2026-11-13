import type { DocStatus } from '../api.ts'

export const APPLICANT_DOCUMENT_STATUS = {
  PASS: { label: '확인 완료', icon: '✓' },
  NEEDS_REVIEW: { label: '담당자 확인 예정', icon: '?' },
  FAIL: { label: '다시 올려 주세요', icon: '↻' },
} satisfies Record<DocStatus, { label: string; icon: string }>

export default function StatusBadge({
  status,
}: {
  status: DocStatus
}) {
  const presentation = APPLICANT_DOCUMENT_STATUS[status]
  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`} role="status">
      <span className="status-badge__icon" aria-hidden="true">{presentation.icon}</span>
      <span>{presentation.label}</span>
    </span>
  )
}
