import assert from 'node:assert/strict'
import test from 'node:test'

import { ApiError } from '../src/api.ts'
import {
  GENERIC_ERROR_COPY, NETWORK_ERROR_COPY, NOT_FOUND_COPY, SERVER_ERROR_COPY,
  friendlyError, isCitizenSafe, messageForStatus,
} from '../src/lib/error-copy.ts'

const FALLBACK = '서류를 올리지 못했습니다. 다시 시도해 주세요.'
const LEAKS = /\/api|\b(GET|POST|PUT|PATCH|DELETE)\b|fetch|실패 \(\d{3}\)/i

test('a server guidance sentence is shown as it is', () => {
  const error = new ApiError('이미 제출된 신청입니다.', 409, '이미 제출된 신청입니다.')
  assert.equal(friendlyError(error, FALLBACK), '이미 제출된 신청입니다.')
  assert.equal(friendlyError({ status: 400, detail: '  생년월일을 확인해 주세요. ' }, FALLBACK), '생년월일을 확인해 주세요.')
})

test('a failed connection asks the citizen to check the internet connection', () => {
  assert.equal(friendlyError(new ApiError(NETWORK_ERROR_COPY, 0), FALLBACK), NETWORK_ERROR_COPY)
  assert.equal(friendlyError(new TypeError('Failed to fetch'), FALLBACK), NETWORK_ERROR_COPY)
  assert.equal(friendlyError(new Error('Failed to fetch'), FALLBACK), NETWORK_ERROR_COPY)
  assert.equal(friendlyError(new Error('NetworkError when attempting to fetch resource.'), FALLBACK), NETWORK_ERROR_COPY)
  assert.equal(friendlyError('Load failed', FALLBACK), NETWORK_ERROR_COPY)
})

test('server errors, missing applications and other statuses map to fixed sentences', () => {
  assert.equal(friendlyError(new ApiError('x', 500), FALLBACK), SERVER_ERROR_COPY)
  assert.equal(friendlyError(new ApiError('x', 503), FALLBACK), SERVER_ERROR_COPY)
  assert.equal(friendlyError(new ApiError('x', 404), FALLBACK), NOT_FOUND_COPY)
  assert.equal(friendlyError(new ApiError('x', 403), FALLBACK), NOT_FOUND_COPY)
  assert.equal(friendlyError(new ApiError('x', 400), FALLBACK), FALLBACK)
  assert.equal(friendlyError(new ApiError('x', 422), FALLBACK), FALLBACK)
})

test('unknown errors use the fallback, and an unsafe fallback is replaced', () => {
  assert.equal(friendlyError(new Error('boom'), FALLBACK), FALLBACK)
  assert.equal(friendlyError(undefined, FALLBACK), FALLBACK)
  assert.equal(friendlyError(null, FALLBACK), FALLBACK)
  assert.equal(friendlyError(42, FALLBACK), FALLBACK)
  assert.equal(friendlyError(new Error('boom'), 'POST /api/applications/3/documents 실패 (500)'), GENERIC_ERROR_COPY)
  assert.equal(friendlyError(new Error('boom'), ''), GENERIC_ERROR_COPY)
})

test('technical or non-Korean server text is never passed through', () => {
  const cases: unknown[] = [
    new ApiError('GET /api/applications/7 실패 (500)', 500, 'GET /api/applications/7 실패 (500)'),
    { status: 404, detail: 'Not Found' },
    { status: 405, detail: 'Method Not Allowed' },
    { status: 500, detail: 'Internal Server Error' },
    { status: 422, detail: [{ loc: ['body', 'birth'], msg: 'field required' }] },
    { status: 400, detail: 'fetch 실패: 서버 오류' },
    { status: 400, detail: '자세한 내용은 http://127.0.0.1:8001/api/docs 참고' },
    { status: 500, detail: 'Traceback (most recent call last): 오류' },
    { status: 400, detail: '가'.repeat(301) },
    new TypeError('Failed to fetch'),
    new Error('GET /api/programs 실패 (502)'),
  ]
  for (const error of cases) {
    const text = friendlyError(error, FALLBACK)
    assert.doesNotMatch(text, LEAKS)
    assert.match(text, /[가-힣]/)
  }
  assert.equal(friendlyError({ status: 404, detail: 'Not Found' }, FALLBACK), NOT_FOUND_COPY)
  assert.equal(friendlyError({ status: 422, detail: [{ msg: 'field required' }] }, FALLBACK), FALLBACK)
})

test('isCitizenSafe accepts Korean guidance only', () => {
  assert.equal(isCitizenSafe('서약란에 서명해 주세요.'), true)
  assert.equal(isCitizenSafe('서명 이미지는 10MB 이하로 올려 주세요.'), true)
  assert.equal(isCitizenSafe(''), false)
  assert.equal(isCitizenSafe('   '), false)
  assert.equal(isCitizenSafe('Not Found'), false)
  assert.equal(isCitizenSafe(undefined), false)
  assert.equal(isCitizenSafe({ msg: '오류' }), false)
  assert.equal(isCitizenSafe('POST 요청을 처리하지 못했습니다.'), false)
})

test('messageForStatus covers connection, server and missing-application statuses only', () => {
  assert.equal(messageForStatus(0), NETWORK_ERROR_COPY)
  assert.equal(messageForStatus(500), SERVER_ERROR_COPY)
  assert.equal(messageForStatus(502), SERVER_ERROR_COPY)
  assert.equal(messageForStatus(403), NOT_FOUND_COPY)
  assert.equal(messageForStatus(404), NOT_FOUND_COPY)
  assert.equal(messageForStatus(400), null)
  assert.equal(messageForStatus(409), null)
  assert.equal(messageForStatus(200), null)
})

test('ApiError keeps status and detail, and its message is already citizen-safe when built by the api layer', () => {
  const error = new ApiError(NOT_FOUND_COPY, 404)
  assert.equal(error instanceof Error, true)
  assert.equal(error.name, 'ApiError')
  assert.equal(error.status, 404)
  assert.equal(error.detail, undefined)
  assert.equal(new ApiError('이미 제출된 신청입니다.', 409, '이미 제출된 신청입니다.').detail, '이미 제출된 신청입니다.')
})

test('every fixed sentence is free of technical wording', () => {
  for (const text of [NETWORK_ERROR_COPY, SERVER_ERROR_COPY, NOT_FOUND_COPY, GENERIC_ERROR_COPY]) {
    assert.doesNotMatch(text, LEAKS)
    assert.equal(isCitizenSafe(text), true)
  }
})
