import assert from 'node:assert/strict'
import test from 'node:test'

import {
  activeCount, inFlight, isActive, nextRunnable, queueReducer, slotItem,
  type NewQueueItem, type QueueAction, type QueueItem,
} from '../src/pages/applicant/upload-queue.ts'

function file(name = '가상_서류.pdf', bytes = 1000): File {
  return new File([new Uint8Array(bytes)], name)
}

function fresh(id: string, slotKey: string, overrides: Partial<NewQueueItem> = {}): NewQueueItem {
  return { id, slotKey, file: file(), declared: '2026-03-05', estimateSec: 4, pages: 1, kind: 'pdf-scan', previewUrl: `blob:${id}`, ...overrides }
}

function run(actions: QueueAction[], start: QueueItem[] = []): QueueItem[] {
  return actions.reduce(queueReducer, start)
}

const enqueue = (id: string, slotKey: string, now = 0): QueueAction => ({ type: 'enqueue', item: fresh(id, slotKey), now })

test('a new item waits with nothing sent and remembers its file', () => {
  const [item] = run([enqueue('a', 'resident', 10)])
  assert.equal(item.status, 'queued')
  assert.equal(item.sent, 0)
  assert.equal(item.total, 1000)
  assert.equal(item.enqueuedAt, 10)
  assert.equal(item.startedAt, null)
  assert.equal(item.sentAt, null)
  assert.equal(item.finishedAt, null)
  assert.equal(item.declared, '2026-03-05')
  assert.equal(item.previewUrl, 'blob:a')
})

test('nextRunnable returns the first waiting item only when nothing is in flight', () => {
  let state = run([enqueue('a', 's1'), enqueue('b', 's2'), enqueue('c', 's3')])
  assert.equal(nextRunnable(state)?.id, 'a')

  state = queueReducer(state, { type: 'start', id: 'a', now: 1 })
  assert.equal(inFlight(state)?.id, 'a')
  assert.equal(nextRunnable(state), null, 'sending blocks the next item')

  state = queueReducer(state, { type: 'sent', id: 'a', now: 2 })
  assert.equal(state[0].status, 'reading')
  assert.equal(nextRunnable(state), null, 'reading blocks the next item')

  state = queueReducer(state, { type: 'succeed', id: 'a' })
  assert.equal(nextRunnable(state)?.id, 'b')

  state = queueReducer(state, { type: 'start', id: 'b', now: 3 })
  state = queueReducer(state, { type: 'fail', id: 'b', error: '가상 오류', now: 4 })
  assert.equal(nextRunnable(state)?.id, 'c', 'a failed item does not block the line')
})

test('the reducer never lets two items be in flight, whatever order actions arrive in', () => {
  let state = run([enqueue('a', 's1'), enqueue('b', 's2'), enqueue('c', 's3')])
  state = queueReducer(state, { type: 'start', id: 'a', now: 1 })
  const before = state
  state = queueReducer(state, { type: 'start', id: 'b', now: 2 })
  assert.equal(state, before, 'a second start is ignored')
  state = queueReducer(state, { type: 'start', id: 'c', now: 2 })
  assert.equal(state.filter((item) => item.status === 'sending' || item.status === 'reading').length, 1)

  // 무작위에 가까운 긴 순서로도 동시에 둘이 나가지 않는다.
  const ids = ['a', 'b', 'c', 'd']
  let fuzz: QueueItem[] = []
  let seed = 7
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648)
  for (let step = 0; step < 4000; step += 1) {
    const id = ids[next() % ids.length]
    const kind = next() % 8
    const action: QueueAction = kind === 0 ? enqueue(`${id}${step}`, `slot-${id}`, step)
      : kind === 1 ? { type: 'start', id: fuzz[next() % Math.max(1, fuzz.length)]?.id ?? id, now: step }
      : kind === 2 ? { type: 'sent', id: fuzz[next() % Math.max(1, fuzz.length)]?.id ?? id, now: step }
      : kind === 3 ? { type: 'succeed', id: fuzz[next() % Math.max(1, fuzz.length)]?.id ?? id }
      : kind === 4 ? { type: 'fail', id: fuzz[next() % Math.max(1, fuzz.length)]?.id ?? id, error: '가상 오류', now: step }
      : kind === 5 ? { type: 'retry', id: fuzz[next() % Math.max(1, fuzz.length)]?.id ?? id, now: step }
      : kind === 6 ? { type: 'cancel', id: fuzz[next() % Math.max(1, fuzz.length)]?.id ?? id }
      : { type: 'clearSlot', slotKey: `slot-${id}` }
    fuzz = queueReducer(fuzz, action)
    const flying = fuzz.filter((item) => item.status === 'sending' || item.status === 'reading')
    assert.ok(flying.length <= 1, `step ${step}: ${flying.length} items in flight`)
    const slots = fuzz.map((item) => item.slotKey)
    assert.equal(new Set(slots).size, slots.length, `step ${step}: one item per slot`)
    if (flying.length === 1) assert.equal(nextRunnable(fuzz), null)
  }
})

