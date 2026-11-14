/**
 * 본인인증 (데모).
 *
 * 업로드 서류가 '이 신청자의 것인지' 대조하려면 기준 신원이 먼저 있어야 한다.
 * 신청서에 손으로 적은 성명·생년월일은 기준이 될 수 없으므로 신청 맨 앞에서 정한다.
 *
 * 실서비스는 로그인할 때 PASS·간편인증으로 받는다. 데모는 그 단계를 흉내 내어
 * 입력값을 그대로 인증 결과로 쓴다. 서약 서명은 신원 증명이 아니라
 * "본인 서류만 제출한다"는 책임 확인이다.
 *
 * 서명은 화면에 직접 하거나, 서명 파일(PNG·JPG·PDF, 5MB 이하)을 올린다.
 *
 * 인증 뒤에는 성명·생년월일을 고칠 수 없으므로, 보내기 전에 입력값을 다시 보여 주고 확인받는다.
 * 주 버튼은 빠진 항목이 있어도 꺼 두지 않는다. 누르면 무엇이 빠졌는지 알려 주고 첫 항목으로 옮긴다.
 */

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'

import { verifyIdentity, type Identity } from '../../api.ts'
import ConfirmDialog from '../../components/ConfirmDialog.tsx'
import FilePreview from '../../components/FilePreview.tsx'
import Icon from '../../components/Icon.tsx'
import Notice from '../../components/Notice.tsx'
import PdfPages from '../../components/PdfPages.tsx'
import SignaturePad from '../../components/SignaturePad.tsx'
import Spinner from '../../components/Spinner.tsx'
import { DateTriple } from '../../forms/FormSheet.tsx'
import { formatPhone, isValidPhone, phoneCursorPosition } from '../../forms/phone.ts'
import { EMPTY_YMD, ymdToISO, type YMD } from '../../forms/ymd.ts'
import { friendlyError } from '../../lib/error-copy.ts'
import { formatDate } from '../../lib/format.ts'
import {
  IDENTITY_FIELDS,
  firstInvalidField,
  validateIdentity,
  type IdentityField,
} from '../../lib/identity-validation.ts'
import './identity-check.css'

const SIGN_MODES = ['직접 서명', '서명 파일 올리기'] as const
type SignMode = (typeof SIGN_MODES)[number]

const SIGN_FILE_ACCEPT = '.png,.jpg,.jpeg,.pdf'
const SIGN_FILE_MAX = 5 * 1024 * 1024
/** 확장자 → 형식. 브라우저가 형식을 비워 보내는 경우가 있어 확장자로도 판별한다. */
const SIGN_FILE_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  pdf: 'application/pdf',
}

/** 서명 칸의 최대 폭과 높이(px). */
const SIGN_MAX_WIDTH = 560
const SIGN_HEIGHT = 200

function signFileType(file: File): string | null {
  if (Object.values(SIGN_FILE_EXT).includes(file.type)) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return SIGN_FILE_EXT[ext] ?? null
}

interface SignFile {
  name: string
  type: string
  /** 서버로 보낼 값 */
  dataUrl: string
  /** 화면 미리보기용 (blob URL) */
  previewUrl: string
}

const PLEDGE =
  '본인은 위 정보의 당사자이며, 신청에 제출하는 서류는 모두 본인 명의임을 확인합니다. ' +
  '타인의 서류를 제출하거나 사실과 다른 내용을 제출한 경우 선정 취소 등 불이익을 받는 데 동의합니다.'

const VERIFY_ERROR_COPY = '본인인증을 마치지 못했습니다. 입력한 내용을 확인한 뒤 다시 시도해 주세요.'

interface Props {
  appId: number
  /** 이미 인증을 마쳤으면 결과만 보여준다 */
  identity: Identity | null
  onVerified: (identity: Identity, mobile: string) => void
  onNext: () => void
}

function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p className="field__error" id={id}>
      <Icon name="alertCircle" size={18} />
      <span>{children}</span>
    </p>
  )
}

