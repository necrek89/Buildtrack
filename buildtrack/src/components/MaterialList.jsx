function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d    = new Date(dateStr)
  const diff = (Date.now() - d) / 1000
  if (diff < 60)      return 'just now'
  if (diff < 3600)    return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)   return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800)  return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString('en', { day: 'numeric', month: 'short' })
}

export default function MaterialList({
  materials       = [],
  showProject     = false,
  projects        = [],
  onTogglePurchased,
  onDelete,
  role,
  profile,
}) {
  if (materials.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '28px 0', color: '#B8AFA6' }}>
        <div style={{ fontSize: 30, marginBottom: 6 }}>📦</div>
        <div style={{ fontSize: 12 }}>No materials yet</div>
      </div>
    )
  }

  return (
    <div>
      {materials.map(m => {
        const isPurchased = m.status === 'purchased'
        const projName    = showProject ? (projects.find(p => String(p.id) === String(m.projectId))?.name || (m.projectId ? 'Unknown project' : null)) : null
        const canCheck    = role === 'foreman' && !!onTogglePurchased
        const canDelete   = role === 'foreman' || m.reportedBy === profile?.name

        return (
          <div key={m.id} className={`material-row ${m.status}`}>
            {/* Checkbox */}
            <div
              onClick={() => canCheck && onTogglePurchased(m.id)}
              title={canCheck ? (isPurchased ? 'Mark as needed again' : 'Mark as purchased') : undefined}
              style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 2,
                border: `2px solid ${isPurchased ? '#5A9467' : '#C96B3A'}`,
                background: isPurchased ? '#5A9467' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: canCheck ? 'pointer' : 'default',
                transition: 'background .15s, border-color .15s',
              }}
            >
              {isPurchased && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="material-name">
                {m.name}
                <span style={{
                  fontWeight: 700,
                  color: isPurchased ? '#7A6E66' : '#C96B3A',
                  marginLeft: 6,
                }}>
                  × {m.qty} {m.unit}
                </span>
              </div>

              {/* Project chip — показывается только если передан showProject */}
              {projName && (
                <div style={{ marginTop: 4, marginBottom: 2 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    background: '#FAECE4', color: '#C96B3A',
                    border: '1px solid #E8C9B4',
                    borderRadius: 6, padding: '2px 8px',
                  }}>
                    🏗 {projName}
                  </span>
                </div>
              )}

              <div className="material-meta">
                {m.reportedBy}
                {m.stage && <> · {m.stage}</>}
                {isPurchased
                  ? <> · <span style={{ color: '#5A9467', fontWeight: 600 }}>purchased {timeAgo(m.purchasedAt)}</span></>
                  : <> · {timeAgo(m.createdAt)}</>
                }
              </div>

              {m.note && (
                <div className="material-note">"{m.note}"</div>
              )}
            </div>

            {/* Delete */}
            {canDelete && onDelete && (
              <button
                onClick={() => onDelete(m.id)}
                title="Remove"
                style={{
                  background: 'none', border: 'none', color: '#C8B8B0',
                  cursor: 'pointer', fontSize: 14, padding: '0 2px', flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                🗑
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
