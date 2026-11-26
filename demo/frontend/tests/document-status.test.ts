import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { APPLICANT_DOCUMENT_STATUS, UPLOADED_REVIEW_NOTE, uploadAnnouncement } from '../src/lib/document-status.ts'

// #23: UPLOADED는 자동 확인 적합(PASS)과 담당자 확인 필요(NEEDS_REVIEW)를 함께 담는다.
// 화면은 둘을 구별할 수 없으므로 UPLOADED를 적합 판정처럼 보이면 안 된다.
const APPROVAL_WORDS = /완료|적합|통과|승인|확인됨|문제\s*없/

test('UPLOADED is a neutral "uploaded" state, never a success verdict', () => {
  const uploaded = APPLICANT_DOCUMENT_STATUS.UPLOADED
  assert.equal(uploaded.label, '업로드됨')
  assert.doesNotMatch(uploaded.label, APPROVAL_WORDS)
  assert.notEqual(uploaded.icon, 'checkCircle')
  assert.notEqual(uploaded.icon, 'check')
  // 공용 CSS의 .status-badge--uploaded는 성공색(초록 채움)이다. 쓰지 않는다.
  assert.doesNotMatch(uploaded.className, /--uploaded|success/)
  assert.equal(uploaded.className, 'status-badge')
})

test('confirmed reupload keeps its danger badge and guidance', () => {
  assert.deepEqual(APPLICANT_DOCUMENT_STATUS.REUPLOAD_REQUIRED,
    { label: '다시 올려 주세요', icon: 'refresh', className: 'status-badge status-badge--reupload_required' })
  assert.equal(uploadAnnouncement('주민등록초본', 'REUPLOAD_REQUIRED'), '주민등록초본 다시 올려야 합니다. 안내를 확인해 주세요.')
})

test('announcement and review note do not imply approval or reveal an internal verdict', () => {
  assert.equal(uploadAnnouncement('주민등록초본', 'UPLOADED'), '주민등록초본 업로드됨')
  assert.doesNotMatch(uploadAnnouncement('주민등록초본', 'UPLOADED'), APPROVAL_WORDS)
  assert.match(UPLOADED_REVIEW_NOTE, /담당자가 원본/)
  // 모든 UPLOADED 서류에 같은 문장이다. 확인필요·보류·판독 실패 같은 내부 판정 말을 쓰지 않는다.
  assert.doesNotMatch(UPLOADED_REVIEW_NOTE, /확인\s*필요|보류|판독|신뢰도|NEEDS_REVIEW|PASS/)
})

test('upload cards and progress no longer paint or count uploads as completed approvals', () => {
  const css = readFileSync(new URL('../src/pages/applicant/document-upload.css', import.meta.url), 'utf8')
  const card = /\.dslot--uploaded\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
  assert.ok(card, '.dslot--uploaded rule exists')
  assert.doesNotMatch(card, /success/)
  const page = readFileSync(new URL('../src/pages/applicant/DocumentUpload.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(page, /종 완료|업로드 완료/)
  for (const screen of ['FinalCheck.tsx', 'MyPage.tsx', 'DocumentUpload.tsx']) {
    const source = readFileSync(new URL(`../src/pages/applicant/${screen}`, import.meta.url), 'utf8')
    assert.match(source, /UPLOADED_REVIEW_NOTE/, `${screen} shows the fixed review note`)
  }
})
