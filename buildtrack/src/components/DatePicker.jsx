import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useT } from '../i18n/useLanguage'

// Returns array of cells for a month grid (null = empty, number = day)
function buildGrid(year, month) {
  const firstDow = new Date(year, month, 1).getDay()          // 0=Sun
  const offset   = firstDow === 0 ? 6 : firstDow - 1          // Mon-based offset
  const total    = new Date(year, month + 1, 0).getDate()
  const cells    = Array(offset).fill(null)
  for (let d = 1; d <= total; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

// YYYY-MM-DD ↔ {year, month, day}
function parseISO(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return { year: y, month: m - 1, day: d }
}
function toISO(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

export default function DatePicker({ value, onChange, placeholder }) {
  const { t, lang } = useT()
  const parsed = parseISO(value)

  const today = new Date()
  const [open,      setOpen]      = useState(false)
  const [viewYear,  setViewYear]  = useState(parsed?.year  ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth())
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })

  const triggerRef = useRef(null)
  const dropRef    = useRef(null)

  // Position dropdown below trigger
  const openDropdown = () => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (!r) return
    const dropH = 300
    const spaceBelow = window.innerHeight - r.bottom
    const top = spaceBelow >= dropH ? r.bottom + 4 : r.top - dropH - 4
    const left = Math.min(r.left, window.innerWidth - 276)
    setPos({ top, left, width: Math.max(r.width, 276) })
    setOpen(true)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (triggerRef.current?.contains(e.target)) return
      if (dropRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Keep view in sync when value changes externally
  useEffect(() => {
    if (parsed) { setViewYear(parsed.year); setViewMonth(parsed.month) }
  }, [value])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1) }
    else setViewMonth(m => m + 1)
  }

  const selectDay = (day) => {
    if (!day) return
    onChange(toISO(viewYear, viewMonth, day))
    setOpen(false)
  }

  const clearDate = () => { onChange(''); setOpen(false) }
  const goToday   = () => {
    const d = new Date()
    onChange(toISO(d.getFullYear(), d.getMonth(), d.getDate()))
    setOpen(false)
  }

  // Formatted display
  const displayValue = parsed
    ? new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(parsed.year, parsed.month, parsed.day)
      )
    : null

  // Month/year header
  const monthLabel = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(
    new Date(viewYear, viewMonth, 1)
  )

  // Day-of-week headers (Mon-first)
  const dayHeaders = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 1 + i) // 2024-01-01 is Monday
    return new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(d)
  })

  const cells = buildGrid(viewYear, viewMonth)
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <>
      {/* Trigger button */}
      <div
        ref={triggerRef}
        className="form-input"
        onClick={openDropdown}
        style={{
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', userSelect: 'none',
          color: displayValue ? 'var(--text-1,#2E2420)' : '#B8AFA6',
          minHeight: 38,
        }}
      >
        <span style={{ fontSize: 13 }}>
          {displayValue || (placeholder ?? t('calendar.noDate'))}
        </span>
        <span style={{ fontSize: 13, color: '#C96B3A', display:'flex', alignItems:'center' }}><CalendarBlank size={13} weight="bold" /></span>
      </div>

      {/* Dropdown via portal */}
      {open && createPortal(
        <div
          ref={dropRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left,
            width: pos.width, minWidth: 276,
            background: 'var(--surface,#fff)', borderRadius: 14,
            border: '1.5px solid #EAE3D8',
            boxShadow: '0 8px 32px rgba(46,36,32,0.13)',
            zIndex: 9999, padding: '12px 12px 8px',
            fontFamily: 'inherit',
          }}
        >
          {/* Header: prev / month-year / next */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <button onClick={prevMonth} style={navBtn}><CaretLeft size={13} weight="bold" /></button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-1,#2E2420)', textTransform: 'capitalize' }}>
              {monthLabel}
            </div>
            <button onClick={nextMonth} style={navBtn}><CaretRight size={13} weight="bold" /></button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
            {dayHeaders.map((h, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#B8AFA6', padding: '2px 0', textTransform: 'uppercase' }}>
                {h}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const iso     = toISO(viewYear, viewMonth, day)
              const isToday = iso === todayISO
              const isSel   = iso === value
              return (
                <button
                  key={i}
                  onClick={() => selectDay(day)}
                  style={{
                    border: 'none', borderRadius: 8, cursor: 'pointer',
                    padding: '6px 0', fontSize: 12, fontWeight: isSel || isToday ? 700 : 400,
                    background: isSel ? '#C96B3A' : isToday ? '#FAECE4' : 'transparent',
                    color: isSel ? '#fff' : isToday ? '#C96B3A' : 'var(--text-1,#2E2420)',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#F2EDE4' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isToday ? '#FAECE4' : 'transparent' }}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Footer: Clear + Today */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid #EAE3D8' }}>
            <button onClick={clearDate} style={footBtn('#A32D2D')}>{t('calendar.clear')}</button>
            <button onClick={goToday}  style={footBtn('#C96B3A')}>{t('calendar.today')}</button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

const navBtn = {
  background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
  color: '#C96B3A', padding: '0 8px', lineHeight: 1, fontWeight: 700,
}
const footBtn = (color) => ({
  background: 'none', border: 'none', fontSize: 12, fontWeight: 600,
  color, cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
})
