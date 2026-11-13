/**
 * 서류 업로드 · 즉시 판정 (P2).
 *
 * 두배적금은 보완 요청이 없는 사업이다. 제출한 뒤에 미비를 알려주면 이미 늦다.
 * 그래서 이 화면의 전부는 "올리는 순간 알려준다"에 걸려 있다.
 *
 *   근로유형 선택 → 본인에게 필요한 서류만 남는다 (R3.2)
 *   슬롯마다  [발급처 바로가기] [발급일 직접 입력] → [파일 업로드]
 *            발급일 입력을 받는 서류는 날짜를 다 적어야 파일을 고를 수 있다 (2차 검증의 기준값)
 *   업로드 즉시 확인 안내 + 해결 방법 + 재업로드 (R2.1·R2.2)
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  deleteDocument,
  fetchChecklist,
  fetchFinalCheck,
  submitApplication,
  putDocContext,
  uploadDocument,
  type Checklist,
  type DocContext,
  type DocRequirementRow,
  type UploadedDocument,
  type SubmitResult,
  type FinalCheck,
  type Blocker,
} from '../../api.ts'
import FilePreview from '../../components/FilePreview.tsx'
import { Skeleton, SkeletonBlock, SkeletonCard, SkeletonLine } from '../../components/Skeleton.tsx'
import useDelayedFlag from '../../hooks/useDelayedFlag.ts'
import Modal from '../../components/Modal.tsx'
import PdfPages from '../../components/PdfPages.tsx'
import StatusBadge from '../../components/StatusBadge.tsx'
import { DateTriple } from '../../forms/FormSheet.tsx'
import { EMPTY_YMD, isCompleteYMD, ymdToISO, type YMD } from '../../forms/ymd.ts'
import { issuerLink, reuploadFindings, REUPLOAD_GUIDANCE } from './reupload-guidance.ts'
import './document-upload.css'

const WORKPLACE_COUNTS = ['1개', '2개', '3개'] as const

/** 파일 형식 표시 (PDF·JPG·PNG). */
function fileKind(name: string): string {
  return (name.split('.').pop() ?? '').toUpperCase().slice(0, 4) || 'FILE'
}

function isPdf(doc: UploadedDocument): boolean {
  return (doc.file_format || doc.file_name).toLowerCase().endsWith('pdf')
}

