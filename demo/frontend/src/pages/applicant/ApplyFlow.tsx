/** 두배적금: 본인인증 → 서식 작성 → 서류 업로드 → 확인 및 제출 → 마이페이지. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  ApiError,
  createApplication,
  fetchApplication,
  fetchApplicationConsents,
  fetchPrograms,
  fetchStatus,
  patchApplication,
  postConsents,
  postSelfCheck,
  type ApplicationRow,
  type ConsentPayload,
  type Identity,
  type Program,
  type SelfCheckResult,
  type SubmitResult,
} from '../../api.ts'
import DocumentUpload from './DocumentUpload.tsx'
import FinalCheck from './FinalCheck.tsx'
import IdentityCheck from './IdentityCheck.tsx'
import MyPage from './MyPage.tsx'
import PdfFormsWorkspace, { ApplicantFormsBulkMenu } from '../../forms/PdfFormsWorkspace.tsx'
import { EMPTY_CONSENT, type ConsentValue } from '../../forms/consent-model.ts'
import { CONSENT_OPTIONS } from '../../forms/consent-model.ts'
import { EMPTY_FORM1, type Form1Value } from '../../forms/form1-model.ts'
import { EMPTY_FORM5, SIGN_MODES, type Form5Value, type SignMode } from '../../forms/form5-model.ts'
import type { SelfCheckAnswers } from '../../forms/form2-model.ts'
import { ACTIVE_APPLICATION_KEY, currentApplicationGeneration, currentParams, routeUrl } from '../../navigation-url.ts'
import './apply-flow.css'

type Stage =
  | 'identity'
  | 'forms'
  | 'upload'
  | 'final'
  | 'complete'
  | 'mypage'

function savedPage(): { appId: number; stage: Stage; previous: Stage } | null {
  const params = currentParams()
  const route = /^\/apply\/([a-z]+)\/?$/.exec(window.location.pathname)
  const stage = route?.[1] as Stage
  const previous = params.get('from') as Stage
  const stages: Stage[] = ['identity', 'forms', 'upload', 'final', 'complete', 'mypage']
  try {
    const savedId = window.sessionStorage.getItem(ACTIVE_APPLICATION_KEY)
    if (!savedId || !/^[1-9]\d*$/.test(savedId)) return null
    const appId = Number(savedId)
    if (!Number.isSafeInteger(appId)) return null
    return { appId, stage: stages.includes(stage) ? stage : 'identity', previous: stages.includes(previous) ? previous : 'identity' }
  } catch {
    return null
  }
}

type Step = { key: 'identity' | 'forms' | 'upload' | 'final'; label: string }
type StepperProgress = { completed: number; total: number }
const APPLY_STEPS: Step[] = [
  { key: 'identity', label: '본인인증' },
  { key: 'forms', label: '서식 작성' },
  { key: 'upload', label: '서류 업로드' },
  { key: 'final', label: '확인 및 제출' },
]

type ConsentType = ConsentPayload['consent_type']

/** 신청서의 성명·생년월일을 본인인증 값으로 덮는다 (서버도 같은 규칙으로 잠근다). */
function lockIdentity(form: Form1Value, identity: Identity | null): Form1Value {
  if (!identity) return form
  const [y, m, d] = identity.birth.split('-')
  return { ...form, name: identity.name, birth: { y, m: String(Number(m)), d: String(Number(d)) } }
}

/** 두배적금의 필수 동의 종류. */
function consentTypesOf(): ConsentType[] {
  return ['privacy', 'unique_id', 'third_party', 'admin_info']
}

// StrictMode effect replay and a history remount share the same pending POST.
let pendingDraft: { generation: number; request: ReturnType<typeof createApplication> } | null = null
function createSavingsDraft() {
  const generation = currentApplicationGeneration()
  if (!pendingDraft || pendingDraft.generation !== generation) {
    let previousId: string | null = null
    try { previousId = window.sessionStorage.getItem(ACTIVE_APPLICATION_KEY) } catch { /* Continue in memory. */ }
    const request = createApplication('double_savings').then((application) => {
      try {
        // An old POST must not replace an explicit new start or a newer tab selection.
        if (currentApplicationGeneration() === generation && window.sessionStorage.getItem(ACTIVE_APPLICATION_KEY) === previousId) {
          window.sessionStorage.setItem(ACTIVE_APPLICATION_KEY, String(application.id))
        }
      } catch { /* Continue in memory. */ }
      return application
    }).finally(() => {
      if (pendingDraft?.request === request) pendingDraft = null
    })
    pendingDraft = { generation, request }
  }
  return pendingDraft.request
}

