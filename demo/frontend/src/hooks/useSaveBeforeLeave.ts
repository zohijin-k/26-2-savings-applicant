import { useCallback, useEffect, useRef, useState } from 'react'
import { registerApplicantLeave, registerApplicantHistory } from '../lib/applicant-navigation.ts'
import { mutationError } from '../lib/applicant-mutation.ts'

/** Flush before the shell unmounts the in-memory draft. Native unload is guarded separately. */
export default function useSaveBeforeLeave(enabled: boolean, flush: () => Promise<void>, blocked = false) {
  const latest = useRef({ enabled, flush, blocked })
  useEffect(() => { latest.current = { enabled, flush, blocked } }, [enabled, flush, blocked])
  const working = useRef(false)
  const mounted = useRef(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const leave = useCallback((action: () => void) => {
    if (working.current) return
    const current = latest.current
    if (current.blocked) { setError('진행 중인 저장·업로드·제출을 마친 뒤 이동해 주세요.'); return }
    if (!current.enabled) { action(); return }
    working.current = true; setPending(true); setError('')
    void current.flush().then(() => { if (mounted.current) action() }).catch((problem: unknown) => {
      if (mounted.current) setError(mutationError(problem, '저장을 확인하지 못해 이동하지 않았습니다. 입력을 확인한 뒤 다시 저장해 주세요.'))
    }).finally(() => { working.current = false; if (mounted.current) setPending(false) })
  }, [])
  useEffect(() => {
    mounted.current = true
    let location = window.location.href
    let index = Number(window.history.state?.applicantIndex ?? 0)
    const remember = () => { location = window.location.href; index = Number(window.history.state?.applicantIndex ?? 0) }
    let replay = false
    let restore: (() => void) | null = null
    const history = (event: PopStateEvent) => {
      if (replay) { replay = false; remember(); return false }
      if (restore) { event.stopImmediatePropagation(); const action = restore; restore = null; leave(action); return true }
      if (!latest.current.enabled && !latest.current.blocked) { remember(); return false }
      event.stopImmediatePropagation()
      const target = window.location.href
      const delta = Number(window.history.state?.applicantIndex) - index
      if (Number.isFinite(delta) && delta !== 0) {
        // Restore the current history entry first, preserving both back and forward history.
        restore = () => { replay = true; window.history.go(delta) }
        window.history.go(-delta)
      } else {
        // Unmarked same-document entries have no known direction. Retain the draft and URL.
        window.history.replaceState(window.history.state, '', location)
        leave(() => { replay = true; window.history.replaceState(window.history.state, '', target); window.dispatchEvent(new PopStateEvent('popstate')) })
      }
      return true
    }
    window.addEventListener('applicant:route', remember)
    const unregisterHistory = registerApplicantHistory(history)
    const unregister = registerApplicantLeave(leave)
    return () => { mounted.current = false; unregister(); window.removeEventListener('applicant:route', remember); unregisterHistory() }
  }, [leave])
  return { leave, pending, error }
}
