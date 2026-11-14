/**
 * 표 안의 파일 이름 — 누르면 크게 보기 대화상자가 뜬다.
 * 마이페이지처럼 올린 서류를 목록으로 보여 주는 곳에서 쓴다.
 */

import { useState } from 'react'

import FilePreview from './FilePreview.tsx'
import './file-preview.css'

interface Props {
  url: string
  name: string
  format: string
}

export default function FileLink({ url, name, format }: Props) {
  const [open, setOpen] = useState(false)
  const kind = (format || name).toLowerCase().endsWith('pdf') ? 'pdf' : 'image'
  return (
    <>
      <button type="button" className="file-link" onClick={() => setOpen(true)} aria-haspopup="dialog">
        {name}
        <span className="sr-only"> 크게 보기</span>
      </button>
      {open && <FilePreview url={url} name={name} kind={kind} onClose={() => setOpen(false)} />}
    </>
  )
}
