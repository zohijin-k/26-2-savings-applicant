import assert from 'node:assert/strict'
import test from 'node:test'

import { formatBytes, formatDate, formatDateTime, formatDuration } from '../src/lib/format.ts'

test('formatDate turns an ISO date into the Korean dotted form without zero padding', () => {
  assert.equal(formatDate('2026-03-03'), '2026. 3. 3.')
  assert.equal(formatDate('1998-06-15'), '1998. 6. 15.')
  assert.equal(formatDate('2026-11-14'), '2026. 11. 14.')
  assert.equal(formatDate(' 2024-02-29 '), '2024. 2. 29.')
})

test('formatDate returns anything it cannot read unchanged', () => {
  for (const value of ['', '발급일 확인 필요', '2026-02-31', '2025-02-29', '2026-13-01', '2026-00-10', '2026-3-3', '20260303', '2026-03-03T10:00:00']) {
    assert.equal(formatDate(value), value)
  }
  assert.equal(formatDate(null as unknown as string), null)
  assert.equal(formatDate(undefined as unknown as string), undefined)
})

test('formatDateTime shows a timestamp without a zone exactly as written, on a 12-hour clock', () => {
  assert.equal(formatDateTime('2026-11-14T00:35:10'), '2026. 11. 14. 오전 12:35')
  assert.equal(formatDateTime('2026-11-14T09:05:00'), '2026. 11. 14. 오전 9:05')
  assert.equal(formatDateTime('2026-11-14T12:00:00'), '2026. 11. 14. 오후 12:00')
  assert.equal(formatDateTime('2026-03-03T23:59'), '2026. 3. 3. 오후 11:59')
  assert.equal(formatDateTime('2026-03-03 14:07:30.123456'), '2026. 3. 3. 오후 2:07')
})

test('formatDateTime converts a zoned timestamp to the viewing device and keeps the same instant', () => {
  const zoned = '2026-11-14T00:35:10+09:00'
  const date = new Date(zoned)
  const hour = date.getHours()
  const expected = `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}. ${hour < 12 ? '오전' : '오후'} ${hour % 12 === 0 ? 12 : hour % 12}:${String(date.getMinutes()).padStart(2, '0')}`
  assert.equal(formatDateTime(zoned), expected)
  assert.equal(formatDateTime('2026-11-13T15:35:10Z'), expected)
})

test('formatDateTime falls back to the date form for a date and leaves unreadable input unchanged', () => {
  assert.equal(formatDateTime('2026-11-14'), '2026. 11. 14.')
  for (const value of ['', '접수 전', '2026-02-31T10:00:00', '2026-11-14T24:00:00', '2026-11-14T10:60:00', 'Sat Nov 14 2026']) {
    assert.equal(formatDateTime(value), value)
  }
  assert.equal(formatDateTime(null as unknown as string), null)
})

test('formatBytes picks B, KB, MB or GB and drops a trailing .0', () => {
  assert.equal(formatBytes(0), '0B')
  assert.equal(formatBytes(512), '512B')
  assert.equal(formatBytes(1024), '1KB')
  assert.equal(formatBytes(153_600), '150KB')
  assert.equal(formatBytes(1_258_291), '1.2MB')
  assert.equal(formatBytes(5 * 1024 * 1024), '5MB')
  assert.equal(formatBytes(20 * 1024 * 1024), '20MB')
  assert.equal(formatBytes(1.5 * 1024 ** 3), '1.5GB')
})

test('formatBytes returns invalid numbers unchanged as text', () => {
  assert.equal(formatBytes(-1), '-1')
  assert.equal(formatBytes(Number.NaN), 'NaN')
  assert.equal(formatBytes(Number.POSITIVE_INFINITY), 'Infinity')
})

test('formatDuration says seconds below a minute and whole minutes from there', () => {
  assert.equal(formatDuration(12), '약 12초')
  assert.equal(formatDuration(0), '약 1초')
  assert.equal(formatDuration(0.14), '약 1초')
  assert.equal(formatDuration(3.6), '약 4초')
  assert.equal(formatDuration(59), '약 59초')
  assert.equal(formatDuration(60), '약 1분')
  assert.equal(formatDuration(89), '약 1분')
  assert.equal(formatDuration(90), '약 2분')
  assert.equal(formatDuration(180), '약 3분')
  assert.equal(formatDuration(-5), '-5')
  assert.equal(formatDuration(Number.NaN), 'NaN')
})
