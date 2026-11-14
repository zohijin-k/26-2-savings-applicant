import assert from 'node:assert/strict'
import test from 'node:test'

import {
  IDENTITY_ERROR_COPY,
  IDENTITY_FIELDS,
  firstInvalidField,
  todayOf,
  validateBirth,
  validateIdentity,
  validateName,
  validatePhone,
  validatePledge,
  validateSignature,
} from '../src/lib/identity-validation.ts'

const TODAY = { year: 2026, month: 11, day: 14 }
const VALID = {
  name: '홍길동',
  birth: { y: '1998', m: '6', d: '15' },
  phone: '010-0000-0000',
  pledge: true,
  signature: 'data:image/png;base64,AAAA',
}

test('validateName requires something other than spaces', () => {
  assert.equal(validateName('홍길동'), null)
  assert.equal(validateName(' 홍길동 '), null)
  assert.equal(validateName(''), IDENTITY_ERROR_COPY.name)
  assert.equal(validateName('   '), IDENTITY_ERROR_COPY.name)
})

test('validateBirth asks for all three parts before judging the date', () => {
  for (const birth of [
    { y: '', m: '', d: '' },
    { y: '1998', m: '', d: '15' },
    { y: '1998', m: '6', d: '' },
    { y: '', m: '6', d: '15' },
    { y: ' ', m: '6', d: '15' },
  ]) {
    assert.equal(validateBirth(birth, TODAY), IDENTITY_ERROR_COPY.birthMissing)
  }
})

test('validateBirth accepts real calendar dates with or without zero padding', () => {
  assert.equal(validateBirth({ y: '1998', m: '6', d: '15' }, TODAY), null)
  assert.equal(validateBirth({ y: '1998', m: '06', d: '05' }, TODAY), null)
  assert.equal(validateBirth({ y: '2000', m: '2', d: '29' }, TODAY), null)
  assert.equal(validateBirth({ y: '2024', m: '2', d: '29' }, TODAY), null)
  assert.equal(validateBirth({ y: '1900', m: '1', d: '1' }, TODAY), null)
})

test('validateBirth rejects dates that are not on the calendar', () => {
  for (const birth of [
    { y: '1998', m: '2', d: '31' },
    { y: '1998', m: '2', d: '29' },
    { y: '1900', m: '2', d: '29' },
    { y: '1998', m: '4', d: '31' },
    { y: '1998', m: '13', d: '1' },
    { y: '1998', m: '0', d: '10' },
    { y: '1998', m: '6', d: '0' },
    { y: '1998', m: '6', d: '32' },
  ]) {
    assert.equal(validateBirth(birth, TODAY), IDENTITY_ERROR_COPY.birthInvalid, JSON.stringify(birth))
  }
})

test('validateBirth needs a four-digit year from 1900 onwards', () => {
  for (const y of ['1', '98', '199', '0098', '1899', '19980']) {
    assert.equal(validateBirth({ y, m: '6', d: '15' }, TODAY), IDENTITY_ERROR_COPY.birthInvalid, y)
  }
  assert.equal(validateBirth({ y: '19a8', m: '6', d: '15' }, TODAY), IDENTITY_ERROR_COPY.birthInvalid)
})

test('validateBirth rejects a date after today and accepts today itself', () => {
  assert.equal(validateBirth({ y: '2026', m: '11', d: '14' }, TODAY), null)
  assert.equal(validateBirth({ y: '2026', m: '11', d: '15' }, TODAY), IDENTITY_ERROR_COPY.birthInvalid)
  assert.equal(validateBirth({ y: '2026', m: '12', d: '1' }, TODAY), IDENTITY_ERROR_COPY.birthInvalid)
  assert.equal(validateBirth({ y: '2027', m: '1', d: '1' }, TODAY), IDENTITY_ERROR_COPY.birthInvalid)
})

test('todayOf reads the calendar day of the given moment', () => {
  assert.deepEqual(todayOf(new Date(2026, 10, 14, 23, 59)), TODAY)
})

test('validatePhone accepts only an 11-digit number starting with 010', () => {
  assert.equal(validatePhone('010-0000-0000'), null)
  assert.equal(validatePhone('01000000000'), null)
  for (const phone of ['', '010-0000-000', '011-1234-5678', '02-123-4567', '010-0000-00000']) {
    assert.equal(validatePhone(phone), IDENTITY_ERROR_COPY.phone, phone)
  }
})

test('validatePledge and validateSignature require the pledge and a signature', () => {
  assert.equal(validatePledge(true), null)
  assert.equal(validatePledge(false), IDENTITY_ERROR_COPY.pledge)
  assert.equal(validateSignature('data:image/png;base64,AAAA'), null)
  assert.equal(validateSignature(''), IDENTITY_ERROR_COPY.signature)
})

test('validateIdentity returns nothing for a complete form', () => {
  assert.deepEqual(validateIdentity(VALID, TODAY), {})
  assert.equal(firstInvalidField(validateIdentity(VALID, TODAY)), null)
})

test('validateIdentity reports every problem of an empty form in screen order', () => {
  const errors = validateIdentity({ name: '', birth: { y: '', m: '', d: '' }, phone: '', pledge: false, signature: '' }, TODAY)
  assert.deepEqual(Object.keys(errors), [...IDENTITY_FIELDS])
  assert.deepEqual(errors, {
    name: IDENTITY_ERROR_COPY.name,
    birth: IDENTITY_ERROR_COPY.birthMissing,
    phone: IDENTITY_ERROR_COPY.phone,
    pledge: IDENTITY_ERROR_COPY.pledge,
    signature: IDENTITY_ERROR_COPY.signature,
  })
  assert.equal(firstInvalidField(errors), 'name')
})

test('validateIdentity reports only the fields that are wrong', () => {
  const errors = validateIdentity({ ...VALID, birth: { y: '1998', m: '2', d: '31' }, signature: '' }, TODAY)
  assert.deepEqual(errors, { birth: IDENTITY_ERROR_COPY.birthInvalid, signature: IDENTITY_ERROR_COPY.signature })
  assert.equal(firstInvalidField(errors), 'birth')
})

test('every message is a polite Korean sentence without technical wording', () => {
  for (const message of Object.values(IDENTITY_ERROR_COPY)) {
    assert.match(message, /주세요\.$/)
    assert.doesNotMatch(message, /[A-Za-z]{3,}|\/api/)
  }
})
