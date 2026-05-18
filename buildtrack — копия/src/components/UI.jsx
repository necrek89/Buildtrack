// Badge
export function Badge({ variant = 'gray', children }) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}

// Button
export function Button({ variant = 'default', size = 'md', onClick, children, type = 'button' }) {
  const cls = ['btn', variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : '', size === 'sm' ? 'btn-sm' : ''].join(' ')
  return <button className={cls} onClick={onClick} type={type}>{children}</button>
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
      <div className="stat-value" style={danger ? { color: '#A32D2D' } : {}}>{value}</div>
    </div>
  )
}

// Progress bar
export function ProgressBar({ value, label }) {
  return (
    <div className="progress-wrap">
      <div className="progress-labels"><span>{label || 'Прогресс'}</span><span>{value}%</span></div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${value}%` }} /></div>
    </div>
  )
}

// Checkbox
export function Checkbox({ checked, onChange }) {
  return (
    <div className={`checkbox ${checked ? 'checked' : ''}`} onClick={onChange}>
      {checked && <span className="checkbox-check">✓</span>}
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

// Form input
export function FormGroup({ label, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}
