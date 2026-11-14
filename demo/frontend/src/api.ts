/** 백엔드 호출. vite dev 서버가 /api 를 :8000 으로 프록시한다. */

import { FORM_FIELD_KEYS } from './forms/form-field-bindings.ts'
import { GENERIC_ERROR_COPY, NETWORK_ERROR_COPY, isCitizenSafe, messageForStatus } from './lib/error-copy.ts'

/** 두배적금 신청에 사용하는 서버 사업 설정. */
export interface Program {
  code: string
  name: string
  announcement_date: string
  document_cutoff: string
  age_basis_date: string
  birth_range: [string, string]
  selection: 'scored' | 'first_come'
  is_first_come: boolean
  supplement_days: number | null
  allows_supplement: boolean
  has_income_requirement: boolean
  has_work_requirement: boolean
  apply_period: [string, string]
  /** 2차 모집이 있는 사업의 2차 신청 기간. 없으면 null. */
  apply_period_2: [string, string] | null
  quota_by_region: Record<string, number> | null
  quota_total: number | null
  /** 두배적금 자가진단 문항 번호. */
  self_check_items: number[]
  site_url: string
  call_center: string
  notes: string[]
}

/** 서류 보완 기한 (E12). 보완이 없는 사업에서는 null. */
export interface SupplementInfo {
  days: number | null
  deadline: string
  days_left: number
  hours_left: number
  expired: boolean
  targets: { label: string; reason: string }[]
  notice: string
}

export interface ApplicationRow {
  id: number
  application_no: string
  program_code: string
  status: string
  form1_json: Record<string, unknown>
  self_check_json: Record<string, string>
  form5_json: Record<string, unknown>
  identity_json: Partial<Identity> | null
}

export interface SelfCheckResult {
  completed: boolean
  /** 두배적금 자가진단 문항 수. */
  total_items: number
}

export interface ConsentPayload {
  consent_type: 'privacy' | 'unique_id' | 'third_party' | 'admin_info'
  agreed: boolean
  signature_data_url?: string
  signature_kind?: 'electronic' | 'handwritten'
}

/** 업로드 즉시 판정 결과 한 줄. 사유만 주면 신청자는 또 전화한다 — 해결 방법과 발급처가 함께 온다. */
export interface Finding {
  code: string
  message: string
  how_to_fix: string
  link: string
  /** 과거 저장 사유는 severity를 생략하며 기존 FAIL 기본값을 따른다. */
  severity?: 'FAIL' | 'NEEDS_REVIEW'
}

export type DocStatus = 'UPLOADED' | 'REUPLOAD_REQUIRED'

export interface UploadedDocument {
  document_id: number
  slot_key: string
  file_name: string
  file_format: string
  /** 원본을 브라우저 안에서 여는 주소 (인라인 스트리밍) */
  file_url: string
  expected_doc_type: string | null
  detected_doc_type: string | null
  declared_issue_date: string | null
  status: DocStatus | null
  findings: Finding[]
  extracted: Record<string, string>
  elapsed_ms: number | null
  page_index: number | null
  uploaded_at: string
}

/** 체크리스트 한 줄. `upload`가 false면 온라인 작성으로 대체된 항목이다. */
export interface DocRequirementRow {
  slot_key: string
  doc_type: string
  /** 이 자리에 인정되는 서류들. 응시확인서 **또는** 성적표처럼 택1인 칸이 있다. */
  doc_type_choices: string[]
  /** 서류에 반드시 찍혀 있어야 하는 항목 (예: 응시확인서의 "응시일"). */
  required_fields: string[]
  label: string
  required: boolean
  upload: boolean
  fulfilled_by: string
  requires_signature: boolean
  check_declared_date: boolean
  date_basis: 'issue_date' | 'payment_date' | 'interview_date' | 'exam_date' | 'none'
  date_basis_label: string
  min_issue_date: string | null
  max_issue_date: string | null
  issue_rule_label: string
  issuer: string
  issuer_url: string
  notes: string[]
  warnings: string[]
  alternatives: string[]
  accept: string[]
  documents: UploadedDocument[]
}

export interface DocContext {
  work_category?: string | null
  admin_fixed_term?: boolean
  workplace_count?: number
  handwritten_admin_consent?: boolean
  paper_forms?: Record<string, boolean>
}

/** 업로드 화면이 사업 코드로 분기하지 않도록 서버가 내려주는 안내. */
export interface ChecklistProgram {
  code: string
  name: string
  selection: 'scored' | 'first_come'
  allows_supplement: boolean
  supplement_days: number | null
  document_cutoff: string
  announcement_date: string
  application_period: string[]
  application_period_2: string[] | null
  asks_work_category: boolean
  paper_forms: Record<string, boolean>
}