test('one item per slot: a new file replaces a waiting or failed one, never one in flight', () => {
  let state = run([enqueue('a', 's1')])
  state = queueReducer(state, { type: 'enqueue', item: fresh('a2', 's1'), now: 5 })
  assert.deepEqual(state.map((item) => item.id), ['a2'], 'waiting item replaced')

  state = queueReducer(state, { type: 'start', id: 'a2', now: 6 })
  const sending = state
  state = queueReducer(state, { type: 'enqueue', item: fresh('a3', 's1'), now: 7 })
  assert.equal(state, sending, 'cannot enqueue over a sending item')

  state = queueReducer(state, { type: 'sent', id: 'a2', now: 8 })
  const reading = state
  state = queueReducer(state, { type: 'enqueue', item: fresh('a3', 's1'), now: 9 })
  assert.equal(state, reading, 'cannot enqueue over a reading item')

  state = queueReducer(state, { type: 'fail', id: 'a2', error: '가상 오류', now: 10 })
  state = queueReducer(state, { type: 'enqueue', item: fresh('a4', 's1'), now: 11 })
  assert.deepEqual(state.map((item) => [item.id, item.status]), [['a4', 'queued']], 'failed item replaced')
})

test('progress only moves forward while sending and is clamped to the total', () => {
  let state = run([enqueue('a', 's1'), { type: 'start', id: 'a', now: 1 }])
  state = queueReducer(state, { type: 'progress', id: 'a', sent: 400, total: 1200 })
  assert.deepEqual([state[0].sent, state[0].total], [400, 1200])
  state = queueReducer(state, { type: 'progress', id: 'a', sent: 100, total: 1200 })
  assert.equal(state[0].sent, 400, 'never goes backwards')
  state = queueReducer(state, { type: 'progress', id: 'a', sent: 5000, total: 1200 })
  assert.equal(state[0].sent, 1200)

  state = queueReducer(state, { type: 'sent', id: 'a', now: 3 })
  assert.deepEqual([state[0].status, state[0].sent, state[0].sentAt], ['reading', 1200, 3])
  const reading = state
  state = queueReducer(state, { type: 'progress', id: 'a', sent: 10, total: 1200 })
  assert.equal(state, reading, 'progress after sending is ignored')

  const waiting = run([enqueue('b', 's2')])
  assert.equal(queueReducer(waiting, { type: 'progress', id: 'b', sent: 10, total: 100 }), waiting)
  assert.equal(queueReducer(waiting, { type: 'sent', id: 'b', now: 1 }), waiting)
})

test('cancel removes only a waiting item', () => {
  let state = run([enqueue('a', 's1'), enqueue('b', 's2'), { type: 'start', id: 'a', now: 1 }])
  const before = state
  state = queueReducer(state, { type: 'cancel', id: 'a' })
  assert.equal(state, before, 'an item in flight cannot be cancelled')
  state = queueReducer(state, { type: 'cancel', id: 'b' })
  assert.deepEqual(state.map((item) => item.id), ['a'])
  assert.equal(queueReducer(state, { type: 'cancel', id: 'missing' }), state)
})

