import assert from 'node:assert/strict'
import test from 'node:test'

import type { Finding } from '../src/api.ts'
import { issuerLink, reuploadFindings, REUPLOAD_GUIDANCE } from '../src/pages/applicant/reupload-guidance.ts'

const CODES = [
  'DOCUMENT_ISSUED_TOO_EARLY', 'DOCUMENT_ISSUED_AFTER_APPLICATION',
  'IDENTITY_MISMATCH', 'IMAGE_RESOLUTION_TOO_LOW', 'LOW_IMAGE_QUALITY',
  'PAGES_INCOMPLETE', 'UNREADABLE_FILE', 'MISSING_ADDRESS_DATES',
  'MISSING_BILLING_MONTHS', 'WRONG_DOCUMENT_TYPE',
]

function finding(code: string, severity: Finding['severity'] = 'FAIL'): Finding {
  return { code, severity, message: '가상 안내', how_to_fix: '가상 해결 방법', link: '' }
}

function issuer(url: string): Parameters<typeof issuerLink>[0] {
  return { issuer: '가상 발급처', issuer_url: url }
}

test('the public guidance covers exactly the agreed ten reupload codes', () => {
  assert.deepEqual(Object.keys(REUPLOAD_GUIDANCE).sort(), [...CODES].sort())
})

for (const code of CODES) {
  test(`${code}: only confirmed FAIL appears in reupload guidance`, () => {
    const fail = finding(code)
    const source = [finding(code, 'NEEDS_REVIEW'), fail, { ...finding(code), severity: 'INFO' } as unknown as Finding]
    const before = structuredClone(source)
    assert.deepEqual(reuploadFindings(source), [fail])
    assert.deepEqual(source, before)
  })
}

test('unknown and other internal failures do not create a public repair reason', () => {
  assert.deepEqual(reuploadFindings([
    finding('DAILY_RECORDS_PARTIALLY_SELECTED'), finding('OVER_LIMIT'),
    finding('PAGES_DUPLICATED'), finding('UNKNOWN_DOCUMENT_TYPE'), finding('toString'),
  ]), [])
})

test('a known historical code without severity keeps the server default FAIL policy', () => {
  const legacy = { code: 'PAGES_INCOMPLETE', message: '가상 과거 안내', how_to_fix: '', link: '' } as Finding
  assert.deepEqual(reuploadFindings([legacy]), [legacy])
})

test('mixed repeated findings retain every distinct actionable code in source order', () => {
  const page = finding('PAGES_INCOMPLETE')
  const quality = finding('LOW_IMAGE_QUALITY')
  assert.deepEqual(reuploadFindings([
    finding('PAGES_INCOMPLETE', 'NEEDS_REVIEW'), page,
    finding('LOW_OCR_CONFIDENCE', 'NEEDS_REVIEW'), quality,
    finding('PAGES_INCOMPLETE'), finding('DAILY_RECORDS_PARTIALLY_SELECTED'),
  ]), [page, quality])
})

test('government and insurance issuer deep links use their official home pages', () => {
  assert.equal(issuerLink(issuer('https://www.gov.kr/mw/example')), 'https://www.gov.kr')
  assert.equal(issuerLink(issuer('https://plus.gov.kr/example')), 'https://www.gov.kr')
  assert.equal(issuerLink(issuer('https://www.nhis.or.kr/nhis/example')), 'https://www.nhis.or.kr')
  assert.equal(issuerLink(issuer('https://nhis.or.kr/example')), 'https://www.nhis.or.kr')
})

test('other issuers require a valid HTTPS link and do not match lookalike hosts', () => {
  assert.equal(issuerLink(issuer('https://example.invalid/issue')), 'https://example.invalid/issue')
  assert.equal(issuerLink(issuer('https://gov.kr.example.invalid/issue')), 'https://gov.kr.example.invalid/issue')
  assert.equal(issuerLink(issuer('javascript:alert(1)')), '')
  assert.equal(issuerLink(issuer('http://example.invalid/issue')), '')
  assert.equal(issuerLink(issuer('not a URL')), '')
})
