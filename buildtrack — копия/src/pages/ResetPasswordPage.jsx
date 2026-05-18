import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../i18n/useLanguage'
import LanguagePicker from '../components/LanguagePicker'

export default function ResetPasswordPage({ onDone }) {
  const { t } = useT()
  const [pw,      setPw]      = useState('')
  const [confirm, setConfirm] = useState('')
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)

  const submit = async () => {
    setError('')
    if (pw.length < 6)   { setError(t('auth.newPwTooShort'));  return }
    if (pw !== confirm)  { setError(t('auth.newPwMismatch'));  return }

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setSaving(false)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      // sign out so user logs in fresh with new password
      setTimeout(async () => {
        await supabase.auth.signOut()
        onDone()
      }, 2200)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#FAF7F2', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: 28,
        width: '100%', maxWidth: 380, border: '1px solid #EAE3D8',
        boxShadow: '0 4px 24px rgba(46,36,32,0.07)',
      }}>
        {/* Language picker */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <LanguagePicker />
        </div>

        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#C96B3A', marginBottom: 6, letterSpacing: '-0.5px' }}>
            Tutuu
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#2E2420', marginBottom: 4 }}>
            {t('auth.newPwTitle')}
          </div>
          <div style={{ fontSize: 13, color: '#B8AFA6' }}>
            {t('auth.newPwDesc')}
          </div>
        </div>

        {/* Success state */}
        {success ? (
          <div style={{
            textAlign: 'center', padding: '24px 0',
          }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#3D7A52', marginBottom: 6 }}>
              {t('auth.newPwSuccess')}
            </div>
          </div>
        ) : (
          <>
            {/* Error */}
            {error && (
              <div style={{ background: '#FCEBEB', color: '#A32D2D', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 14 }}>
                {error}
              </div>
            )}

            {/* New password */}
            <div className="form-group">
              <label className="form-label">{t('auth.newPwLabel')}</label>
              <input
                className="form-input" type="password"
                placeholder="••••••••"
                value={pw}
                onChange={e => setPw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                autoFocus
              />
            </div>

            {/* Confirm */}
            <div className="form-group">
              <label className="form-label">{t('auth.newPwConfirm')}</label>
              <input
                className="form-input" type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
              />
            </div>

            {/* Password strength bar */}
            {pw.length > 0 && (
              <div style={{ marginBottom: 14, marginTop: -4 }}>
                <div style={{ height: 3, background: '#EAE3D8', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: 3, borderRadius: 4, transition: 'width .3s, background .3s',
                    width: pw.length < 6 ? '25%' : pw.length < 10 ? '60%' : '100%',
                    background: pw.length < 6 ? '#E07B6A' : pw.length < 10 ? '#D4A843' : '#5A9467',
                  }} />
                </div>
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px 16px', fontSize: 14, borderRadius: 10 }}
              onClick={submit}
              disabled={saving}
            >
              {saving ? t('auth.newPwSaving') : t('auth.newPwBtn')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
