import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check } from '@phosphor-icons/react'
import { useLang, LANGUAGES } from '../i18n/useLanguage'

export default function LanguagePicker({ compact = false }) {
  const { lang, setLang } = useLang()
  const [open, setOpen]   = useState(false)
  const [pos,  setPos]    = useState({ top: 0, left: 0 })
  const btnRef            = useRef(null)
  const dropRef           = useRef(null)

  const toggle = () => {
    if (!open && btnRef.current) {
      const r       = btnRef.current.getBoundingClientRect()
      const dropH   = LANGUAGES.length * 42 + 8
      const below   = window.innerHeight - r.bottom
      const top     = below >= dropH ? r.bottom + 6 : r.top - dropH - 6
      const left    = Math.min(r.left, window.innerWidth - 185)
      setPos({ top: Math.max(8, top), left: Math.max(8, left) })
    }
    setOpen(o => !o)
  }

  // Close when clicking outside BOTH the button AND the dropdown
  useEffect(() => {
    if (!open) return
    function onOutside(e) {
      const inBtn  = btnRef.current  && btnRef.current.contains(e.target)
      const inDrop = dropRef.current && dropRef.current.contains(e.target)
      if (!inBtn && !inDrop) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', gap: compact ? 4 : 6,
          background: 'transparent', border: '1px solid #E0D8CF',
          borderRadius: 8, padding: compact ? '4px 8px' : '6px 10px',
          cursor: 'pointer', fontSize: compact ? 12 : 13,
          color: '#7A6E66', fontWeight: 500,
          transition: 'background .15s',
          flexShrink: 0,
        }}
        title="Change language"
      >
        <span style={{ fontSize: compact ? 14 : 16 }}>{current.flag}</span>
        {!compact && <span>{current.label}</span>}
        <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 1 }}>▾</span>
      </button>

      {open && createPortal(
        <div
          ref={dropRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            background: 'var(--surface,#fff)',
            border: '1px solid #E0D8CF',
            borderRadius: 12,
            boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
            zIndex: 9999,
            minWidth: 178,
            overflow: 'hidden',
            padding: '4px 0',
          }}
        >
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%',
                background: lang === l.code ? '#FAECE4' : 'transparent',
                border: 'none', padding: '10px 14px', cursor: 'pointer',
                fontSize: 13, color: lang === l.code ? '#C96B3A' : 'var(--text-1,#2E2420)',
                fontWeight: lang === l.code ? 600 : 400,
                textAlign: 'left', transition: 'background .1s',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{l.flag}</span>
              <span style={{ flex: 1 }}>{l.label}</span>
              {lang === l.code && (
                <span style={{ fontSize: 11, color: '#C96B3A', display:'flex', alignItems:'center' }}><Check size={11} weight="bold" /></span>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
