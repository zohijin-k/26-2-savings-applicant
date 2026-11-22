import assert from 'node:assert/strict'
import test from 'node:test'
import { httpStatus, mutationError, slotChange, isSubmitted } from '../src/lib/applicant-mutation.ts'
for (const status of [400,401,403,409,422,503]) test(`applicant mutation ${status} uses bounded public copy and retains status`, () => {
  const error = Object.assign(new Error('SECRET SQL /api/internal applicant'), {status})
  assert.equal(httpStatus(error), status)
  assert.doesNotMatch(mutationError(error, '공개 안내'), /SECRET|SQL|\/api/)
})
test('503 is transient and distinct from expired authentication', () => {
  assert.notEqual(mutationError({status:503}, ''), mutationError({status:401}, ''))
  assert.match(mutationError({status:503}, ''), /일시적/)
})
test('network, abort and response timeout never assert that a write failed', () => {
  for (const error of [new TypeError('network'),new DOMException('timeout','TimeoutError'),new DOMException('abort','AbortError')]) assert.match(mutationError(error,''), /서버의 처리 결과/)
})
test('slot changes are evidence to inspect, never file identity or eligibility', () => {
  assert.equal(slotChange(null,[]),'unchanged')
  assert.equal(slotChange(2,[{document_id:2}]),'unchanged')
  assert.equal(slotChange(2,[{document_id:3}]),'changed')
  assert.equal(slotChange(null,[{document_id:1}]),'changed')
})
test('receipt requires acknowledged submitted status and submitted_at', () => {
  assert.equal(isSubmitted({status:'draft',submitted_at:null}),false)
  assert.equal(isSubmitted({status:'draft',submitted_at:'2026-11-22'}),false)
  assert.equal(isSubmitted({status:'submitted',submitted_at:null}),false)
  assert.equal(isSubmitted({status:'submitted',submitted_at:'2026-11-22'}),true)
})
test('unexpected failures expose only caller-approved copy', () => {
  assert.equal(mutationError(new Error('SQL SECRET'), '공개 안내'), '공개 안내')
  assert.equal(httpStatus(new Error('401 text is not an HTTP status')), null)
})
