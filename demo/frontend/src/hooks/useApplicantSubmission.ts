import { useEffect, useRef, useState } from 'react'
import { fetchFinalCheck, fetchStatus, submitApplication, type ApplicationStatus, type SubmitResult } from '../api.ts'
import { isSubmitted, mutationError } from '../lib/applicant-mutation.ts'
export default function useApplicantSubmission(applicationId: number, onSubmitted: (result: SubmitResult) => void) {
  const lock = useRef(false)
  const epoch = useRef(0)
  const callback = useRef(onSubmitted)
  useEffect(() => { callback.current = onSubmitted }, [onSubmitted])
  const [busy, setBusy] = useState(false)
  const [unknown, setUnknown] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { epoch.current += 1; return () => { epoch.current += 1 } }, [applicationId])
  const complete = (status: ApplicationStatus) => {
    if (!isSubmitted(status)) return false
    callback.current({ ...status, notice: status.result_notice, message: '서버에서 신청 접수를 확인했습니다.', next_steps: [] })
    return true
  }
  const check = async () => {
    if (lock.current) return
    lock.current = true; setBusy(true)
    const generation = epoch.current
    try {
      const status = await fetchStatus(applicationId)
      if (generation !== epoch.current) return
      if (!complete(status)) { setUnknown(false); setError('현재 서버에서는 작성 중인 신청입니다. 내용을 확인한 뒤 제출할 수 있습니다.') }
    } catch (problem: unknown) {
      if (generation === epoch.current) { setUnknown(true); setError(mutationError(problem, '접수 결과를 확인하지 못했습니다. 접수 상태를 다시 확인해 주세요.')) }
    } finally { lock.current = false; if (generation === epoch.current) setBusy(false) }
  }
  const submit = async () => {
    if (lock.current || unknown) return
    lock.current = true; setBusy(true); setError('')
    const generation = epoch.current
    try {
      const status = await fetchStatus(applicationId)
      if (generation !== epoch.current || complete(status)) return
      const ready = await fetchFinalCheck(applicationId)
      if (generation !== epoch.current) return
      if (!ready.can_submit) { setError('제출 전에 채워야 할 항목이 있습니다. 최신 제출 준비 상태를 확인해 주세요.'); return }
      const result = await submitApplication(applicationId)
      if (!isSubmitted(result)) throw new Error('Unconfirmed submission response')
      if (generation === epoch.current) callback.current(result)
    } catch (problem: unknown) {
      if (generation !== epoch.current) return
      setUnknown(true)
      setError(mutationError(problem, '제출 응답을 확인하지 못했습니다. 접수 상태를 먼저 확인해 주세요.'))
      try {
        const status = await fetchStatus(applicationId)
        if (generation === epoch.current) complete(status)
      } catch { /* Keep the explicit status-only recovery action. */ }
    } finally { lock.current = false; if (generation === epoch.current) setBusy(false) }
  }
  return { submit, check, busy, unknown, error }
}