export interface Checklist {
  context: DocContext
  program: ChecklistProgram
  work_categories: string[]
  accepted_formats: string[]
  items: DocRequirementRow[]
  upload_total: number
  upload_done: number
  unassigned: UploadedDocument[]
  /** 판정 컷라인 등 TF 미확정 가정값 안내. `(데모 추정치)` 라벨이 붙어 온다. */
  assumption_notes: string[]
}

export interface MergedUploadResult {
  mode: 'merged'
  source_file: string
  page_count: number
  assigned: UploadedDocument[]
  unassigned: UploadedDocument[]
}

/** 제출을 막는 항목 하나. `goto`는 "어디로 가면 고칠 수 있는가"다. */
export interface Blocker {
  kind: 'form' | 'consent' | 'document' | 'context' | 'eligibility'
  target: string
  label: string
  message: string
  goto: 'form1' | 'consent' | 'upload'
}

export interface FinalCheck {
  application_no: string
  program_code: string
  program_name: string
  allows_supplement: boolean
  supplement_days: number | null
  selection: 'scored' | 'first_come'
  status: string
  can_submit: boolean
  already_submitted: boolean
  blockers: Blocker[]
  warnings: string[]
  form_summary: { label: string; value: string }[]
  documents: UploadedDocument[]
}

export interface SubmitResult {
  application_no: string
  submitted_at: string | null
  status: string
  message: string
  next_steps: string[]
  supplement: SupplementInfo | null
  notice: string
}

/**
 * 마이페이지 응답.
 *
 * ⚠️ 점수 필드가 없는 것이 사양이다 (공고문: "평가결과는 공개하지 않음").
 * 이 인터페이스에 점수·구간·순위를 추가하면 안 된다.
 */
export interface ApplicationStatus {
  application_no: string
  program_code: string
  program_name: string
  status: string
  submitted_at: string | null
  progress: { label: string; state: 'done' | 'current' | 'todo' }[]
  result_notice: string
  supplement: SupplementInfo | null
  documents: UploadedDocument[]
  consents: {
    consent_type: string
    label: string
    agreed: boolean
    agreed_at: string
    signature_kind: string | null
  }[]
  call_center: string
}

/**
 * 요청 실패.
 *
 * `message`는 그대로 화면에 보여 줘도 되는 문장이다(서버가 준 안내, 없으면 상태별 문장).
 * `status`는 HTTP 상태이고 통신 자체가 실패하면 0이다. `detail`은 서버가 준 안내 문장이 있을 때만 채워진다.
 */
export class ApiError extends Error {
  readonly status: number
  readonly detail?: string
  constructor(message: string, status: number, detail?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

const UPLOAD_ERROR_COPY = '파일을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.'

/** 응답 본문에서 서버 안내 문장만 꺼낸다. 문자열이 아니거나 안내 문장이 아니면 undefined. */
function serverDetail(data: unknown): string | undefined {
  const raw = data !== null && typeof data === 'object' ? (data as { detail?: unknown }).detail : undefined
  return isCitizenSafe(raw) ? raw.trim() : undefined
}

function apiError(status: number, data: unknown, fallback: string): ApiError {
  const detail = serverDetail(data)
  return new ApiError(detail ?? messageForStatus(status) ?? fallback, status, detail)
}

/** 통신 자체가 실패하면(연결 끊김 등) 상태 0의 ApiError로 바꾼다. */
async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(path, init)
  } catch {
    throw new ApiError(NETWORK_ERROR_COPY, 0)
  }
}

async function failure(res: Response, fallback: string): Promise<ApiError> {
  return apiError(res.status, await res.json().catch(() => null), fallback)
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await request(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) throw await failure(res, GENERIC_ERROR_COPY)
  return res.json() as Promise<T>
}

/** 파일 업로드는 multipart라 Content-Type을 브라우저가 붙이게 둔다. */
async function form<T>(path: string, body: FormData): Promise<T> {
  const res = await request(path, { method: 'POST', body })
  if (!res.ok) throw await failure(res, UPLOAD_ERROR_COPY)
  return res.json() as Promise<T>
}

export async function uploadSignatureScan(id: number, file: File): Promise<void> {
  const body = new FormData()
  body.append('file', file)
  await form<{ uploaded: boolean }>(`/api/applications/${id}/forms/signature-scan`, body)
}

