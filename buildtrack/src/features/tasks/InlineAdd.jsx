import { useState, useRef } from 'react'
import { useT } from '../../i18n/useLanguage'

// ─── QUICK ADD ROW ───────────────────────────────────────────────────────────
export default function QuickAddRow({ stage, onAdd }) {
  const { t } = useT()
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef()

  const submit = async () => {
    const text = val.trim()
    if (!text) return
    setBusy(true)
    await onAdd(text, stage)
    setVal('')
    setBusy(false)
    ref.current?.focus()
  }

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:6,
      borderTop:'1px solid var(--border,#F2EDE6)',
      padding:'7px 12px', background:'var(--surface-2,#FDFBF8)',
    }}>
      <span style={{ fontSize:14, color:'#C8C0B8', flexShrink:0 }}>+</span>
      <input
        ref={ref}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setVal('') }}
        placeholder={t('tasks.quickAdd')}
        disabled={busy}
        style={{
          flex:1, border:'none', outline:'none', background:'transparent',
          fontSize:13, color:'var(--text-1,#2E2420)', fontFamily:'inherit',
          opacity: busy ? 0.5 : 1,
        }}
      />
      {val.trim() && (
        <button
          onClick={submit}
          disabled={busy}
          style={{
            background:'#C96B3A', color:'#fff', border:'none',
            borderRadius:6, padding:'3px 10px', fontSize:12,
            fontWeight:600, cursor:'pointer', flexShrink:0,
          }}
        >{busy ? '...' : 'Enter ↵'}</button>
      )}
    </div>
  )
}
