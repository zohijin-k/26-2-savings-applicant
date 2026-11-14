import { useEffect } from 'react'

/** `active`인 동안 탭을 닫거나 새로 고치려 하면 브라우저의 이탈 확인을 띄운다. */
export default function useBeforeUnload(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // 일부 브라우저는 returnValue가 있어야 확인 창을 띄운다. 문구는 브라우저가 정한다.
      event.returnValue = true
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [active])
}
