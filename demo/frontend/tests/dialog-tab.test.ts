import assert from 'node:assert/strict'
import test from 'node:test'

// Minimal DOM stand-ins: the guard only needs containment, focus and document events.
class FakeNode {
  children: FakeNode[] = []
  parent: FakeNode | null = null
  isConnected = true
  name: string
  constructor(name: string) { this.name = name }
  append(...nodes: FakeNode[]) { for (const node of nodes) { node.parent = this; this.children.push(node) } return this }
  contains(other: unknown): boolean {
    for (let node = other as FakeNode | null; node; node = node.parent) if (node === this) return true
    return false
  }
}
class FakeElement extends FakeNode {
  focus() { fakeDocument.activeElement = this }
}
const listeners: Record<string, Array<(event: object) => void>> = {}
const fakeDocument = {
  activeElement: null as FakeElement | null,
  addEventListener(type: string, fn: (event: object) => void) { (listeners[type] ??= []).push(fn) },
  removeEventListener(type: string, fn: (event: object) => void) { listeners[type] = (listeners[type] ?? []).filter((item) => item !== fn) },
}
Object.assign(globalThis, { Node: FakeNode, HTMLElement: FakeElement, document: fakeDocument })
const fire = (type: string, event: object) => { for (const fn of listeners[type] ?? []) fn(event) }
const tick = () => new Promise((resolve) => setTimeout(resolve, 5))

const { guardDialogTab, neighbourControl } = await import('../src/lib/dialog-tab.ts')

test('neighbourControl walks the dialog controls in order and wraps at both ends', () => {
  const controls = ['close', 'cancel', 'confirm']
  assert.equal(neighbourControl(controls, 'close', false), 'cancel')
  assert.equal(neighbourControl(controls, 'confirm', false), 'close')
  assert.equal(neighbourControl(controls, 'close', true), 'confirm')
  assert.equal(neighbourControl(controls, 'cancel', true), 'close')
  // The dialog heading (tabindex -1) is not a control: Tab goes to the first, Shift+Tab to the last.
  assert.equal(neighbourControl(controls, 'heading', false), 'close')
  assert.equal(neighbourControl(controls, 'heading', true), 'confirm')
  assert.equal(neighbourControl(controls, null, false), 'close')
  assert.equal(neighbourControl([], 'close', false), undefined)
})

function dialogFixture() {
  const body = new FakeElement('body')
  const box = new FakeElement('dialog')
  const heading = new FakeElement('heading')
  const close = new FakeElement('close')
  const cancel = new FakeElement('cancel')
  const confirm = new FakeElement('confirm')
  box.append(heading, close, cancel, confirm)
  body.append(box)
  const release = guardDialogTab(() => box as unknown as HTMLElement, () => [close, cancel, confirm] as unknown as HTMLElement[])
  return { body, box, heading, close, cancel, confirm, release }
}

test('a native Tab that drops focus out of the dialog (WebKit default) moves to the next dialog control', async () => {
  const { body, heading, close, cancel, release } = dialogFixture()
  try {
    heading.focus()
    fire('keydown', { key: 'Tab', shiftKey: false, defaultPrevented: false })
    fakeDocument.activeElement = body
    fire('focusout', { target: heading, relatedTarget: null })
    await tick()
    assert.equal(fakeDocument.activeElement, close)

    fire('keydown', { key: 'Tab', shiftKey: false, defaultPrevented: false })
    fakeDocument.activeElement = body
    fire('focusout', { target: close, relatedTarget: null })
    await tick()
    assert.equal(fakeDocument.activeElement, cancel)

    fire('keydown', { key: 'Tab', shiftKey: true, defaultPrevented: false })
    fakeDocument.activeElement = body
    fire('focusout', { target: cancel, relatedTarget: null })
    await tick()
    assert.equal(fakeDocument.activeElement, close)
  } finally { release() }
})

test('the guard leaves native Tab alone when focus stays inside, and ignores Tabs the trap already handled', async () => {
  const { heading, close, cancel, confirm, release } = dialogFixture()
  try {
    heading.focus()
    fire('keydown', { key: 'Tab', shiftKey: false, defaultPrevented: false })
    fakeDocument.activeElement = close
    fire('focusout', { target: heading, relatedTarget: close })
    await tick()
    assert.equal(fakeDocument.activeElement, close)

    confirm.focus()
    fire('keydown', { key: 'Tab', shiftKey: false, defaultPrevented: true })
    fire('focusout', { target: confirm, relatedTarget: null })
    await tick()
    assert.equal(fakeDocument.activeElement, confirm)

    // A later blur that was not caused by Tab (e.g. a mouse click elsewhere) is not redirected.
    cancel.focus()
    fire('keydown', { key: 'Tab', shiftKey: false, defaultPrevented: false })
    await tick()
    fire('focusout', { target: cancel, relatedTarget: null })
    await tick()
    assert.equal(fakeDocument.activeElement, cancel)
  } finally { release() }
})

test('cleanup removes both listeners', () => {
  const before = (listeners.keydown?.length ?? 0) + (listeners.focusout?.length ?? 0)
  const { release } = dialogFixture()
  release()
  assert.equal((listeners.keydown?.length ?? 0) + (listeners.focusout?.length ?? 0), before)
})