function DocumentThumbnail({ doc, onClick }: { doc: UploadedDocument; onClick: () => void }) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const pdf = isPdf(doc)
  const extension = fileKind(doc.file_name)
  const kind = extension === 'JPEG' ? 'JPG' : extension

  return (
    <button
      type="button"
      className="dresult__kind"
      onClick={onClick}
      aria-label={`${doc.file_name} 크게 보기`}
    >
      {!failed && (pdf ? (
        <PdfPages
          url={doc.file_url}
          width={56}
          maxHeight={76}
          maxPages={1}
          className={ready ? 'dresult__pages dresult__pages--ready' : 'dresult__pages'}
          onReady={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      ) : (
        <img
          className="dresult__image"
          src={doc.file_url}
          alt=""
          onLoad={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      ))}
      {(!ready || failed) && <span className="dresult__fallback">{kind}</span>}
      {ready && !failed && <span className="dresult__badge">{kind}</span>}
    </button>
  )
}

function DocumentResult({
  doc,
  onRetry,
}: {
  doc: UploadedDocument
  onRetry: () => void
}) {
  const [viewing, setViewing] = useState(false)
  const status = doc.status ?? 'UPLOADED'
  const extracted = Object.entries(doc.extracted)
  return (
    <div className={`dresult dresult--${status.toLowerCase()}`}>
      <div className="dresult__file">
        <DocumentThumbnail key={doc.file_url} doc={doc} onClick={() => setViewing(true)} />
        <div className="dresult__body">
          <button type="button" className="dresult__name" onClick={() => setViewing(true)}>
            {doc.file_name}
          </button>
          {extracted.length > 0 && (
            <dl className="dextract">
              {extracted.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {/* 확인이 필요한 경우에만 판독된 서류 종류를 함께 보여준다 */}
          {status === 'REUPLOAD_REQUIRED' && doc.detected_doc_type && (
            <span className="dresult__detected">읽은 서류 종류: {doc.detected_doc_type}</span>
          )}
        </div>
        <div className="dresult__actions">
          <button type="button" className="btn btn--small" onClick={() => setViewing(true)}>
            미리보기
          </button>
          <button type="button" className="btn btn--small dresult__retry" onClick={onRetry}>
            다시 올리기
          </button>
        </div>
      </div>
      {viewing && (
        <FilePreview
          url={doc.file_url}
          name={doc.file_name}
          kind={(doc.file_format || doc.file_name).toLowerCase().endsWith('pdf') ? 'pdf' : 'image'}
          onClose={() => setViewing(false)}
        />
      )}

      {reuploadFindings(doc.findings).map((finding) => (
        <p key={finding.code} className="dfinding__msg">{REUPLOAD_GUIDANCE[finding.code].title}</p>
      ))}
    </div>
  )
}

/** ⓘ에 보여줄 내용이 하나라도 있는지. 없으면 아이콘 자체를 띄우지 않는다. */
function hasInfo(item: DocRequirementRow): boolean {
  return (
    item.doc_type_choices.length > 1 ||
    item.required_fields.length > 0 ||
    item.notes.length > 0 ||
    item.alternatives.length > 0 ||
    item.warnings.length > 0
  )
}

/** 카드에서 뺀 요건 설명 · 체크포인트를 모아 보여주는 모달. 발급처 링크는 원래대로
    카드에 남겨 새 창으로 바로 열리게 한다 — 모달 안에 숨기지 않는다. */
function SlotInfoModal({ item, onClose }: { item: DocRequirementRow; onClose: () => void }) {
  return (
    <Modal title={item.label} onClose={onClose}>
      {item.doc_type_choices.length > 1 && (
        <div className="dinfo__section">
          <h4>인정되는 서류</h4>
          <p>{item.doc_type_choices.join(' 또는 ')} 중 하나만 올리면 됩니다.</p>
        </div>
      )}
      {item.required_fields.length > 0 && (
        <div className="dinfo__section">
          <h4>반드시 있어야 하는 표기</h4>
          <p>{item.required_fields.join('·')} 표기가 반드시 있어야 인정됩니다.</p>
        </div>
      )}
      {item.notes.length > 0 && (
        <div className="dinfo__section">
          <h4>안내</h4>
          {item.notes.map((n) => (
            <p key={n}>※ {n}</p>
          ))}
        </div>
      )}
      {item.alternatives.length > 0 && (
        <div className="dinfo__section">
          <h4>대체 가능</h4>
          {item.alternatives.map((n) => (
            <p key={n} className="dinfo__alt">
              {n}
            </p>
          ))}
        </div>
      )}
      {item.warnings.length > 0 && (
        <div className="dinfo__section">
          <h4>자주 틀리는 부분</h4>
          <ul className="dinfo__warn">
            {item.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}

function SlotCard({
  item,
  busy,
  declared,
  onDeclaredChange,
  onPick,
  onRetry,
  replacement,
}: {
  item: DocRequirementRow
  busy: boolean
  declared: YMD
  onDeclaredChange: (v: YMD) => void
  onPick: (file: File) => void
  onRetry: (doc: UploadedDocument) => void
  replacement: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [busyFileName, setBusyFileName] = useState('')
  const showBusySkeleton = useDelayedFlag(busy)
  const doc = item.documents[0]
  const status = doc?.status ?? null
  // 발급일 직접 입력이 있는 서류는 날짜를 먼저 받아야 업로드 즉시 2차 검증을 할 수 있다.
  const dateReady = !item.check_declared_date || isCompleteYMD(declared)
  const issueISO = isCompleteYMD(declared) ? ymdToISO(declared) : ''
  const current = new Date()
  const todayISO = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
  const basisLabel = item.date_basis_label || '발급일'
  const dateWarning = issueISO && issueISO > todayISO
    ? `${basisLabel}이 오늘 이후입니다. 다시 확인해 주세요.`
    : issueISO && item.min_issue_date && issueISO < item.min_issue_date
      ? `이 사업은 ${item.min_issue_date.replaceAll('-', '.')} 이후 ${basisLabel}만 인정합니다. 서류를 확인해 주세요.`
      : ''

  return (
    <li
      className={`dslot dslot--${status ? status.toLowerCase() : 'empty'}`}
      id={`slot-${item.slot_key}`}
    >
      <div className="dslot__head">
        <div className="dslot__title">
          <span className="dslot__label">{item.label}</span>
          {item.required && <span className="dslot__req">필수</span>}
          {hasInfo(item) && (
            <button
              type="button"
              className="dslot__info"
              onClick={() => setInfoOpen(true)}
              aria-label={`${item.label} 요건 안내`}
            >
              ⓘ
            </button>
          )}
        </div>
        <div className="dslot__head-meta">
          {status ? (
            <StatusBadge status={status} />
          ) : showBusySkeleton ? (
            <span className="status-badge status-badge--loading" role="status" aria-live="polite">
              <span className="dslot__spinner" aria-hidden="true" />
              읽는 중…
            </span>
          ) : null}
          {!status && issuerLink(item) && (
            <a className="dslot__issuer" href={issuerLink(item)} target="_blank" rel="noreferrer">
              {item.issuer}에서 발급받기 ↗
            </a>
          )}
        </div>
      </div>

      <p className="dslot__criteria">{item.issue_rule_label}{item.notes.filter((note) => note.startsWith('조회기간에 ') || note.startsWith('최근 ')).map((note) => ` · ${note}`).join('')}</p>

      {/* 올리기 전: 발급일 → 파일 업로드. 올린 뒤에는 결과만 남긴다. */}
      {(!doc || replacement) && !busy && (
        <div className="dslot__action">
          <input
            ref={input}
            className="dslot__file"
            type="file"
            accept={item.accept.map((f) => `.${f}`).join(',')}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                setBusyFileName(file.name)
                onPick(file)
              }
              e.target.value = ''
            }}
          />
          {item.check_declared_date && (
            <label className="dslot__declared">
              <span className="dslot__declared-label">서류에 적힌 {basisLabel}</span>
              <DateTriple value={declared} onChange={onDeclaredChange} ariaPrefix={item.label} />
            </label>
          )}
          {dateWarning && <p className="dslot__date-warning" role="status">{dateWarning}</p>}
          {!dateReady && (
            <p className="dslot__gate">{basisLabel}을 입력하면 파일을 올릴 수 있습니다.</p>
          )}
          <button
            type="button"
            className="btn btn--primary dslot__upload"
            id={`upload-${item.slot_key}`}
            disabled={!dateReady}
            onClick={() => input.current?.click()}
          >
            {doc ? '새 파일로 교체' : '파일 업로드'}
          </button>
        </div>
      )}

      {!doc && busy && showBusySkeleton && (
        <div className="dresult dresult--loading">
          <div className="dresult__file">
            <div className="dresult__kind dresult__kind--loading" aria-hidden="true">
              <SkeletonBlock className="dresult__thumbnail-shimmer" />
            </div>
            <div className="dresult__body dresult__body--loading">
              {busyFileName ? (
                <span className="dresult__name dresult__name--loading">{busyFileName}</span>
              ) : (
                <SkeletonLine className="dresult__filename-shimmer" />
              )}
              <span className="dresult__issue-date"><span>발급일</span><SkeletonLine width="7em" /></span>
            </div>
            <div className="dresult__actions">
              <button type="button" className="btn btn--small" disabled aria-disabled="true">미리보기</button>
              <button type="button" className="btn btn--small dresult__retry" disabled aria-disabled="true">다시 올리기</button>
            </div>
          </div>
        </div>
      )}

      {doc && <DocumentResult doc={doc} onRetry={() => onRetry(doc)} />}
      {infoOpen && <SlotInfoModal item={item} onClose={() => setInfoOpen(false)} />}
    </li>
  )
}

export default function DocumentUpload({ applicationId, onProgress, onBusyChange, onForms, onBeforeSubmit, onSubmitted }: {
  applicationId: number
  onProgress: (uploaded: number, total: number) => void
  onBusyChange: (busy: boolean) => void
  onForms: () => void
  onBeforeSubmit: () => Promise<void>
  onSubmitted: (result: SubmitResult) => void
}) {
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [readiness, setReadiness] = useState<FinalCheck | null>(null)
  const [declared, setDeclared] = useState<Record<string, YMD>>({})
  const [busySlot, setBusySlot] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [editingSlot, setEditingSlot] = useState('')
  const [reuploadOpen, setReuploadOpen] = useState(false)
  const latestRequest = useRef(0)
  const active = useRef(false)
  const mutation = useRef(false)
  const shownIssues = useRef('')
  const showChecklistSkeleton = useDelayedFlag(!checklist && !error)

  const refresh = useCallback(async () => {
    const version = ++latestRequest.current
    const [next, ready] = await Promise.all([fetchChecklist(applicationId), fetchFinalCheck(applicationId)])
    if (active.current && version === latestRequest.current) {
      setChecklist(next)
      setReadiness(ready)
      onProgress(next.upload_done, next.upload_total)
    }
    return ready
  }, [applicationId, onProgress])

  useEffect(() => {
    active.current = true
    mutation.current = false
    void refresh().catch((e: unknown) => {
      if (active.current) setError(e instanceof Error ? e.message : String(e))
    })
    return () => { active.current = false; latestRequest.current += 1 }
  }, [refresh])

  const issueItems = (checklist?.items ?? []).map((item) => ({
    item,
    findings: item.documents.flatMap((doc) => reuploadFindings(doc.findings))
      .filter((finding, index, all) => all.findIndex((other) => other.code === finding.code) === index),
  })).filter(({ findings }) => findings.length > 0)
  const issueFingerprint = JSON.stringify(issueItems.map(({ item, findings }) => [item.slot_key, item.documents.map((doc) => doc.document_id), findings.map((finding) => finding.code)]))

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (issueFingerprint === '[]') { setReuploadOpen(false); shownIssues.current = ''; return }
      if (!busySlot && !submitting && shownIssues.current !== issueFingerprint) {
        shownIssues.current = issueFingerprint
        setReuploadOpen(true)
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [issueFingerprint, busySlot, submitting])

  useEffect(() => {
    onBusyChange(!!busySlot || submitting)
    return () => onBusyChange(false)
  }, [busySlot, submitting, onBusyChange])

  const context = checklist?.context ?? {}
  const runMutation = async (slot: string, operation: () => Promise<void>) => {
    if (mutation.current) return
    mutation.current = true
    ++latestRequest.current
    setReadiness(null)
    setBusySlot(slot)
    setError('')
    try {
      await operation()
      await refresh()
    } catch (e: unknown) {
      if (active.current) {
        setError(e instanceof Error ? e.message : String(e))
        setReadiness(null)
      }
      // A failed upload/context update may still have changed the server. Re-read before enabling submit.
      try { await refresh() } catch { /* Keep readiness unavailable; explicit retry remains visible. */ }
    } finally {
      mutation.current = false
      if (active.current) setBusySlot('')
    }
  }

  const changeContext = async (patch: Partial<DocContext>) => {
    const proofRows = checklist?.items.filter((item) => item.slot_key.startsWith('work_proof') || item.slot_key === 'labor_contract') ?? []
    const changedWork = (['work_category', 'workplace_count'] as const).some((key) => patch[key] !== undefined && patch[key] !== context[key])
    const changedAdmin = patch.admin_fixed_term !== undefined && patch.admin_fixed_term !== context.admin_fixed_term
    const proofDocs = proofRows.filter((item) => changedWork || (changedAdmin && item.slot_key === 'labor_contract')).flatMap((item) => item.documents)
    if (proofDocs.length && !window.confirm('올리신 근로확인서류가 빠집니다. 바꾸시겠어요?')) return
    await runMutation('work-context', async () => {
      for (const doc of proofDocs) await deleteDocument(applicationId, doc.document_id)
      await putDocContext(applicationId, { ...context, ...patch })
    })
  }

  const upload = (item: DocRequirementRow, file: File) => runMutation(item.slot_key, async () => {
    await uploadDocument(applicationId, item.slot_key, file, ymdToISO(declared[item.slot_key] ?? EMPTY_YMD))
    if (active.current) setEditingSlot('')
  })

  const retry = (doc: UploadedDocument) => {
    setEditingSlot(doc.slot_key)
    const existingDate = doc.declared_issue_date?.split('-')
    if (existingDate?.length === 3) setDeclared((value) => ({ ...value, [doc.slot_key]: { y: existingDate[0], m: String(Number(existingDate[1])), d: String(Number(existingDate[2])) } }))
    requestAnimationFrame(() => {
      const uploadControl = document.getElementById(`upload-${doc.slot_key}`) as HTMLButtonElement | null
      const target = uploadControl && !uploadControl.disabled ? uploadControl : document.getElementById(`slot-${doc.slot_key}`)?.querySelector<HTMLElement>('input:not([type="file"])') ?? uploadControl
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target?.focus()
    })
  }

  const goToBlocker = (blocker: Blocker) => {
    if (blocker.goto !== 'upload') { onForms(); return }
    const target = document.getElementById(`slot-${blocker.target}`) ?? document.getElementById('work-context')
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target?.querySelector<HTMLElement>('input:not([type="file"]),button,select')?.focus()
  }

  const submit = async () => {
    if (mutation.current || !readiness?.can_submit) return
    mutation.current = true
    setSubmitting(true)
    setError('')
    try {
      await onBeforeSubmit()
      if (!active.current) return
      const latest = await refresh()
      if (!active.current || !latest.can_submit) return
      const result = await submitApplication(applicationId)
      if (active.current) onSubmitted(result)
    } catch (e: unknown) {
      if (active.current) setError(e instanceof Error ? e.message : String(e))
      setReadiness(null)
      try { await refresh() } catch { /* Block until retry succeeds. */ }
    } finally {
      mutation.current = false
      if (active.current) setSubmitting(false)
    }
  }

  if (error && !checklist) return <div><p className="flow-error" role="alert">{error}</p><button type="button" className="btn" onClick={() => { setError(''); void refresh().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e))) }}>다시 확인</button></div>
  if (!checklist) return showChecklistSkeleton ? (
    <Skeleton className="dupload__skeleton-list">
      {Array.from({ length: 5 }, (_, index) => (
        <SkeletonCard key={index} className="dupload__skeleton-slot">
          <SkeletonLine width="38%" />
          <SkeletonLine width="78%" />
          <SkeletonLine width="54%" />
        </SkeletonCard>
      ))}
    </Skeleton>
  ) : null

  const uploadItems = checklist.items.filter((i) => i.upload)
  const onlineItems = checklist.items.filter((i) => !i.upload)
  const hasAdminConsent = checklist.items.some((i) => i.slot_key === 'admin_info_consent')

  return (
    <div className="dupload" aria-busy={!!busySlot || submitting}>
      <div inert={!!busySlot || submitting}>
      {/* 근로유형에 따라 필요한 근로확인서류를 정한다. */}
      {checklist.program.asks_work_category && (
        <section className="dupload__context" id="work-context">
          <h3>근로유형</h3>
          <p className="dupload__hint">
            근로확인서류는 5종 중 1종만 내면 됩니다. 아래에서 고르면 본인에게 필요한 서류만 남습니다.
          </p>
          <fieldset className="dupload__worktypes" disabled={busySlot === 'work-context'}>
            <legend>근로유형 선택</legend>
            {checklist.work_categories.map((category, index) => {
              const id = `work-category-${applicationId}-${index}`
              return (
                <label key={category} htmlFor={id}>
                  <input
                    id={id}
                    type="radio"
                    name={`work-category-${applicationId}`}
                    value={category}
                    checked={context.work_category === category}
                    onChange={() => void changeContext({ work_category: category })}
                  />
                  <span>{category}</span>
                </label>
              )
            })}
          </fieldset>
          <div className="dupload__opts">
            {context.work_category === '직장가입자' && (
              <label>
                <input
                  type="checkbox"
                  checked={!!context.admin_fixed_term}
                  disabled={busySlot === 'work-context'}
                  onChange={(e) => void changeContext({ admin_fixed_term: e.target.checked })}
                />
                행정기관 기간제 근로자입니다 (근로계약서 사본 추가)
              </label>
            )}
            <label>
              근무 사업장 수
              <select
                value={`${context.workplace_count ?? 1}개`}
                disabled={busySlot === 'work-context'}
                onChange={(e) => void changeContext({ workplace_count: Number(e.target.value[0]) })}
              >
                {WORKPLACE_COUNTS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}

      <div className="dupload__progress">
        제출 서류 <strong>{checklist.upload_done}</strong> / {checklist.upload_total}
        {checklist.program.asks_work_category && !context.work_category && (
          <span className="dupload__progress-hint">근로유형을 고르면 서류가 1종 추가됩니다.</span>
        )}
        <div className="dupload__bar">
          <div
            className="dupload__bar-fill"
            style={{
              width: `${checklist.upload_total ? (checklist.upload_done / checklist.upload_total) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      <ul className="dslots">
        {uploadItems.map((item) => (
          <SlotCard
            key={item.slot_key}
            item={item}
            busy={busySlot === item.slot_key}
            replacement={editingSlot === item.slot_key}
            declared={declared[item.slot_key] ?? EMPTY_YMD}
            onDeclaredChange={(v) => setDeclared({ ...declared, [item.slot_key]: v })}
            onPick={(file) => void upload(item, file)}
            onRetry={retry}
          />
        ))}
      </ul>

      {(onlineItems.length > 0 || hasAdminConsent) && (
        <section className="dupload__online">
          <h3>업로드하지 않아도 되는 서류</h3>
          <ul>
            {onlineItems.filter((i) => i.slot_key !== 'admin_info_consent').map((i) => (
              <li key={i.slot_key}>
                <strong>{i.label}</strong> — {i.fulfilled_by}(으)로 대체되었습니다.
              </li>
            ))}
            {hasAdminConsent && (
              <li>
                <strong>행정정보 공동이용 사전동의서 (서식5)</strong>
                {' — '}{context.paper_forms?.['서식5'] ? '스캔본을 제출합니다.' : '온라인 작성 동의와 서명을 제출합니다.'}
              </li>
            )}
          </ul>
        </section>
      )}

      {checklist.unassigned.length > 0 && (
        <section className="dupload__unassigned">
          <h3>배정되지 않은 페이지</h3>
          <ul>
            {checklist.unassigned.map((d) => (
              <li key={d.document_id}>
                {d.file_name}
                {d.page_index !== null && ` (${d.page_index + 1}쪽)`} —{' '}
                {d.detected_doc_type ?? '서류 종류 미판별'}
                <button
                  type="button"
                  className="btn btn--small"
                  onClick={() => void runMutation(d.slot_key, async () => { await deleteDocument(applicationId, d.document_id) })}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      </div>
      {busySlot && <p role="status">{busySlot === 'work-context' ? '필요 서류를 갱신하고 있습니다…' : '서류를 올리고 확인하고 있습니다…'}</p>}
      {issueItems.length > 0 && <button type="button" id="reupload-guidance-trigger" className="btn" onClick={() => setReuploadOpen(true)}>다시 올릴 서류와 해결 방법 보기 ({issueItems.length}종)</button>}
      <section className="dupload__submission" aria-labelledby="submission-heading">
        <h3 id="submission-heading">신청 제출</h3>
        <p>제출 후에는 신청 내용을 수정할 수 없습니다. 작성한 내용과 올린 파일을 확인해 주세요.</p>
        {readiness?.blockers.length ? <div className="dupload__blockers">
          <h4>제출 전에 채워 주세요 ({readiness.blockers.length}건)</h4>
          <ul>{readiness.blockers.map((blocker) => <li key={`${blocker.kind}-${blocker.target}`}>
            <span><strong>{blocker.label}</strong> {blocker.message}</span>
            <button type="button" className="btn btn--small" disabled={!!busySlot || submitting} onClick={() => goToBlocker(blocker)}>수정하기</button>
          </li>)}</ul>
        </div> : null}
        {!readiness && !busySlot && !submitting && <p role="status">제출에 필요한 항목을 확인하고 있습니다. 확인이 끝나면 제출할 수 있습니다.</p>}
        {error && <p className="dupload__error" role="alert">{error}</p>}
        {error && <button type="button" className="btn" disabled={!!busySlot || submitting} onClick={() => void runMutation('readiness', async () => {})}>제출 준비 다시 확인</button>}
        <div className="flow__actions">
          <button type="button" className="btn" disabled={!!busySlot || submitting} onClick={onForms}>서식 수정</button>
          <button type="button" className="btn btn--primary" disabled={!readiness?.can_submit || !!busySlot || submitting || !!error} onClick={() => void submit()}>
            {submitting ? '제출 중…' : readiness?.already_submitted ? '이미 제출된 신청입니다' : '신청 제출'}
          </button>
        </div>
      </section>
      {reuploadOpen && issueItems.length > 0 && <Modal
        title="다시 올려야 할 서류를 확인해 주세요"
        description="아래 서류의 안내를 확인하고 파일을 다시 올려 주세요. 모든 재업로드 항목이 해결되면 제출할 수 있습니다."
        variant="reupload"
        returnFocus={() => document.getElementById('reupload-guidance-trigger')}
        onClose={() => setReuploadOpen(false)}
        footer={<button type="button" className="btn" onClick={() => setReuploadOpen(false)}>닫기</button>}>
        {issueItems.map(({ item, findings }) => <section key={item.slot_key} className="reupload-doc" aria-labelledby={`reupload-${item.slot_key}`}>
          <h4 id={`reupload-${item.slot_key}`}>{item.label}</h4>
          {item.issue_rule_label && <p>발급일 안내: {item.issue_rule_label}</p>}
          {item.notes.filter((note) => note.startsWith('조회기간에 ') || note.startsWith('최근 ')).map((note) => <p key={note}>{note}</p>)}
          <ol>{findings.map((finding) => {
            const copy = REUPLOAD_GUIDANCE[finding.code]
            return <li key={finding.code}><h5>{copy.title}</h5><p>{copy.reason}</p><p>{copy.fix}</p></li>
          })}</ol>
          <div className="reupload-doc__actions">
            {issuerLink(item) && <a href={issuerLink(item)} target="_blank" rel="noreferrer">{item.issuer || '발급처'} 바로가기 (새 창)</a>}
            <button type="button" className="btn btn--primary" onClick={() => { setReuploadOpen(false); retry(item.documents[0]) }}>{item.label} 다시 올리기</button>
          </div>
        </section>)}
      </Modal>}
    </div>
  )
}
