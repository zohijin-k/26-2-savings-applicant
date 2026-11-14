import assert from 'node:assert/strict'
import test from 'node:test'

import {
  LARGE_FILE_BYTES, LARGE_FILE_HINT, PRECHECK_MESSAGES, fileExtension, isPasswordError, precheckFile,
  type PdfProbe,
} from '../src/lib/file-precheck.ts'

const PREVIEW = 'blob:가상-미리보기'

function file(name: string, bytes = 16): File {
  return new File([new Uint8Array(bytes)], name)
}

function probe(result: { pages: number; hasText: boolean }): PdfProbe & { calls: number } {
  const fn = (async () => { fn.calls += 1; return result }) as PdfProbe & { calls: number }
  fn.calls = 0
  return fn
}

function failing(error: unknown): PdfProbe & { calls: number } {
  const fn = (async () => { fn.calls += 1; throw error }) as PdfProbe & { calls: number }
  fn.calls = 0
  return fn
}

function passwordError(): Error {
  const error = new Error('No password given')
  error.name = 'PasswordException'
  return error
}

test('fileExtension follows the server rule: last suffix, lower-cased', () => {
  assert.equal(fileExtension('가상_초본.PDF'), 'pdf')
  assert.equal(fileExtension('scan.tar.JPeG'), 'jpeg')
  assert.equal(fileExtension('이름없음'), '')
  assert.equal(fileExtension('.pdf'), '', 'a dot-file has no suffix')
  assert.equal(fileExtension('폴더.v2/서류'), '')
})

test('HEIC photos are stopped with conversion guidance and no probe', async () => {
  for (const name of ['IMG_0001.HEIC', 'photo.heif']) {
    const pdf = probe({ pages: 1, hasText: true })
    const result = await precheckFile(file(name), pdf, PREVIEW)
    assert.deepEqual(result, { ok: false, reason: 'heic', message: PRECHECK_MESSAGES.heic })
    assert.equal(pdf.calls, 0)
  }
  assert.match(PRECHECK_MESSAGES.heic, /JPG로 바꾸거나/)
})

test('formats the server rejects by suffix are stopped', async () => {
  for (const name of ['서류.hwp', '서류.zip', '서류.webp', '서류', '서류.pdf.docx']) {
    const result = await precheckFile(file(name), probe({ pages: 1, hasText: true }), PREVIEW)
    assert.deepEqual(result, { ok: false, reason: 'format', message: PRECHECK_MESSAGES.format })
  }
})

test('an empty file is stopped before any probe', async () => {
  const pdf = probe({ pages: 1, hasText: true })
  const result = await precheckFile(file('빈파일.pdf', 0), pdf, PREVIEW)
  assert.deepEqual(result, { ok: false, reason: 'empty', message: PRECHECK_MESSAGES.empty })
  assert.equal(pdf.calls, 0)
  assert.equal((await precheckFile(file('빈사진.jpg', 0), pdf, PREVIEW)).ok, false)
})

test('a password-protected PDF is stopped', async () => {
  const result = await precheckFile(file('암호.pdf'), failing(passwordError()), PREVIEW)
  assert.deepEqual(result, { ok: false, reason: 'encrypted', message: PRECHECK_MESSAGES.encrypted })
  assert.equal(isPasswordError(passwordError()), true)
  assert.equal(isPasswordError(new Error('PasswordException')), false)
  assert.equal(isPasswordError(null), false)
})

test('a PDF with a text layer is pdf-text, one without is pdf-scan, with the page count', async () => {
  assert.deepEqual(
    await precheckFile(file('원본.pdf'), probe({ pages: 2, hasText: true }), PREVIEW),
    { ok: true, kind: 'pdf-text', pages: 2, previewUrl: PREVIEW },
  )
  assert.deepEqual(
    await precheckFile(file('스캔.PDF'), probe({ pages: 3, hasText: false }), PREVIEW),
    { ok: true, kind: 'pdf-scan', pages: 3, previewUrl: PREVIEW },
  )
})

test('any probe failure other than a password error passes: the server decides', async () => {
  const errors: unknown[] = [new Error('Invalid PDF structure'), new TypeError('worker failed'), 'timeout', undefined]
  for (const error of errors) {
    const result = await precheckFile(file('손상.pdf'), failing(error), PREVIEW)
    assert.deepEqual(result, { ok: true, kind: 'pdf-scan', pages: null, previewUrl: PREVIEW })
  }
  const odd = await precheckFile(file('이상.pdf'), probe({ pages: 0, hasText: true }), PREVIEW)
  assert.deepEqual(odd, { ok: true, kind: 'pdf-scan', pages: null, previewUrl: PREVIEW })
})

test('photos pass without a probe', async () => {
  for (const name of ['사진.jpg', '사진.JPEG', '사진.png']) {
    const pdf = probe({ pages: 9, hasText: true })
    const result = await precheckFile(file(name), pdf, PREVIEW)
    assert.deepEqual(result, { ok: true, kind: 'image', pages: null, previewUrl: PREVIEW })
    assert.equal(pdf.calls, 0)
  }
})

test('size never blocks; a large file only adds a hint', async () => {
  const big = { name: '큰파일.jpg', size: LARGE_FILE_BYTES } as File
  const result = await precheckFile(big, probe({ pages: 1, hasText: true }), PREVIEW)
  assert.deepEqual(result, { ok: true, kind: 'image', pages: null, previewUrl: PREVIEW, hint: LARGE_FILE_HINT })
  const justUnder = { name: '파일.jpg', size: LARGE_FILE_BYTES - 1 } as File
  assert.equal('hint' in await precheckFile(justUnder, probe({ pages: 1, hasText: true }), PREVIEW), false)
})

test('without a prepared preview address one is created for the file', async () => {
  const result = await precheckFile(file('사진.png'), probe({ pages: 1, hasText: true }))
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.match(result.previewUrl, /^blob:/)
    URL.revokeObjectURL(result.previewUrl)
  }
})

test('messages are polite sentences without technical words', () => {
  for (const message of Object.values(PRECHECK_MESSAGES)) {
    assert.match(message, /(주세요|습니다)\.$/)
    assert.doesNotMatch(message, /api|fetch|error|exception/i)
  }
})
