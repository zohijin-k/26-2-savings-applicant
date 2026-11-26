import assert from 'node:assert/strict'
import test from 'node:test'

import { isValidEmail, normalizeEmail, savableEmail, withSavableEmail } from '../src/forms/email.ts'

const TYPED = 'hong.gildong@example.go.kr'

/** Mirrors the backend rule: an empty email or a valid one is accepted, anything else is a 400. */
const backendAccepts = (email: string) => normalizeEmail(email) === '' || isValidEmail(normalizeEmail(email))

test('typing an address one character at a time never sends an email the backend rejects', () => {
  const savable = { current: '' }
  const sent: string[] = []
  for (let length = 1; length <= TYPED.length; length += 1) {
    sent.push(withSavableEmail({ email: TYPED.slice(0, length), address: '전주시' }, savable).email)
  }

  assert.ok(sent.every(backendAccepts))
  assert.ok(sent.some((email, index) => email !== TYPED.slice(0, index + 1)), 'unfinished prefixes must be replaced')
  assert.equal(sent.at(-1), TYPED)
  assert.equal(savable.current, TYPED)
})

test('editing a saved address keeps the last savable value until the address is valid again', () => {
  const savable = { current: savableEmail(TYPED, '') }
  const send = (email: string) => withSavableEmail({ email }, savable).email

  assert.equal(send('hong.gildong@example.go.'), TYPED)
  assert.equal(send('hong.gildong@example.go'), 'hong.gildong@example.go')
  assert.equal(send('hong.gildong@ex'), 'hong.gildong@example.go')
  assert.equal(send(''), '')
})

test('valid emails pass through unchanged and other fields are kept', () => {
  const savable = { current: '' }
  const valid = { email: 'a@b.co', address: '주소' }
  assert.equal(withSavableEmail(valid, savable), valid)

  const unfinished = { email: 'a@b', address: '주소 2' }
  assert.deepEqual(withSavableEmail(unfinished, savable), { email: 'a@b.co', address: '주소 2' })
  assert.equal(unfinished.email, 'a@b')
})

test('savableEmail follows the shared normalization', () => {
  assert.equal(savableEmail('   ', 'a@b.co'), '   ')
  assert.equal(savableEmail('ａ@ｂ.ｃｏ', ''), 'ａ@ｂ.ｃｏ')
  assert.equal(savableEmail('홍@b.co', 'x@y.kr'), 'x@y.kr')
  assert.equal(savableEmail(undefined, 'x@y.kr'), 'x@y.kr')
})
