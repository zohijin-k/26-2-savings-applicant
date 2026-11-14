/**
 * 본인인증 입력값 확인. 화면(React)과 무관한 순수 함수만 둔다.
 * 각 함수는 고쳐야 할 내용을 문장으로 돌려주고, 문제가 없으면 null을 돌려준다.
 * 서버도 같은 값을 다시 확인한다. 여기서는 보내기 전에 알 수 있는 것만 걸러 낸다.
 */

import { isValidPhone } from '../forms/phone.ts'

export interface BirthParts {
  y: string
  m: string
  d: string
}

/** 화면에 나오는 순서. 오류 요약과 첫 오류 칸으로의 포커스 이동이 이 순서를 따른다. */
export const IDENTITY_FIELDS = ['name', 'birth', 'phone', 'pledge', 'signature'] as const
export type IdentityField = (typeof IDENTITY_FIELDS)[number]
export type IdentityErrors = Partial<Record<IdentityField, string>>

export const IDENTITY_ERROR_COPY = {
  name: '성명을 입력해 주세요.',
  birthMissing: '생년월일을 모두 입력해 주세요.',
  birthInvalid: '생년월일을 다시 확인해 주세요. 달력에 있는 날짜를 입력해 주세요.',
  phone: '010으로 시작하는 휴대폰 번호 11자리를 입력해 주세요.',
  pledge: '서약 내용을 확인하고 동의해 주세요.',
  signature: '서명을 해 주세요.',
} as const

const EARLIEST_BIRTH_YEAR = 1900

export interface CalendarDay {
  year: number
  month: number
  day: number
}

/** 보는 기기의 오늘 날짜. */
export function todayOf(now: Date = new Date()): CalendarDay {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
}

function daysInMonth(year: number, month: number): number {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
}

export function validateName(name: string): string | null {
  return name.trim() ? null : IDENTITY_ERROR_COPY.name
}

/**
 * 세 칸이 모두 채워졌는지, 달력에 있는 날짜인지(2월 31일 등), 1900년부터 오늘까지인지 확인한다.
 * 연도는 네 자리여야 한다.
 */
export function validateBirth(birth: BirthParts, today: CalendarDay = todayOf()): string | null {
  const [y, m, d] = [birth.y.trim(), birth.m.trim(), birth.d.trim()]
  if (!y || !m || !d) return IDENTITY_ERROR_COPY.birthMissing
  if (!/^\d{4}$/.test(y) || !/^\d{1,2}$/.test(m) || !/^\d{1,2}$/.test(d)) return IDENTITY_ERROR_COPY.birthInvalid
  const [year, month, day] = [Number(y), Number(m), Number(d)]
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return IDENTITY_ERROR_COPY.birthInvalid
  if (year < EARLIEST_BIRTH_YEAR) return IDENTITY_ERROR_COPY.birthInvalid
  const future = year > today.year
    || (year === today.year && (month > today.month || (month === today.month && day > today.day)))
  return future ? IDENTITY_ERROR_COPY.birthInvalid : null
}

export function validatePhone(phone: string): string | null {
  return isValidPhone(phone) ? null : IDENTITY_ERROR_COPY.phone
}

export function validatePledge(agreed: boolean): string | null {
  return agreed ? null : IDENTITY_ERROR_COPY.pledge
}

export function validateSignature(signature: string): string | null {
  return signature ? null : IDENTITY_ERROR_COPY.signature
}

export interface IdentityInput {
  name: string
  birth: BirthParts
  phone: string
  pledge: boolean
  /** 서버로 보낼 서명 값(data URL). 서명하지 않았으면 빈 문자열. */
  signature: string
}

/** 고쳐야 할 항목만 담아 돌려준다. 모두 맞으면 빈 객체다. */
export function validateIdentity(input: IdentityInput, today: CalendarDay = todayOf()): IdentityErrors {
  const found: Record<IdentityField, string | null> = {
    name: validateName(input.name),
    birth: validateBirth(input.birth, today),
    phone: validatePhone(input.phone),
    pledge: validatePledge(input.pledge),
    signature: validateSignature(input.signature),
  }
  const errors: IdentityErrors = {}
  for (const field of IDENTITY_FIELDS) {
    const message = found[field]
    if (message) errors[field] = message
  }
  return errors
}

/** 화면 순서로 첫 번째 오류 항목. 없으면 null. */
export function firstInvalidField(errors: IdentityErrors): IdentityField | null {
  return IDENTITY_FIELDS.find((field) => errors[field]) ?? null
}