export async function deleteSignatureScan(id: number): Promise<void> {
  const res = await request(`/api/applications/${id}/forms/signature-scan`, { method: 'DELETE' })
  if (!res.ok) throw await failure(res, '서명 이미지를 지우지 못했습니다. 잠시 후 다시 시도해 주세요.')
}

export const fetchPrograms = () => json<Program[]>('/api/programs')

export const createApplication = (programCode: string) =>
  json<ApplicationRow>('/api/applications', {
    method: 'POST',
    body: JSON.stringify({ program_code: programCode }),
  })

export const fetchApplication = (id: number) =>
  json<ApplicationRow>(`/api/applications/${id}`)

export const fetchApplicationConsents = (id: number) =>
  json<{ consent_type: string; agreed: boolean }[]>(`/api/applications/${id}/consents`)

export const patchApplication = (
  id: number,
  body: { form1?: unknown; self_check?: unknown; form5?: unknown },
) =>
  json<ApplicationRow>(`/api/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export interface FormFieldLayout {
  type: 'text' | 'check' | 'image'
  control?: 'radio_text'
  page: number
  box: [number, number, number, number]
  label_box?: [number, number, number, number]
  click_box?: [number, number, number, number]
  choice_box?: [number, number, number, number]
  choice_group_box?: [number, number, number, number]
  cell_box?: [number, number, number, number]
  x?: number
  y?: number
  size?: number
  align?: 'left' | 'center'
  format?: 'yyyy' | 'yy' | 'none'
  auto_date?: boolean
  date_part?: 'year' | 'month' | 'day'
  date_reference?: { size: number; baseline: number; render_baseline: number; render_size_scale: number; character: string; font_family: 'serif' | 'sans'; glyph_box: [number, number, number, number] }
  group_box?: [number, number, number, number]
  font_family?: 'serif' | 'sans'
  anchor?: string
  label?: string
}

export interface FormLayout {
  form_no: string
  title: string
  public_form: string | null
  page_sizes: { width: number; height: number }[]
  fields: Record<string, FormFieldLayout>
  requirements?: ({ kind: 'all_or_none'; fields: string[] } | { kind: 'when_choice'; field: string; equals: string; required: string[] })[]
  masks?: { page: number; box: [number, number, number, number] }[]
  auto_date: string
}

export interface ApplicantFormSummary {
  form_no: string
  public_form: string | null
  title: string
  label: string
  file_url: string
  file_name: string
  hwp_available: boolean
}

export const fetchOriginalHwpOptions = (id: number) =>
  json<{ url: string | null; label: string | null }>(`/api/applications/${id}/forms/files/original-hwp/options`)
export const fetchFormLayout = async (id: number, formNo: string): Promise<FormLayout> => {
  const layout = await json<FormLayout>(`/api/applications/${id}/forms/layouts/${encodeURIComponent(formNo)}`)
  const bindings = FORM_FIELD_KEYS[formNo] || []
  const fields = Object.fromEntries(Object.entries(layout.fields).map(([opaqueId, field], index) => [bindings[index] || opaqueId, field]))
  const keyById = Object.fromEntries(bindings.map((key, index) => [`f${String(index).padStart(4, '0')}`, key]))
  const requirements = (layout.requirements || []).map((rule) => rule.kind === 'all_or_none'
    ? { ...rule, fields: rule.fields.map((key) => keyById[key] || key) }
    : { ...rule, field: (keyById[rule.field] || rule.field).split('.')[0], required: rule.required.map((key) => keyById[key] || key) })
  return { ...layout, fields, requirements }
}

export const fetchApplicantForms = (id: number) =>
  json<ApplicantFormSummary[]>(`/api/applications/${id}/forms`)

/** 본인인증 결과. 서류 본인 대조의 기준이 된다 (연락처는 가려서 돌아온다). */
export interface Identity {
  name: string
  birth: string
  phone: string
  method: string
  verified_at: string
}

export interface IdentityPayload {
  name: string
  /** YYYY-MM-DD */
  birth: string
  phone: string
  pledge: boolean
  signature_data_url: string
  /** electronic(화면에 직접 서명) | uploaded(서명 파일 올리기) */
  signature_kind: 'electronic' | 'uploaded'
}

/** 본인인증 (데모). 실패 사유는 서버 문구 그대로 보여준다. */
export async function verifyIdentity(id: number, body: IdentityPayload): Promise<Identity> {
  const res = await request(`/api/applications/${id}/identity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => null)) as
    | { identity?: Identity; detail?: unknown }
    | null
  if (!res.ok || !data?.identity) {
    throw apiError(res.status, data, '본인인증을 마치지 못했습니다. 입력한 내용을 확인한 뒤 다시 시도해 주세요.')
  }
  return data.identity
}

