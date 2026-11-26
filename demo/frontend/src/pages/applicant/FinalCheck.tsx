/**
 * 4단계 확인 및 제출.
 *
 * 작성한 서식과 올린 서류를 목록으로 보여 주고, 하나를 누르면 그 자리에서 크게 미리 본다(FilePreview).
 * 모두 확인했으면 여기서 신청을 제출한다. 아직 채울 항목이 남아 있으면 제출 대신 남은 항목과 바로 가기를 보여 준다.
 */

import { useCallback, useEffect, useState } from 'react'

import {
  fetchApplicantForms,
  fetchChecklist,
  fetchFinalCheck,
  type ApplicantFormSummary,
  type Blocker,
  type Checklist,
  type FinalCheck as FinalCheckData,
  type SubmitResult,
} from '../../api.ts'
import ConfirmDialog from '../../components/ConfirmDialog.tsx'
import FilePreview, { type PreviewKind } from '../../components/FilePreview.tsx'
import Icon from '../../components/Icon.tsx'
import Notice from '../../components/Notice.tsx'
import { Skeleton, SkeletonCard, SkeletonLine } from '../../components/Skeleton.tsx'
import Spinner from '../../components/Spinner.tsx'
import StatusBadge from '../../components/StatusBadge.tsx'
import useApplicantSubmission from '../../hooks/useApplicantSubmission.ts'
import useBeforeUnload from '../../hooks/useBeforeUnload.ts'
import useDelayedFlag from '../../hooks/useDelayedFlag.ts'
import { friendlyError } from '../../lib/error-copy.ts'
import { mutationError } from '../../lib/applicant-mutation.ts'
import './final-check.css'

const LOAD_FAILED_COPY = '신청 내용을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
const SUBMIT_FAILED_COPY = '신청을 제출하지 못했습니다. 잠시 후 다시 시도해 주세요.'

interface Loaded {
  check: FinalCheckData
  forms: ApplicantFormSummary[]
  checklist: Checklist
}

interface Viewing {
  url: string
  name: string
  kind: PreviewKind
}

function previewKind(name: string): PreviewKind {
  return /\.pdf$/i.test(name) ? 'pdf' : 'image'
}

