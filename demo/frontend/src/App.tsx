/** 두배적금 신청자 전용 진입점. 신청 내용은 ApplyFlow가 소유한다. */
import { useEffect, useState } from 'react'

import ApplyFlow from './pages/applicant/ApplyFlow.tsx'
import { goToHome } from './navigation-url.ts'
import './app-shell.css'

export default function App() {
  const [applicantKey, setApplicantKey] = useState(0)
  const [applicantHeaderHost, setApplicantHeaderHost] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const onHistoryChange = () => setApplicantKey((key) => key + 1)
    window.addEventListener('popstate', onHistoryChange)
    return () => window.removeEventListener('popstate', onHistoryChange)
  }, [])

  const goHome = () => {
    goToHome()
    setApplicantKey((key) => key + 1)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="app-shell app-shell--applicant">
      <nav className="shell" aria-label="두배적금 신청">
        <div className="shell__inner">
          <span className="shell__title">
            <button className="shell__mark" type="button" onClick={goHome} aria-label="두배적금 본인인증으로 이동">
              전북
            </button>
            <span><strong>전북청년 함께 두배적금 신청</strong></span>
          </span>
          <div ref={setApplicantHeaderHost} className="shell__application" />
        </div>
      </nav>
      <ApplyFlow key={applicantKey} headerHost={applicantHeaderHost} />
    </div>
  )
}