export default function ApplyFlow({ headerHost }: { headerHost: HTMLElement | null }) {
  const [initialPage] = useState(savedPage)
  const initialUrlWrite = useRef(true)
  const [restoring, setRestoring] = useState(true)
  const initialization = useRef<Promise<void> | null>(null)
  const createdDraft = useRef<ApplicationRow | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [program, setProgram] = useState<Program | null>(null)
  const [appId, setAppId] = useState<number | null>(null)
  const [appNo, setAppNo] = useState('')
  const [stage, setStage] = useState<Stage>('identity')
  const [stageBeforeMypage, setStageBeforeMypage] = useState<Stage>('identity')
  const [error, setError] = useState('')
  const [identity, setIdentity] = useState<Identity | null>(null)

  const [answers, setAnswers] = useState<SelfCheckAnswers>({})
  const [checkResult, setCheckResult] = useState<SelfCheckResult | null>(null)

  const [form1, setForm1] = useState<Form1Value>(EMPTY_FORM1)

  const [consent, setConsent] = useState<ConsentValue>(EMPTY_CONSENT)
  const [form5, setForm5] = useState<Form5Value>(EMPTY_FORM5)
  const [signMode, setSignMode] = useState<SignMode>('화면에 서명')
  const [paperForms, setPaperForms] = useState<Record<string, boolean>>({})

  const [submitted, setSubmitted] = useState<SubmitResult | null>(null)
  const [formContinuing, setFormContinuing] = useState(false)
  const [formError, setFormError] = useState('')
  const [formProgress, setFormProgress] = useState<StepperProgress>({ completed: 0, total: 0 })
  const [uploadProgress, setUploadProgress] = useState<StepperProgress>({ completed: 0, total: 0 })
  const saveQueue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let active = true
    const initialize = async () => {
      const programs = await fetchPrograms()
      const picked = programs.find((item) => item.code === 'double_savings')
      if (!picked) throw new Error('두배적금 신청 설정을 불러올 수 없습니다.')
      let application = createdDraft.current
      const pageToRestore = savedPage() ?? initialPage
      if (!application && pageToRestore) {
        try {
          const saved = await fetchApplication(pageToRestore.appId)
          if (saved.program_code === picked.code) application = saved
        } catch (error) {
          // Only missing/inaccessible drafts are discarded; transient errors are retryable.
          if (!(error instanceof ApiError) || ![403, 404].includes(error.status)) throw error
        }
      }
      const restored = application !== null && application.id === initialPage?.appId
      if (!application) {
        application = await createSavingsDraft()
        createdDraft.current = application
      }
      const [consents, status] = await Promise.all([
        fetchApplicationConsents(application.id), fetchStatus(application.id),
      ])
      if (!active) return
      setProgram(picked)
      setAppId(application.id)
      setAppNo(application.application_no)
      const savedIdentity = application.identity_json
      setIdentity(savedIdentity?.name && savedIdentity.birth ? savedIdentity as Identity : null)
      setForm1({ ...EMPTY_FORM1, ...application.form1_json } as Form1Value)
      setAnswers(application.self_check_json as SelfCheckAnswers)
      setForm5({ ...EMPTY_FORM5, ...application.form5_json } as Form5Value)
      setSignMode(application.form5_json.signatureScanUploaded ? SIGN_MODES[1] : SIGN_MODES[0])
      const consentValue = (type: string) => {
        const item = consents.find((row) => row.consent_type === type)
        return item ? CONSENT_OPTIONS[item.agreed ? 0 : 1] : ''
      }
      setConsent({ privacy: consentValue('privacy'), uniqueId: consentValue('unique_id'), thirdParty: consentValue('third_party') })
      if (status.status !== 'draft') {
        setSubmitted({
          application_no: status.application_no, submitted_at: status.submitted_at,
          status: status.status, message: '신청이 완료되었습니다.', next_steps: [],
          supplement: status.supplement,
          notice: status.result_notice,
        })
      }
      const restoredStage = restored && initialPage ? initialPage.stage : 'identity'
      setStage(restoredStage === 'complete' && status.status === 'draft' ? 'final' : restoredStage)
      setStageBeforeMypage(restored && initialPage ? initialPage.previous : 'identity')
    }
    // Defer the work so StrictMode's first cleanup happens before initialization.
    initialization.current ??= Promise.resolve().then(initialize)
    initialization.current.then(() => {
      if (active) setRestoring(false)
    }).catch((e: unknown) => {
      if (!active) return
      setError(e instanceof Error ? e.message : String(e))
      setRestoring(false)
    })
    return () => { active = false; initialization.current = null }
  }, [initialPage, attempt])

  useEffect(() => {
    if (restoring || appId === null) return
    try { window.sessionStorage.setItem(ACTIVE_APPLICATION_KEY, String(appId)) } catch { /* Continue in memory. */ }
    routeUrl(`/apply/${stage}`, stage === 'mypage' ? { from: stageBeforeMypage } : {}, initialUrlWrite.current)
    initialUrlWrite.current = false
  }, [appId, stage, stageBeforeMypage, restoring])

  const reportFormProgress = useCallback((completed: number, total: number) => {
    setFormProgress({ completed, total })
  }, [])
  const reportUploadProgress = useCallback((completed: number, total: number) => {
    setUploadProgress({ completed, total })
  }, [])

  const save = (body: { form1?: unknown; self_check?: unknown; form5?: unknown }): Promise<void> => {
    if (appId === null) return Promise.resolve()
    const next = saveQueue.current.catch(() => undefined).then(() => patchApplication(appId, body)).then(() => undefined)
    saveQueue.current = next.catch(() => undefined)
    return saveQueue.current
  }

  const continueFromForms = async () => {
    if (appId === null || program === null) return
    setFormContinuing(true)
    setFormError('')
    try {
      const payload = Object.fromEntries(Object.entries(answers).filter(([, v]) => v)) as Record<string, string>
      const result = await postSelfCheck(appId, payload)
      setCheckResult(result)
      if (!result.eligible) return
      if (!consentReady) {
        setFormError('필수 동의와 서명을 모두 마쳐 주세요.')
        return
      }
    const types = consentTypesOf()
    const values: Record<ConsentType, ConsentPayload> = {
      privacy: { consent_type: 'privacy', agreed: consent.privacy === '동의함' },
      unique_id: { consent_type: 'unique_id', agreed: consent.uniqueId === '동의함' },
      third_party: {
        consent_type: 'third_party',
        agreed: consent.thirdParty === '동의함',
      },
      admin_info: {
        consent_type: 'admin_info',
        agreed: form5.agree === '동의함',
        signature_data_url: signMode === '화면에 서명' ? form5.signature : undefined,
        signature_kind: signMode === '화면에 서명' ? 'electronic' : 'handwritten',
      },
    }
      await postConsents(
      appId,
      types.filter((t) => !(t === 'admin_info' && paperForms['서식5'])).map((t) => values[t]),
    )
    if (types.includes('admin_info')) save({ form5 })
    setStage('upload')
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : String(e))
    } finally {
      setFormContinuing(false)
    }
  }

  /** 최종 확인의 수정 링크는 이미 도달한 단계로만 돌아가게 한다. */
  const jumpTo = (next: Stage) => {
    if (next === stage) return
    if (next === 'identity' && identity !== null) return
    setStage(next)
    window.scrollTo({ top: 0 })
  }

  if (error) return <div className="flow"><p className="flow-error" role="alert">{error}</p><button type="button" className="btn" onClick={() => { setError(''); setRestoring(true); setAttempt((value) => value + 1) }}>다시 시도</button></div>
  if (restoring || program === null) return <p className="flow" role="status">두배적금 본인인증을 준비하고 있습니다...</p>

  const consentTypes = consentTypesOf()
  const needsAdminConsent = consentTypes.includes('admin_info')
  const needsUniqueId = consentTypes.includes('unique_id')

  const consentReady =
    consent.privacy === '동의함' &&
    (!needsUniqueId || consent.uniqueId === '동의함') &&
    consent.thirdParty === '동의함' &&
    (!needsAdminConsent || paperForms['서식5'] ||
      (form5.agree === '동의함' &&
        (signMode === '화면에 서명' ? !!form5.signature : form5.signatureScanUploaded)))

  const submittedDone = submitted !== null
  const uploadComplete = uploadProgress.total > 0 && uploadProgress.completed >= uploadProgress.total
  const viewedStage = stage === 'mypage' && !submittedDone ? stageBeforeMypage : stage
  const currentIndex = viewedStage === 'identity' ? 0
    : viewedStage === 'forms' ? 1
      : viewedStage === 'upload' ? 2 : 3

  const openMyPage = () => {
    if (stage !== 'mypage') setStageBeforeMypage(stage)
    setStage('mypage')
    window.scrollTo({ top: 0 })
  }

  const stepStatus = (index: number): string => {
    if (submittedDone) return index === 3 ? '접수 완료' : '완료'
    const progress = index === 1 ? formProgress : index === 2 ? uploadProgress : null
    const count = progress && progress.total > 0 ? `${progress.completed} / ${progress.total}` : ''
    if (index < currentIndex) return index === 2 && count ? `완료 · ${count}` : '완료'
    if (index > currentIndex) {
      const state = index === 2 && uploadComplete ? '완료' : '예정'
      return count ? `${state} · ${count}` : state
    }
    return count ? `현재 · ${count}` : '현재 단계'
  }

  const stepperNavigate = (index: number) => {
    const previouslyReachedUpload = index === 2 && uploadProgress.total > 0
    if (submittedDone || stage === 'mypage' || index === 0) return
    if (index >= currentIndex && !previouslyReachedUpload) return
    setStage(index === 1 ? 'forms' : 'upload')
    window.scrollTo({ top: 0 })
  }

  /** 신청서 저장. 본인인증을 마쳤으면 성명·생년월일은 인증 값으로 고정된다. */
  const onForm1 = (next: Form1Value) => {
    const locked = lockIdentity(next, identity)
    setForm1(locked)
    save({ form1: locked })
  }

  return (
    <div className={`flow flow--active${stage === 'upload' ? ' flow--fluid' : stage === 'forms' ? ' flow--forms' : ''}`}>
      {headerHost && appId !== null && createPortal(
        <div className="shell__application-controls">
          <span className="shell__application-number">신청번호 <strong>{appNo || '발급 중…'}</strong></span>
          <button type="button" className="shell__mypage" onClick={openMyPage} disabled={stage === 'mypage'}>마이페이지</button>
        </div>, headerHost,
      )}
      <div className="flow__overview">
        <header className="flow__head flow__head--compact">
          <h1>{program.name} 신청</h1>
        </header>
        <ol className="flow__stages" aria-label="신청 단계">
          {APPLY_STEPS.map(({ key, label }, i) => {
            const complete = submittedDone || i < currentIndex || (i === 2 && uploadComplete)
            const current = i === currentIndex
            const canNavigate = !submittedDone && stage !== 'mypage' && i !== 0 &&
              (i < currentIndex || (i === 2 && uploadProgress.total > 0))
            const status = stepStatus(i)
            return (
            <li
              key={key}
              className={current ? 'is-current' : complete ? 'is-complete' : 'is-waiting'}
            >
              <button
                type="button"
                aria-current={current ? 'step' : undefined}
                aria-disabled={!canNavigate}
                title={i === 0 && identity ? '본인인증은 완료되었습니다' : undefined}
                onClick={() => stepperNavigate(i)}
              >
                <span className="flow__stage-no" aria-hidden="true">
                  {complete && !current && <span className="flow__stage-check" aria-hidden="true">✓</span>}
                </span>
                <span className="flow__stage-copy">
                  <span className="flow__stage-caption">
                    <span>{i + 1}단계</span>
                    <span className="flow__stage-status">{status}</span>
                  </span>
                  <span className="flow__stage-label">{label}</span>
                </span>
              </button>
            </li>
            )
          })}
        </ol>
      </div>

      {/* ── 본인인증 (데모) ── */}
      {stage === 'identity' && appId !== null && (
        <IdentityCheck
          appId={appId}
          identity={identity}
          onVerified={(verified, mobile) => {
            setIdentity(verified)
            const locked = lockIdentity({ ...form1, mobile }, verified)
            setForm1(locked)
            save({ form1: locked })
            setStage('forms')
            window.scrollTo({ top: 0 })
          }}
          onNext={() => setStage('forms')}
        />
      )}

      {/* ── [1] 자가진단 ── */}
      {stage === 'forms' && appId !== null && (
        <PdfFormsWorkspace
          key={`${appId}:${program.code}:${!!submitted}`}
          applicationId={appId}
          program={program}
          identity={identity}
          form1={form1}
          answers={answers}
          consent={consent}
          form5={form5}
          signMode={signMode}
          checkResult={checkResult}
          onForm1={onForm1}
          onAnswers={(next) => { setAnswers(next); setCheckResult(null); save({ self_check: next }) }}
          onConsent={setConsent}
          onForm5={(next) => { setForm5(next); save({ form5: next }) }}
          onSignMode={setSignMode}
          onFlush={async () => {
            if (appId === null) return
            await saveQueue.current
            await patchApplication(appId, { form1, self_check: answers, form5 })
            const values: Record<ConsentType, ConsentPayload> = {
              privacy: { consent_type: 'privacy', agreed: consent.privacy === '동의함' },
              unique_id: { consent_type: 'unique_id', agreed: consent.uniqueId === '동의함' },
              third_party: { consent_type: 'third_party', agreed: consent.thirdParty === '동의함' },
              admin_info: {
                consent_type: 'admin_info',
                agreed: form5.agree === '동의함',
                signature_data_url: signMode === '화면에 서명' ? form5.signature : undefined,
                signature_kind: signMode === '화면에 서명' ? 'electronic' : 'handwritten',
              },
            }
            const selectedConsent: Record<ConsentType, string> = {
              privacy: consent.privacy,
              unique_id: consent.uniqueId,
              third_party: consent.thirdParty,
              admin_info: form5.agree,
            }
            await postConsents(appId, consentTypesOf()
              .filter((type) => !(type === 'admin_info' && paperForms['서식5']))
              .filter((type) => selectedConsent[type] === '동의함' || selectedConsent[type] === '동의하지 않음')
              .map((type) => values[type]))
          }}
          onPaperFormsChange={setPaperForms}
          onContinue={() => void continueFromForms()}
          continuing={formContinuing}
          error={formError}
          readOnly={!!submitted}
          onProgress={reportFormProgress}
        />
      )}

      {/* ── [5] 서류 업로드 ── */}
      {stage === 'upload' && appId !== null && (
        <>
          {identity === null && (
            <div className="flow-block flow-block--warn">
              <strong>본인인증 전입니다.</strong>
              <p>
                지금 올리는 서류는 본인 명의인지 대조하지 않습니다.{' '}
                <button type="button" className="btn btn--small" onClick={() => jumpTo('identity')}>
                  본인인증 하러 가기
                </button>
              </p>
            </div>
          )}
          <DocumentUpload applicationId={appId} onProgress={reportUploadProgress} />
          <div className="flow__actions">
            <button
              type="button"
              className="btn"
              onClick={() => setStage('forms')}
            >
              이전
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setStage('final')}>
              제출 전 최종 확인
            </button>
          </div>
        </>
      )}

      {/* ── [6] 제출 전 최종 확인 ── */}
      {stage === 'final' && appId !== null && (
        <>
          <FinalCheck
            applicationId={appId}
            onSubmitted={(result) => {
              setSubmitted(result)
              setStage('complete')
              window.scrollTo({ top: 0 })
            }}
            onBack={() => jumpTo('upload')}
            onGoto={jumpTo}
          />
        </>
      )}

      {/* ── 제출 완료 ── */}
      {stage === 'complete' && submitted && appId !== null && (
        <>
          <div className="flow-block flow-block--ok">
            <strong>{submitted.message}</strong>
            <p>신청번호 {submitted.application_no}</p>
            <ol className="flow-steps-list">
              {submitted.next_steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
            <p className="flow-alt">{submitted.notice}</p>
            <ApplicantFormsBulkMenu applicationId={appId} refreshKey={1} />
            <button type="button" className="btn btn--primary" onClick={openMyPage}>마이페이지</button>
          </div>
        </>
      )}

      {stage === 'mypage' && appId !== null && (
        <>
          <div className="flow__mypage-return">
            <button type="button" className="btn" onClick={() => setStage(stageBeforeMypage)}>신청 화면으로 돌아가기</button>
          </div>
          <MyPage applicationId={appId} />
        </>
      )}
    </div>
  )
}
