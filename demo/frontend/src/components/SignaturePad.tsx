/**
 * 캔버스 전자서명.
 *
 * 서식5는 원문상 "(서명 또는 인)" 자필서명을 요구한다. 데모는 이를 전자서명으로
 * 대체해 "수기 0건"을 보여주되, 현행 지침과 다르다는 점을 화면에 드러낸다.
 * 전자서명 대체 가능 여부는 TF 확인사항이다.
 */

import { useEffect, useRef, useState } from 'react'

interface Props {
  /** data:image/png;base64,... 또는 빈 문자열 */
  value: string
  onChange: (dataUrl: string) => void
  width?: number
  height?: number
}

export default function SignaturePad({ value, onChange, width = 260, height = 90 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [empty, setEmpty] = useState(!value)
  // 고해상도 화면에서 획이 흐려지지 않게 캔버스를 화면 배율만큼 크게 잡는다.
  const [dpr] = useState(() => Math.max(1, Math.round(window.devicePixelRatio || 1)))

  const latestValue = useRef(value)
  // 되살리는 그림이 늦게 도착해 새로 그은 획을 덮지 않도록, 다시 그릴 때마다 번호를 올린다.
  const restoreTurn = useRef(0)
  useEffect(() => {
    latestValue.current = value
  }, [value])

  // 저장된 서명이 있으면 되살린다 (임시저장 후 복귀 등).
  // 캔버스 크기가 바뀌면 브라우저가 그림을 지우므로, 그때도 지금 서명을 다시 그린다.
  // 서명은 늘이지 않고 원래 비율 그대로 새 크기에 맞춰 가운데에 놓는다.
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    const turn = ++restoreTurn.current
    const current = latestValue.current
    if (!current) {
      setEmpty(true)
      return
    }
    const img = new Image()
    img.onload = () => {
      if (turn !== restoreTurn.current || !img.naturalWidth || !img.naturalHeight) return
      const fit = Math.min(width / img.naturalWidth, height / img.naturalHeight)
      const drawWidth = img.naturalWidth * fit
      const drawHeight = img.naturalHeight * fit
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
    }
    img.src = current
    setEmpty(false)
    // value 는 복원에만 쓴다. 그리는 중에 다시 그리면 획이 끊기므로 값이 바뀔 때는 다시 그리지 않는다.
  }, [width, height, dpr])

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    e.currentTarget.setPointerCapture(e.pointerId)
    restoreTurn.current += 1
    drawing.current = true
    const { x, y } = pos(e)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111'
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setEmpty(false)
  }

  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    const canvas = ref.current
    if (canvas) onChange(canvas.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, width, height)
    setEmpty(true)
    onChange('')
  }

  return (
    <span className="signature-box">
      <span className="signature-frame" style={{ width, height }}>
        <canvas
          ref={ref}
          className="signature-pad"
          width={width * dpr}
          height={height * dpr}
          style={{ width, height }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
          aria-label="전자서명 입력란"
        />
        {empty && (
          <span className="signature-placeholder" aria-hidden="true">
            여기에 서명하세요
          </span>
        )}
      </span>
      <span className="signature-actions">
        <button type="button" className="signature-clear" onClick={clear} disabled={empty}>
          지우기
        </button>
        <span className={empty ? 'signature-state' : 'signature-state signature-state--done'}>
          {empty ? '서명 전' : '서명 완료'}
        </span>
      </span>
    </span>
  )
}
