import type { DocStatus } from '../api.ts'
import { APPLICANT_DOCUMENT_STATUS } from '../lib/document-status.ts'
import Icon from './Icon.tsx'


export default function StatusBadge({
  status,
}: {
  status: DocStatus
}) {
  const presentation = APPLICANT_DOCUMENT_STATUS[status]
  return (
    <span className={presentation.className}>
      <Icon name={presentation.icon} size={16} />
      <span>{presentation.label}</span>
    </span>
  )
}
