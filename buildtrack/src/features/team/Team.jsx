import { useState, useEffect } from 'react'
import { Badge, Button, StatCard, EmptyState } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

// ─── WORKER STATUS CONFIG ────────────────────────────────────────────────────
const WORKER_STATUS = {
  on_site:   { label: 'On Site',     color: '#3D7A52', bg: '#E8F2EB', border: '#A8D4B4', dot: '#3D7A52' },
  day_off:   { label: 'Day Off',     color: '#7A6E66', bg: '#F2EDE4', border: '#D9D0C7', dot: '#B8AFA6' },
  sick:      { label: 'Sick Leave',  color: '#A32D2D', bg: '#FCEBEB', border: '#F0AAAA', dot: '#A32D2D' },
  vacation:  { label: 'Vacation',    color: '#2E6FB5', bg: '#E4EEFA', border: '#A3C2E8', dot: '#2E6FB5' },
  other:     { label: 'Not Available', color: '#9A6E10', bg: '#FBF3DC', border: '#F0D897', dot: '#D4A843' },
}
const STATUS_CYCLE = ['on_site', 'day_off', 'sick', 'vacation', 'other']

// ─── TEAM ────────────────────────────────────────────────────────────────────
export default function Team() {
  const { t } = useT()
  const { team, projects, tasks, tools, fetchProjects, fetchAllWorkers, updateWorkerStatus, profile, joinRequests, fetchJoinRequests, approveJoinRequest, rejectJoinRequest, addClientToProject, addManagerToTeam } = useStore()
  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [msg, setMsg]               = useState('')
  const [openId, setOpenId]         = useState(null)
  const [clientEmail,   setClientEmail]   = useState('')
  const [clientProjId,  setClientProjId]  = useState('')
  const [clientMsg,     setClientMsg]     = useState('')
  const [clientLoading, setClientLoading] = useState(false)
  const [managerEmail,   setManagerEmail]   = useState('')
  const [managerMsg,     setManagerMsg]     = useState('')
  const [managerLoading, setManagerLoading] = useState(false)

  useEffect(() => {
    fetchProjects().then(() => {
      fetchAllWorkers()
    })
    if (profile?.role === 'foreman') fetchJoinRequests()
  }, [])

  const invite = async () => {
    if (!email.trim()) return
    setLoading(true); setMsg('')
    const allProjects = useStore.getState().projects
    if (!allProjects.length) { setMsg('No project found'); setLoading(false); return }
    const { data: worker, error } = await supabase
      .from('profiles').select('id, name, role').eq('email', email.trim().toLowerCase()).single()
    if (error || !worker) { setMsg('User not found. Ask them to register first.'); setLoading(false); return }
    const inserts = allProjects.map(p => ({ project_id: p.id, worker_id: worker.id }))
    const { error: e2 } = await supabase.from('project_workers').insert(inserts)
    if (e2) {
      setMsg(e2.code === '23505' ? 'Worker already in team' : 'Error adding worker')
    } else {
      setMsg(`${worker.name} added!`)
      fetchAllWorkers(); setEmail('')
    }
    setLoading(false)
  }

  const inviteClient = async () => {
    if (!clientEmail.trim() || !clientProjId) { setClientMsg('Select a project and enter email'); return }
    setClientLoading(true); setClientMsg('')
    const { error, name } = await addClientToProject(clientEmail.trim(), clientProjId)
    setClientLoading(false)
    if (error) { setClientMsg(error); return }
    setClientMsg(`${name} added as client!`)
    setClientEmail(''); fetchAllWorkers()
  }

  const inviteManager = async () => {
    if (!managerEmail.trim()) return
    setManagerLoading(true); setManagerMsg('')
    const { error, name } = await addManagerToTeam(managerEmail.trim())
    setManagerLoading(false)
    if (error) { setManagerMsg(error); return }
    setManagerMsg(`${name} added as manager!`)
    setManagerEmail('')
  }

  const cycleStatus = (workerId, currentStatus) => {
    const idx  = STATUS_CYCLE.indexOf(currentStatus || 'on_site')
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
    updateWorkerStatus(workerId, next)
  }

  // Stat counters
  const onSite  = team.filter(m => !m.worker_status || m.worker_status === 'on_site').length
  const away    = team.length - onSite

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('team.title')}</h1>
        <Button variant="primary" size="sm" onClick={() => { setShowInvite(!showInvite); setMsg('') }}>
          {showInvite ? t('team.close') : t('team.invite')}
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:12 }}>
        <StatCard label={t('team.statTotal')}   value={team.length} />
        <StatCard label={t('team.statOnSite')} value={onSite} />
        <StatCard label={t('team.statAway')}    value={away} danger={away > 0} />
      </div>

      {/* ── Add workers panel (foreman only) ── */}
      {profile?.role === 'foreman' && showInvite && (
        <div className="card card-body" style={{ marginBottom:12 }}>

          {/* Рабочий по email */}
          <div style={{ paddingBottom:14, borderBottom:'1px solid #EAE3D8' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#7A6E66', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>
              {t('team.emailMethod')}
            </div>
            <div style={{ fontSize:12, color:'#7A6E66', marginBottom:8 }}>{t('team.emailDesc')}</div>
            <div style={{ display:'flex', gap:8 }}>
              <input className="form-input" placeholder={t('team.emailPlaceholder')}
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key==='Enter' && invite()} style={{ flex:1 }} />
              <Button variant="primary" size="sm" onClick={invite} disabled={loading}>{loading ? '...' : t('common.add')}</Button>
            </div>
            {msg && (
              <div style={{ marginTop:8, fontSize:12, padding:'6px 10px', borderRadius:6, background: msg.includes('added') || msg.includes('!') ? '#E8F2EB' : '#FCEBEB', color: msg.includes('added') || msg.includes('!') ? '#3D7A52' : '#A32D2D' }}>
                {msg}
              </div>
            )}
          </div>

          {/* Менеджер по email */}
          <div style={{ borderBottom:'1px solid #EAE3D8', paddingTop:14, paddingBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#7A6E66', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>
              {t('team.managerMethod')}
            </div>
            <div style={{ fontSize:12, color:'#7A6E66', marginBottom:8 }}>{t('team.managerDesc')}</div>
            <div style={{ display:'flex', gap:8 }}>
              <input className="form-input" placeholder={t('team.managerPlaceholder')}
                value={managerEmail} onChange={e => setManagerEmail(e.target.value)}
                onKeyDown={e => e.key==='Enter' && inviteManager()} style={{ flex:1 }} />
              <Button variant="primary" size="sm" onClick={inviteManager} disabled={managerLoading}>{managerLoading ? '...' : t('common.add')}</Button>
            </div>
            {managerMsg && (
              <div style={{ marginTop:8, fontSize:12, padding:'6px 10px', borderRadius:6, background: managerMsg.includes('added') ? '#E8F2EB' : '#FCEBEB', color: managerMsg.includes('added') ? '#3D7A52' : '#A32D2D' }}>
                {managerMsg}
              </div>
            )}
          </div>

          {/* Заказчик по email + проект */}
          <div style={{ paddingTop:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#7A6E66', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>
              {t('team.clientMethod')}
            </div>
            <div style={{ fontSize:12, color:'#7A6E66', marginBottom:8 }}>{t('team.clientDesc')}</div>
            <select className="form-input" value={clientProjId} onChange={e => setClientProjId(e.target.value)} style={{ marginBottom:8 }}>
              <option value="">{t('team.clientProjectSelect')}</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div style={{ display:'flex', gap:8 }}>
              <input className="form-input" placeholder={t('team.clientPlaceholder')}
                value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                onKeyDown={e => e.key==='Enter' && inviteClient()} style={{ flex:1 }} />
              <Button variant="primary" size="sm" onClick={inviteClient} disabled={clientLoading}>{clientLoading ? '...' : t('common.add')}</Button>
            </div>
            {clientMsg && (
              <div style={{ marginTop:8, fontSize:12, padding:'6px 10px', borderRadius:6, background: clientMsg.includes('added') ? '#E8F2EB' : '#FCEBEB', color: clientMsg.includes('added') ? '#3D7A52' : '#A32D2D' }}>
                {clientMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Pending join requests ── */}
      {profile?.role === 'foreman' && joinRequests.length > 0 && (
        <div className="card" style={{ marginBottom:12, padding:0 }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid #EAE3D8', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#C96B3A', letterSpacing:'.08em', textTransform:'uppercase' }}>{t('team.joinRequests')}</div>
            <div style={{ background:'#FAECE4', color:'#C96B3A', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>{joinRequests.length}</div>
          </div>
          {joinRequests.map(r => (
            <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderBottom:'1px solid #EAE3D8' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'#FAECE4', color:'#C96B3A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, flexShrink:0 }}>
                {r.worker?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#2E2420' }}>{r.worker?.name}</div>
                <div style={{ fontSize:11, color:'#B8AFA6' }}>{t('team.wantsToJoin')}</div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <Button size="sm" variant="primary" onClick={() => approveJoinRequest(r.id, r.worker.id)}>{t('team.accept')}</Button>
                <Button size="sm" variant="danger"  onClick={() => rejectJoinRequest(r.id)}>{t('team.decline')}</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Worker cards ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {team.length === 0 && <EmptyState>{t('team.noMembers')}</EmptyState>}
        {team.map(m => {
          const st       = m.worker_status || 'on_site'
          const stCfg    = WORKER_STATUS[st] || WORKER_STATUS.on_site
          const isOpen   = openId === m.id
          // Worker's projects
          const workerProjects = (m.project_ids || []).map(pid => projects.find(p => p.id === pid)).filter(Boolean)
          // Worker's tools
          const workerTools = tools.filter(t => t.worker_id === m.id)
          // Worker's active tasks
          const workerTasks = tasks.filter(t => t.worker_id === m.id && t.status !== 'approved')
          const workerDone  = tasks.filter(t => t.worker_id === m.id && t.status === 'approved').length

          return (
            <div key={m.id} style={{
              background: '#fff',
              border: `1.5px solid ${isOpen ? '#C96B3A' : '#EAE3D8'}`,
              borderRadius: 14, overflow: 'hidden',
              boxShadow: isOpen ? '0 3px 10px rgba(201,107,58,0.10)' : 'none',
              transition: 'border-color .15s, box-shadow .15s',
            }}>
              {/* ── Collapsed row ── */}
              <div
                onClick={() => setOpenId(prev => prev === m.id ? null : m.id)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', cursor:'pointer', background: isOpen ? '#FAECE4' : '#fff' }}
              >
                {/* Avatar with status dot */}
                <div style={{ position:'relative', flexShrink:0 }}>
                  <div style={{
                    width:40, height:40, borderRadius:'50%',
                    background: isOpen ? '#C96B3A' : '#F2EDE4',
                    color: isOpen ? '#fff' : '#C96B3A',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:15, fontWeight:700,
                  }}>
                    {m.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{
                    position:'absolute', bottom:0, right:0,
                    width:11, height:11, borderRadius:'50%',
                    background: stCfg.dot, border:'2px solid #fff',
                  }} />
                </div>

                {/* Name + quick info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color: isOpen ? '#C96B3A' : '#2E2420', marginBottom:3 }}>{m.name}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5, alignItems:'center' }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background: stCfg.bg, color: stCfg.color, border:`1px solid ${stCfg.border}` }}>
                      {t('team.ws_' + st)}
                    </span>
                    {workerTasks.length > 0 && (
                      <span style={{ fontSize:10, color:'#C96B3A', fontWeight:600 }}>⚡ {workerTasks.length} tasks</span>
                    )}
                    {workerTools.length > 0 && (
                      <span style={{ fontSize:10, color:'#7A6E66' }}>🔧 {workerTools.length}</span>
                    )}
                  </div>
                </div>

                {/* Status cycle button (foreman only) */}
                {profile?.role === 'foreman' && (
                  <button
                    onClick={e => { e.stopPropagation(); cycleStatus(m.id, st) }}
                    title="Tap to change status"
                    style={{
                      flexShrink:0, padding:'5px 10px', borderRadius:8, fontSize:11, fontWeight:600,
                      background: stCfg.bg, color: stCfg.color,
                      border: `1px solid ${stCfg.border}`,
                      cursor:'pointer', transition:'opacity .15s',
                    }}
                  >
                    ⟳
                  </button>
                )}

                <span style={{ fontSize:10, color:'#B8AFA6' }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {/* ── Expanded detail ── */}
              {isOpen && (
                <div style={{ borderTop:'1px solid #EAE3D8', padding:'12px 14px', background:'#FDFBF8' }}>

                  {/* Status picker row */}
                  {profile?.role === 'foreman' && (
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6', marginBottom:6 }}>{t('team.statusHeader')}</div>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        {STATUS_CYCLE.map(s => {
                          const cfg = WORKER_STATUS[s]
                          const isActive = st === s
                          return (
                            <button key={s}
                              onClick={() => updateWorkerStatus(m.id, s)}
                              style={{
                                padding:'5px 11px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer',
                                background: isActive ? cfg.bg : '#F2EDE4',
                                color: isActive ? cfg.color : '#B8AFA6',
                                border: isActive ? `1.5px solid ${cfg.border}` : '1.5px solid #EAE3D8',
                                transition:'all .12s',
                              }}
                            >
                              {t('team.ws_' + s)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Projects */}
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6', marginBottom:5 }}>{t('team.projectsHeader')}</div>
                    {workerProjects.length === 0
                      ? <span style={{ fontSize:11, color:'#B8AFA6' }}>{t('common.none')}</span>
                      : <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                          {workerProjects.map(p => (
                            <span key={p.id} style={{ fontSize:11, fontWeight:600, background:'#FAECE4', color:'#C96B3A', borderRadius:8, padding:'3px 10px' }}>{p.name}</span>
                          ))}
                        </div>
                    }
                  </div>

                  {/* Tools */}
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6', marginBottom:5 }}>{t('team.toolsHeader')}</div>
                    {workerTools.length === 0
                      ? <span style={{ fontSize:11, color:'#B8AFA6' }}>{t('team.noTools')}</span>
                      : <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                          {workerTools.map(t => (
                            <span key={t.id} style={{ fontSize:11, fontWeight:500, background:'#F2EDE4', color:'#7A6E66', borderRadius:8, padding:'3px 10px', border:'1px solid #EAE3D8' }}>{t.name}</span>
                          ))}
                        </div>
                    }
                  </div>

                  {/* Task summary */}
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6', marginBottom:5 }}>{t('team.tasksHeader')}</div>
                    <div style={{ display:'flex', gap:10 }}>
                      {workerTasks.filter(t=>['new','rejected'].includes(t.status)).length > 0 && (
                        <span style={{ fontSize:11, fontWeight:600, color:'#C96B3A' }}>⚡ {workerTasks.filter(t=>['new','rejected'].includes(t.status)).length} active</span>
                      )}
                      {workerTasks.filter(t=>t.status==='pending').length > 0 && (
                        <span style={{ fontSize:11, fontWeight:600, color:'#D4A843' }}>🕐 {workerTasks.filter(t=>t.status==='pending').length} in review</span>
                      )}
                      {workerDone > 0 && (
                        <span style={{ fontSize:11, fontWeight:600, color:'#3D7A52' }}>✅ {workerDone} done</span>
                      )}
                      {workerTasks.length === 0 && workerDone === 0 && (
                        <span style={{ fontSize:11, color:'#B8AFA6' }}>{t('team.noTasks')}</span>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
