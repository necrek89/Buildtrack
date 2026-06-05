import { useState, useEffect, useRef } from 'react'
import { useT } from '../../i18n/useLanguage'
import { Plus, Check, X } from '@phosphor-icons/react'

// Compact labels for the unit select
const UNIT_OPTIONS = [
  { value: '',      label: '—' },
  { value: 'шт',    label: 'шт' },
  { value: 'пог.м', label: 'пог.м' },
  { value: 'кв.м',  label: 'кв.м' },
  { value: 'куб.м', label: 'куб.м' },
  { value: 'м',     label: 'м' },
  { value: 'кг',    label: 'кг' },
  { value: 'т',     label: 'т' },
  { value: 'л',     label: 'л' },
  { value: 'ч',     label: 'ч' },
  { value: 'компл', label: 'компл' },
]

// ─── QUICK ADD ROW ────────────────────────────────────────────────────────────
// isOpen / onOpen / onClose are controlled by SortableStageList so only one
// stage can have the row open at a time.
export default function QuickAddRow({ stage, onAdd, isOpen, onOpen, onClose }) {
  const { t } = useT()
  const [name, setName] = useState('')
  const [qty,  setQty]  = useState('')
  const [unit, setUnit] = useState('')
  const [busy, setBusy] = useState(false)
  const nameRef = useRef()
  const rowRef  = useRef()

  // Auto-focus name input when the row opens
  useEffect(() => {
    if (isOpen) setTimeout(() => nameRef.current?.focus(), 0)
  }, [isOpen])

  // Reset fields when closed from outside
  useEffect(() => {
    if (!isOpen) { setName(''); setQty(''); setUnit('') }
  }, [isOpen])

  const submit = async () => {
    const text = name.trim()
    if (!text || busy) return
    setBusy(true)
    await onAdd({ text, stage, qty: qty !== '' ? Number(qty) : null, unit: unit || null })
    setName('')
    setQty('')
    setUnit('')
    setBusy(false)
    nameRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); submit() }
    if (e.key === 'Escape') { onClose() }
  }

  // Click outside → collapse
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (rowRef.current && !rowRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onClose])

  const inputStyle = {
    border: '1px solid var(--border,#EAE3D8)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
    background: '#fff',
    color: 'var(--text-1,#2E2420)',
    transition: 'border-color .15s',
  }

  // ── Trigger button (collapsed state) ────────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={onOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          width: '100%', padding: '8px 13px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, color: 'var(--text-2,#7A6E66)',
          borderTop: '1px solid var(--border,#F2EDE6)',
          textAlign: 'left', fontFamily: 'inherit',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--accent,#C96B3A)'
          e.currentTarget.style.background = 'var(--accent-light,#FAECE4)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--text-2,#7A6E66)'
          e.currentTarget.style.background = 'none'
        }}
      >
        <Plus size={12} weight="bold" />
        {t('tasks.quickAddBtn')}
      </button>
    )
  }

  // ── Expanded quick-add row ───────────────────────────────────────────────────
  return (
    <div
      ref={rowRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 10px',
        background: 'var(--accent-light,#FAECE4)',
        borderTop: '1px solid var(--border,#EAE3D8)',
      }}
    >
      {/* Task name */}
      <input
        ref={nameRef}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('tasks.quickAddPlaceholder')}
        disabled={busy}
        style={{ ...inputStyle, flex: 1, minWidth: 0 }}
        onFocus={e => (e.target.style.borderColor = 'var(--accent,#C96B3A)')}
        onBlur={e  => (e.target.style.borderColor = 'var(--border,#EAE3D8)')}
      />

      {/* Quantity */}
      <input
        type="number"
        value={qty}
        onChange={e => setQty(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="кол-во"
        min="0"
        disabled={busy}
        style={{ ...inputStyle, width: 62, flexShrink: 0, padding: '6px 8px' }}
        onFocus={e => (e.target.style.borderColor = 'var(--accent,#C96B3A)')}
        onBlur={e  => (e.target.style.borderColor = 'var(--border,#EAE3D8)')}
      />

      {/* Unit */}
      <select
        value={unit}
        onChange={e => setUnit(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={busy}
        style={{
          ...inputStyle, flexShrink: 0,
          padding: '6px 5px', cursor: 'pointer',
          fontSize: 12,
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--accent,#C96B3A)')}
        onBlur={e  => (e.target.style.borderColor = 'var(--border,#EAE3D8)')}
      >
        {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
      </select>

      {/* Confirm */}
      <button
        onClick={submit}
        disabled={busy || !name.trim()}
        title="Добавить (Enter)"
        style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: name.trim() && !busy ? 'var(--accent,#C96B3A)' : '#D1C8C0',
          color: '#fff', border: 'none', borderRadius: 6,
          padding: '6px 10px',
          cursor: name.trim() && !busy ? 'pointer' : 'default',
          transition: 'background .15s',
        }}
      >
        <Check size={14} weight="bold" />
      </button>

      {/* Cancel */}
      <button
        onClick={onClose}
        title="Отмена (Esc)"
        style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent',
          border: '0.5px solid var(--border-med,#D1C8C0)',
          borderRadius: 6, padding: '6px 10px',
          cursor: 'pointer', color: 'var(--text-2,#7A6E66)',
        }}
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  )
}
