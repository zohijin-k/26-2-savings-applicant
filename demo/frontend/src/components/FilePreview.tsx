/**
 * 올린 파일 크게 보기 — 업로드한 서류나 서명 파일을 눌렀을 때 뜨는 대화상자.
 *
 * PDF는 쪽을 세로로 이어 그리고(pdf.js), 이미지는 그대로 띄운다.
 * 확대·축소만 둔다. 저장 버튼은 두지 않는다 (원본 저장 경로를 만들지 않는 원칙).
 */

import { useState } from 'react'

import Icon from './Icon.tsx'
import Modal from './Modal.tsx'
import PdfPages from './PdfPages.tsx'
import Spinner from './Spinner.tsx'
import './file-preview.css'

/** 쪽 폭(px). 한 단계씩 키우고 줄인다. 100%는 720px이다. */
const WIDTHS = [320, 400, 480, 600, 720, 860, 1040, 1240]
const BASE_WIDTH = 720

/** 처음에는 화면에 가로로 다 들어오는 가장 큰 단계로 연다. */
function initialStep(): number {
  const room = Math.min(BASE_WIDTH, window.innerWidth - 80)
  const fitting = WIDTHS.findLastIndex((width) => width <= room)
  return Math.max(0, fitting)
}

export type PreviewKind = 'pdf' | 'image'

interface Props {
  url: string
  name: string
  kind: PreviewKind
  onClose: () => void
}

export default function FilePreview({ url, name, kind, onClose }: Props) {
  const [fitStep] = useState(initialStep)
  const [step, setStep] = useState(fitStep)
  const [pages, setPages] = useState(0)
  const [image, setImage] = useState<'loading' | 'ready' | 'failed'>('loading')
  const width = WIDTHS[step]
  const percent = Math.round((width / BASE_WIDTH) * 100)

  return (
    <Modal title={name} onClose={onClose} variant="viewer">
      <div className="fpreview">
        <div className="fpreview__bar">
          <span className="fpreview__meta">
            {kind === 'pdf' ? 'PDF' : '이미지'}
            {kind === 'pdf' && pages > 0 && ` · ${pages}쪽`}
          </span>
          <div className="fpreview__zoom" role="group" aria-label="확대·축소">
            <button type="button" onClick={() => setStep((current) => current - 1)} disabled={step === 0} aria-label="축소">
              <Icon name="minus" />
            </button>
            <button
              type="button"
              className="fpreview__percent"
              onClick={() => setStep(fitStep)}
              aria-label={`처음 크기로 (지금 ${percent}%)`}
            >
              {percent}%
            </button>
            <button type="button" onClick={() => setStep((current) => current + 1)} disabled={step === WIDTHS.length - 1} aria-label="확대">
              <Icon name="plus" />
            </button>
          </div>
        </div>
        <div className="fpreview__stage">
          {kind === 'pdf' ? (
            <PdfPages url={url} width={width} onPageCount={setPages} />
          ) : (
            <>
              {image === 'loading' && <p className="fpreview__loading"><Spinner label="파일을 불러오고 있습니다." /></p>}
              {image === 'failed' && <p className="pdfpages__error">파일을 표시할 수 없습니다.</p>}
              {image !== 'failed' && (
                <img
                  className="fpreview__img"
                  src={url}
                  alt={name}
                  style={{ width }}
                  hidden={image === 'loading'}
                  onLoad={() => setImage('ready')}
                  onError={() => setImage('failed')}
                />
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
