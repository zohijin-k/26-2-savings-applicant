/** Accessible portal dialog. Each instance restores the background and focus it owns. */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './modal.css'

const openDialogs: HTMLElement[] = []
const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

export default function Modal({ title, description, onClose, returnFocus, children, footer, variant = 'default' }: {
  title: string
  description?: string
  onClose: () => void
  returnFocus?: () => HTMLElement | null
  children: ReactNode
  footer?: ReactNode
  variant?: 'default' | 'viewer' | 'printable-viewer' | 'reupload'
}) {
  const id = useId()
  const [host] = useState(() => document.createElement('div'))
  const dialog = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const focusFallback = useRef(returnFocus)
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose; focusFallback.current = returnFocus }, [onClose, returnFocus])

  useEffect(() => {
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.append(host)
    const background = Array.from(document.body.children).filter((node): node is HTMLElement => node instanceof HTMLElement && node !== host)
      .map((node) => ({ node, inert: node.inert }))
    for (const { node } of background) node.inert = true
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    openDialogs.push(host)
    heading.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (openDialogs.at(-1) !== host) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close.current()
      }
      if (event.key !== 'Tab') return
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
        .filter((node) => node.getClientRects().length > 0 && !node.closest('[inert]'))
        .sort((a, b) => (a.tabIndex > 0 ? a.tabIndex : Infinity) - (b.tabIndex > 0 ? b.tabIndex : Infinity))
      const first = controls[0]
      const last = controls.at(-1)
      if (!first) { event.preventDefault(); heading.current?.focus(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) {
        event.preventDefault(); last?.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus()
      }
    }
    const onFocus = (event: FocusEvent) => {
      if (openDialogs.at(-1) === host && !dialog.current?.contains(event.target as Node)) heading.current?.focus()
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('focusin', onFocus)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('focusin', onFocus)
      openDialogs.splice(openDialogs.indexOf(host), 1)
      for (const { node, inert } of background) node.inert = inert
      document.body.style.overflow = previousOverflow
      host.remove()
      const returnTarget = origin?.isConnected && origin !== document.body && origin.getClientRects().length > 0 ? origin : focusFallback.current?.()
      if (returnTarget?.isConnected && !returnTarget.closest('[inert]')) returnTarget.focus()
    }
  }, [host])

  return createPortal(
    <div className={variant === 'printable-viewer' ? 'modal-overlay modal-overlay--printable' : 'modal-overlay'} onClick={onClose}>
      <div ref={dialog} className={variant === 'reupload' ? 'modal modal--reupload' : variant === 'default' ? 'modal' : 'modal modal--viewer'}
        role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined}
        onClick={(event) => event.stopPropagation()}>
        <div className="modal__head">
          <h3 id={`${id}-title`} ref={heading} tabIndex={-1}>{title}</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <div className="modal__body">
          {description && <p id={`${id}-description`}>{description}</p>}
          {children}
        </div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>, host,
  )
}
