import { useState } from 'react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n/useLanguage'
import LanguagePicker from '../components/LanguagePicker'

export default function LoginPage({ onLogin }) {
  const { signIn, signUp, loading } = useStore()
  const { t } = useT()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'worker' })
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    if (!form.email || !form.password) { setError(t('auth.errFillAll')); return }

    if (mode === 'login') {
      const { error } = await signIn(form.email, form.password)
      if (error) { setError(t('auth.errCredentials')); return }
      onLogin()
    } else {
      if (!form.name) { setError(t('auth.errFillName')); return }
      const { error } = await signUp(form.email, form.password, form.name, form.role)
      if (error) { setError(error.message); return }
      setSuccess(t('auth.successCreated'))
      setMode('login')
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
        {/* ── Language picker ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <LanguagePicker />
        </div>

        {/* ── Logo ── */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#C96B3A', marginBottom: 6, letterSpacing: '-0.5px' }}>
            Tutuu
          </div>
          <div style={{ fontSize: 13, color: '#B8AFA6' }}>
            {mode === 'login' ? t('auth.signinTitle') : t('auth.signupTitle')}
          </div>
        </div>

        {/* ── Error / Success ── */}
        {error && (
          <div style={{ background: '#FCEBEB', color: '#A32D2D', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#EAF3DE', color: '#3B6D11', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 14 }}>
            {success}
          </div>
        )}

        {/* ── Register fields ── */}
        {mode === 'register' && (
          <>
            <div className="form-group">
              <label className="form-label">{t('auth.nameLabel')}</label>
              <input className="form-input" placeholder={t('auth.namePlaceholder')} value={form.name} onChange={set('name')} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('auth.roleLabel')}</label>
              <select className="form-input" value={form.role} onChange={set('role')}>
                <option value="foreman">{t('roles.foreman')}</option>
                <option value="worker">{t('roles.worker')}</option>
                <option value="client">{t('roles.client')}</option>
              </select>
            </div>
          </>
        )}

        {/* ── Email / Password ── */}
        <div className="form-group">
          <label className="form-label">{t('auth.emailLabel')}</label>
          <input className="form-input" type="email" placeholder="you@example.com"
            value={form.email} onChange={set('email')}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('auth.passwordLabel')}</label>
          <input className="form-input" type="password" placeholder="••••••••"
            value={form.password} onChange={set('password')}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 8, padding: '11px 16px', fontSize: 14, borderRadius: 10 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? t('auth.loadingBtn') : mode === 'login' ? t('auth.signinBtn') : t('auth.signupBtn')}
        </button>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#B8AFA6' }}>
          {mode === 'login' ? (
            <>
              {t('auth.noAccount')}{' '}
              <span style={{ color: '#C96B3A', cursor: 'pointer', fontWeight: 500 }}
                onClick={() => { setMode('register'); setError('') }}>
                {t('auth.signupLink')}
              </span>
            </>
          ) : (
            <>
              {t('auth.haveAccount')}{' '}
              <span style={{ color: '#C96B3A', cursor: 'pointer', fontWeight: 500 }}
                onClick={() => { setMode('login'); setError('') }}>
                {t('auth.signinLink')}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
