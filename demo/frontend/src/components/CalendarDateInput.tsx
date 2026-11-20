import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import Icon from './Icon.tsx'
import './calendar-date-input.css'

interface Props {
  value: string
  max: string
  label: string
  onChange: (value: string) => void
  disabled?: boolean
  describedBy?: string
  invalid?: boolean
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']
const FIRST_YEAR = 1900

function parts(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day
    ? { year, month, day }
    : null
}

function dateISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function CalendarDateInput({ value, max, label, onChange, disabled = false, describedBy, invalid = false }: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const yearsRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'days' | 'years' | 'months'>('days')
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const maxDate = parts(max) ?? parts(new Date().toISOString().slice(0, 10))!
  const selected = parts(value)
  const [year, setYear] = useState(selected?.year ?? maxDate.year)
  const [month, setMonth] = useState(selected?.month ?? maxDate.month)

  const updatePosition = () => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(280, window.innerWidth - 16)
    const height = Math.min(320, window.innerHeight - 16)
    const top = rect.bottom + 6 + height <= window.innerHeight
      ? rect.bottom + 6
      : Math.max(8, rect.top - height - 6)
    setPosition({ top, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) })
  }

  const close = (returnFocus = false) => {
    setOpen(false)
    if (returnFocus) requestAnimationFrame(() => anchorRef.current?.focus())
  }

  const show = () => {
    const initial = selected ?? maxDate
    setYear(initial.year)
    setMonth(initial.month)
    setView('days')
    setOpen(true)
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    const onScroll = () => updatePosition()
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll)
    return () => {
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    if (view === 'years') {
      const list = yearsRef.current
      const chosen = list?.querySelector<HTMLElement>('[aria-current="date"]')
      if (list && chosen) {
        list.scrollTop = chosen.offsetTop - list.offsetTop - list.clientHeight / 2 + chosen.clientHeight / 2
        chosen.focus()
      }
    } else if (view === 'months') {
      popoverRef.current?.querySelector<HTMLButtonElement>('.calendar-date__months button[aria-pressed="true"]')?.focus()
    } else {
      popoverRef.current?.querySelector<HTMLButtonElement>('.calendar-date__heading')?.focus()
    }
  }, [open, view])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (!anchorRef.current?.contains(target) && !popoverRef.current?.contains(target)) close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close(true)
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!disabled || !open) return
    const frame = requestAnimationFrame(() => setOpen(false))
    return () => cancelAnimationFrame(frame)
  }, [disabled, open])

  const changeMonth = (delta: number) => {
    const date = new Date(year, month - 1 + delta, 1)
    setYear(date.getFullYear())
    setMonth(date.getMonth() + 1)
  }
  const previousAllowed = year > FIRST_YEAR || month > 1
  const nextAllowed = year < maxDate.year || (year === maxDate.year && month < maxDate.month)
  const startOffset = (new Date(year, month - 1, 1).getDay() + 6) % 7
  const dayCount = new Date(year, month, 0).getDate()
  const years = Array.from({ length: maxDate.year - FIRST_YEAR + 1 }, (_, index) => FIRST_YEAR + index)

  return <>
    <button
      ref={anchorRef}
      type="button"
      className="input calendar-date__trigger"
      aria-label={`${label} 날짜 선택${selected ? `, ${selected.year}년 ${selected.month}월 ${selected.day}일` : ''}`}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => open ? close() : show()}
    >
      <span>{selected ? `${selected.year}. ${String(selected.month).padStart(2, '0')}. ${String(selected.day).padStart(2, '0')}.` : '날짜 선택'}</span>
      <Icon name="calendar" size={18} />
    </button>
    {open && createPortal(
      <div ref={popoverRef} className="calendar-date__popover" style={position} role="dialog" aria-label={`${label} 날짜 선택`}>
        <div className="calendar-date__header">
          {view === 'days' ? <>
            <button type="button" className="calendar-date__arrow" aria-label="이전 달" disabled={!previousAllowed} onClick={() => changeMonth(-1)}><Icon name="chevronLeft" size={18} /></button>
            <button type="button" className="calendar-date__heading" onClick={() => setView('years')} aria-label={`${year}년 ${month}월, 연도 선택`}>{year}년 {month}월 <Icon name="chevronDown" size={16} /></button>
            <button type="button" className="calendar-date__arrow" aria-label="다음 달" disabled={!nextAllowed} onClick={() => changeMonth(1)}><Icon name="chevronRight" size={18} /></button>
          </> : view === 'months' ? <>
            <button type="button" className="calendar-date__arrow" aria-label="연도 다시 선택" onClick={() => setView('years')}><Icon name="chevronLeft" size={18} /></button>
            <span className="calendar-date__heading">{year}년 월 선택</span>
            <button type="button" className="calendar-date__arrow" aria-label="날짜로 돌아가기" onClick={() => setView('days')}><Icon name="close" size={18} /></button>
          </> : <>
            <span className="calendar-date__heading">연도 선택</span>
            <button type="button" className="calendar-date__arrow" aria-label="달력으로 돌아가기" onClick={() => setView('days')}><Icon name="close" size={18} /></button>
          </>}
        </div>
        {view === 'years' ? <div ref={yearsRef} className="calendar-date__years" role="group" aria-label="연도 목록">
          {years.map((option) => <button key={option} type="button" aria-current={option === year ? 'date' : undefined} onClick={() => { setYear(option); if (option === maxDate.year && month > maxDate.month) setMonth(maxDate.month); setView('months') }}>{option}년</button>)}
        </div> : view === 'months' ? <div className="calendar-date__months" role="group" aria-label={`${year}년 월 선택`}>
          {Array.from({ length: 12 }, (_, index) => index + 1).map((option) => <button key={option} type="button" aria-label={`${year}년 ${option}월`} aria-pressed={option === month} disabled={year === maxDate.year && option > maxDate.month} onClick={() => { setMonth(option); setView('days') }}>{option}월</button>)}
        </div> : <div className="calendar-date__grid" role="group" aria-label={`${year}년 ${month}월`}>
          {WEEKDAYS.map((day) => <span key={day} className="calendar-date__weekday" aria-hidden="true">{day}</span>)}
          {Array.from({ length: startOffset }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
          {Array.from({ length: dayCount }, (_, index) => {
            const day = index + 1
            const iso = dateISO(year, month, day)
            return <button key={day} type="button" aria-label={`${year}년 ${month}월 ${day}일`} aria-pressed={value === iso} disabled={iso > max} onClick={() => { onChange(iso); close(true) }}>{day}</button>
          })}
        </div>}
        {view === 'days' && selected && <div className="calendar-date__footer">
          <button type="button" onClick={() => { onChange(''); close(true) }}>선택 지우기</button>
        </div>}
      </div>, document.body,
    )}
  </>
}