export default function FinalCheck({ applicationId, onBack, onForms, onBeforeSubmit, onSubmitted, onBusyChange }: {
  applicationId: number
  /** 3단계 서류 업로드로 돌아간다. */
  onBack: () => void
  /** 2단계 서식 작성으로 돌아간다. */
  onForms: () => void
  /** 제출 직전에 아직 보내지 않은 서식 저장을 마친다. */
  onBeforeSubmit: () => Promise<void>
  onSubmitted: (result: SubmitResult) => void
  onBusyChange?: (busy: boolean) => void
}) {
  const [data, setData] = useState<Loaded | null>(null)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [viewing, setViewing] = useState<Viewing | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const submission = useApplicantSubmission(applicationId, onSubmitted)
  const busy = submitting || submission.busy
  const showSkeleton = useDelayedFlag(!data && !loadError)
  useBeforeUnload(busy)

  useEffect(() => {
    onBusyChange?.(busy)
    return () => onBusyChange?.(false)
  }, [busy, onBusyChange])

  const load = useCallback(async () => {
    const [check, forms, checklist] = await Promise.all([
      fetchFinalCheck(applicationId), fetchApplicantForms(applicationId), fetchChecklist(applicationId),
    ])
    return { check, forms, checklist }
  }, [applicationId])

  useEffect(() => {
    let alive = true
    load()
      .then((next) => { if (alive) { setData(next); setLoadError('') } })
      .catch((problem: unknown) => { if (alive) setLoadError(friendlyError(problem, LOAD_FAILED_COPY)) })
    return () => { alive = false }
  }, [load, reload])

  const submit = async () => {
    if (busy) return
    setConfirming(false)
    setSubmitting(true)
    setSubmitError('')
    try {
      await onBeforeSubmit()
      await submission.submit()
    } catch (problem: unknown) {
      setSubmitError(mutationError(problem, SUBMIT_FAILED_COPY))
    } finally {
      setSubmitting(false)
    }
    // 실패했으면 남은 항목이 바뀌었을 수 있다. 성공했으면 화면이 접수증으로 바뀌므로 결과를 쓰지 않는다.
    load().then(setData).catch(() => undefined)
  }

  if (loadError && !data) {
    return (
      <div className="fcheck">
        <h2 className="fcheck__title" tabIndex={-1}>확인 및 제출</h2>
        <Notice tone="danger" role="alert" title="신청 내용을 불러오지 못했습니다">
          <p>{loadError}</p>
          <div className="fcheck__notice-actions">
            <button type="button" className="btn btn--small" onClick={() => { setLoadError(''); setReload((value) => value + 1) }}>
              <Icon name="refresh" size={18} />다시 시도
            </button>
          </div>
        </Notice>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="fcheck">
        <h2 className="fcheck__title" tabIndex={-1}>확인 및 제출</h2>
        {showSkeleton && (
          <Skeleton className="fcheck__skeleton" label="신청 내용을 불러오는 중">
            {[0, 1].map((index) => (
              <SkeletonCard key={index}>
                <SkeletonLine width="32%" />
                <SkeletonLine width="78%" />
                <SkeletonLine width="64%" />
              </SkeletonCard>
            ))}
          </Skeleton>
        )}
      </div>
    )
  }

  const { check, forms, checklist } = data
  const paperForms = { ...checklist.program.paper_forms, ...checklist.context.paper_forms }
  // 스캔본으로 내기로 한 서식은 온라인 작성본이 없다. 스캔본은 아래 제출 서류에 들어 있다.
  const writtenForms = forms.filter((form) => !paperForms[form.form_no])
  const uploaded = checklist.items
    .filter((item) => item.documents.length > 0)
    .flatMap((item) => item.documents.map((doc) => ({ item, doc })))
  const blockers = check.blockers
  const canSubmit = check.can_submit && !check.already_submitted
  const goTo = (blocker: Blocker) => (blocker.goto === 'upload' ? onBack() : onForms())

  return (
    <div className="fcheck">
      <h2 className="fcheck__title" tabIndex={-1}>확인 및 제출</h2>
      <p className="fcheck__lead">제출하기 전에 작성한 서식과 올린 서류를 확인해 주세요. 항목을 누르면 미리 볼 수 있습니다.</p>

      <section className="card fcheck__group" aria-labelledby="fcheck-forms-title">
        <div className="fcheck__group-head">
          <h3 id="fcheck-forms-title">작성한 서식</h3>
          <span className="fcheck__count">{writtenForms.length}건</span>
        </div>
        {writtenForms.length > 0 ? (
          <ul className="fcheck__list">
            {writtenForms.map((form) => (
              <li key={form.form_no}>
                <button
                  type="button"
                  className="fcheck__item"
                  onClick={() => setViewing({ url: form.file_url, name: form.label, kind: 'pdf' })}
                >
                  <span className="fcheck__icon" aria-hidden="true"><Icon name="file" size={20} /></span>
                  <span className="fcheck__copy">
                    <span className="fcheck__name">{form.label}</span>
                    <span className="fcheck__meta">PDF · 온라인 작성</span>
                  </span>
                  <span className="fcheck__open"><Icon name="eye" size={18} />미리보기</span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="fcheck__empty">작성한 서식이 없습니다.</p>}
      </section>

      <section className="card fcheck__group" aria-labelledby="fcheck-docs-title">
        <div className="fcheck__group-head">
          <h3 id="fcheck-docs-title">제출 서류</h3>
          <span className="fcheck__count">{uploaded.length}건</span>
        </div>
        {uploaded.length > 0 ? (
          <ul className="fcheck__list">
            {uploaded.map(({ item, doc }) => (
              <li key={doc.document_id}>
                <button
                  type="button"
                  className="fcheck__item"
                  onClick={() => setViewing({ url: doc.file_url, name: `${item.label} · ${doc.file_name}`, kind: previewKind(doc.file_format || doc.file_name) })}
                >
                  <span className="fcheck__icon" aria-hidden="true"><Icon name="file" size={20} /></span>
                  <span className="fcheck__copy">
                    <span className="fcheck__name">
                      {item.label}
                      {doc.status && <StatusBadge status={doc.status} />}
                    </span>
                    <span className="fcheck__meta">{doc.file_name}</span>
                  </span>
                  <span className="fcheck__open"><Icon name="eye" size={18} />미리보기</span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="fcheck__empty">올린 서류가 없습니다.</p>}
      </section>

      {!canSubmit && !check.already_submitted && blockers.length > 0 && (
        <Notice tone="warning" title={`제출 전에 채워 주세요 (${blockers.length}건)`} className="fcheck__blockers">
          <ul>
            {blockers.map((blocker) => (
              <li key={`${blocker.kind}-${blocker.target}`}>
                <span><strong>{blocker.label}</strong> {blocker.message}</span>
                <button type="button" className="btn btn--quiet btn--small" disabled={busy} onClick={() => goTo(blocker)} aria-label={`${blocker.label} 바로 가기`}>
                  바로 가기<Icon name="chevronRight" size={18} />
                </button>
              </li>
            ))}
          </ul>
        </Notice>
      )}

      {(submitError || submission.error) && (
        <Notice tone="danger" role="alert" title="신청을 제출하지 못했습니다">
          <p>{submission.error || submitError}</p>
          {submission.unknown && (
            <div className="fcheck__notice-actions">
              <button type="button" className="btn btn--small" disabled={busy} onClick={() => void submission.check()}>
                <Icon name="refresh" size={18} />접수 상태 다시 확인
              </button>
            </div>
          )}
        </Notice>
      )}

      <section className="card fcheck__submit" aria-labelledby="fcheck-submit-title">
        <h3 id="fcheck-submit-title">신청 제출</h3>
        <p className="fcheck__lead">제출한 뒤에는 서식과 서류를 수정할 수 없습니다.</p>
        <div className="flow__actions">
          <button type="button" className="btn" disabled={busy} onClick={onBack}>
            <Icon name="chevronLeft" size={18} />이전
          </button>
          <button
            type="button"
            id="submit-application"
            className={busy ? 'btn btn--primary btn--lg btn--busy' : 'btn btn--primary btn--lg'}
            disabled={!canSubmit || busy || submission.unknown}
            onClick={() => setConfirming(true)}
          >
            {busy && <Spinner small />}
            {busy ? '제출하는 중' : check.already_submitted ? '이미 제출된 신청입니다' : '신청 제출'}
          </button>
        </div>
      </section>

      {viewing && <FilePreview url={viewing.url} name={viewing.name} kind={viewing.kind} onClose={() => setViewing(null)} />}

      {confirming && (
        <ConfirmDialog
          size="md"
          title="신청을 제출하시겠습니까?"
          description="제출한 뒤에는 서식과 서류를 수정할 수 없습니다."
          confirmLabel="제출하기"
          cancelLabel="돌아가기"
          returnFocus={() => document.getElementById('submit-application')}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void submit()}
        >
          <dl className="fcheck__confirm">
            <div><dt>서식</dt><dd>{writtenForms.length}건 작성</dd></div>
            <div><dt>서류</dt><dd>{uploaded.length}건 업로드</dd></div>
          </dl>
        </ConfirmDialog>
      )}
    </div>
  )
}
