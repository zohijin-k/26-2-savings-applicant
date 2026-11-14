/** 두배적금: 본인인증 → 서식 작성 → 서류 업로드 및 제출 → 마이페이지. */
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
  type SubmitResult,
} from '../../api.ts'
import Icon from '../../components/Icon.tsx'
import Notice from '../../components/Notice.tsx'
import PhoneLink from '../../components/PhoneLink.tsx'
import Spinner from '../../components/Spinner.tsx'
import useBeforeUnload from '../../hooks/useBeforeUnload.ts'
import useDelayedFlag from '../../hooks/useDelayedFlag.ts'
import useDocumentTitle from '../../hooks/useDocumentTitle.ts'
import { friendlyError } from '../../lib/error-copy.ts'
import { formatDateTime } from '../../lib/format.ts'
import DocumentUpload from './DocumentUpload.tsx'
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
  | 'complete'
  | 'mypage'

function savedPage(): { appId: number; stage: Stage; previous: Stage } | null {
  const params = currentParams()
  const route = /^\/apply\/([a-z]+)\/?$/.exec(window.location.pathname)
  const stage = (route?.[1] === 'final' ? 'upload' : route?.[1]) as Stage
  const previous = (params.get('from') === 'final' ? 'upload' : params.get('from')) as Stage
  const stages: Stage[] = ['identity', 'forms', 'upload', 'complete', 'mypage']
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

type Step = { key: 'identity' | 'forms' | 'upload'; label: string }
type StepperProgress = { completed: number; total: number }
const APPLY_STEPS: Step[] = [
  { key: 'identity', label: '본인인증' },
  { key: 'forms', label: '서식 작성' },
  { key: 'upload', label: '서류 업로드 및 제출' },
]

/** 단계마다 다른 문서 제목. `{단계명} | 전북청년 함께 두배적금 신청` */
const STAGE_TITLES: Record<Stage, string> = {
  identity: '본인인증',
  forms: '서식 작성',
  upload: '서류 업로드 및 제출',
  complete: '접수 완료',
  mypage: '마이페이지',
}
const SERVICE_TITLE = '전북청년 함께 두배적금 신청'

const LOAD_ERROR_COPY = '신청 화면을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
const SAVE_ERROR_COPY = '작성한 내용을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'

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

export default function ApplyFlow({ headerHost, footerHost, onProgressChange }: {
  headerHost: HTMLElement | null
  /** 바닥글의 문의처 자리. App이 DOM 자리만 갖고, 내용은 ApplyFlow가 포털로 그린다. */
  footerHost?: HTMLElement | null
  /** 본인인증을 마쳤고 아직 제출하지 않은 신청이 있는지를 App에 알린다. */
  onProgressChange?: (hasProgress: boolean) => void
}) {
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

  const [form1, setForm1] = useState<Form1Value>(EMPTY_FORM1)

  const [consent, setConsent] = useState<ConsentValue>(EMPTY_CONSENT)
  const [form5, setForm5] = useState<Form5Value>(EMPTY_FORM5)
  const [signMode, setSignMode] = useState<SignMode>('화면에 서명')
  const [paperForms, setPaperForms] = useState<Record<string, boolean>>({})

  const [submitted, setSubmitted] = useState<SubmitResult | null>(null)
  const [formContinuing, setFormContinuing] = useState(false)
  const [formError, setFormError] = useState('')
  const [formProgress, setFormProgress] = useState<StepperProgress>({ completed: 0, total: 0 })
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<StepperProgress>({ completed: 0, total: 0 })
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  // 아직 끝나지 않은 저장 요청 수. 남아 있는 동안 탭을 떠나려 하면 이탈 확인을 띄운다.
  const pendingSaves = useRef(0)
  const [saving, setSaving] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  const focusedStage = useRef<Stage | null>(null)
  const showLoading = useDelayedFlag(restoring && !error)

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
      setStage(restoredStage === 'complete' && status.status === 'draft' ? 'upload' : restoredStage)
      const restoredPrevious = restored && initialPage ? initialPage.previous : 'identity'
      setStageBeforeMypage(restoredPrevious === 'complete' && status.status === 'draft' ? 'upload' : restoredPrevious)
    }
    // Defer the work so StrictMode's first cleanup happens before initialization.
    initialization.current ??= Promise.resolve().then(initialize)
    initialization.current.then(() => {
      if (active) setRestoring(false)
    }).catch((e: unknown) => {
      if (!active) return
      setError(friendlyError(e, LOAD_ERROR_COPY))
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
  const reportUploadBusy = useCallback((busy: boolean) => setUploadBusy(busy), [])
  const reportUploadProgress = useCallback((completed: number, total: number) => {
    setUploadProgress({ completed, total })
  }, [])

  const hasProgress = identity !== null && submitted === null
  useEffect(() => {
    onProgressChange?.(hasProgress)
  }, [hasProgress, onProgressChange])
  useBeforeUnload(hasProgress || saving || formContinuing)
  useDocumentTitle(restoring || program === null || error ? '' : `${STAGE_TITLES[stage]} | ${SERVICE_TITLE}`)

  // 단계가 바뀌면 맨 위로 올리고 새 단계의 제목으로 포커스를 옮긴다. 처음 화면을 열 때는 옮기지 않는다.
  useEffect(() => {
    if (restoring || program === null || error) return undefined
    if (focusedStage.current === null || focusedStage.current === stage) {
      focusedStage.current = stage
      return undefined
    }
    focusedStage.current = stage
    window.scrollTo({ top: 0 })
    const root = body.current
    if (!root) return undefined
    const findHeading = () => root.querySelector<HTMLElement>(stage === 'forms' ? '#pdf-form-panel-title' : 'h2')
    const focusHeading = (heading: HTMLElement) => {
      if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
    const ready = findHeading()
    if (ready) {
      focusHeading(ready)
      return undefined
    }
    // 내용을 불러온 뒤에 제목이 나타나는 단계는 잠시 기다린다. 그 사이 본문 안의 다른 곳을 쓰고 있으면 옮기지 않는다.
    const observer = new MutationObserver(() => {
      const heading = findHeading()
      if (!heading) return
      observer.disconnect()
      const focused = document.activeElement
      if (!focused || focused === document.body || !root.contains(focused)) focusHeading(heading)
    })
    observer.observe(root, { childList: true, subtree: true })
    const giveUp = window.setTimeout(() => observer.disconnect(), 5000)
    return () => {
      observer.disconnect()
      window.clearTimeout(giveUp)
    }
  }, [stage, restoring, program, error])

  const save = (body: { form1?: unknown; self_check?: unknown; form5?: unknown }): Promise<void> => {
    if (appId === null) return Promise.resolve()
    // 저장에 성공하면 앞선 자동 저장 실패 안내를 지운다. 저장 순서와 통과 조건은 그대로다.
    const next = saveQueue.current.catch(() => undefined).then(() => patchApplication(appId, body)).then(() => { setFormError('') })
    saveQueue.current = next.catch(() => undefined)
    pendingSaves.current += 1
    setSaving(true)
    void saveQueue.current.then(() => {
      pendingSaves.current -= 1
      if (pendingSaves.current === 0) setSaving(false)
    })
    return next
  }
  const reportSaveError = (e: unknown) => setFormError(friendlyError(e, SAVE_ERROR_COPY))

  const continueFromForms = async () => {
    if (appId === null || program === null) return
    setFormContinuing(true)
    setFormError('')
    try {
      await flushForms()
      const payload = Object.fromEntries(Object.entries(answers).filter(([, v]) => v)) as Record<string, string>
      const result = await postSelfCheck(appId, payload)
      if (!result.completed) {
        setFormError('자가진단의 모든 문항에 답해 주세요.')
        return
      }
      if (!consentReady) {
        setFormError('필수 동의와 서명을 모두 마쳐 주세요.')
        return
      }
      setStage('upload')
    } catch (e: unknown) {
      reportSaveError(e)
    } finally {
      setFormContinuing(false)
    }
  }

  /** 제출 준비의 수정 링크는 이미 도달한 단계로만 돌아가게 한다. */
  const jumpTo = (next: Stage) => {
    if (next === stage) return
    if (next === 'identity' && identity !== null) return
    setStage(next)
    window.scrollTo({ top: 0 })
  }

  if (error) {
    return (
      <div className="flow flow--message">
        <Notice tone="danger" role="alert" title="신청 화면을 열지 못했습니다">{error}</Notice>
        <button type="button" className="btn btn--primary" onClick={() => { setError(''); setRestoring(true); setAttempt((value) => value + 1) }}>
          <Icon name="refresh" />
          다시 시도
        </button>
      </div>
    )
  }
  if (restoring || program === null) {
    // 뒤로·앞으로 가기처럼 금방 끝나는 준비에는 글자를 깜빡이지 않는다.
    return (
      <div className="flow flow--message" aria-busy="true">
        {showLoading && <Spinner label="신청 화면을 준비하고 있습니다." />}
      </div>
    )
  }

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
  // 제출을 마친 뒤에는 어느 화면을 보고 있든 마지막 단계(접수 완료)만 현재로 알린다.
  const currentIndex = submittedDone ? 2
    : viewedStage === 'identity' ? 0
      : viewedStage === 'forms' ? 1
        : 2

  // 주소를 직접 쳐서 본인인증 없이 뒤 단계에 온 경우, 1단계를 완료로 그리지 않는다.
  const identityMissing = identity === null && !submittedDone && currentIndex > 0

  const openMyPage = async () => {
    if (formContinuing || uploadBusy) return
    if (stage === 'forms') {
      setFormContinuing(true)
      setFormError('')
      try { await flushForms() } catch (e: unknown) {
        reportSaveError(e)
        return
      } finally { setFormContinuing(false) }
    }
    if (stage !== 'mypage') setStageBeforeMypage(stage)
    setStage('mypage')
    window.scrollTo({ top: 0 })
  }

  /** 단계 표시의 상태 글자와 진행 수치. 색이 아니라 글자로 완료·현재·예정을 알린다. */
  const stepStatus = (index: number): { state: string; count: string } => {
    if (submittedDone) return { state: index === 2 ? '접수 완료' : '완료', count: '' }
    if (index === 0 && identityMissing) return { state: '미완료', count: '' }
    const progress = index === 1 ? formProgress : index === 2 ? uploadProgress : null
    const count = progress && progress.total > 0
      ? `${index === 1 ? '서식' : '서류'} ${progress.completed} / ${progress.total}`
      : ''
    if (index < currentIndex) return { state: '완료', count: '' }
    if (index > currentIndex) return { state: index === 2 && uploadComplete ? '완료' : '예정', count }
    return { state: '현재', count }
  }

  const stepperNavigate = async (index: number) => {
    const previouslyReachedUpload = index === 2 && uploadProgress.total > 0
    if (submittedDone || stage === 'mypage' || index === 0 || formContinuing || uploadBusy) return
    if (index >= currentIndex && !previouslyReachedUpload) return
    if (stage === 'forms') {
      setFormContinuing(true)
      setFormError('')
      try { await flushForms() } catch (e: unknown) {
        reportSaveError(e)
        return
      } finally { setFormContinuing(false) }
    }
    setStage(index === 1 ? 'forms' : 'upload')
    window.scrollTo({ top: 0 })
  }

  /** 신청서 저장. 본인인증을 마쳤으면 성명·생년월일은 인증 값으로 고정된다. */
  const onForm1 = (next: Form1Value) => {
    const locked = lockIdentity(next, identity)
    setForm1(locked)
    void save({ form1: locked }).catch(reportSaveError)
  }

  const flushForms = async () => {
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
    setFormError('')
  }

  const leaveMyPage = () => setStage(stageBeforeMypage === 'complete' && !submittedDone ? 'upload' : stageBeforeMypage)

  return (
    <div className={`flow${stage === 'upload' ? ' flow--fluid' : stage === 'forms' ? ' flow--forms' : ''}`}>
      {headerHost && appId !== null && createPortal(
        <div className="shell__application-controls">
          <span className="shell__application-number">신청번호 <strong>{appNo || '발급 중…'}</strong></span>
          <button type="button" className="btn btn--small shell__mypage" onClick={() => void openMyPage()} disabled={stage === 'mypage' || formContinuing || uploadBusy}>마이페이지</button>
        </div>, headerHost,
      )}
      {footerHost && program.call_center && createPortal(
        <>
          <Icon name="phone" size={18} />
          <span>문의</span>
          <PhoneLink number={program.call_center} />
        </>, footerHost,
      )}

      <div className="flow__head">
        <h1>{program.name} 신청</h1>
        <ol className="flow__stages" aria-label="신청 단계">
          {APPLY_STEPS.map(({ key, label }, i) => {
            const complete = submittedDone || (i < currentIndex && !(i === 0 && identityMissing)) || (i === 2 && uploadComplete)
            const current = i === currentIndex
            // 제출을 마친 뒤의 마지막 단계는 현재이면서 완료다. 그 밖에는 현재 표시가 완료 표시보다 앞선다.
            const marker = submittedDone || (complete && !current) ? 'complete' : current ? 'current' : 'waiting'
            const reachable = !submittedDone && stage !== 'mypage' && i !== 0 && !current &&
              (i < currentIndex || (i === 2 && uploadProgress.total > 0))
            const blocked = formContinuing || uploadBusy
            const { state, count } = stepStatus(i)
            const content = (
              <>
                <span className={`step-marker step-marker--${marker}`} aria-hidden="true">
                  {marker === 'complete' ? <Icon name="check" size={18} /> : marker === 'waiting' ? i + 1 : null}
                </span>
                <span className="flow__stage-copy">
                  <span className="flow__stage-caption">
                    <span>{i + 1}단계</span>
                    <span className="flow__stage-status">{state}</span>
                    {count && <span className="flow__stage-count">{count}</span>}
                  </span>
                  <span className="flow__stage-label">{label}</span>
                </span>
              </>
            )
            return (
              <li key={key} className={`is-${marker}`}>
                {reachable ? (
                  <button
                    type="button"
                    className="flow__stage"
                    aria-disabled={blocked}
                    onClick={() => void stepperNavigate(i)}
                  >
                    {content}
                  </button>
                ) : (
                  <span className="flow__stage" aria-current={current ? 'step' : undefined}>
                    {content}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      <div className="flow__body" ref={body}>
        {/* ── 본인인증 (데모) ── */}
        {stage === 'identity' && appId !== null && (
          <IdentityCheck
            appId={appId}
            identity={identity}
            onVerified={(verified, mobile) => {
              setIdentity(verified)
              const locked = lockIdentity({ ...form1, mobile }, verified)
              setForm1(locked)
              void save({ form1: locked }).catch(reportSaveError)
              setStage('forms')
              window.scrollTo({ top: 0 })
            }}
            onNext={() => setStage('forms')}
          />
        )}

        {/* ── 서식 작성 ── */}
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
            onForm1={onForm1}
            onAnswers={(next) => { setAnswers(next); void save({ self_check: next }).catch(reportSaveError) }}
            onConsent={setConsent}
            onForm5={(next) => { setForm5(next); void save({ form5: next }).catch(reportSaveError) }}
            onSignMode={setSignMode}
            onFlush={flushForms}
            onPaperFormsChange={setPaperForms}
            onContinue={() => void continueFromForms()}
            continuing={formContinuing}
            error={formError}
            readOnly={!!submitted}
            onProgress={reportFormProgress}
          />
        )}

        {/* ── 서류 업로드 및 제출 ── */}
        {stage === 'upload' && appId !== null && (
          <>
            {identity === null && (
              <Notice tone="warning" title="본인인증 전입니다." className="flow__notice">
                <p>지금 올리는 서류는 본인 명의인지 대조하지 않습니다.</p>
                <button type="button" className="btn btn--small" onClick={() => jumpTo('identity')}>
                  본인인증 하러 가기
                </button>
              </Notice>
            )}
            <DocumentUpload
              applicationId={appId}
              callCenter={program.call_center}
              onProgress={reportUploadProgress}
              onBusyChange={reportUploadBusy}
              onForms={() => jumpTo('forms')}
              onBeforeSubmit={async () => { await saveQueue.current }}
              onSubmitted={(result) => {
                setSubmitted(result)
                setStage('complete')
                window.scrollTo({ top: 0 })
              }}
            />
          </>
        )}

        {/* ── 접수 완료 (접수증) ── */}
        {stage === 'complete' && submitted && appId !== null && (
          <section className="card receipt" aria-labelledby="receipt-title">
            <div className="receipt__head">
              <Icon name="checkCircle" size={40} className="receipt__mark" />
              <div>
                <h2 id="receipt-title" tabIndex={-1}>신청이 접수되었습니다</h2>
                <p>아래 접수 내용을 확인해 주세요.</p>
              </div>
            </div>

            <div className="receipt__body">
              <dl className="fact-list receipt__facts">
                <div>
                  <dt>신청번호</dt>
                  <dd className="receipt__number">{submitted.application_no}</dd>
                </div>
                {submitted.submitted_at && (
                  <div>
                    <dt>접수 일시</dt>
                    <dd>{formatDateTime(submitted.submitted_at)}</dd>
                  </div>
                )}
                <div>
                  <dt>사업명</dt>
                  <dd>{program.name}</dd>
                </div>
                {program.call_center && (
                  <div>
                    <dt>문의</dt>
                    <dd><PhoneLink number={program.call_center} /></dd>
                  </div>
                )}
              </dl>

              <div className="receipt__next">
                {submitted.next_steps.length > 0 && (
                  <>
                    <h3>다음 절차</h3>
                    <ol>
                      {submitted.next_steps.map((step) => <li key={step}>{step}</li>)}
                    </ol>
                  </>
                )}
                <p>진행 상황은 마이페이지에서 확인할 수 있습니다.</p>
              </div>

              {submitted.notice && <Notice tone="neutral">{submitted.notice}</Notice>}

              <div className="receipt__actions">
                <button type="button" className="btn btn--primary" onClick={() => void openMyPage()}>
                  마이페이지에서 진행 상황 보기
                </button>
                <ApplicantFormsBulkMenu applicationId={appId} refreshKey={1} />
                <button type="button" className="btn btn--quiet" onClick={() => window.print()}>
                  <Icon name="printer" />
                  접수 내용 인쇄
                </button>
              </div>
            </div>
          </section>
        )}

        {stage === 'mypage' && appId !== null && (
          <>
            <div className="flow__back">
              <button type="button" className="btn btn--small" onClick={leaveMyPage}>
                <Icon name="chevronLeft" size={18} />
                신청 화면으로 돌아가기
              </button>
            </div>
            <MyPage applicationId={appId} />
          </>
        )}
      </div>
    </div>
  )
}
