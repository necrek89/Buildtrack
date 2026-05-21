import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { Button, FormGroup } from '../components/UI'
import LanguagePicker from '../components/LanguagePicker'
import { useT } from '../i18n/useLanguage'
import { supabase } from '../lib/supabase'

const AVATAR_COLORS = [
  '#C96B3A','#5A9467','#D4A843','#4A7FC1','#9B6B9B',
  '#E07B6A','#6BAA8E','#C4A35A','#7B8EC8','#A67C52'
]

function JoinForeman({ t }) {
  const { sendJoinRequest } = useStore()
  const [code,    setCode]    = useState('')
  const [msg,     setMsg]     = useState('')
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!code.trim()) return
    setLoading(true); setMsg('')
    let inviteCode = code.trim()
    if (inviteCode.includes('?join=')) inviteCode = inviteCode.split('?join=')[1]
    const { error, foremanName } = await sendJoinRequest(inviteCode)
    setLoading(false)
    if (error) setMsg(error)
    else setMsg(t('account.msgRequestSent', { name: foremanName }))
    setCode('')
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
        <input className="form-input" placeholder={t('account.inviteCodePlaceholder')}
          value={code} onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key==='Enter' && send()} style={{ flex:1 }} />
        <Button variant="primary" size="sm" onClick={send}>
          {loading ? '...' : t('account.sendRequestBtn')}
        </Button>
      </div>
      {msg && (
        <div style={{
          fontSize:12, padding:'6px 10px', borderRadius:6,
          background: msg.includes('!') ? '#E8F2EB' : '#FCEBEB',
          color: msg.includes('!') ? '#3D7A52' : '#A32D2D'
        }}>{msg}</div>
      )}
    </div>
  )
}

