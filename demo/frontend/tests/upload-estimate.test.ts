import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_SECONDS, MAX_ESTIMATE_SEC, MAX_OBSERVATIONS, estimateSeconds, rememberObservation, slowThresholdSec,
  type Observation,
} from '../src/lib/upload-estimate.ts'

test('without history the defaults apply: text PDF 1s, photo 3s, scanned PDF 4s per page', () => {
  assert.equal(estimateSeconds('pdf-text', 1, []), 1)
  assert.equal(estimateSeconds('pdf-text', 12, []), 1, 'a text PDF does not scale with pages')
  assert.equal(estimateSeconds('image', null, []), 3)
  assert.equal(estimateSeconds('pdf-scan', 1, []), 4)
  assert.equal(estimateSeconds('pdf-scan', 3, []), 12)
  assert.deepEqual(DEFAULT_SECONDS, { 'pdf-text': 1, image: 3, 'pdf-scan': 4 })
})

test('an unknown or invalid page count counts as one page', () => {
  assert.equal(estimateSeconds('pdf-scan', null, []), 4)
  assert.equal(estimateSeconds('pdf-scan', 0, []), 4)
  assert.equal(estimateSeconds('pdf-scan', Number.NaN, []), 4)
  assert.equal(estimateSeconds('pdf-scan', 2.9, []), 8)
})

test('history of the same kind blends half and half with the default', () => {
  const history: Observation[] = [{ kind: 'pdf-scan', pages: 2, ms: 16000 }] // 8s per page
  assert.equal(estimateSeconds('pdf-scan', 1, history), 6) // (4 + 8) / 2
  assert.equal(estimateSeconds('pdf-scan', 3, history), 18)

  const photos: Observation[] = [{ kind: 'image', pages: 1, ms: 1000 }, { kind: 'image', pages: 1, ms: 2000 }]
  assert.equal(estimateSeconds('image', null, photos), 2) // (3 + 1.5) / 2 = 2.25
})

test('history of another kind is ignored', () => {
  const history: Observation[] = [{ kind: 'pdf-scan', pages: 1, ms: 60000 }, { kind: 'image', pages: 1, ms: 30000 }]
  assert.equal(estimateSeconds('pdf-text', 1, history), 1)
})

test('broken observations are skipped', () => {
  const history: Observation[] = [{ kind: 'image', pages: 1, ms: Number.NaN }, { kind: 'image', pages: 1, ms: -5 }]
  assert.equal(estimateSeconds('image', null, history), 3)
})

test('the estimate is clamped to 1..180 seconds', () => {
  assert.equal(estimateSeconds('pdf-text', 1, [{ kind: 'pdf-text', pages: 1, ms: 0 }]), 1)
  assert.equal(estimateSeconds('pdf-scan', 500, []), MAX_ESTIMATE_SEC)
  assert.equal(estimateSeconds('image', null, [{ kind: 'image', pages: 1, ms: 10_000_000 }]), MAX_ESTIMATE_SEC)
})

test('the slow notice starts at 10 seconds or 1.5x the estimate, whichever is later', () => {
  assert.equal(slowThresholdSec(1), 10)
  assert.equal(slowThresholdSec(4), 10)
  assert.equal(slowThresholdSec(12), 18)
  assert.equal(slowThresholdSec(60), 90)
})

test('rememberObservation keeps only the most recent entries and does not mutate', () => {
  let history: Observation[] = []
  const first = history
  for (let index = 0; index < MAX_OBSERVATIONS + 5; index += 1) {
    history = rememberObservation(history, { kind: 'image', pages: 1, ms: index })
  }
  assert.equal(first.length, 0)
  assert.equal(history.length, MAX_OBSERVATIONS)
  assert.equal(history[0].ms, 5)
  assert.equal(history.at(-1)?.ms, MAX_OBSERVATIONS + 4)
})
