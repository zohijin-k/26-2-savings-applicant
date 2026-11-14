import { Fragment, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  fetchFormLayout,
  fetchApplicantForms,
  fetchChecklist,
  putDocContext,
  deleteDocument,
  fetchOriginalHwpOptions,
  uploadSignatureScan,
  deleteSignatureScan,
  type FormFieldLayout,
  type FormLayout,
  type Identity,
  type Program,
} from '../api.ts'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import Icon from '../components/Icon.tsx'
import Notice from '../components/Notice.tsx'
import SignaturePad from '../components/SignaturePad.tsx'
import { Skeleton, SkeletonBlock, SkeletonLine } from '../components/Skeleton.tsx'
import Spinner from '../components/Spinner.tsx'
import useBeforeUnload from '../hooks/useBeforeUnload.ts'
import useDelayedFlag from '../hooks/useDelayedFlag.ts'
import { friendlyError, isCitizenSafe } from '../lib/error-copy.ts'
import { formatDate } from '../lib/format.ts'
import type { ConsentValue } from './consent-model.ts'
import { isValidEmail, normalizeEmail } from './email.ts'
import { formatPhone, isValidPhone, phoneCursorPosition } from './phone.ts'
import { EMPTY_FORM1, type Form1Value } from './form1-model.ts'
import type { SelfCheckAnswers } from './form2-model.ts'
import { EMPTY_FORM5, type Form5Value, type SignMode } from './form5-model.ts'
import './pdf-forms-workspace.css'

type ActiveForm = { formNo: string; mode: 'edit' | 'preview' }

/** 화면에 보여 줄 오류. `save`는 저장·서식 전환 실패로, 다시 저장할 수 있게 안내한다. */
type WorkspaceError = { message: string; kind: 'save' | 'input' }

/** 화면 확인 대화상자에 넘기는 내용. 답은 `resolve`로 돌려준다. */
type ConfirmRequest = {
  title: string
  description: string
  confirmLabel: string
  tone?: 'primary' | 'danger'
  resolve: (confirmed: boolean) => void
}

const SAVE_FAILED_COPY = '작성한 내용을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'
const REQUEST_FAILED_COPY = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
const LOAD_FAILED_COPY = '서식을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'

interface Props {
  applicationId: number
  program: Program
  identity: Identity | null
  form1: Form1Value
  answers: SelfCheckAnswers
  consent: ConsentValue
  form5: Form5Value
  signMode: SignMode
  onForm1: (value: Form1Value) => void
  onAnswers: (value: SelfCheckAnswers) => void
  onConsent: (value: ConsentValue) => void
  onForm5: (value: Form5Value) => void
  onSignMode: (value: SignMode) => void
  onFlush: () => Promise<void>
  onPaperFormsChange?: (paperForms: Record<string, boolean>) => void
  onContinue: () => void
  continuing: boolean
  error: string
  readOnly?: boolean
  onProgress: (completed: number, total: number) => void
}

function truthy(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object' && 'y' in value) {
    const date = value as { y?: string; m?: string; d?: string }
    return !!(date.y && date.m && date.d)
  }
  return Boolean(value)
}

function dateText(value: unknown): string {
  if (!value || typeof value !== 'object' || !('y' in value)) return ''
  const date = value as { y?: string; m?: string; d?: string }
  return [date.y, date.m, date.d].filter(Boolean).join('. ')
}

function applyFieldFormat(value: string, format: FormFieldLayout['format']): string {
  if (format === 'yy') {
    const digits = value.replace(/\D/g, '')
    return digits.length >= 2 ? digits.slice(-2) : digits
  }
  return value
}

function autoDateText(layout: FormLayout, field: FormFieldLayout): string {
  if (!field.date_part) return ''
  const [year, month, day] = layout.auto_date.split('-')
  if (field.date_part === 'year') return field.format === 'yy' ? year.slice(-2) : year
  return String(Number(field.date_part === 'month' ? month : day))
}

function readForm(form1: Form1Value, key: string): unknown {
  return (form1 as unknown as Record<string, unknown>)[key]
}

