import { useState } from 'react'
import { LockSimple, X } from '@phosphor-icons/react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n/useLanguage'

const DISMISS_KEY = 'tutuu_lockout_dismissed'

// Persistent (but dismissible-for-this-session) banner shown when the
// relevant foreman's trial has ended with no active subscription — all data
// stays visible, this is purely a heads-up + call to action. Reads directly
// from the store rather than being prop-driven, so it can render once in
// App.jsx without threading isLocked through every page.
export default function LockoutBanner({ onNavigate }) {
  const { t } = useT()
  const { isLocked, role } = useStore()
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1')

  if (!isLocked || dismissed) return null

  const dismiss = () => { sessionStorage.setItem(DISMISS_KEY, '1'); setDismissed(true) }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      background: 'var(--accent-light,#FFF7ED)', borderBottom: '1px solid var(--accent-border,#FED7AA)',
      padding: '10px 16px', fontSize: 13, color: 'var(--accent,#9A3412)',
    }}>
      <LockSimple size={16} weight="bold" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 200 }}>
        {role === 'foreman' ? t('lockout.foremanMsg') : t('lockout.memberMsg')}
      </div>
      {role === 'foreman' && (
        <button
          onClick={() => onNavigate?.('account')}
          style={{
            background: 'var(--accent,#EA580C)', color: '#fff', border: 'none', borderRadius: 8,
            padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          }}
        >
          {t('lockout.foremanCta')}
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  )
}
