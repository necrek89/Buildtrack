import { useEffect } from 'react'
import { Check } from '@phosphor-icons/react'
import { useT } from '../i18n/useLanguage'

// Modal shell: backdrop (click-out to close), Escape-to-close, centered card
export function Modal({ onClose, className, style, overlayStyle, children }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={overlayStyle}>
      <div className={['modal', className].filter(Boolean).join(' ')} style={style}>
        {children}
      </div>
    </div>
  )
}

// Inline success/error banner. `dense` gives the smaller in-card variant
// used next to a form field instead of the full-page auth-screen size.
export function Alert({ ok, dense, children }) {
  if (!children) return null
  return (
    <div style={{
      background: ok ? 'var(--success-bg)' : 'var(--danger-bg)', color: ok ? 'var(--success)' : 'var(--danger)',
      borderRadius: dense ? 6 : 8, fontSize: dense ? 12 : 13,
      padding: dense ? '6px 10px' : '10px 12px', marginBottom: dense ? 8 : 14,
      border: `1px solid ${ok ? 'var(--success-border)' : 'var(--danger-border)'}`,
    }}>
      {children}
    </div>
  )
}

// Centered card used by the auth screens (login/signup, reset password)
export function AuthCard({ children }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 20, padding: 28,
        width: '100%', maxWidth: 380, border: '0.5px solid var(--border-medium)',
        boxShadow: 'none',
      }}>
        {children}
      </div>
    </div>
  )
}

// Badge
export function Badge({ variant = 'gray', children }) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}

// Button
export function Button({ variant = 'default', size = 'md', onClick, children, type = 'button', disabled = false, style }) {
  const cls = ['btn', variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : '', size === 'sm' ? 'btn-sm' : ''].join(' ')
  return <button className={cls} onClick={onClick} type={type} disabled={disabled} style={style}>{children}</button>
}

// Icon button (edit / delete)
export function IconButton({ danger, onClick, children, title }) {
  return (
    <button className={`btn-icon${danger ? ' danger' : ''}`} onClick={onClick} title={title}>
      {children}
    </button>
  )
}

// Stat card
export function StatCard({ label, value, danger }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={danger ? { color: 'var(--danger)' } : {}}>{value}</div>
    </div>
  )
}

// Progress bar
export function ProgressBar({ value, label }) {
  const { t } = useT()
  return (
    <div className="progress-wrap">
      <div className="progress-labels"><span>{label || t('detail.progress')}</span><span>{value}%</span></div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${value}%` }} /></div>
    </div>
  )
}

// Checkbox
export function Checkbox({ checked, onChange }) {
  return (
    <div className={`checkbox ${checked ? 'checked' : ''}`} onClick={onChange}>
      {checked && <span className="checkbox-check"><Check size={11} weight="bold" /></span>}
    </div>
  )
}

// Section title
export function SectionTitle({ children }) {
  return <div className="section-title">{children}</div>
}

// Empty state
export function EmptyState({ children }) {
  return <div className="empty-state">{children}</div>
}

// Shared inline input style used by the form-heavy modals (expenses, material
// requests, invoices) that don't use the .form-input CSS class
export const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--border-medium)', background: 'var(--bg-subtle)',
  fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none',
}

// Form input
export function FormGroup({ label, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}
