import type { DocStatus } from '../api.ts'
import Icon, { type IconName } from './Icon.tsx'

export const APPLICANT_DOCUMENT_STATUS = {
  UPLOADED: { label: '업로드 완료', icon: 'checkCircle' },
  REUPLOAD_REQUIRED: { label: '다시 올려 주세요', icon: 'refresh' },
} satisfies Record<DocStatus, { label: string; icon: IconName }>

export default function StatusBadge({
  status,
}: {
  status: DocStatus
}) {
  const presentation = APPLICANT_DOCUMENT_STATUS[status]
  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`}>
      <Icon name={presentation.icon} size={16} />
      <span>{presentation.label}</span>
    </span>
  )
}