test('fail keeps the file and message; retry queues the same file again at the end of the line', () => {
  const picked = file('가상_초본.png', 2048)
  let state = run([
    { type: 'enqueue', item: fresh('a', 's1', { file: picked, kind: 'image', estimateSec: 3 }), now: 0 },
    enqueue('b', 's2', 1),
    { type: 'start', id: 'a', now: 2 },
    { type: 'progress', id: 'a', sent: 2048, total: 2048 },
    { type: 'sent', id: 'a', now: 3 },
    { type: 'fail', id: 'a', error: '인터넷 연결을 확인한 뒤 다시 시도해 주세요.', now: 9 },
  ])
  const failed = slotItem(state, 's1')
  assert.equal(failed?.status, 'failed')
  assert.equal(failed?.error, '인터넷 연결을 확인한 뒤 다시 시도해 주세요.')
  assert.equal(failed?.finishedAt, 9)
  assert.equal(failed?.file, picked)
  assert.equal(isActive(state), true, 'b is still waiting')
  assert.equal(activeCount(state), 1)

  assert.equal(queueReducer(state, { type: 'retry', id: 'b', now: 10 }), state, 'retry is only for failed items')

  state = queueReducer(state, { type: 'retry', id: 'a', now: 10, estimateSec: 5 })
  assert.deepEqual(state.map((item) => item.id), ['b', 'a'])
  const again = slotItem(state, 's1')
  assert.equal(again?.status, 'queued')
  assert.equal(again?.file, picked)
  assert.equal(again?.error, undefined)
  assert.deepEqual([again?.sent, again?.startedAt, again?.sentAt, again?.finishedAt, again?.enqueuedAt, again?.estimateSec], [0, null, null, null, 10, 5])
  assert.equal(nextRunnable(state)?.id, 'b')
})

test('succeed removes the item; a finished or unknown id changes nothing', () => {
  let state = run([enqueue('a', 's1')])
  assert.equal(queueReducer(state, { type: 'succeed', id: 'a' }), state, 'a waiting item cannot succeed')
  assert.equal(queueReducer(state, { type: 'fail', id: 'a', error: '가상 오류', now: 1 }), state, 'a waiting item cannot fail')
  state = run([{ type: 'start', id: 'a', now: 1 }, { type: 'succeed', id: 'a' }], state)
  assert.deepEqual(state, [])
  assert.equal(queueReducer(state, { type: 'succeed', id: 'a' }), state)
  assert.equal(isActive(state), false)
  assert.equal(slotItem(state, 's1'), null)
})

test('clearSlot drops waiting and failed items of that slot but not one in flight', () => {
  let state = run([enqueue('a', 's1'), enqueue('b', 's2'), { type: 'start', id: 'a', now: 1 }])
  const before = state
  state = queueReducer(state, { type: 'clearSlot', slotKey: 's1' })
  assert.equal(state, before)
  state = queueReducer(state, { type: 'clearSlot', slotKey: 's2' })
  assert.deepEqual(state.map((item) => item.id), ['a'])
  state = run([{ type: 'fail', id: 'a', error: '가상 오류', now: 2 }, { type: 'clearSlot', slotKey: 's1' }], state)
  assert.deepEqual(state, [])
})

test('isActive ignores failed items so a drained queue can be reconciled', () => {
  const state = run([enqueue('a', 's1'), { type: 'start', id: 'a', now: 1 }, { type: 'fail', id: 'a', error: '가상 오류', now: 2 }])
  assert.equal(isActive(state), false)
  assert.equal(activeCount(state), 0)
  assert.equal(inFlight(state), null)
  assert.equal(nextRunnable(state), null)
  assert.equal(slotItem(state, 's1')?.status, 'failed')
})

test('the reducer does not mutate the state it is given', () => {
  const start = run([enqueue('a', 's1'), enqueue('b', 's2')])
  const snapshot = start.map((item) => ({ ...item }))
  run([
    { type: 'start', id: 'a', now: 1 }, { type: 'progress', id: 'a', sent: 10, total: 1000 }, { type: 'sent', id: 'a', now: 2 },
    { type: 'fail', id: 'a', error: '가상 오류', now: 3 }, { type: 'retry', id: 'a', now: 4 }, { type: 'cancel', id: 'b' },
  ], start)
  assert.deepEqual(start, snapshot)
})