export default function IdentityCheck({ appId, identity, onVerified, onNext }: Props) {
  const [name, setName] = useState('')
  const [birth, setBirth] = useState<YMD>(EMPTY_YMD)
  const [phone, setPhone] = useState('')
  const phoneInput = useRef<HTMLInputElement>(null)
  const pendingPhoneCaret = useRef<number | null>(null)
  const [pledge, setPledge] = useState(false)
  const [signMode, setSignMode] = useState<SignMode>('직접 서명')
  const [drawn, setDrawn] = useState('')
  // 지우기를 누르면 서명 칸을 새로 만든다. 폭이 바뀔 때는 새로 만들지 않아 서명이 남는다.
  const [padKey, setPadKey] = useState(0)
  const signBody = useRef<HTMLDivElement>(null)
  const [signWidth, setSignWidth] = useState(320)
  const [file, setFile] = useState<SignFile | null>(null)
  const [fileKey, setFileKey] = useState(0)
  const [fileError, setFileError] = useState('')
  const [viewing, setViewing] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<IdentityField, boolean>>>({})
  const [attempted, setAttempted] = useState(false)
  const [serverError, setServerError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const summary = useRef<HTMLDivElement>(null)
  const submitButton = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    const input = phoneInput.current
    const digits = pendingPhoneCaret.current
    if (!input || digits === null) return
    const position = phoneCursorPosition(phone, digits)
    input.setSelectionRange(position, position)
    pendingPhoneCaret.current = null
  }, [phone])

  // 미리보기 URL은 파일을 바꾸거나 화면을 떠날 때 해제한다.
  useEffect(() => {
    if (!file) return undefined
    return () => URL.revokeObjectURL(file.previewUrl)
  }, [file])

  useLayoutEffect(() => {
    const body = signBody.current
    if (!body) return undefined
    const updateWidth = () => setSignWidth(Math.min(SIGN_MAX_WIDTH, Math.max(1, Math.floor(body.clientWidth))))
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(body)
    return () => observer.disconnect()
  }, [identity])

  // 서버가 돌려준 오류는 요약 자리로 포커스를 옮겨 바로 읽히게 한다.
  useEffect(() => {
    if (serverError) summary.current?.focus()
  }, [serverError])

  if (identity) {
    return (
      <section className="card idcheck" aria-labelledby="identity-title">
        <h2 id="identity-title" tabIndex={-1}>본인인증</h2>
        <Notice tone="success" title="본인인증을 마쳤습니다.">
          <dl className="fact-list idcheck__verified">
            <div>
              <dt>성명</dt>
              <dd>{identity.name}</dd>
            </div>
            <div>
              <dt>생년월일</dt>
              <dd>{formatDate(identity.birth)}</dd>
            </div>
            <div>
              <dt>휴대폰</dt>
              <dd>{identity.phone}</dd>
            </div>
          </dl>
        </Notice>
        <p className="idcheck__after">
          신청서의 성명·생년월일은 이 정보로 채워지며 고칠 수 없습니다. 올리시는 서류도 이
          정보와 같은 사람의 것인지 확인합니다.
        </p>
        <p className="idcheck__after idcheck__after--hint">
          입력한 정보가 틀렸다면 화면 맨 위 왼쪽의 배너를 눌러 새 신청을 시작해 주세요.
        </p>
        <div className="flow__actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={onNext}>
            서식 작성으로
          </button>
        </div>
      </section>
    )
  }

  const birthISO = ymdToISO(birth)
  const signature = signMode === '직접 서명' ? drawn : (file?.dataUrl ?? '')
  const phoneDigits = phone.replace(/\D/g, '')

  const errors = validateIdentity({ name, birth, phone, pledge, signature })
  // 건드리지 않은 칸에는 오류를 보이지 않는다. 한 번 "본인인증"을 누른 뒤에는 모두 보인다.
  const shows = (field: IdentityField) =>
    attempted || touched[field] || (field === 'phone' && phoneDigits.length === 11 && !isValidPhone(phone))
  const shown = (field: IdentityField): string | undefined => (shows(field) ? errors[field] : undefined)
  const nameError = shown('name')
  const birthError = shown('birth')
  const phoneError = shown('phone')
  const pledgeError = shown('pledge')
  const signError = fileError || shown('signature')
  const summaryFields = attempted ? IDENTITY_FIELDS.filter((field) => errors[field]) : []

  const touch = (field: IdentityField) => setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }))

  const controlId = (field: IdentityField): string => {
    if (field === 'name') return 'identity-name'
    if (field === 'birth') {
      const emptyPart = (['y', 'm', 'd'] as const).find((part) => !birth[part])
      return `identity-birth-${emptyPart ?? 'y'}`
    }
    if (field === 'phone') return 'identity-phone'
    if (field === 'pledge') return 'identity-pledge'
    return signMode === '직접 서명' ? 'identity-sign-draw' : 'identity-sign-file'
  }

  const focusField = (field: IdentityField) => {
    document.getElementById(controlId(field))?.focus()
  }

  /** 서명 파일을 data URL로 읽는다. 형식·크기는 서버도 다시 확인한다. */
  const pickFile = (picked: File | undefined) => {
    setFileError('')
    setServerError('')
    if (!picked) {
      setFile(null)
      return
    }
    const type = signFileType(picked)
    if (!type) {
      setFile(null)
      setFileError('서명 파일은 PNG·JPG·PDF만 올릴 수 있습니다.')
      return
    }
    if (picked.size > SIGN_FILE_MAX) {
      setFile(null)
      setFileError('서명 파일은 5MB 이하로 올려 주세요.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      // 형식을 비워 보낸 파일도 서버가 읽을 수 있게 data URL 머리를 판별한 형식으로 맞춘다.
      const raw = String(reader.result)
      const dataUrl = `data:${type};base64,${raw.slice(raw.indexOf(',') + 1)}`
      setFile({ name: picked.name, type, dataUrl, previewUrl: URL.createObjectURL(picked) })
    }
    reader.readAsDataURL(picked)
  }

  const clearFile = () => {
    setFile(null)
    setFileError('')
    setFileKey((k) => k + 1) // 같은 파일을 다시 고를 수 있게 입력칸을 새로 만든다
  }

  const clearSignature = () => {
    if (signMode === '직접 서명') {
      setDrawn('')
      setPadKey((k) => k + 1)
    } else {
      clearFile()
    }
  }

  const verify = async () => {
    setConfirming(false)
    if (busy) return
    setBusy(true)
    setServerError('')
    try {
      const result = await verifyIdentity(appId, {
        name,
        birth: birthISO,
        phone,
        pledge,
        signature_data_url: signature,
        signature_kind: signMode === '직접 서명' ? 'electronic' : 'uploaded',
      })
      onVerified(result, phone)
    } catch (e) {
      setServerError(friendlyError(e, VERIFY_ERROR_COPY))
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy || confirming) return
    setServerError('')
    const first = firstInvalidField(errors)
    if (first) {
      setAttempted(true)
      focusField(first)
      return
    }
    setConfirming(true)
  }

  const onSummaryLink = (event: MouseEvent<HTMLAnchorElement>, field: IdentityField) => {
    event.preventDefault()
    focusField(field)
  }

  const describedBy = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(' ') || undefined

  return (
    <section className="card idcheck" aria-labelledby="identity-title">
      <h2 id="identity-title" tabIndex={-1}>본인인증</h2>

      <Notice tone="info" title="신청 전에 확인해 주세요">
        <ul>
          <li>신청은 본인인증 → 서식 작성 → 서류 업로드 및 제출 순서로 진행합니다.</li>
          <li>증빙서류는 발급처에서 받은 PDF 파일로 준비하면 가장 빠르고 정확하게 확인됩니다.</li>
          <li>작성 중인 신청은 이 창(탭)에서만 이어서 쓸 수 있습니다. 제출을 마칠 때까지 창을 닫지 마세요.</li>
          <li>본인인증에 입력한 성명·생년월일은 신청서에 그대로 들어가며 나중에 고칠 수 없습니다.</li>
        </ul>
      </Notice>
      <Notice tone="neutral">
        데모 화면입니다. 실제 서비스에서는 로그인할 때 휴대폰·간편인증으로 대신합니다.
      </Notice>

      <form className="idcheck__form" noValidate onSubmit={onSubmit} aria-busy={busy}>
        {serverError ? (
          <Notice ref={summary} tone="danger" role="alert" tabIndex={-1} title="본인인증을 마치지 못했습니다" className="idcheck__summary">
            {serverError}
          </Notice>
        ) : summaryFields.length > 0 && (
          <Notice tone="danger" role="alert" title="입력 내용을 확인해 주세요" className="idcheck__summary">
            <ul>
              {summaryFields.map((field) => (
                <li key={field}>
                  <a className="link" href={`#${controlId(field)}`} onClick={(event) => onSummaryLink(event, field)}>
                    {errors[field]}
                  </a>
                </li>
              ))}
            </ul>
          </Notice>
        )}

        <div className="field idcheck__field">
          <label className="field__label" htmlFor="identity-name">
            성명<span className="field__req">필수</span>
          </label>
          <input
            id="identity-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { if (name) touch('name') }}
            autoComplete="name"
            aria-required="true"
            aria-invalid={nameError ? true : undefined}
            aria-describedby={describedBy(nameError && 'identity-name-error')}
          />
          {nameError && <FieldError id="identity-name-error">{nameError}</FieldError>}
        </div>

        <div className="field">
          <span className="field__label" id="identity-birth-label">
            생년월일<span className="field__req">필수</span>
          </span>
          <DateTriple
            variant="ui"
            value={birth}
            onChange={setBirth}
            ariaPrefix="생년월일"
            idPrefix="identity-birth"
            invalid={Boolean(birthError)}
            describedBy={describedBy('identity-birth-hint', birthError && 'identity-birth-error')}
            onBlur={() => { if (birth.y || birth.m || birth.d) touch('birth') }}
          />
          <p className="field__hint" id="identity-birth-hint">예: 1998년 6월 15일</p>
          {birthError && <FieldError id="identity-birth-error">{birthError}</FieldError>}
        </div>

        <div className="field idcheck__field">
          <label className="field__label" htmlFor="identity-phone">
            휴대폰<span className="field__req">필수</span>
          </label>
          <input
            id="identity-phone"
            className="input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={13}
            placeholder="010-0000-0000"
            value={phone}
            ref={phoneInput}
            aria-required="true"
            aria-invalid={phoneError ? true : undefined}
            aria-describedby={describedBy('identity-phone-hint', phoneError && 'identity-phone-error')}
            onBlur={() => { if (phone) touch('phone') }}
            onChange={(e) => {
              const input = e.currentTarget
              const beforeCursor = input.value.slice(0, input.selectionStart ?? input.value.length)
              let digitCount = beforeCursor.replace(/\D/g, '').length
              if (beforeCursor.trimStart().startsWith('+82') && digitCount >= 2) digitCount -= 1
              pendingPhoneCaret.current = digitCount
              setPhone(formatPhone(input.value))
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text')
              if (!pasted) return
              e.preventDefault()
              const formatted = formatPhone(pasted)
              pendingPhoneCaret.current = formatted.replace(/\D/g, '').length
              setPhone(formatted)
            }}
            onKeyDown={(e) => {
              const input = e.currentTarget
              const cursor = input.selectionStart
              if (
                e.key !== 'Backspace' ||
                cursor === null ||
                cursor !== input.selectionEnd ||
                cursor === 0 ||
                input.value[cursor - 1] !== '-'
              ) return
              e.preventDefault()
              const digitCount = input.value.slice(0, cursor).replace(/\D/g, '').length
              const digits = phone.replace(/\D/g, '')
              if (digitCount === 0) return
              pendingPhoneCaret.current = digitCount - 1
              setPhone(formatPhone(`${digits.slice(0, digitCount - 1)}${digits.slice(digitCount)}`))
            }}
          />
          <p className="field__hint" id="identity-phone-hint">010으로 시작하는 번호</p>
          {phoneError && <FieldError id="identity-phone-error">{phoneError}</FieldError>}
        </div>

        <div className="card__panel idcheck__pledge">
          <h3 className="idcheck__pledge-title">
            본인 확인 서약<span className="field__req">필수</span>
          </h3>
          <p className="idcheck__pledge-text">{PLEDGE}</p>
          <label className="check idcheck__agree">
            <input
              id="identity-pledge"
              type="checkbox"
              checked={pledge}
              onChange={(e) => { setPledge(e.target.checked); touch('pledge') }}
              aria-required="true"
              aria-invalid={pledgeError ? true : undefined}
              aria-describedby={describedBy(pledgeError && 'identity-pledge-error')}
            />
            <span>위 내용을 확인했으며 동의합니다.</span>
          </label>
          {pledgeError && <FieldError id="identity-pledge-error">{pledgeError}</FieldError>}
        </div>

        <div className="field idcheck__sign">
          <span className="field__label" id="identity-sign-label">
            서명<span className="field__req">필수</span>
          </span>
          <div
            className="idcheck__modes"
            role="radiogroup"
            aria-labelledby="identity-sign-label"
            aria-describedby={describedBy(signError && 'identity-sign-error')}
          >
            {SIGN_MODES.map((mode) => (
              <label key={mode} className="idcheck__mode">
                <input
                  id={mode === '직접 서명' ? 'identity-sign-draw' : 'identity-sign-upload'}
                  type="radio"
                  name="identity-sign-mode"
                  checked={signMode === mode}
                  onChange={() => {
                    setSignMode(mode)
                    setFileError('')
                    setServerError('')
                  }}
                />
                <span>
                  {signMode === mode && <Icon name="check" size={18} />}
                  {mode}
                </span>
              </label>
            ))}
          </div>

          <div className={signError ? 'idcheck__sign-area is-invalid' : 'idcheck__sign-area'} ref={signBody}>
            {signMode === '직접 서명' ? (
              <SignaturePad
                key={padKey}
                value={drawn}
                onChange={(next) => { setDrawn(next); touch('signature') }}
                width={signWidth}
                height={SIGN_HEIGHT}
              />
            ) : (
              <div className="idcheck__file">
                {file ? (
                  <button type="button" className="idcheck__preview" onClick={() => setViewing(true)} aria-label="올린 서명 크게 보기">
                    {file.type === 'application/pdf' ? (
                      <PdfPages url={file.previewUrl} width={Math.min(signWidth - 48, 280)} maxHeight={112} maxPages={1} />
                    ) : (
                      <img src={file.previewUrl} alt="올린 서명 미리보기" />
                    )}
                    <span className="idcheck__zoomhint" aria-hidden="true"><Icon name="eye" size={16} />크게 보기</span>
                  </button>
                ) : (
                  <p className="idcheck__file-guide">
                    <Icon name="upload" size={24} />
                    <span>PNG·JPG·PDF 서명 파일을 올려 주세요. (5MB 이하)</span>
                  </p>
                )}
                {file && <p className="idcheck__filename">{file.name}</p>}
                <input
                  key={fileKey}
                  id="identity-sign-file"
                  className="sr-only"
                  type="file"
                  accept={SIGN_FILE_ACCEPT}
                  aria-label="서명 파일"
                  aria-describedby={describedBy(signError && 'identity-sign-error')}
                  onChange={(e) => { pickFile(e.target.files?.[0]); touch('signature') }}
                />
                <label className="btn btn--small idcheck__file-pick" htmlFor="identity-sign-file">
                  {file ? '다른 파일 선택' : '파일 선택'}
                </label>
              </div>
            )}
          </div>
          <div className="idcheck__sign-foot">
            {signError ? <FieldError id="identity-sign-error">{signError}</FieldError> : <span />}
            <button
              type="button"
              className="btn btn--quiet btn--small"
              disabled={signMode === '직접 서명' ? !drawn : !file}
              onClick={clearSignature}
            >
              <Icon name="trash" size={18} />
              지우기
            </button>
          </div>
        </div>

        <div className="flow__actions">
          <button
            ref={submitButton}
            type="submit"
            className={busy ? 'btn btn--primary btn--lg btn--busy' : 'btn btn--primary btn--lg'}
            aria-busy={busy || undefined}
          >
            {busy && <Spinner small />}
            본인인증
          </button>
        </div>
      </form>

      {file && viewing && (
        <FilePreview
          url={file.previewUrl}
          name={file.name}
          kind={file.type === 'application/pdf' ? 'pdf' : 'image'}
          onClose={() => setViewing(false)}
        />
      )}

      {confirming && (
        <ConfirmDialog
          title="입력한 정보가 맞습니까?"
          confirmLabel="맞습니다, 본인인증"
          cancelLabel="다시 확인"
          onConfirm={() => void verify()}
          onCancel={() => setConfirming(false)}
          returnFocus={() => submitButton.current}
        >
          <dl className="fact-list">
            <div>
              <dt>성명</dt>
              <dd>{name}</dd>
            </div>
            <div>
              <dt>생년월일</dt>
              <dd>{formatDate(birthISO)}</dd>
            </div>
            <div>
              <dt>휴대폰</dt>
              <dd>{phone}</dd>
            </div>
          </dl>
          <p className="idcheck__confirm-note">확인 후에는 성명과 생년월일을 고칠 수 없습니다.</p>
        </ConfirmDialog>
      )}
    </section>
  )
}
