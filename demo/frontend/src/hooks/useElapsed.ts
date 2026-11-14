import { useEffect, useState } from 'react'

/**
 * `startedAt`(Date.now() 기준 ms)부터 흐른 시간을 초 단위 정수로 돌려준다.
 * `startedAt`이 null이면 0이고 시계도 돌리지 않는다.
 */
export default function useElapsed(startedAt: number | null, tickMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startedAt === null) return
    const tick = () => setNow(Date.now())
    const first = window.setTimeout(tick, 0)
    const timer = window.setInterval(tick, tickMs)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [startedAt, tickMs])

  return startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000))
}
