import type { DocRequirementRow, Finding } from '../../api.ts'

/** Public copy uses checklist requirements, never raw OCR findings or another person's identity. */
export const REUPLOAD_GUIDANCE: Record<string, { title: string; reason: string; fix: string }> = {
  DOCUMENT_ISSUED_TOO_EARLY: {
    title: '서류를 새로 발급해 주세요.',
    reason: '이 서류는 이 사업에서 인정하는 기준일보다 전에 발급되어 발급일 조건에 맞지 않습니다.',
    fix: '아래 발급처에서 새 서류를 발급받아 주세요. PDF를 열어 화면에 안내된 기준일 또는 그 뒤에 발급되었는지 확인한 후 이 칸에 다시 올려 주세요.',
  },
  DOCUMENT_ISSUED_AFTER_APPLICATION: {
    title: '서류의 발급 날짜를 확인해 주세요.',
    reason: '서류에 적힌 발급일이 이 신청에서 인정하는 마지막 날짜보다 뒤입니다.',
    fix: '화면의 인정 기간과 서류의 발급일을 비교해 주세요. 인정 기간에 발급받은 서류가 있으면 그 파일을 올려 주세요. 날짜가 잘못 표기됐거나 해당 기간의 서류를 준비하기 어렵다면 발급처와 사업 문의처에 확인해 주세요.',
  },
  IDENTITY_MISMATCH: {
    title: '본인 명의의 서류를 올려 주세요.',
    reason: '서류에서 확인한 신청인 정보가 본인인증 정보와 맞지 않습니다.',
    fix: '가족이나 다른 사람의 파일을 고르지 않았는지 확인해 주세요. 아래 발급처에서 본인 명의로 발급한 파일을 준비해 이 칸에 다시 올려 주세요.',
  },
  IMAGE_RESOLUTION_TOO_LOW: {
    title: '서류의 글자가 너무 작게 보여요.',
    reason: '원본 이미지가 작아 서류의 주요 내용을 확인하기 어렵습니다.',
    fix: '가능하면 발급처에서 내려받은 원본 PDF를 그대로 올려 주세요. 사진은 문서를 평평하게 놓고 밝은 곳에서 글자에 초점을 맞춰 찍어 주세요. 네 모서리가 모두 나오게 하고 메신저로 줄인 사진이나 작은 화면 캡처 대신 원본 사진을 올려 주세요. 작은 사진을 확대해 저장하는 것만으로는 글자가 선명해지지 않습니다.',
  },
  LOW_IMAGE_QUALITY: {
    title: '더 선명한 서류가 필요해요.',
    reason: '이 파일은 글자를 확인하기에 화질이 낮게 확인됐습니다.',
    fix: '발급처에서 원본 PDF를 다시 내려받아 올려 주세요. 사진으로 제출한다면 서류 전체가 밝고 똑바로 보이게 찍고, 흔들림·빛 반사·그림자가 없는지 확인해 주세요. 글자가 읽히는 원본 사진으로 다시 올려 주세요.',
  },
  PAGES_INCOMPLETE: {
    title: '빠진 쪽까지 모두 올려 주세요.',
    reason: '서류에 표시된 전체 쪽수에 비해 올라온 쪽이 부족해 내용을 끝까지 확인할 수 없습니다.',
    fix: '발급받은 PDF에서 첫 쪽부터 마지막 쪽까지 있는지 확인해 주세요. 가능하면 모든 쪽이 들어 있는 PDF 한 파일을 올려 주세요. 사진이라면 빠진 쪽을 포함해 업로드 칸에서 지원하는 방식으로 전체 쪽을 다시 준비해 주세요.',
  },
  UNREADABLE_FILE: {
    title: '서류 파일을 열 수 없어요.',
    reason: 'PDF에 암호가 있거나 파일이 손상됐을 수 있어 서류 내용을 확인할 수 없습니다.',
    fix: '먼저 내 기기에서 파일을 열어 보세요. 암호를 묻는다면 본인이 열 수 있는 파일의 암호를 해제하거나 발급처에서 암호 없는 PDF를 준비해 주세요. 열리지 않거나 다운로드가 끊긴 파일은 다시 내려받고 실제로 열리는지 확인한 후 올려 주세요. 이 사이트에 암호를 입력하거나 보낼 필요는 없습니다.',
  },
  MISSING_ADDRESS_DATES: {
    title: '주소가 바뀐 날짜가 나오는 주민등록초본을 발급해 주세요.',
    reason: '현재 파일에는 주소 변동의 발생일·신고일이 없어 거주기간을 확인하기 어렵습니다.',
    fix: '정부24에서 주민등록초본을 신청할 때 주소 변동사항과 발생일·신고일이 표시되도록 선택해 주세요. 발급한 초본을 열어 주소 이력 옆에 날짜가 있는지 확인한 뒤 초본 칸에 다시 올려 주세요. 온라인 발급이 어려우면 행정복지센터에 같은 항목이 포함된 초본을 요청해 주세요.',
  },
  MISSING_BILLING_MONTHS: {
    title: '심사에 필요한 월이 나오는 건강보험료 납부확인서를 준비해 주세요.',
    reason: '현재 파일에서는 이 사업에서 요구하는 월의 고지 내역이 확인되지 않습니다.',
    fix: '국민건강보험공단에서 보험료 납부확인서를 발급할 때 조회기간에 필요한 월이 모두 들어가도록 선택해 주세요. 발급한 파일에서 각 월과 고지금액이 보이는지 확인하고 다시 올려 주세요. 기간을 맞춰도 해당 월이 나오지 않으면 공단에 발급 내용을 문의해 주세요. 금액을 직접 고치거나 없는 내역을 만들 필요는 없습니다.',
  },
  WRONG_DOCUMENT_TYPE: {
    title: '이 칸에서 요청한 서류가 필요해요.',
    reason: '지금 올린 파일은 이 칸에서 요청한 서류와 다른 종류로 확인됐습니다.',
    fix: '예를 들어 주민등록초본 칸에는 등본이 아닌 초본이 필요합니다. 파일을 잘못 골랐다면 올바른 파일을 선택해 주세요. 아직 없다면 아래 발급처에서 해당 서류를 준비해 이 칸에 다시 올려 주세요. 다른 업로드 칸의 서류라면 그 칸에 올려 주세요.',
  },
}

export function reuploadFindings(findings: Finding[]): Finding[] {
  return findings.filter((finding, index) => (finding.severity ?? 'FAIL') === 'FAIL' && Object.hasOwn(REUPLOAD_GUIDANCE, finding.code)
    && findings.findIndex((other) => (other.severity ?? 'FAIL') === 'FAIL' && other.code === finding.code) === index)
}

/** Unverified deep links for these agencies deliberately fall back to their official home pages. */
export function issuerLink(item: Pick<DocRequirementRow, 'issuer' | 'issuer_url'>): string {
  try {
    const url = new URL(item.issuer_url)
    if (url.hostname === 'gov.kr' || url.hostname.endsWith('.gov.kr')) return 'https://www.gov.kr'
    if (url.hostname === 'nhis.or.kr' || url.hostname.endsWith('.nhis.or.kr')) return 'https://www.nhis.or.kr'
    return url.protocol === 'https:' ? url.href : ''
  } catch { return '' }
}
