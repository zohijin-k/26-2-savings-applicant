/** 두배적금 신청자 전용 진입점. 신청 내용은 ApplyFlow가 소유한다. */
import { useEffect, useRef, useState, type MouseEvent } from 'react'

import bannerUrl from './assets/brand/jb-banner.png'
import ConfirmDialog from './components/ConfirmDialog.tsx'
import ApplyFlow from './pages/applicant/ApplyFlow.tsx'
import { goToHome } from './navigation-url.ts'
import './app-shell.css'

export default function App() {
  const [applicantKey, setApplicantKey] = useState(0)
  const [applicantHeaderHost, setApplicantHeaderHost] = useState<HTMLDivElement | null>(null)
  const [applicantFooterHost, setApplicantFooterHost] = useState<HTMLDivElement | null>(null)
  // ApplyFlow가 알려 주는 값: 본인인증을 마쳤고 아직 제출하지 않은 신청이 있는지.
  const [hasProgress, setHasProgress] = useState(false)
  const [confirmingHome, setConfirmingHome] = useState(false)
  const homeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onHistoryChange = () => setApplicantKey((key) => key + 1)
    window.addEventListener('popstate', onHistoryChange)
    return () => window.removeEventListener('popstate', onHistoryChange)
  }, [])

  const goHome = () => {
    setConfirmingHome(false)
    setHasProgress(false)
    goToHome()
    setApplicantKey((key) => key + 1)
    window.scrollTo({ top: 0 })
  }

  // 주소에 #main을 남기지 않고 본문으로 포커스만 옮긴다(뒤로 가기 기록을 늘리지 않는다).
  const skipToMain = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    const main = document.getElementById('main')
    main?.focus()
    main?.scrollIntoView()
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main" onClick={skipToMain}>본문으로 건너뛰기</a>
      <header className="shell">
        <div className="shell__inner">
          <button
            ref={homeButton}
            className="shell__home"
            type="button"
            onClick={() => (hasProgress ? setConfirmingHome(true) : goHome())}
            aria-label="처음으로 (새 신청 시작)"
          >
            <img className="shell__banner" src={bannerUrl} width={297} height={100} alt="전북특별자치도 2026 전북청년 함께 두배적금" />
          </button>
          <div ref={setApplicantHeaderHost} className="shell__tools" />
        </div>
      </header>
      <main id="main" className="shell-main" tabIndex={-1}>
        <ApplyFlow
          key={applicantKey}
          headerHost={applicantHeaderHost}
          footerHost={applicantFooterHost}
          onProgressChange={setHasProgress}
        />
      </main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <p className="site-footer__service">
            <strong>「전북청년 함께 두배적금」 신청</strong>
            <span>전북특별자치도</span>
          </p>
          <div ref={setApplicantFooterHost} className="site-footer__contact" />
        </div>
      </footer>
      {confirmingHome && (
        <ConfirmDialog
          title="새 신청을 시작하시겠습니까?"
          description="지금 작성 중인 신청은 이 창에서 더 이어서 쓸 수 없습니다."
          confirmLabel="새 신청 시작"
          cancelLabel="계속 작성"
          tone="danger"
          onConfirm={goHome}
          onCancel={() => setConfirmingHome(false)}
          returnFocus={() => homeButton.current}
        />
      )}
    </div>
  )
}