function durationBand(value: Form1Value['transferIn'], basis: string, work: boolean): string {
  if (!value.y || !value.m || !value.d) return ''
  const start = new Date(Number(value.y), Number(value.m) - 1, Number(value.d))
  const end = new Date(`${basis}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return ''
  let years = end.getFullYear() - start.getFullYear()
  if (end.getMonth() < start.getMonth() || (end.getMonth() === start.getMonth() && end.getDate() < start.getDate())) years -= 1
  if (work) return years >= 3 ? '3년 이상' : `${years}년 이상 ~ ${years + 1}년 미만`
  return years >= 5 ? '5년 이상' : `${years}년 이상 ~ ${years + 1}년 미만`
}

function requiredKeys(formNo: string): string[] {
  if (formNo === '서식2') return Array.from({ length: 8 }, (_, i) => `self_check.${i + 1}`)
  if (formNo === '서식1') return [
    'name', 'birth', 'address', 'mobile', 'email', 'savingPurpose', 'priorJoined',
    'gender', 'householdType', 'householdSize', 'workType', 'workplaceRegion',
    'bankName', 'accountNo', 'accountHolder',
  ]
  if (formNo === '서식3') return ['consent.privacy', 'consent.uniqueId']
  if (formNo === '서식4') return ['consent.thirdParty']
  if (formNo === '서식5') return ['agree', 'signature']
  return []
}

function fieldGroup(key: string): string {
  if (key.startsWith('self_check.')) return key.split('.').slice(0, 2).join('.')
  if (key.startsWith('consent.')) return key.split('.').slice(0, 2).join('.')
  if (key.startsWith('agree.')) return 'agree'
  return key.split('.')[0]
}

export function ApplicantFormsBulkMenu({ applicationId, refreshKey, label = '서식 내려받기', small = false, closeKey }: {
  applicationId: number
  refreshKey?: number
  /** 버튼에 보이는 이름. */
  label?: string
  /** 문서 머리처럼 좁은 자리에서는 40px 버튼으로 그린다. */
  small?: boolean
  /** 값이 바뀌면 열려 있던 메뉴를 닫는다(서식 전환, 대화상자 열림 등). */
  closeKey?: string | number
}) {
  const [hwp, setHwp] = useState<{ url: string | null; label: string | null }>({ url: null, label: null })
  const [open, setOpen] = useState(false)
  const [seenCloseKey, setSeenCloseKey] = useState(closeKey)
  const menuRef = useRef<HTMLDetailsElement>(null)
  if (seenCloseKey !== closeKey) {
    setSeenCloseKey(closeKey)
    setOpen(false)
  }

  // 열려 있는 동안 Esc와 바깥 클릭으로 닫는다.
  useEffect(() => {
    if (!open) return
    const menu = menuRef.current
    const onPointer = (event: PointerEvent) => {
      if (menu && !menu.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const focusInside = !!menu && menu.contains(document.activeElement)
      setOpen(false)
      if (focusInside) menu.querySelector('summary')?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    let alive = true
    const refresh = () => {
      fetchOriginalHwpOptions(applicationId)
        .then((hwpOptions) => {
          if (!alive) return
          setHwp(hwpOptions)
        }).catch(() => undefined)
    }
    refresh()
    window.addEventListener('focus', refresh)
    return () => {
      alive = false
      window.removeEventListener('focus', refresh)
    }
  }, [applicationId, refreshKey])

  return (
    <details ref={menuRef} className="pdf-forms__bulk-menu" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className={small ? 'btn btn--small' : 'btn'}>
        {!small && <Icon name="fileDown" />}
        {label}
        <Icon name="chevronDown" size={16} className="pdf-forms__bulk-caret" />
      </summary>
      <div className="pdf-forms__bulk-list">
        <a href={`/api/applications/${applicationId}/forms/files/written.pdf`} onClick={() => setOpen(false)}>
          <Icon name="fileDown" size={18} /> <span>PDF 내려받기</span>
        </a>
        {hwp.url && hwp.label && <a href={hwp.url} onClick={() => setOpen(false)}>
          <Icon name="fileDown" size={18} /> <span>HWP 내려받기</span>
        </a>}
      </div>
    </details>
  )
}

export default function PdfFormsWorkspace({
  applicationId, program, identity, form1, answers, consent, form5, signMode,
  onForm1, onAnswers, onConsent, onForm5, onSignMode,
  onFlush, onPaperFormsChange, onContinue, continuing, error, readOnly = false, onProgress,
}: Props) {
  const [formNos, setFormNos] = useState<string[]>([])
  const [layouts, setLayouts] = useState<Record<string, FormLayout>>({})
  const [availableFormCount, setAvailableFormCount] = useState(0)
  const [paperAllowed, setPaperAllowed] = useState<Record<string, boolean>>({})
  const [paperForms, setPaperForms] = useState<Record<string, boolean>>({})
  const [active, setActive] = useState<ActiveForm | null>(null)
  const [page, setPage] = useState(0)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [localError, setLocalError] = useState<WorkspaceError | null>(null)
  const [dismissedParentError, setDismissedParentError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveNotice, setSaveNotice] = useState<{ message: string; values: unknown[] } | null>(null)
  // 서버에 마지막으로 보낸 동의 선택. 동의 선택은 저장·서식 전환·미리보기 때에만 서버로 간다.
  const [flushedConsent, setFlushedConsent] = useState(consent)
  // 빈칸을 오류 색으로 보여 줄지: 저장·다음 단계를 시도한 서식에서만 켠다.
  const [attemptedForms, setAttemptedForms] = useState<Record<string, boolean>>({})
  const [incompleteNotice, setIncompleteNotice] = useState(0)
  const [pendingFormNo, setPendingFormNo] = useState<string | null>(null)
  const [jump, setJump] = useState(0)
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null)
  const [imageStatus, setImageStatus] = useState<{ key: string; status: 'loaded' | 'error' } | null>(null)
  const [imageRetry, setImageRetry] = useState(0)
  const [signatureTarget, setSignatureTarget] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [thumbnailVersion, setThumbnailVersion] = useState(0)
  const [scanVersion, setScanVersion] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const navListRef = useRef<HTMLUListElement>(null)
  const incompleteRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<ConfirmRequest | null>(null)
  const signatureDialogRef = useRef<HTMLDivElement>(null)
  const signatureTitleRef = useRef<HTMLHeadingElement>(null)
  const signatureTriggerRef = useRef<HTMLButtonElement | null>(null)
  const signatureFocusReturnRef = useRef<HTMLButtonElement | null>(null)
  const sessionEpoch = useRef(0)
  const pendingOperation = useRef<number | null>(null)
  const paperFormsChangeRef = useRef(onPaperFormsChange)
  const resetPending = useRef<number | null>(null)
  const [availablePageWidth, setAvailablePageWidth] = useState(794)
  const draftValues = [form1, answers, consent, form5, signMode]
  const currentSaveNotice = saveNotice?.values.every((value, index) => value === draftValues[index]) ? saveNotice.message : ''
  const hasUnflushedChanges = !readOnly && (
    consent.privacy !== flushedConsent.privacy || consent.uniqueId !== flushedConsent.uniqueId || consent.thirdParty !== flushedConsent.thirdParty
  )
  // 저장에 성공하면 그 전에 떠 있던 상위 오류는 감추고, 상위 오류가 바뀌면 다시 보여 준다.
  if (dismissedParentError && error !== dismissedParentError) setDismissedParentError('')
  const parentError = error && error !== dismissedParentError ? (isCitizenSafe(error) ? error : REQUEST_FAILED_COPY) : ''

  useBeforeUnload(saving || hasUnflushedChanges)

  useEffect(() => { paperFormsChangeRef.current = onPaperFormsChange }, [onPaperFormsChange])

  // 화면 확인 대화상자. 답을 기다리는 동안 화면이 사라지면 "취소"로 끝낸다.
  const askConfirm = (request: Omit<ConfirmRequest, 'resolve'>) => new Promise<boolean>((resolve) => {
    const next = { ...request, resolve }
    confirmRef.current = next
    setConfirmRequest(next)
  })
  const answerConfirm = (confirmed: boolean) => {
    const request = confirmRef.current
    confirmRef.current = null
    setConfirmRequest(null)
    request?.resolve(confirmed)
  }
  useEffect(() => () => {
    confirmRef.current?.resolve(false)
    confirmRef.current = null
  }, [])

  useEffect(() => {
    let alive = true
    sessionEpoch.current += 1
    pendingOperation.current = null
    Promise.all([fetchApplicantForms(applicationId), fetchChecklist(applicationId)])
      .then(async ([availableForms, checklist]) => {
        const items = await Promise.all(availableForms.map(({ form_no }) => fetchFormLayout(applicationId, form_no)))
        if (alive) {
          // Display and initial selection use the same public-number order, not stored IDs.
          const orderedFormNos = items.map((layout, index) => {
                const match = layout.public_form?.match(/^서식\s*([1-9]\d*)$/)
                const publicNumber = match ? Number(match[1]) : NaN
                return {
                  formNo: layout.form_no,
                  index,
                  order: Number.isSafeInteger(publicNumber) ? publicNumber : Number.MAX_SAFE_INTEGER,
                }
              })
              .sort((a, b) => a.order - b.order || a.index - b.index)
              .map(({ formNo }) => formNo)
          setFormNos(orderedFormNos)
          setLayouts(Object.fromEntries(items.map((item) => [item.form_no, item])))
          setAvailableFormCount(availableForms.length)
          setPaperAllowed(checklist.program.paper_forms || {})
          setPaperForms(checklist.context.paper_forms || {})
          paperFormsChangeRef.current?.(checklist.context.paper_forms || {})
          if (orderedFormNos.length > 0) {
            setActive({ formNo: orderedFormNos[0], mode: readOnly ? 'preview' : 'edit' })
            setLoadState('ready')
          } else {
            setLoadError(LOAD_FAILED_COPY)
            setLoadState('failed')
          }
        }
      })
      .catch((e: unknown) => {
        if (!alive) return
        setLoadError(friendlyError(e, LOAD_FAILED_COPY))
        setLoadState('failed')
      })
    return () => { alive = false; sessionEpoch.current += 1 }
  }, [applicationId, readOnly, loadAttempt])

  const signatureOpen = active?.mode === 'edit' && active.formNo === '서식5' && !readOnly && !!signatureTarget
  useEffect(() => {
    if (!signatureOpen) return
    const dialog = signatureDialogRef.current
    if (!dialog) return
    const trigger = signatureTriggerRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]')).filter((item) => item.getClientRects().length > 0)
    // 처음에는 닫기 버튼이 아니라 대화상자 제목이 포커스를 받는다.
    const title = signatureTitleRef.current
    if (title) title.focus()
    else focusable()[0]?.focus()
    const onKey = (event: KeyboardEvent) => {
      // 이 창 위에 확인 대화상자가 떠 있는 동안에는 그 대화상자가 키보드를 맡는다.
      if (dialog.closest('[inert]')) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        setSignatureTarget(null)
      } else if (event.key === 'Tab') {
        const items = focusable()
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && (document.activeElement === first || document.activeElement === title || !dialog.contains(document.activeElement))) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = previousOverflow
      signatureFocusReturnRef.current = trigger
    }
  }, [signatureOpen])

  useEffect(() => {
    if (signatureOpen || saving) return
    const trigger = signatureFocusReturnRef.current
    signatureFocusReturnRef.current = null
    if (trigger?.isConnected) trigger.focus()
  }, [signatureOpen, saving])

  const runSavedAction = async (action: (isCurrent: () => boolean) => void | Promise<void>, flush = true) => {
    if (pendingOperation.current !== null || continuing) return
    const epoch = sessionEpoch.current
    const isCurrent = () => epoch === sessionEpoch.current
    pendingOperation.current = epoch
    setSaving(true)
    setLocalError(null)
    setSaveNotice(null)
    let flushing = !readOnly && flush
    try {
      if (!readOnly && flush) await onFlush()
      if (!isCurrent()) return
      if (flushing) {
        flushing = false
        setFlushedConsent(consent)
        setDismissedParentError(error)
        setSaveNotice({ message: '저장했습니다', values: draftValues })
      }
      await action(isCurrent)
      if (isCurrent()) setThumbnailVersion((key) => key + 1)
    } catch (e: unknown) {
      if (isCurrent()) {
        setLocalError(flushing
          ? { message: friendlyError(e, SAVE_FAILED_COPY), kind: 'save' }
          : { message: friendlyError(e, REQUEST_FAILED_COPY), kind: 'input' })
      }
    } finally {
      if (isCurrent()) {
        pendingOperation.current = null
        setSaving(false)
      }
    }
  }

  const changePaperMode = async (formNo: string, next: boolean) => {
    if (readOnly || saving || continuing || !!paperForms[formNo] === next) return
    const hasOnlineContent = formNo === '서식5' ? hasStarted('서식5') : false
    if (next && hasOnlineContent && !(await askConfirm({
      title: '스캔본 제출로 바꿀까요?',
      description: '온라인으로 작성한 내용은 제출되지 않습니다.',
      confirmLabel: '바꾸기',
    }))) return
    await runSavedAction(async (isCurrent) => {
      if (!next && paperForms[formNo]) {
        const checklist = await fetchChecklist(applicationId)
        if (!isCurrent()) return
        const scan = checklist.items.find((item) => item.slot_key === 'admin_info_consent')?.documents[0]
        if (scan && !(await askConfirm({
          title: '온라인 작성으로 바꿀까요?',
          description: '올린 스캔본은 제출되지 않습니다.',
          confirmLabel: '바꾸기',
        }))) return
        if (!isCurrent()) return
        if (scan) await deleteDocument(applicationId, scan.document_id)
      }
      const checklist = await fetchChecklist(applicationId)
      if (!isCurrent()) return
      await putDocContext(applicationId, { ...checklist.context, paper_forms: { ...(checklist.context.paper_forms || {}), [formNo]: next } })
      if (!isCurrent()) return
      setPaperForms((current) => ({ ...current, [formNo]: next }))
      onPaperFormsChange?.({ ...paperForms, [formNo]: next })
      setSignatureTarget(null)
    })
  }

  useEffect(() => {
    const epoch = resetPending.current
    if (epoch === null) return
    resetPending.current = null
    void onFlush().then(() => {
      if (epoch !== sessionEpoch.current) return
      setThumbnailVersion((version) => version + 1)
      setFlushedConsent(consent)
      setSaveNotice({ message: '초기화한 내용을 저장했습니다', values: [form1, answers, consent, form5, signMode] })
    }).catch((e: unknown) => {
      if (epoch === sessionEpoch.current) setLocalError({ message: friendlyError(e, SAVE_FAILED_COPY), kind: 'save' })
    }).finally(() => {
      if (epoch === sessionEpoch.current) { pendingOperation.current = null; setSaving(false) }
    })
  }, [answers, consent, form1, form5, signMode, onFlush])

  useEffect(() => {
    const viewport = scrollRef.current
    if (!viewport) return
    const update = () => setAvailablePageWidth(Math.max(1, viewport.clientWidth - 28))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [active, paperForms])

  const currentLayout = active ? layouts[active.formNo] : undefined
  const pageSize = currentLayout?.page_sizes[page]
  const pageWidth = Math.min(794, Math.max(620, availablePageWidth))
  const scale = pageSize ? pageWidth / pageSize.width : 1

  const readChoice = (key: string): boolean => {
    const [group, option] = [fieldGroup(key), key.split('.').slice(-1)[0]]
    if (group.startsWith('self_check.')) return answers[Number(group.split('.')[1])] === option
    if (group === 'consent.privacy') return consent.privacy === option
    if (group === 'consent.uniqueId') return consent.uniqueId === option
    if (group === 'consent.thirdParty') return consent.thirdParty === option
    if (group === 'agree') return form5.agree === option
    if (group === 'monthlyDeposit') return option === '월 10만원'
    if (group === 'referralPaths') return form1.referralPaths.some((item) => item.startsWith(option))
    if (group === 'residencePeriod') return durationBand(form1.transferIn, program.announcement_date, false) === option
    if (group === 'workPeriod') return durationBand(form1.employedAt, program.announcement_date, true) === option
    return readForm(form1, group) === option
  }

  const readText = (key: string): string => {
    if (key === 'birth') return dateText(form1.birth)
    if (key === 'name' && identity) return identity.name
    if (key === 'phone') return form5.phone || form1.mobile
    if (key === 'writtenMonth') return String(new Date().getMonth() + 1)
    if (key === 'writtenDay') return String(new Date().getDate())
    if (key.startsWith('consent.form')) {
      const date = new Date()
      if (key.endsWith('.year')) return String(date.getFullYear())
      if (key.endsWith('.month')) return String(date.getMonth() + 1)
      if (key.endsWith('.day')) return String(date.getDate())
    }
    const value = readForm(form1, key)
    if (typeof value === 'string') return value
    if (key === 'birth') return dateText(value)
    return ''
  }

  const requiredItems = (formNo: string): string[] => {
    const keys = requiredKeys(formNo)
    for (const rule of layouts[formNo]?.requirements || []) {
      if (rule.kind === 'all_or_none') {
        if (rule.fields.some((field) => truthy(readForm(form1, field)))) keys.push(...rule.fields)
      } else if (readForm(form1, rule.field) === rule.equals) {
        keys.push(...rule.required)
      }
    }
    return keys
  }

  const requirementSatisfied = (key: string): boolean => {
    if (key.startsWith('self_check.')) return !!answers[Number(key.split('.')[1])]
    if (key === 'consent.privacy') return !!consent.privacy
    if (key === 'consent.uniqueId') return !!consent.uniqueId
    if (key === 'consent.thirdParty') return !!consent.thirdParty
    if (key === 'agree') return !!form5.agree
    if (key === 'signature') return signMode === '화면에 서명' ? !!form5.signature : form5.signatureScanUploaded
    if (key === 'ecContact') return isValidPhone(String(readForm(form1, key) || ''))
    if (key === 'email') return isValidEmail(normalizeEmail(String(readForm(form1, key) || '')))
    if (key.endsWith('.signature')) return !!readForm(form1, key)
    return truthy(readForm(form1, key))
  }

  const missing = (formNo: string): string[] => requiredItems(formNo).filter((key) => !requirementSatisfied(key))

  const missingGroupBoxes = (formNo: string, targetPage: number): [number, number, number, number][] => {
    const fields = layouts[formNo]?.fields || {}
    const groups = new Map<string, [number, number, number, number]>()
    for (const missingKey of missing(formNo)) {
      const entry = Object.entries(fields).find(([fieldKey, field]) => field.type === 'check' && (fieldKey === missingKey || fieldGroup(fieldKey) === missingKey))
      if (!entry) continue
      const group = fieldGroup(entry[0])
      const groupBox = entry[1].choice_group_box || entry[1].group_box || entry[1].choice_box || entry[1].box
      if (entry[1].page !== targetPage) continue
      const box: [number, number, number, number] = [...groupBox] as [number, number, number, number]
      groups.set(`${targetPage}-${group}`, box)
    }
    return [...groups.values()]
  }

  const hasStarted = (formNo: string): boolean => requiredItems(formNo).some(requirementSatisfied)

  const allReady = availableFormCount > 0 && formNos.every((formNo) => !!layouts[formNo] && (paperForms[formNo] || missing(formNo).length === 0))
  const completedFormCount = formNos.filter(
    (formNo) => !!layouts[formNo] && (paperForms[formNo] || missing(formNo).length === 0),
  ).length

  const setText = (key: string, value: string) => {
    if (key === 'name' && identity) return
    if (key === 'birth' && identity) return
    if (key === 'consent.privacy') { onConsent({ ...consent, privacy: value }); return }
    if (key === 'consent.uniqueId') { onConsent({ ...consent, uniqueId: value }); return }
    if (key === 'consent.thirdParty') { onConsent({ ...consent, thirdParty: value }); return }
    if (key === 'agree') { onForm5({ ...form5, agree: value }); return }
    if (key === 'householdSizeCount') value = value.replace(/\D/g, '').slice(0, 2)
    if (key === 'birth' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-')
      onForm1({ ...form1, birth: { y, m: String(Number(m)), d: String(Number(d)) } })
      return
    }
    if (key === 'mobile' || key === 'ecContact') value = formatPhone(value)
    onForm1({ ...(form1 as unknown as Record<string, unknown>), [key]: value } as unknown as Form1Value)
  }

  const toggleChoice = (key: string, checked: boolean) => {
    const group = fieldGroup(key)
    const option = key.split('.').slice(-1)[0]
    if (group.startsWith('self_check.')) {
      const no = group.split('.')[1]
      const answer = option as '예' | '아니오'
      onAnswers({ ...answers, [Number(no)]: checked ? answer : undefined })
      return
    }
    if (group === 'consent.privacy') { onConsent({ ...consent, privacy: checked ? option : '' }); return }
    if (group === 'consent.uniqueId') { onConsent({ ...consent, uniqueId: checked ? option : '' }); return }
    if (group === 'consent.thirdParty') { onConsent({ ...consent, thirdParty: checked ? option : '' }); return }
    if (group === 'agree') { onForm5({ ...form5, agree: checked ? option : '' }); return }
    if (group === 'residencePeriod' || group === 'workPeriod') return
    if (group === 'referralPaths') {
      const old = form1.referralPaths
      const value = checked ? [...old, option] : old.filter((item) => !item.startsWith(option))
      onForm1({ ...form1, referralPaths: value })
      return
    }
    const value = readForm(form1, group)
    onForm1({ ...(form1 as unknown as Record<string, unknown>), [group]: checked ? option : value === option ? '' : value } as unknown as Form1Value)
  }

  const setSignature = (formNo: string, value: string) => {
    if (formNo === '서식5') {
      onForm5({ ...form5, signature: value })
      return
    }
  }

  const signatureValue = (formNo: string): string => {
    if (formNo === '서식5') return form5.signatureScanUploaded
      ? `/api/applications/${applicationId}/forms/signature-scan.png?v=${scanVersion}`
      : form5.signature
    return ''
  }

  const changeSignMode = async (next: SignMode) => {
    if (readOnly || next === signMode || pendingOperation.current !== null) return
    const hasSignature = !!form5.signature || form5.signatureScanUploaded
    if (hasSignature && !(await askConfirm({
      title: '서명 방식을 바꿀까요?',
      description: '서명 방식을 바꾸면 현재 서명이 지워집니다.',
      confirmLabel: '바꾸기',
    }))) return
    await runSavedAction(async (isCurrent) => {
      if (form5.signatureScanUploaded) await deleteSignatureScan(applicationId)
      if (!isCurrent()) return
      onForm5({ ...form5, signature: '', signatureScanUploaded: false })
      onSignMode(next)
      setScanVersion((value) => value + 1)
    }, false)
  }

  const uploadScan = async (file: File | undefined, input: HTMLInputElement) => {
    if (!file || readOnly || pendingOperation.current !== null) return
    input.value = ''
    setLocalError(null)
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setLocalError({ message: 'JPG 또는 PNG 이미지 파일을 올려 주세요.', kind: 'input' })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setLocalError({ message: '서명 이미지는 10MB 이하로 올려 주세요.', kind: 'input' })
      return
    }
    await runSavedAction(async (isCurrent) => {
      await uploadSignatureScan(applicationId, file)
      if (!isCurrent()) return
      onForm5({ ...form5, signature: '', signatureScanUploaded: true })
      setScanVersion((value) => value + 1)
    }, false)
  }

  const removeScan = async () => {
    if (readOnly) return
    await runSavedAction(async (isCurrent) => {
      await deleteSignatureScan(applicationId)
      if (!isCurrent()) return
      onForm5({ ...form5, signatureScanUploaded: false })
      setScanVersion((value) => value + 1)
    }, false)
  }

  const resetForm = async (formNo: string) => {
    if (readOnly || pendingOperation.current !== null || continuing) return
    if (!(await askConfirm({
      title: '다시 작성할까요?',
      description: '작성한 내용과 서명이 모두 지워집니다.',
      confirmLabel: '다시 작성',
      tone: 'danger',
    }))) return
    if (pendingOperation.current !== null) return
    const epoch = sessionEpoch.current
    pendingOperation.current = epoch
    setSaving(true)
    setSaveNotice(null)
    setLocalError(null)
    // 다시 작성한 서식은 처음 연 서식처럼 차분한 표시로 돌아간다.
    setAttemptedForms((current) => ({ ...current, [formNo]: false }))
    try {
      if (formNo === '서식5' && form5.signatureScanUploaded) await deleteSignatureScan(applicationId)
      if (epoch !== sessionEpoch.current) return
      resetPending.current = epoch
      if (formNo === '서식2') onAnswers({})
      else if (formNo === '서식3') onConsent({ ...consent, privacy: '', uniqueId: '' })
      else if (formNo === '서식4') onConsent({ ...consent, thirdParty: '' })
      else if (formNo === '서식5') {
        onForm5(EMPTY_FORM5)
        onSignMode('화면에 서명')
      } else {
        const reset = { ...EMPTY_FORM1 }
        if (identity) {
          reset.name = identity.name
          const [y, m, d] = identity.birth.split('-')
          reset.birth = { y, m: String(Number(m)), d: String(Number(d)) }
        }
        onForm1(reset)
      }
      setSignatureTarget(null)
    } catch (e: unknown) {
      if (epoch !== sessionEpoch.current) return
      resetPending.current = null
      pendingOperation.current = null
      setSaving(false)
      setLocalError({ message: friendlyError(e, REQUEST_FAILED_COPY), kind: 'input' })
    }
  }

  const startPreview = async (formNo: string) => {
    await runSavedAction(() => {
      setPreviewKey((key) => key + 1)
      setPage(0)
      setSignatureTarget(null)
      setActive({ formNo, mode: 'preview' })
      scrollRef.current?.scrollTo({ top: 0, left: 0 })
    })
  }

  const markAttempted = (targets: string[]) => {
    setAttemptedForms((current) => ({ ...current, ...Object.fromEntries(targets.map((formNo) => [formNo, true])) }))
  }

  const saveAndClose = async () => {
    if (active) markAttempted([active.formNo])
    await runSavedAction(() => {
      setSignatureTarget(null)
    })
  }

  /** 빈칸이 처음 나오는 쪽. 빈칸이 없으면 첫 쪽이다. */
  const firstMissingPage = (formNo: string): number => {
    const fields = Object.entries(layouts[formNo]?.fields || {})
    const pages = missing(formNo).flatMap((required) => fields
      .filter(([fieldKey]) => fieldKey === required || fieldGroup(fieldKey) === required)
      .map(([, field]) => field.page))
    return pages.length > 0 ? Math.min(...pages) : 0
  }

  /**
   * 서식을 바꾼다. 바꾸기 전에 지금 서식을 저장하고, 저장에 실패하면 지금 서식에 머문다.
   * `toMissing`을 주면 바꾼 뒤 빈칸이 있는 쪽으로 옮기고 문서 머리로 포커스를 보낸다.
   */
  const selectForm = async (formNo: string, toMissing = false) => {
    if (active?.formNo === formNo) {
      if (!toMissing || readOnly) return
      if (active.mode !== 'edit') setActive({ ...active, mode: 'edit' })
      setPage(firstMissingPage(formNo))
      setJump((count) => count + 1)
      return
    }
    // 쓰다 만 서식을 떠나면, 돌아왔을 때 남은 빈칸을 오류 색으로 보여 준다.
    const leaving = active?.formNo
    if (leaving && !readOnly && !paperForms[leaving] && hasStarted(leaving) && missing(leaving).length > 0) markAttempted([leaving])
    setPendingFormNo(formNo)
    await runSavedAction(() => {
      setPage(toMissing ? firstMissingPage(formNo) : 0)
      setSignatureTarget(null)
      setActive({ formNo, mode: readOnly ? 'preview' : 'edit' })
      if (toMissing) setJump((count) => count + 1)
      else scrollRef.current?.scrollTo({ top: 0, left: 0 })
    })
    setPendingFormNo(null)
  }

  const incompleteForms = formNos.filter((formNo) => !!layouts[formNo] && !paperForms[formNo] && missing(formNo).length > 0)

  const submitWorkspace = () => {
    if (readOnly || pendingOperation.current !== null || continuing || loadState !== 'ready') return
    if (!allReady) {
      // 통과 조건은 그대로다. 덜 쓴 서식을 알려 주고 빈칸을 오류 색으로 바꾼다.
      markAttempted(formNos)
      setIncompleteNotice((count) => count + 1)
      return
    }
    onContinue()
  }

  const changePage = (next: number) => {
    setPage(next)
    scrollRef.current?.scrollTo({ top: 0 })
  }

  const pageImageUrl = active
    ? `/api/applications/${applicationId}/forms/${encodeURIComponent(active.formNo)}/pages/${page + 1}.png?preview=${active.mode === 'preview' ? 'true' : 'false'}&v=${previewKey}`
    : ''
  // 쪽 그림이 올 때까지 자리 표시를 보여 주고, 입력 칸은 그림이 온 뒤에 보인다.
  const imageKey = `${pageImageUrl}#${imageRetry}`
  const imageState = !active ? 'loaded' : imageStatus?.key === imageKey ? imageStatus.status : 'loading'
  const showPageSkeleton = useDelayedFlag(imageState === 'loading')

  // 덜 쓴 서식 안내가 나오면 그 안내로 포커스를 옮긴다.
  useEffect(() => {
    if (incompleteNotice > 0) incompleteRef.current?.focus()
  }, [incompleteNotice])

  // 안내에서 고른 서식: 첫 빈칸이 보이게 하고 문서 머리로 포커스를 옮긴다.
  useEffect(() => {
    if (jump === 0) return
    const frame = requestAnimationFrame(() => {
      const viewport = scrollRef.current
      if (viewport) {
        const base = viewport.getBoundingClientRect().top - viewport.scrollTop
        const tops = Array.from(viewport.querySelectorAll<HTMLElement>('.is-missing, .pdf-form__group-missing'))
          .map((item) => item.getBoundingClientRect().top - base)
        viewport.scrollTo({ top: tops.length > 0 ? Math.max(0, Math.min(...tops) - 80) : 0 })
      }
      document.getElementById('pdf-form-panel-title')?.focus({ preventScroll: true })
      document.getElementById('pdf-form-panel')?.scrollIntoView({ block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [jump])

  // 좁은 화면의 가로 서식 목록: 더 넘길 내용이 있는 쪽에 그림자를 보이고, 고른 서식이 보이게 한다.
  const activeFormNo = active?.formNo
  useEffect(() => {
    const list = navListRef.current
    const frame = list?.parentElement
    if (!list || !frame) return
    const update = () => {
      const rest = list.scrollWidth - list.clientWidth - list.scrollLeft
      frame.dataset.moreStart = list.scrollLeft > 4 ? 'true' : 'false'
      frame.dataset.moreEnd = rest > 4 ? 'true' : 'false'
    }
    const current = list.querySelector<HTMLElement>('[aria-current="true"]')?.parentElement
    if (current && list.scrollWidth > list.clientWidth) {
      list.scrollTo({ left: Math.max(0, current.offsetLeft - list.offsetLeft - 16) })
    }
    update()
    list.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(list)
    return () => {
      list.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [activeFormNo, loadState])

  const renderField = ([key, field]: [string, FormFieldLayout], fieldIndex: number) => {
    if (!active || field.page !== page) return null
    const [x0, y0, x1, y1] = field.box
    const boxStyle = {
      left: x0 * scale,
      top: y0 * scale,
      width: Math.max(8, (x1 - x0) * scale),
      height: Math.max(8, (y1 - y0) * scale),
    }
    const isMissing = missing(active.formNo).some((required) => required === key || fieldGroup(key) === required)
    const label = field.anchor || field.label || '입력 항목'
    const publicId = `pdf-input-${fieldIndex}`
    const fieldRef = `${field.page}-${fieldIndex}`
    if (field.type === 'check') {
      const checked = readChoice(key)
      const group = fieldGroup(key)
      const derived = group === 'residencePeriod' || group === 'workPeriod' || group === 'monthlyDeposit'
      if (field.control === 'radio_text') {
        const optionGroup = fieldGroup(key)
        const [gx0, gy0, gx1, gy1] = field.group_box || field.box
        const groupWidth = (gx1 - gx0) * scale
        const groupHeight = (gy1 - gy0) * scale
        const isYes = key.endsWith('.예')
        const half = groupWidth / 2
        const radioStyle = { left: gx0 * scale + (isYes ? 0 : half), top: gy0 * scale, width: half, height: groupHeight, fontSize: Number(field.size || 9) * scale }
        const groupKeys = Object.keys(layouts[active.formNo].fields).filter((fieldKey) => fieldGroup(fieldKey) === optionGroup)
        const radioName = `pdf-radio-${active.formNo}-${Object.keys(layouts[active.formNo].fields).indexOf(groupKeys[0])}`
        return (
          <Fragment key={key}>
            <label data-field-ref={fieldRef} className={`pdf-form__radio-text pdf-form__radio-text--${field.font_family || 'sans'}`} style={radioStyle}>
              <input id={publicId} type="radio" name={radioName} checked={checked} disabled={readOnly} aria-label={`${label} ${field.label || '선택'}`} onChange={() => toggleChoice(key, true)} />
              <svg className={`pdf-form__radio-box ${checked ? 'is-checked' : ''}`} aria-hidden="true" style={{ width: Number(field.size || 9) * scale * 0.78, height: Number(field.size || 9) * scale * 0.78 }} viewBox="0 0 20 20"><rect x="1.5" y="1.5" width="17" height="17" /><path d="M4.5 10.5 8.2 14 15.5 6" /></svg>
              <span>{field.label || (isYes ? '예' : '아니오')}</span>
            </label>
          </Fragment>
        )
      }
      const [cx0, cy0, cx1, cy1] = field.click_box || field.box
      const clickStyle = {
        left: cx0 * scale,
        top: cy0 * scale,
        width: Math.max(8, (cx1 - cx0) * scale),
        height: Math.max(8, (cy1 - cy0) * scale),
      }
      const markSize = (Math.max(x1 - x0, y1 - y0) + 3) * scale
      return (
        <label key={key} data-field-ref={fieldRef} className="pdf-form__check" style={clickStyle}>
          <input
            id={publicId}
            type="checkbox"
            checked={checked}
            disabled={derived || readOnly}
            aria-label={`${label} ${field.label || '선택'}`}
            onChange={(event) => toggleChoice(key, event.currentTarget.checked)}
          />
          {checked && <svg
            className="pdf-form__check-mark"
            width={markSize}
            height={markSize}
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={{ left: (x0 - cx0 + (x1 - x0) / 2) * scale, top: (y0 - cy0 + (y1 - y0) / 2) * scale }}
          ><rect x="1" y="1" width="22" height="22" rx="1" /><path d="M5 12.5 10 17 19 7" /></svg>}
        </label>
      )
    }
    if (field.type === 'image') {
      const value = signatureValue(active.formNo)
      return (
        <button
          key={key}
          type="button"
          id={publicId}
          data-field-ref={fieldRef}
          disabled={readOnly}
          className={`pdf-form__sign ${isMissing && !requirementSatisfied(key) ? 'is-missing' : ''}`}
          style={boxStyle}
          aria-label="서명 입력란"
          title="눌러서 서명"
          onClick={(event) => { signatureTriggerRef.current = event.currentTarget; setLocalError(null); setSignatureTarget(key) }}
        >
          {value && <img src={value} alt="입력한 서명" />}
        </button>
      )
    }
    const value = readText(key)
    const invalidEmail = key === 'email' && !!value && !isValidEmail(normalizeEmail(value))
    const required = requiredItems(active.formNo).includes(key)
    const householdCountEnabled = key !== 'householdSizeCount' || form1.householdSize === '10인 이상'
    const locked = !!identity && (key === 'name' || key === 'birth')
    const dateValue = key === 'birth'
      ? (() => {
          const b = form1.birth
          if (!b.y || !b.m || !b.d) return ''
          return `${b.y}-${String(Number(b.m)).padStart(2, '0')}-${String(Number(b.d)).padStart(2, '0')}`
        })()
      : value
    if (field.auto_date) {
      const text = autoDateText(layouts[active.formNo], field)
      const reference = field.date_reference
      const autoSize = (reference?.size || Number(field.size || 10)) * (reference?.render_size_scale || 1) * scale
      const baseline = (reference?.render_baseline ?? reference?.baseline ?? field.y ?? y1) * scale
      return <span key={key} className={`pdf-form__auto-date pdf-form__auto-date--${reference?.font_family || 'sans'}`} aria-hidden="true" data-auto-date="true" style={{ left: x0 * scale, top: baseline - autoSize * 0.79, width: boxStyle.width, height: autoSize, fontSize: autoSize, lineHeight: `${autoSize}px`, textAlign: field.align || 'center' }}>{text}</span>
    }
    const baseFont = Math.min(12, Math.max(8, Number(field.size || 9) * scale))
    const fitFont = value.length > 0 ? Math.max(7, Math.min(baseFont, boxStyle.width / (value.length * 0.62))) : baseFont
    return (
      <Fragment key={key}>
        <input
        id={publicId}
        data-field-ref={fieldRef}
        type={key === 'transferIn' || key === 'employedAt' ? 'date' : key === 'email' ? 'email' : 'text'}
        className={`pdf-form__text pdf-form__text--${field.font_family || 'sans'} ${isMissing && required ? 'is-missing' : ''}`}
        style={{ ...boxStyle, fontSize: fitFont, textAlign: field.align || 'left' }}
        aria-label={label}
        aria-invalid={invalidEmail || undefined}
        value={key === 'transferIn' || key === 'employedAt' ? isoDate(readForm(form1, key) as unknown as Form1Value['transferIn']) : applyFieldFormat(dateValue, field.format)}
        readOnly={readOnly || locked || !householdCountEnabled || key.startsWith('written') || key.includes('.year') || key.includes('.month') || key.includes('.day')}
        inputMode={key === 'householdSizeCount' || key === 'ecContact' ? 'numeric' : undefined}
        maxLength={key === 'ecContact' ? 13 : undefined}
        max={key === 'transferIn' || key === 'employedAt' ? layouts[active.formNo]?.auto_date : undefined}
        onChange={(event) => {
          const input = event.currentTarget
          const next = event.currentTarget.value
          if (key === 'transferIn' || key === 'employedAt') {
            onForm1({ ...form1, [key]: fromISO(next) })
          } else if (key === 'ecContact' || key === 'mobile') {
            const digitCount = next.slice(0, event.currentTarget.selectionStart ?? next.length).replace(/\D/g, '').length
            const formatted = formatPhone(next)
            setText(key, formatted)
            requestAnimationFrame(() => {
              input.setSelectionRange(phoneCursorPosition(formatted, digitCount), phoneCursorPosition(formatted, digitCount))
            })
          } else setText(key, key === 'email' ? normalizeEmail(next) : next)
        }}
        onBlur={key === 'email' ? () => setText(key, normalizeEmail(value)) : undefined}
        />
        {invalidEmail && <span className="pdf-form__email-hint" role="alert" style={{ left: x0 * scale, top: y1 * scale + 2, width: Math.max(150, 190 * scale), fontSize: Math.max(10, 10 * scale) }}>이메일 형식으로 입력해 주세요.</span>}
      </Fragment>
    )
  }

  const itemLabelForStatus = (formNo: string) => {
    if (!layouts[formNo]) return { state: 'loading', label: '불러오는 중', remaining: 0 }
    if (paperForms[formNo]) return { state: 'paper', label: '스캔본 제출 예정', remaining: 0 }
    const remaining = missing(formNo).length
    if (remaining === 0) return { state: 'done', label: '작성 완료', remaining }
    if (hasStarted(formNo)) return { state: 'draft', label: `작성 중 · 남은 항목 ${remaining}개`, remaining }
    return { state: 'empty', label: '미작성', remaining }
  }

  useEffect(() => {
    if (availableFormCount === 0) return
    onProgress(completedFormCount, availableFormCount)
  }, [availableFormCount, completedFormCount, onProgress])

  const formLabel = (formNo: string) => {
    const layout = layouts[formNo]
    if (!layout) return formNo
    if (!layout.public_form) return layout.title
    const shortTitle = layout.title.replace(/ 및 필수사항.*$/, '')
    return `${layout.public_form} ${shortTitle}`
  }

  const activeStatus = active ? itemLabelForStatus(active.formNo) : null
  const editing = !!active && active.mode === 'edit' && !readOnly && !paperForms[active.formNo]
  // 저장이나 다음 단계를 시도한 서식에서만 남은 빈칸을 오류 색으로 보여 준다.
  const showErrors = editing && !!attemptedForms[active.formNo]
  const hasMissing = editing && (activeStatus?.remaining ?? 0) > 0
  const pageCount = currentLayout?.page_sizes.length ?? 0

  const viewerContent = active && currentLayout ? (
    <fieldset className="pdf-form__contents" disabled={saving || continuing}>
      <div className="pdf-forms__toolbar">
        {hasMissing && (showErrors
          ? <p className="pdf-forms__legend pdf-forms__legend--error"><span className="pdf-forms__legend-swatch" aria-hidden="true" />빨간 테두리 칸이 아직 비어 있습니다.</p>
          : <p className="pdf-forms__legend"><span className="pdf-forms__legend-swatch" aria-hidden="true" />파란 테두리 칸은 작성해야 하는 칸입니다.</p>)}
        <div className="pdf-forms__pager">
          {pageCount > 1 && <button type="button" className="btn btn--small" disabled={page <= 0} onClick={() => changePage(Math.max(0, page - 1))}>
            <Icon name="chevronLeft" size={18} /><span className="pdf-forms__pager-label">이전 쪽</span>
          </button>}
          <span className="pdf-forms__pager-count">{page + 1} / {pageCount}쪽</span>
          {pageCount > 1 && <button type="button" className="btn btn--small" disabled={page >= pageCount - 1} onClick={() => changePage(Math.min(pageCount - 1, page + 1))}>
            <span className="pdf-forms__pager-label">다음 쪽</span><Icon name="chevronRight" size={18} />
          </button>}
        </div>
      </div>
      <p className="pdf-forms__mobile-hint"><Icon name="info" size={18} />서식이 화면보다 넓으면 좌우로 스크롤해 주세요.</p>
      {imageState === 'error' && (
        <div className="pdf-forms__page-error">
          <Notice tone="danger" role="alert" title="서식 화면을 불러오지 못했습니다.">
            <button type="button" className="btn btn--small" onClick={() => setImageRetry((count) => count + 1)}>
              <Icon name="refresh" size={18} />다시 불러오기
            </button>
          </Notice>
        </div>
      )}
      <div className="pdf-form__scroll" ref={scrollRef} data-form-scroll>
        <div
          className={imageState === 'loaded' ? 'pdf-form__page' : 'pdf-form__page pdf-form__page--pending'}
          data-form-page
          style={{ width: pageWidth, height: pageSize ? pageSize.height * scale : 'auto' }}
        >
          <img
            key={imageKey}
            className="pdf-form__background"
            src={pageImageUrl}
            alt={`${formLabel(active.formNo)} ${page + 1}쪽 원본 서식`}
            draggable={false}
            onLoad={() => setImageStatus({ key: imageKey, status: 'loaded' })}
            onError={() => setImageStatus({ key: imageKey, status: 'error' })}
          />
          {showPageSkeleton && (
            <Skeleton className="pdf-forms__page-skeleton" label="서식 화면을 불러오는 중입니다">
              <SheetPlaceholder />
            </Skeleton>
          )}
          {active.mode === 'edit' && (
            <div className="pdf-form__overlay" style={{ width: pageWidth, height: pageSize ? pageSize.height * scale : 'auto' }}>
              {(currentLayout.masks || []).filter((mask) => mask.page === page).map((mask, index) => {
                const [x0, y0, x1, y1] = mask.box
                return <div
                  key={`mask-${index}`}
                  className="pdf-form__mask"
                  aria-hidden="true"
                  style={{ left: x0 * scale, top: y0 * scale, width: (x1 - x0) * scale, height: (y1 - y0) * scale }}
                />
              })}
              {Array.from(new Map(Object.entries(currentLayout.fields).filter(([, field]) => field.control === 'radio_text' && field.group_box).map(([, field]) => [JSON.stringify([field.page, field.group_box]), { page: field.page, box: field.group_box! }])).values()).filter((mask) => mask.page === page).map((mask, index) => {
                const [x0, y0, x1, y1] = mask.box
                return <span key={`selfcheck-cover-${index}`} className="pdf-form__mask" aria-hidden="true" style={{ left: x0 * scale, top: y0 * scale, width: (x1 - x0) * scale, height: (y1 - y0) * scale }} />
              })}
              {missingGroupBoxes(active.formNo, page).map((box, index) => {
                const [x0, y0, x1, y1] = box
                return <span key={`missing-choice-${index}`} className="pdf-form__group-missing" aria-hidden="true" style={{ left: x0 * scale, top: y0 * scale, width: (x1 - x0) * scale, height: (y1 - y0) * scale }} />
              })}
              {Object.entries(currentLayout.fields)
                .sort((a, b) => a[1].page - b[1].page || a[1].box[1] - b[1].box[1] || a[1].box[0] - b[1].box[0])
                .map(renderField)}
            </div>
          )}
        </div>
      </div>
      {active.mode === 'edit' && !readOnly && active.formNo === '서식1' && (
        <div className="pdf-forms__extra">
          <h3 className="pdf-forms__extra-title">기간 산정에 쓰는 날짜</h3>
          <div className="pdf-forms__extra-fields">
            <label className="field">
              <span className="field__label">전북 최종 전입일</span>
              <input className="input" type="date" max={currentLayout?.auto_date} value={isoDate(form1.transferIn)} onChange={(event) => onForm1({ ...form1, transferIn: fromISO(event.currentTarget.value) })} />
            </label>
            <label className="field">
              <span className="field__label">현 직장 입사일</span>
              <input className="input" type="date" max={currentLayout?.auto_date} value={isoDate(form1.employedAt)} onChange={(event) => onForm1({ ...form1, employedAt: fromISO(event.currentTarget.value) })} />
            </label>
          </div>
          <p className="field__hint">날짜를 넣으면 서식의 거주기간·근무기간 칸이 공고일 기준으로 자동 표시됩니다.</p>
          {(isAfterBasis(form1.transferIn, program.announcement_date) || isAfterBasis(form1.employedAt, program.announcement_date)) && (
            <p className="field__error" role="alert"><Icon name="alertCircle" size={18} />공고일({formatDate(program.announcement_date)}) 이후 날짜입니다. 기간 보기에 해당하는 칸이 없습니다.</p>
          )}
        </div>
      )}
    </fieldset>
  ) : null

  const errorNotice = signatureOpen ? null : localError ? (
    <Notice tone="danger" role="alert" className="pdf-forms__error" title={localError.kind === 'save' ? '저장하지 못했습니다' : undefined}>
      <p>{localError.message}</p>
      {localError.kind === 'save' && !readOnly && (
        <button type="button" className="btn btn--small" disabled={saving || continuing} onClick={() => void saveAndClose()}>다시 저장</button>
      )}
    </Notice>
  ) : parentError ? (
    <Notice tone="danger" role="alert" className="pdf-forms__error"><p>{parentError}</p></Notice>
  ) : null

  const busy = saving || continuing
  const saveState = busy ? <><Spinner small />저장 중…</>
    : localError?.kind === 'save' ? <span className="pdf-forms__save-state--failed"><Icon name="alertCircle" size={18} />저장하지 못했습니다</span>
    : hasUnflushedChanges ? <span className="pdf-forms__save-state--pending"><Icon name="info" size={18} />저장하지 않은 변경이 있습니다</span>
    : currentSaveNotice ? <span className="pdf-forms__save-state--saved"><Icon name="checkCircle" size={18} />{currentSaveNotice}</span>
    : null

  const paperChoices = [
    { paper: false, icon: 'pencil', title: '온라인 작성', text: '이 화면에서 바로 작성하고 서명합니다.' },
    { paper: true, icon: 'upload', title: '스캔본 제출', text: '출력해 손으로 쓰고 서명한 뒤 올립니다. 휴대폰 사진도 됩니다.' },
  ] as const

  return (
    <section className={showErrors ? 'pdf-forms pdf-forms--show-errors' : 'pdf-forms'}>
      {errorNotice}
      <div className="pdf-forms__workspace" aria-busy={saving}>
        <aside className="pdf-forms__sidebar">
          <div className="pdf-forms__sidebar-head">
            <h2 className="pdf-forms__sidebar-title">서식 목록</h2>
            {loadState === 'ready' && <span className="pdf-forms__sidebar-count">작성 완료 {completedFormCount} / {availableFormCount}</span>}
          </div>
          <nav className="pdf-forms__nav" aria-label="신청 서식 선택">
            {loadState === 'loading' && (
              <Skeleton className="pdf-forms__nav-skeleton" label="서식 목록을 불러오는 중입니다">
                {[0, 1, 2, 3, 4].map((row) => (
                  <span key={row} className="pdf-forms__nav-skeleton-row">
                    <SkeletonLine width="30%" /><SkeletonLine width="85%" /><SkeletonLine width="45%" />
                  </span>
                ))}
              </Skeleton>
            )}
            <ul ref={navListRef} className="pdf-forms__nav-list">
              {formNos.map((formNo) => {
                const state = itemLabelForStatus(formNo)
                const selected = active?.formNo === formNo
                const layout = layouts[formNo]
                return <li key={formNo}>
                  <button
                    type="button"
                    className={`pdf-forms__nav-item pdf-forms__nav-item--${state.state}${selected ? ' is-active' : ''}`}
                    aria-current={selected ? 'true' : undefined}
                    aria-controls="pdf-form-panel"
                    disabled={!layout || saving || continuing}
                    onClick={() => void selectForm(formNo)}
                  >
                    <span className="pdf-forms__nav-label">{layout?.public_form || formNo}</span>
                    <span className="pdf-forms__nav-title">{layout?.title.replace(/ 및 필수사항.*$/, '') || formNo}</span>
                    <FormStatus state={state.state} label={state.label} />
                    {pendingFormNo === formNo && <span className="pdf-forms__nav-pending"><Spinner small /></span>}
                  </button>
                </li>
              })}
            </ul>
          </nav>
        </aside>
        <section id="pdf-form-panel" className="pdf-forms__panel" aria-labelledby="pdf-form-panel-title">
          <header className="pdf-forms__panel-head">
            <div className="pdf-forms__panel-heading">
              <h2 id="pdf-form-panel-title" tabIndex={-1}>{active ? formLabel(active.formNo) : loadState === 'failed' ? '서식을 불러오지 못했습니다' : '서식을 불러오고 있습니다'}</h2>
              <p className="pdf-forms__panel-state">
                {active && activeStatus && (readOnly
                  ? <FormStatus state="locked" label="제출한 서식입니다" />
                  : paperForms[active.formNo]
                    ? <FormStatus state="paper" label="스캔본 제출" />
                    : active.mode === 'preview'
                      ? <FormStatus state="preview" label="미리보기" />
                      : <FormStatus state={activeStatus.state} label={activeStatus.label} />)}
                <span className="pdf-forms__save-state" role="status">{!readOnly && saveState}</span>
              </p>
            </div>
            {loadState === 'ready' && <div className="pdf-forms__panel-actions">
              {active && !paperForms[active.formNo] && !readOnly && <>
                <button type="button" className="btn btn--quiet btn--small pdf-forms__reset" disabled={busy || activeStatus?.state === 'empty'} onClick={() => void resetForm(active.formNo)}>다시 작성</button>
                <span className="pdf-forms__action-divider" aria-hidden="true" />
              </>}
              <ApplicantFormsBulkMenu
                applicationId={applicationId}
                refreshKey={thumbnailVersion}
                label="내려받기"
                small
                closeKey={`${active?.formNo ?? ''}:${active?.mode ?? ''}:${confirmRequest ? 'confirm' : ''}:${signatureOpen ? 'sign' : ''}`}
              />
              {active && !paperForms[active.formNo] && !readOnly && <>
                {active.mode === 'preview'
                  ? <button type="button" className="btn btn--small" disabled={busy} onClick={() => { setSignatureTarget(null); setActive({ ...active, mode: 'edit' }) }}>수정하기</button>
                  : <button type="button" className="btn btn--small" disabled={busy} onClick={() => void startPreview(active.formNo)}>미리보기</button>}
                <button type="button" className="btn btn--primary btn--small pdf-forms__save" disabled={busy} onClick={() => void saveAndClose()}>저장</button>
              </>}
            </div>}
          </header>
          {active && paperAllowed[active.formNo] && (
            <div className="pdf-forms__paper-options" role="radiogroup" aria-labelledby="pdf-forms-paper-title">
              <p id="pdf-forms-paper-title" className="pdf-forms__paper-title">작성 방식</p>
              <div className="pdf-forms__paper-choices">
                {paperChoices.map((choice) => {
                  const selected = !!paperForms[active.formNo] === choice.paper
                  return (
                    <label key={choice.title} className={`pdf-forms__paper-choice${selected ? ' is-selected' : ''}${readOnly || busy ? ' is-disabled' : ''}`}>
                      <input type="radio" name="pdf-forms-paper-mode" checked={selected} disabled={readOnly || busy} onChange={() => void changePaperMode(active.formNo, choice.paper)} />
                      <span className="pdf-forms__paper-choice-copy">
                        <strong><Icon name={choice.icon} size={18} />{choice.title}</strong>
                        <span>{choice.text}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
          {active && paperForms[active.formNo] ? (
            <div className="pdf-forms__paper-state">
              <span className="pdf-forms__paper-icon" aria-hidden="true"><Icon name="upload" size={28} /></span>
              <h3>스캔본으로 제출하는 서식입니다</h3>
              <p>위의 내려받기 메뉴에서 서식을 받아 작성하고 서명해 주세요.<br />작성한 서류는 다음 단계인 서류 업로드에서 올릴 수 있습니다.</p>
            </div>
          ) : viewerContent || (loadState === 'failed' ? (
            <div className="pdf-forms__load-failed">
              <Notice tone="danger" role="alert">
                <p>{loadError}</p>
                <button type="button" className="btn btn--small" onClick={() => { setLoadState('loading'); setLoadAttempt((count) => count + 1) }}>
                  <Icon name="refresh" size={18} />다시 시도
                </button>
              </Notice>
            </div>
          ) : (
            <Skeleton className="pdf-forms__loading" label="서식을 불러오는 중입니다">
              <SheetPlaceholder />
            </Skeleton>
          ))}
        </section>
      </div>

      {!readOnly && incompleteNotice > 0 && !allReady && incompleteForms.length > 0 && (
        <Notice ref={incompleteRef} tabIndex={-1} tone="warning" className="pdf-forms__incomplete" title="아직 작성하지 않은 서식이 있습니다">
          <p>아래 서식을 누르면 빈칸이 있는 곳으로 이동합니다.</p>
          <ul className="pdf-forms__incomplete-list">
            {incompleteForms.map((formNo) => (
              <li key={formNo}>
                <button type="button" className="pdf-forms__incomplete-item" disabled={busy} onClick={() => void selectForm(formNo, true)}>
                  <span>{formLabel(formNo)} — 남은 항목 {missing(formNo).length}개</span>
                  <Icon name="chevronRight" size={18} />
                </button>
              </li>
            ))}
          </ul>
        </Notice>
      )}
      {!readOnly && (
        <div className="flow__actions">
          <button type="button" className={continuing ? 'btn btn--primary btn--lg btn--busy' : 'btn btn--primary btn--lg'} disabled={busy || loadState !== 'ready'} aria-busy={continuing || undefined} onClick={submitWorkspace}>
            {continuing && <Spinner small />}서류 업로드로
          </button>
        </div>
      )}

      {confirmRequest && (
        <ConfirmDialog
          title={confirmRequest.title}
          description={confirmRequest.description}
          confirmLabel={confirmRequest.confirmLabel}
          tone={confirmRequest.tone}
          onConfirm={() => answerConfirm(true)}
          onCancel={() => answerConfirm(false)}
        />
      )}

      {active?.mode === 'edit' && active.formNo === '서식5' && !readOnly && signatureTarget && createPortal(
        <div className="form-signature__overlay" onClick={() => setSignatureTarget(null)}>
          <div ref={signatureDialogRef} className="form-signature" role="dialog" aria-modal="true" aria-labelledby="form-signature-title" onClick={(event) => event.stopPropagation()}>
            <header className="form-signature__head">
              <h2 id="form-signature-title" ref={signatureTitleRef} className="form-signature__title" tabIndex={-1}>서명하기</h2>
              <button type="button" className="form-signature__close" aria-label="닫기" onClick={() => setSignatureTarget(null)}><Icon name="close" /></button>
            </header>
            <div className="form-signature__tabs" role="group" aria-label="서명 방식">
              <button type="button" disabled={saving} aria-pressed={signMode === '화면에 서명'} className={signMode === '화면에 서명' ? 'is-active' : ''} onClick={() => void changeSignMode('화면에 서명')}>
                {signMode === '화면에 서명' && <Icon name="check" size={18} />}직접 서명
              </button>
              <button type="button" disabled={saving} aria-pressed={signMode === '서명 이미지 올리기'} className={signMode === '서명 이미지 올리기' ? 'is-active' : ''} onClick={() => void changeSignMode('서명 이미지 올리기')}>
                {signMode === '서명 이미지 올리기' && <Icon name="check" size={18} />}서명 파일 올리기
              </button>
            </div>
            <div className="form-signature__body" inert={saving}>
              {signMode === '화면에 서명' ? (
                <SignaturePad key={form5.signature ? 'signed' : 'empty'} value={form5.signature} onChange={(value) => setSignature('서식5', value)} width={Math.min(420, Math.max(220, window.innerWidth - 96))} height={210} />
              ) : (
                <div className="form-signature__upload">
                  {form5.signatureScanUploaded ? <img src={signatureValue('서식5')} alt="업로드한 서명 미리보기" /> : <span>JPG 또는 PNG 서명 파일을 올려 주세요. (10MB 이하)</span>}
                  <label className="btn" htmlFor="form-signature-file"><Icon name="upload" size={18} />{form5.signatureScanUploaded ? '다른 파일 선택' : '파일 선택'}</label>
                  <input id="form-signature-file" type="file" disabled={saving} accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={(event) => void uploadScan(event.currentTarget.files?.[0], event.currentTarget)} />
                </div>
              )}
            </div>
            {localError && <p className="field__error form-signature__error" role="alert"><Icon name="alertCircle" size={18} />{localError.message}</p>}
            {saving && <p className="form-signature__status"><Spinner small label="서명을 저장하고 있습니다…" /></p>}
            <footer className="form-signature__foot">
              <button type="button" className="btn btn--quiet form-signature__clear" disabled={saving || (signMode === '화면에 서명' ? !form5.signature : !form5.signatureScanUploaded)} onClick={() => signMode === '화면에 서명' ? setSignature('서식5', '') : void removeScan()}>
                <Icon name="trash" size={18} />지우기
              </button>
              <button type="button" className="btn btn--primary" disabled={saving || (signMode === '화면에 서명' ? !form5.signature : !form5.signatureScanUploaded)} onClick={() => setSignatureTarget(null)}>확인</button>
            </footer>
          </div>
        </div>, document.body,
      )}
    </section>
  )
}

/** 서식 쪽 그림이 오기 전에 보여 주는 빈 종이 모양의 자리 표시. */
function SheetPlaceholder() {
  return (
    <span className="pdf-forms__sheet-placeholder" aria-hidden="true">
      <SkeletonLine width="42%" />
      <SkeletonBlock />
      <SkeletonLine width="100%" />
      <SkeletonLine width="94%" />
      <SkeletonLine width="97%" />
      <SkeletonLine width="60%" />
      <SkeletonBlock />
    </span>
  )
}

/** 서식 상태 한 줄: 아이콘과 글자로 함께 알린다(목록과 문서 머리가 같이 쓴다). */
function FormStatus({ state, label }: { state: string; label: string }) {
  const icon = state === 'done' ? 'checkCircle'
    : state === 'draft' ? 'pencil'
      : state === 'paper' ? 'upload'
        : state === 'preview' ? 'eye'
          : state === 'locked' ? 'lock'
            : null
  return (
    <span className={`pdf-forms__status pdf-forms__status--${state}`}>
      {icon && <Icon name={icon} size={16} />}
      {label}
    </span>
  )
}

function isoDate(value: Form1Value['transferIn']): string {
  if (!value.y || !value.m || !value.d) return ''
  return `${value.y}-${String(Number(value.m)).padStart(2, '0')}-${String(Number(value.d)).padStart(2, '0')}`
}

function fromISO(value: string): Form1Value['transferIn'] {
  if (!value) return { y: '', m: '', d: '' }
  const [y, m, d] = value.split('-')
  return { y, m: String(Number(m)), d: String(Number(d)) }
}

function isAfterBasis(value: Form1Value['transferIn'], basis: string): boolean {
  const selected = isoDate(value)
  return !!selected && selected > basis
}
