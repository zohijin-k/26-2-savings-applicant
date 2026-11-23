/**
 * Keeps a native Tab inside a modal dialog.
 *
 * Safari/WebKit leaves buttons out of the Tab order by default, so a native Tab from a
 * dialog's heading or button can land on <body> outside the dialog. The dialog traps
 * only handle the first/last control, so they let the browser move focus everywhere else.
 * This guard watches each Tab the trap left to the browser; if focus then leaves the dialog,
 * it moves focus to the neighbouring dialog control instead. Browsers whose Tab already
 * stays inside the dialog are not affected.
 */

/** The control after (or before) `from`, wrapping around; the first/last one when `from` is not a control. */
export function neighbourControl<T>(controls: readonly T[], from: T | null, backwards: boolean): T | undefined {
  if (controls.length === 0) return undefined
  const index = from === null ? -1 : controls.indexOf(from)
  if (index < 0) return backwards ? controls[controls.length - 1] : controls[0]
  return controls[(index + (backwards ? -1 : 1) + controls.length) % controls.length]
}

/** Install the guard for one dialog. Returns the cleanup function. */
export function guardDialogTab(dialog: () => HTMLElement | null, controls: () => HTMLElement[]): () => void {
  let pending: { from: HTMLElement | null; backwards: boolean } | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  const onKeyDown = (event: KeyboardEvent) => {
    const box = dialog()
    if (event.key !== 'Tab' || event.defaultPrevented || !box) return
    const active = document.activeElement
    if (!(active instanceof HTMLElement) || !box.contains(active)) return
    pending = { from: active, backwards: event.shiftKey }
    clearTimeout(timer)
    // The browser moves focus right after keydown; a Tab that does not move it is forgotten.
    timer = setTimeout(() => { pending = null })
  }
  const onFocusOut = (event: FocusEvent) => {
    const box = dialog()
    if (!pending || !box || !(event.target instanceof Node) || !box.contains(event.target)) return
    const { from, backwards } = pending
    pending = null
    if (event.relatedTarget instanceof Node && box.contains(event.relatedTarget)) return
    const target = neighbourControl(controls(), from, backwards)
    // Focus cannot be moved back while the browser is still moving it away.
    if (target) setTimeout(() => { if (target.isConnected && box.isConnected) target.focus() })
  }
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('focusout', onFocusOut, true)
  return () => {
    clearTimeout(timer)
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('focusout', onFocusOut, true)
  }
}
