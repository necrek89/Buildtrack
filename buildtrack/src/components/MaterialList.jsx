import { Package, Buildings, Check, Trash } from '@phosphor-icons/react'
import { useT } from '../i18n/useLanguage'
import { timeAgo } from '../lib/timeAgo'

export default function MaterialList({
  materials       = [],
  showProject     = false,
  projects        = [],
  onTogglePurchased,
  onDelete,
  role,
  profile,
}) {
  const { t } = useT()

  if (materials.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 30, marginBottom: 6, display:'flex', justifyContent:'center' }}><Package size={30} weight="bold" /></div>
        <div style={{ fontSize: 12 }}>{t('materials.none')}</div>
      </div>
    )
  }

  return (
    <div>
      {materials.map(m => {
        const isPurchased = m.status === 'purchased'
        const projName    = showProject ? (projects.find(p => String(p.id) === String(m.projectId))?.name || (m.projectId ? 'Unknown project' : null)) : null
        const canCheck    = (role === 'foreman' || role === 'manager') && !!onTogglePurchased
        const isOwner     = m.reportedById ? m.reportedById === profile?.id : m.reportedBy === profile?.name
        const canDelete   = role === 'foreman' || role === 'manager' || isOwner

        return (
          <div key={m.id} className={`material-row ${m.status}`}>
            {/* Checkbox */}
            <div
              onClick={() => canCheck && onTogglePurchased(m.id)}
              title={canCheck ? (isPurchased ? t('materials.markOpen') : t('materials.markPurchased')) : undefined}
              style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 2,
                border: `2px solid ${isPurchased ? 'var(--success)' : 'var(--accent)'}`,
                background: isPurchased ? 'var(--success)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: canCheck ? 'pointer' : 'default',
                transition: 'background .15s, border-color .15s',
              }}
            >
              {isPurchased && <Check size={11} weight="bold" color="#fff" />}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="material-name">
                {m.name}
                <span style={{
                  fontWeight: 700,
                  color: isPurchased ? 'var(--text-secondary)' : 'var(--accent)',
                  marginLeft: 6,
                }}>
                  × {m.qty} {m.unit}
                </span>
              </div>

              {/* Project chip */}
              {projName && (
                <div style={{ marginTop: 4, marginBottom: 2 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    background: 'var(--accent-light)', color: 'var(--accent)',
                    border: '1px solid var(--accent-border)',
                    borderRadius: 6, padding: '2px 8px',
                  }}>
                    <Buildings size={10} weight="bold" /> {projName}
                  </span>
                </div>
              )}

              <div className="material-meta">
                {m.reportedBy}
                {m.stage && <> · {m.stage}</>}
                {isPurchased
                  ? <> · <span style={{ color: 'var(--success)', fontWeight: 600 }}>{t('materials.purchased', { time: timeAgo(m.purchasedAt) })}</span></>
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
                title={t('common.remove')}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: 14, padding: '0 2px', flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                <Trash size={14} weight="bold" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