export const postSelfCheck = (id: number, answers: Record<string, string>) =>
  json<SelfCheckResult>(`/api/applications/${id}/self-check`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  })

export const postConsents = (id: number, consents: ConsentPayload[]) =>
  json<{ saved: unknown[] }>(`/api/applications/${id}/consents`, {
    method: 'POST',
    body: JSON.stringify({ consents }),
  })

export const fetchChecklist = (id: number) =>
  json<Checklist>(`/api/applications/${id}/required-documents`)

/** 근로유형 등을 저장하고 바뀐 체크리스트를 바로 받는다. */
export const putDocContext = (id: number, context: DocContext) =>
  json<Checklist>(`/api/applications/${id}/doc-context`, {
    method: 'PUT',
    body: JSON.stringify({
      work_category: context.work_category ?? null,
      admin_fixed_term: context.admin_fixed_term ?? false,
      workplace_count: context.workplace_count ?? 1,
      handwritten_admin_consent: context.handwritten_admin_consent ?? false,
      paper_forms: context.paper_forms ?? {},
    }),
  })

export function uploadDocument(
  id: number,
  slotKey: string,
  file: File,
  declaredIssueDate: string,
) {
  const body = new FormData()
  body.append('file', file)
  body.append('slot_key', slotKey)
  if (declaredIssueDate) body.append('declared_issue_date', declaredIssueDate)
  return form<UploadedDocument>(`/api/applications/${id}/documents`, body)
}

/**
 * `uploadDocument`와 같은 요청을 보내되 전송 진행을 알려 준다.
 *
 * - `onProgress(sent, total)`: 서버로 보낸 바이트 수가 바뀔 때마다.
 * - `onSent()`: 파일을 모두 보냈을 때(이후는 서버가 서류를 읽고 확인하는 시간이다).
 * - `signal`: 중단하면 `AbortError`(DOMException)로 거절된다.
 * 실패하면 `ApiError`로 거절된다(통신 실패는 status 0).
 */
export function uploadDocumentWithProgress(
  id: number,
  slotKey: string,
  file: File,
  declaredIssueDate: string,
  opts: {
    onProgress?: (sent: number, total: number) => void
    onSent?: () => void
    signal?: AbortSignal
  } = {},
): Promise<UploadedDocument> {
  const { onProgress, onSent, signal } = opts
  const body = new FormData()
  body.append('file', file)
  body.append('slot_key', slotKey)
  if (declaredIssueDate) body.append('declared_issue_date', declaredIssueDate)

  return new Promise<UploadedDocument>((resolve, reject) => {
    const aborted = () => new DOMException('The request was aborted.', 'AbortError')
    if (signal?.aborted) {
      reject(aborted())
      return
    }
    const xhr = new XMLHttpRequest()
    const abort = () => xhr.abort()
    const settle = () => signal?.removeEventListener('abort', abort)

    xhr.open('POST', `/api/applications/${id}/documents`)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded, event.total)
    }
    xhr.upload.onload = () => onSent?.()
    xhr.onload = () => {
      settle()
      let data: unknown = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch { /* 본문이 JSON이 아니면 상태만으로 판단한다. */ }
      if (xhr.status >= 200 && xhr.status < 300 && data !== null) resolve(data as UploadedDocument)
      else reject(apiError(xhr.status, data, UPLOAD_ERROR_COPY))
    }
    xhr.onerror = () => {
      settle()
      reject(new ApiError(NETWORK_ERROR_COPY, 0))
    }
    xhr.onabort = () => {
      settle()
      reject(aborted())
    }
    signal?.addEventListener('abort', abort, { once: true })
    xhr.send(body)
  })
}

/** 여러 서류를 한 파일로 올린 경우. 페이지별로 쪼개 슬롯에 자동 배정한다. */
export function uploadMerged(id: number, file: File) {
  const body = new FormData()
  body.append('file', file)
  body.append('slot_key', 'auto')
  return form<MergedUploadResult>(`/api/applications/${id}/documents`, body)
}

export const deleteDocument = (id: number, documentId: number) =>
  json<{ deleted: string }>(`/api/applications/${id}/documents/${documentId}`, {
    method: 'DELETE',
  })

/** 제출 전 최종 확인. */
export const fetchFinalCheck = (id: number) =>
  json<FinalCheck>(`/api/applications/${id}/final-check`)

export const submitApplication = (id: number) =>
  json<SubmitResult>(`/api/applications/${id}/submit`, { method: 'POST' })

export const fetchStatus = (id: number) =>
  json<ApplicationStatus>(`/api/applications/${id}/status`)
