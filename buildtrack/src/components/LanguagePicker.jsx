import { useState, useRef, useEffect } from 'react'
import { useLang, LANGUAGES } from '../i18n/useLanguage'

export default function LanguagePicker({ compact = false }) {
  const { lang, setLang } = useLang()
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)

  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]

  useEffect(() => {
    function onOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: compact ? 4 : 6,
          background: 'transparent', border: '1px solid #E0D8CF',
          borderRadius: 8, padding: compact ? '4px 8px' : '6px 10px',
          cursor: 'pointer', fontSize: compact ? 12 : 13,
          color: '#7A6E66', fontWeight: 500,
          transition: 'background .15s',
        }}
        title="Change language"
      >
        <span style={{ fontSize: compact ? 14 : 16 }}>{current.flag}</span>
        {!compact && <span>{current.label}</span>}
        <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 1 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', right: 0,
          background: '#fff', border: '1px solid #E0D8CF',
          borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          zIndex: 200, minWidth: 160, overflow: 'hidden',
          padding: '4px 0',
        }}>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', background: lang === l.code ? '#FAECE4' : 'transparent',
                border: 'none', padding: '9px 14px', cursor: 'pointer',
                fontSize: 13, color: lang === l.code ? '#C96B3A' : '#2E2420',
                fontWeight: lang === l.code ? 600 : 400,
                textAlign: 'left', transition: 'background .1s',
              }}
            >
              <span style={{ fontSize: 18 }}>{l.flag}</span>
              <span>{l.label}</span>
              {lang === l.code && <span style={{ marginLeft: 'auto', fontSize: 11 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
