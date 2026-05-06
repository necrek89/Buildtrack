import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { Button, FormGroup } from '../components/UI'
import { supabase } from '../lib/supabase'

const AVATAR_COLORS = [
  '#C96B3A','#5A9467','#D4A843','#4A7FC1','#9B6B9B',
  '#E07B6A','#6BAA8E','#C4A35A','#7B8EC8','#A67C52'
]
function JoinForeman() {
  const { sendJoinRequest } = useStore()
  const [code, setCode]   = useState('')
  const [msg, setMsg]     = useState('')
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!code.trim()) return
    setLoading(true); setMsg('')
    // Поддержка полной ссылки — вытаскиваем код
    let inviteCode = code.trim()
    if (inviteCode.includes('?join=')) {
      inviteCode = inviteCode.split('?join=')[1]
    }
    const { error, foremanName } = await sendJoinRequest(inviteCode)
    setLoading(false)
    if (error) setMsg(error)
    else setMsg(`Request sent to ${foremanName}! Wait for approval.`)
    setCode('')
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
        <input className="form-input" placeholder="Paste invite code or link"
          value={code} onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key==='Enter' && send()} style={{ flex:1 }} />
        <Button variant="primary" size="sm" onClick={send}>{loading ? '...' : 'Send Request'}</Button>
      </div>
      {msg && (
        <div style={{
          fontSize:12, padding:'6px 10px', borderRadius:6,
          background: msg.includes('sent') ? '#E8F2EB' : '#FCEBEB',
          color: msg.includes('sent') ? '#3D7A52' : '#A32D2D'
        }}>{msg}</div>
      )}
    </div>
  )
}
export default function AccountPage() {
  const { profile, fetchProfile } = useStore()
  const [form, setForm]         = useState({ name:'', phone:'', company:'' })
  const [avatarColor, setAvatarColor] = useState('#C96B3A')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [pwForm, setPwForm]     = useState({ current:'', newPw:'', confirm:'' })
  const [msg, setMsg]           = useState('')
  const [pwMsg, setPwMsg]       = useState('')
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name||'', phone: profile.phone||'', company: profile.company||'' })
      setAvatarColor(profile.avatar_color || '#C96B3A')
      setAvatarUrl(profile.avatar_url || null)
    }
  }, [profile])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const saveProfile = async () => {
    setSaving(true); setMsg('')
    const { error } = await supabase.from('profiles')
      .update({ name: form.name, phone: form.phone, company: form.company, avatar_color: avatarColor })
      .eq('id', profile.id)
    setSaving(false)
    if (error) setMsg('Error saving: ' + error.message)
    else { setMsg('Saved!'); fetchProfile?.() }
  }

  const uploadPhoto = async (file) => {
    if (!file) return
    setUploadingPhoto(true)
    const ext  = file.name.split('.').pop()
    const path = `avatars/${profile.id}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('task-photos').upload(path, file, { upsert: true })
    if (upErr) { setMsg('Upload error'); setUploadingPhoto(false); return }
    const { data } = supabase.storage.from('task-photos').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id)
    setAvatarUrl(data.publicUrl)
    fetchProfile?.()
    setUploadingPhoto(false)
    setMsg('Photo updated!')
  }

  const changePassword = async () => {
    setPwMsg('')
    if (!pwForm.newPw) { setPwMsg('Enter new password'); return }
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg('Passwords do not match'); return }
    if (pwForm.newPw.length < 6) { setPwMsg('Minimum 6 characters'); return }
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    if (error) setPwMsg('Error: ' + error.message)
    else { setPwMsg('Password changed!'); setPwForm({ current:'', newPw:'', confirm:'' }) }
  }

  const initials = (form.name || profile?.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Account</h1>
      </div>

      {/* ── Аватарка ── */}
      <div className="card card-body" style={{ marginBottom:12 }}>
        <div className="section-title">Avatar</div>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16 }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" style={{ width:72, height:72, borderRadius:'50%', objectFit:'cover', border:'3px solid var(--border)' }} />
            : <div style={{ width:72, height:72, borderRadius:'50%', background:avatarColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:700, color:'#fff', flexShrink:0 }}>
                {initials}
              </div>
          }
          <div>
            <label className="btn btn-sm" style={{ cursor:'pointer', marginBottom:6, display:'block' }}>
              {uploadingPhoto ? 'Uploading...' : '📷 Upload photo'}
              <input type="file" accept="image/*" style={{ display:'none' }}
                onChange={e => uploadPhoto(e.target.files[0])} />
            </label>
            {avatarUrl && (
              <button className="btn btn-sm btn-danger" onClick={async () => {
                await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id)
                setAvatarUrl(null); fetchProfile?.()
              }}>Remove photo</button>
            )}
          </div>
        </div>

        <div className="section-title">Color Avatar</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {AVATAR_COLORS.map(c => (
            <div key={c} onClick={() => setAvatarColor(c)} style={{
              width:32, height:32, borderRadius:'50%', background:c, cursor:'pointer',
              border: avatarColor===c ? '3px solid #2E2420' : '3px solid transparent',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:700, color:'#fff'
            }}>
              {avatarColor===c ? '✓' : ''}
            </div>
          ))}
        </div>
      </div>

      {/* ── Личные данные ── */}
      <div className="card card-body" style={{ marginBottom:12 }}>
        <div className="section-title">Personal Info</div>
        <FormGroup label="Full name">
          <input className="form-input" value={form.name} onChange={set('name')} placeholder="Your name" />
        </FormGroup>
        <FormGroup label="Email">
          <input className="form-input" value={profile?.email||''} disabled style={{ opacity:.6 }} />
        </FormGroup>
        <FormGroup label="Role">
          <input className="form-input" value={profile?.role||''} disabled style={{ opacity:.6 }} />
        </FormGroup>
        <div className="form-grid-2">
          <FormGroup label="Phone">
            <input className="form-input" value={form.phone} onChange={set('phone')} placeholder="+382 69 000 000" />
          </FormGroup>
          <FormGroup label="Company">
            <input className="form-input" value={form.company} onChange={set('company')} placeholder="Company name" />
          </FormGroup>
        </div>
        {msg && (
          <div style={{ fontSize:12, padding:'6px 10px', borderRadius:6, marginBottom:8,
            background: msg==='Saved!' ? '#E8F2EB' : '#FCEBEB',
            color: msg==='Saved!' ? '#3D7A52' : '#A32D2D' }}>{msg}</div>
        )}
        <Button variant="primary" onClick={saveProfile}>{saving ? 'Saving...' : 'Save changes'}</Button>
      </div>

      {/* ── Смена пароля ── */}
      <div className="card card-body">
        <div className="section-title">Change Password</div>
        <FormGroup label="New password">
          <input className="form-input" type="password" value={pwForm.newPw}
            onChange={e => setPwForm(f => ({...f, newPw: e.target.value}))} placeholder="Min 6 characters" />
        </FormGroup>
        <FormGroup label="Confirm password">
          <input className="form-input" type="password" value={pwForm.confirm}
            onChange={e => setPwForm(f => ({...f, confirm: e.target.value}))} placeholder="Repeat password" />
        </FormGroup>
        {pwMsg && (
          <div style={{ fontSize:12, padding:'6px 10px', borderRadius:6, marginBottom:8,
            background: pwMsg==='Password changed!' ? '#E8F2EB' : '#FCEBEB',
            color: pwMsg==='Password changed!' ? '#3D7A52' : '#A32D2D' }}>{pwMsg}</div>
        )}
        <Button variant="primary" onClick={changePassword}>Change password</Button>
      </div>
    </div>
  )
  {/* ── Для рабочего: присоединиться к прорабу ── */}
  {profile?.role === 'worker' && (
    <div className="card card-body" style={{ marginTop:12 }}>
      <div className="section-title">Join a Foreman</div>
      <p style={{ fontSize:12, color:'#7A6E66', marginBottom:10 }}>
        Enter the invite code or paste the invite link from your foreman.
      </p>
      <JoinForeman />
    </div>
  )}
}