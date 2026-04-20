import { useState } from 'react'
import { useStore } from '../store/useStore'

export default function LoginPage({ onLogin }) {
  const { signIn, signUp, loading } = useStore()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'worker' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    if (!form.email || !form.password) { setError('Please enter email and password'); return }

    if (mode === 'login') {
      const { error } = await signIn(form.email, form.password)
      if (error) { setError('Invalid email or password'); return }
      onLogin()
    } else {
      if (!form.name) { setError('Please enter your name'); return }
      const { error } = await signUp(form.email, form.password, form.name, form.role)
      if (error) { setError(error.message); return }
      setSuccess('Account created! Please sign in.')
      setMode('login')
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f5f5f5', padding: 16
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 28,
        width: '100%', maxWidth: 380, border: '1px solid #e8e8e8'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#185FA5', marginBottom: 4, letterSpacing: '-0.5px' }}>
            Tutuu
          </div>
          <div style={{ fontSize: 13, color: '#888' }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </div>
        </div>

        {error && (
          <div style={{
            background: '#FCEBEB', color: '#A32D2D', borderRadius: 8,
            padding: '10px 12px', fontSize: 13, marginBottom: 14
          }}>{error}</div>
        )}

        {success && (
          <div style={{
            background: '#EAF3DE', color: '#3B6D11', borderRadius: 8,
            padding: '10px 12px', fontSize: 13, marginBottom: 14
          }}>{success}</div>
        )}

        {mode === 'register' && (
          <>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-input" placeholder="John Smith" value={form.name} onChange={set('name')} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input" value={form.role} onChange={set('role')}>
                <option value="foreman">Foreman</option>
                <option value="worker">Worker</option>
                <option value="client">Client</option>
              </select>
            </div>
          </>
        )}

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input" type="email" placeholder="you@example.com"
            value={form.email} onChange={set('email')}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className="form-input" type="password" placeholder="••••••••"
            value={form.password} onChange={set('password')}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 8, padding: '10px 16px', fontSize: 14 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#888' }}>
          {mode === 'login' ? (
            <>Don't have an account? <span style={{ color: '#185FA5', cursor: 'pointer' }} onClick={() => { setMode('register'); setError('') }}>Sign Up</span></>
          ) : (
            <>Already have an account? <span style={{ color: '#185FA5', cursor: 'pointer' }} onClick={() => { setMode('login'); setError('') }}>Sign In</span></>
          )}
        </div>
      </div>
    </div>
  )
}