export default function AccountPage() {
  const { profile, fetchProfile } = useStore()
  const { t } = useT()
  const [form,    setForm]    = useState({ name:'', phone:'', company:'', currency:'USD' })
  const [avatarColor, setAvatarColor] = useState('#C96B3A')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [pwForm,  setPwForm]  = useState({ current:'', newPw:'', confirm:'' })
  const [msg,     setMsg]     = useState('')
  const [pwMsg,   setPwMsg]   = useState('')
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name||'', phone: profile.phone||'', company: profile.company||'', currency: profile.currency || 'USD' })
      setAvatarColor(profile.avatar_color || '#C96B3A')
      setAvatarUrl(profile.avatar_url || null)
    }
  }, [profile])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const saveProfile = async () => {
    setSaving(true); setMsg('')
    const { error } = await supabase.from('profiles')
      .update({ name: form.name, phone: form.phone, company: form.company, avatar_color: avatarColor, currency: form.currency })
      .eq('id', profile.id)
    setSaving(false)
    if (error) setMsg(t('account.msgError', { err: error.message }))
    else { setMsg(t('account.msgSaved')); fetchProfile?.() }
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
    setMsg(t('account.msgSaved'))
  }

  const changePassword = async () => {
    setPwMsg('')
    if (!pwForm.newPw) { setPwMsg(t('account.msgPwEmpty')); return }
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg(t('account.msgPwNoMatch')); return }
    if (pwForm.newPw.length < 6) { setPwMsg(t('account.msgPwTooShort')); return }
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    if (error) setPwMsg('Error: ' + error.message)
    else { setPwMsg(t('account.msgPwChanged')); setPwForm({ current:'', newPw:'', confirm:'' }) }
  }

  const initials = (form.name || profile?.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)
  const isSavedMsg = msg === t('account.msgSaved')
  const isPwOk = pwMsg === t('account.msgPwChanged')

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('account.title')}</h1>
        <LanguagePicker compact />
      </div>

      {/* ── Avatar ── */}
      <div className="card card-body" style={{ marginBottom:12 }}>
        <div className="section-title">{t('account.avatarSection')}</div>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16 }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" style={{ width:72, height:72, borderRadius:'50%', objectFit:'cover', border:'3px solid #EAE3D8' }} />
            : <div style={{ width:72, height:72, borderRadius:'50%', background:avatarColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:700, color:'#fff', flexShrink:0 }}>
                {initials}
              </div>
          }
          <div>
            <label className="btn btn-sm" style={{ cursor:'pointer', marginBottom:6, display:'block' }}>
              {uploadingPhoto ? t('account.uploadingPhoto') : t('account.uploadPhoto')}
              <input type="file" accept="image/*" style={{ display:'none' }}
                onChange={e => uploadPhoto(e.target.files[0])} />
            </label>
            {avatarUrl && (
              <button className="btn btn-sm btn-danger" onClick={async () => {
                await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id)
                setAvatarUrl(null); fetchProfile?.()
              }}>{t('account.removePhoto')}</button>
            )}
          </div>
        </div>

        <div className="section-title">{t('account.colorSection')}</div>
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

      {/* ── Personal Info ── */}
      <div className="card card-body" style={{ marginBottom:12 }}>
        <div className="section-title">{t('account.personalSection')}</div>
        <FormGroup label={t('account.nameLabel')}>
          <input className="form-input" value={form.name} onChange={set('name')} placeholder={t('account.namePlaceholder')} />
        </FormGroup>
        <FormGroup label={t('account.emailLabel')}>
          <input className="form-input" value={profile?.email||''} disabled style={{ opacity:.6 }} />
        </FormGroup>
        <FormGroup label={t('account.roleLabel')}>
          <input className="form-input" value={profile?.role ? t(`roles.${profile.role}`) : ''} disabled style={{ opacity:.6 }} />
        </FormGroup>
        <div className="form-grid-2">
          <FormGroup label={t('account.phoneLabel')}>
            <input className="form-input" value={form.phone} onChange={set('phone')} placeholder={t('account.phonePlaceholder')} />
          </FormGroup>
          <FormGroup label={t('account.companyLabel')}>
            <input className="form-input" value={form.company} onChange={set('company')} placeholder={t('account.companyPlaceholder')} />
          </FormGroup>
        </div>
      </div>

      {/* ── Currency ── */}
      <div className="card card-body" style={{ marginBottom:12 }}>
        <div className="section-title">Валюта</div>
        <p style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:12, lineHeight:1.5 }}>
          Выбранная валюта будет применяться ко всем задачам, расходам и зарплате
        </p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {[
            { code:'USD', symbol:'$',    label:'USD — Доллар'   },
            { code:'EUR', symbol:'€',    label:'EUR — Евро'     },
            { code:'RUB', symbol:'₽',    label:'RUB — Рубль'    },
            { code:'GBP', symbol:'£',    label:'GBP — Фунт'     },
            { code:'AED', symbol:'د.إ',  label:'AED — Дирхам'   },
            { code:'TRY', symbol:'₺',    label:'TRY — Лира'     },
            { code:'KZT', symbol:'₸',    label:'KZT — Тенге'    },
            { code:'UAH', symbol:'₴',    label:'UAH — Гривна'   },
            { code:'GEL', symbol:'₾',    label:'GEL — Лари'     },
            { code:'CNY', symbol:'¥',    label:'CNY — Юань'     },
          ].map(c => (
            <button key={c.code}
              onClick={() => setForm(f => ({ ...f, currency: c.code }))}
              style={{
                padding:'8px 14px', borderRadius:8, cursor:'pointer',
                background: form.currency === c.code ? 'var(--accent)' : 'var(--bg)',
                color: form.currency === c.code ? '#fff' : 'var(--text-primary)',
                border: form.currency === c.code ? '1.5px solid var(--accent)' : '0.5px solid var(--border-medium)',
                fontSize:13, fontWeight: form.currency === c.code ? 500 : 400,
                transition:'all .1s',
              }}
            >
              <span style={{ fontSize:15 }}>{c.symbol}</span>
              <span style={{ marginLeft:6, fontSize:11, color: form.currency === c.code ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)' }}>{c.code}</span>
            </button>
          ))}
        </div>
        {msg && (
          <div style={{ fontSize:12, padding:'6px 10px', borderRadius:6, marginTop:16,
            background: isSavedMsg ? '#E8F2EB' : '#FCEBEB',
            color: isSavedMsg ? '#3D7A52' : '#A32D2D' }}>{msg}</div>
        )}
        <div style={{ borderTop:'0.5px solid var(--border)', marginTop:16, paddingTop:16 }}>
          <Button variant="primary" onClick={saveProfile}>
            {saving ? t('common.saving') : t('account.saveBtn')}
          </Button>
        </div>
      </div>

      {/* ── Change Password ── */}
      <div className="card card-body" style={{ marginBottom:12 }}>
        <div className="section-title">{t('account.passwordSection')}</div>
        <FormGroup label={t('account.newPwLabel')}>
          <input className="form-input" type="password" value={pwForm.newPw}
            onChange={e => setPwForm(f => ({...f, newPw: e.target.value}))}
            placeholder={t('account.newPwPlaceholder')} />
        </FormGroup>
        <FormGroup label={t('account.confirmPwLabel')}>
          <input className="form-input" type="password" value={pwForm.confirm}
            onChange={e => setPwForm(f => ({...f, confirm: e.target.value}))}
            placeholder={t('account.confirmPwPlaceholder')} />
        </FormGroup>
        {pwMsg && (
          <div style={{ fontSize:12, padding:'6px 10px', borderRadius:6, marginBottom:8,
            background: isPwOk ? '#E8F2EB' : '#FCEBEB',
            color: isPwOk ? '#3D7A52' : '#A32D2D' }}>{pwMsg}</div>
        )}
        <Button variant="primary" onClick={changePassword}>{t('account.changePwBtn')}</Button>
      </div>

      {/* ── Join Foreman (workers only) ── */}
      {profile?.role === 'worker' && (
        <div className="card card-body" style={{ marginBottom:12 }}>
          <div className="section-title">{t('account.joinForemanSection')}</div>
          <p style={{ fontSize:12, color:'#7A6E66', marginBottom:10 }}>
            {t('account.joinForemanDesc')}
          </p>
          <JoinForeman t={t} />
        </div>
      )}

    </div>
  )
}
