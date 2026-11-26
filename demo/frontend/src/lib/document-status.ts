/**
 * 신청자 서류 상태 표시 (#23, 11-27).
 *
 * 신청자 API는 서류 상태를 UPLOADED / REUPLOAD_REQUIRED 두 값만 준다(officer 백엔드 api/common.py,
 * `.trellis/spec/backend/applicant-submission.md`). UPLOADED에는 자동 확인 적합(PASS)과 담당자 확인 필요
 * (NEEDS_REVIEW)가 함께 들어 있고 화면은 둘을 구별할 수 없다. 그래서 UPLOADED는 "파일이 접수됐다"는
 * 중립 상태로만 보인다. 성공색·체크 아이콘·"완료"처럼 적합 판정으로 읽히는 표현을 쓰지 않는다.
 * 확정된 부적합(REUPLOAD_REQUIRED)만 빨간 재업로드 안내와 제출 차단을 유지한다.
 */
import type { DocStatus } from '../api.ts'
import type { IconName } from '../components/Icon.tsx'

export interface DocumentStatusPresentation {
  label: string
  icon: IconName
  /** 배지 클래스. UPLOADED는 공용 `.status-badge` 기본(회색 중립)만 쓴다. */
  className: string
}

export const APPLICANT_DOCUMENT_STATUS = {
  UPLOADED: { label: '업로드됨', icon: 'file', className: 'status-badge' },
  REUPLOAD_REQUIRED: { label: '다시 올려 주세요', icon: 'refresh', className: 'status-badge status-badge--reupload_required' },
} satisfies Record<DocStatus, DocumentStatusPresentation>

/** 업로드됨 서류 곁에 두는 고정 안내. 서류별 내부 판정을 드러내지 않는다(모든 UPLOADED에 같은 문장). */
export const UPLOADED_REVIEW_NOTE = '업로드됨은 파일이 접수됐다는 뜻이며, 서류가 요건에 맞는지는 담당자가 원본을 보고 확인합니다.'

/** 화면 읽기 프로그램에 알리는 업로드 결과. */
export function uploadAnnouncement(label: string, status: DocStatus | null): string {
  return status === 'REUPLOAD_REQUIRED' ? `${label} 다시 올려야 합니다. 안내를 확인해 주세요.` : `${label} 업로드됨`
}
