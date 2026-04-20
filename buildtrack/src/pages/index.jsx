import { useState, useEffect } from 'react'
import { useStore, PRIORITY_BADGE, PRIORITY_LABEL, TOOL_STATUS_BADGE, TOOL_STATUS_LABEL, STATUS_LABEL, STATUS_BADGE, STAGES, PRIORITY_OPTIONS } from '../store/useStore'
import { Badge, Button, StatCard, ProgressBar, SectionTitle, EmptyState, IconButton, FormGroup } from '../components/UI'
import TaskModal from '../components/TaskModal'
import ConfirmModal from '../components/ConfirmModal'
import { supabase } from '../lib/supabase'

const PROJECT_STAGES = [
  { n:1, name:'Foundation',    pct:100, cls:'done'    },
  { n:2, name:'Electrical',    pct:45,  cls:'current' },
  { n:3, name:'Walls',         pct:10,  cls:''        },
  { n:4, name:'Roofing',       pct:0,   cls:''        },
  { n:5, name:'Finishing',     pct:0,   cls:''        },
]

const STAGE_OPTIONS = ['Foundation','Electrical','Walls','Roofing','Finishing']

// ─── FOREMAN DASHBOARD ───────────────────────────────────────────────────────
export function Dashboard() {
  const { tasks, tools, projects, fetchProjects, fetchTasks, fetchTools, profile } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', stage: 'Foundation', deadline: '' })

  useEffect(() => {
    fetchProjects(); fetchTasks(); fetchTools()
  }, [])

  const createProject = async () => {
    if (!form.name.trim()) return
    const { error } = await supabase.from('projects').insert({
      name: form.name, stage: form.stage,
      deadline: form.deadline || null,
      foreman_id: profile.id, progress: 0
    })
    if (!error) { fetchProjects(); setShowAdd(false); setForm({ name: '', stage: 'Foundation', deadline: '' }) }
  }

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>+ Project</Button>
      </div>
      <div className="stat-grid">
        <StatCard label="Projects"       value={projects.length} />
        <StatCard label="Active tasks"   value={tasks.filter(t => t.status !== 'approved').length} />
        <StatCard label="Tools"          value={tools.length} />
        <StatCard label="Pending review" value={tasks.filter(t => t.status === 'pending').length} />
      </div>
      <SectionTitle>Projects</SectionTitle>
      {projects.length === 0 && <EmptyState>No projects yet — create your first one!</EmptyState>}
      {projects.map(p => (
        <div className="card card-body" key={p.id}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <strong style={{ fontSize:14 }}>{p.name}</strong>
            <Badge variant="blue">{p.stage}</Badge>
          </div>
          {p.deadline && <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>Deadline: {p.deadline}</div>}
          <ProgressBar value={p.progress || 0} />
        </div>
      ))}

      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">New Project</div>
            <FormGroup label="Project name *">
              <input className="form-input" placeholder='e.g. "Office Building A"'
                value={form.name} onChange={set('name')} autoFocus />
            </FormGroup>
            <div className="form-grid-2">
              <FormGroup label="Current stage">
                <select className="form-input" value={form.stage} onChange={set('stage')}>
                  {STAGE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="Deadline">
                <input className="form-input" type="date"
                  value={form.deadline} onChange={set('deadline')} />
              </FormGroup>
            </div>
            <div className="modal-actions">
              <Button size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={createProject}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TASKS (foreman) ─────────────────────────────────────────────────────────
export function Tasks() {
  const { tasks, fetchTasks, approveTask, rejectTask, deleteTask } = useStore()
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [rejectId, setRejectId] = useState(null)
  const [rejectComment, setRejectComment] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => { fetchTasks() }, [])

  const filtered = tasks.filter(t =>
    filter === 'active'  ? ['new','rejected'].includes(t.status) :
    filter === 'pending' ? t.status === 'pending' :
    filter === 'done'    ? t.status === 'approved' : true
  )
  const pending  = tasks.filter(t => t.status === 'pending').length
  const approved = tasks.filter(t => t.status === 'approved').length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>+ Add Task</Button>
      </div>
      <div className="stat-grid">
        <StatCard label="Total"          value={tasks.length} />
        <StatCard label="Pending review" value={pending} />
        <StatCard label="Completed"      value={approved} />
        <StatCard label="Urgent"         value={tasks.filter(t => t.priority==='high' && t.status!=='approved').length} danger />
      </div>
      <div className="filter-bar">
        <button className={`filter-btn ${filter==='all'     ?'active':''}`} onClick={() => setFilter('all')}>All ({tasks.length})</button>
        <button className={`filter-btn ${filter==='active'  ?'active':''}`} onClick={() => setFilter('active')}>Active</button>
        <button className={`filter-btn ${filter==='pending' ?'active':''}`} onClick={() => setFilter('pending')}>Review ({pending})</button>
        <button className={`filter-btn ${filter==='done'    ?'active':''}`} onClick={() => setFilter('done')}>Done ({approved})</button>
      </div>

      <div className="card" style={{ padding:0 }}>
        {filtered.length === 0 && <EmptyState>No tasks</EmptyState>}
        {filtered.map(t => (
          <div className="task-row" key={t.id}>
            <div className="task-body">
              <div className="task-text" style={{ fontWeight:500 }}>{t.text}</div>
              <div className="task-meta" style={{ marginTop:5 }}>
                <Badge variant={STATUS_BADGE[t.status]?.replace('badge-','')}>{STATUS_LABEL[t.status]}</Badge>
                <Badge variant={PRIORITY_BADGE[t.priority]?.replace('badge-','')}>{PRIORITY_LABEL[t.priority]}</Badge>
                {t.stage && <Badge variant="gray">{t.stage}</Badge>}
                {t.deadline && <span style={{ fontSize:11, color:'#888' }}>due {t.deadline}</span>}
                {t.worker && <span style={{ fontSize:11, color:'#aaa' }}>{t.worker.name}</span>}
              </div>
              {t.status === 'pending' && (
                <div style={{ marginTop:8 }}>
                  {t.photo_url && (
                    <div style={{ marginBottom:8 }}>
                      <div style={{ fontSize:11, color:'#888', marginBottom:4 }}>Photo from worker:</div>
                      <img src={t.photo_url} alt="work photo"
                        style={{ width:'100%', maxWidth:240, borderRadius:8, border:'1px solid #e8e8e8', cursor:'pointer' }}
                        onClick={() => window.open(t.photo_url, '_blank')} />
                    </div>
                  )}
                  <div style={{ display:'flex', gap:6 }}>
                    <Button variant="primary" size="sm" onClick={() => approveTask(t.id)}>✓ Approve</Button>
                    <Button variant="danger"  size="sm" onClick={() => { setRejectId(t.id); setRejectComment('') }}>↩ Revise</Button>
                  </div>
                </div>
              )}
              {t.status === 'rejected' && t.reject_comment && (
                <div style={{ fontSize:12, color:'#A32D2D', marginTop:5, background:'#FCEBEB', padding:'5px 8px', borderRadius:6 }}>
                  Note: {t.reject_comment}
                </div>
              )}
            </div>
            <div className="task-actions">
              <IconButton danger onClick={() => setDeleteId(t.id)}>✕</IconButton>
            </div>
          </div>
        ))}
      </div>

      {showAdd && <TaskModal onClose={() => setShowAdd(false)} />}

      {rejectId && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setRejectId(null)}>
          <div className="modal">
            <div className="modal-title">Request Revision</div>
            <FormGroup label="Comment for the worker">
              <textarea className="form-input" rows={3} placeholder="What needs to be fixed..."
                value={rejectComment} onChange={e => setRejectComment(e.target.value)} autoFocus />
            </FormGroup>
            <div className="modal-actions">
              <Button size="sm" onClick={() => setRejectId(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => { rejectTask(rejectId, rejectComment); setRejectId(null) }}>Send Back</Button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <ConfirmModal
          title="Delete task?"
          subtitle={tasks.find(t => t.id === deleteId)?.text}
          onConfirm={() => { deleteTask(deleteId); setDeleteId(null) }}
          onClose={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}

// ─── MY TASKS (worker) ────────────────────────────────────────────────────────
export function MyTasks() {
  const { tasks, fetchTasks, submitTask, profile } = useStore()
  const [filter, setFilter] = useState('active')
  const [uploadingId, setUploadingId] = useState(null)

  useEffect(() => { fetchTasks() }, [])

  const mine = tasks.filter(t => t.worker_id === profile?.id)
  const filtered = mine.filter(t =>
    filter === 'active'  ? ['new','rejected'].includes(t.status) :
    filter === 'pending' ? t.status === 'pending' :
    filter === 'done'    ? t.status === 'approved' : true
  )

  const uploadPhoto = async (taskId, file) => {
    if (!file) return
    setUploadingId(taskId)
    try {
      const ext = file.name.split('.').pop()
      const path = `${profile.id}/${taskId}_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('task-photos').upload(path, file, { upsert: true })
      if (upErr) { alert('Upload failed'); setUploadingId(null); return }
      const { data } = supabase.storage.from('task-photos').getPublicUrl(path)
      await supabase.from('tasks').update({ photo_url: data.publicUrl }).eq('id', taskId)
      fetchTasks()
    } catch(e) { alert('Error') }
    setUploadingId(null)
  }

  return (
    <div>
      <div className="page-header"><h1 className="page-title">My Tasks</h1></div>
      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        <StatCard label="Total"     value={mine.length} />
        <StatCard label="Active"    value={mine.filter(t => ['new','rejected'].includes(t.status)).length} />
        <StatCard label="Completed" value={mine.filter(t => t.status==='approved').length} />
      </div>
      <div className="filter-bar">
        <button className={`filter-btn ${filter==='active'  ?'active':''}`} onClick={() => setFilter('active')}>Active</button>
        <button className={`filter-btn ${filter==='pending' ?'active':''}`} onClick={() => setFilter('pending')}>In Review</button>
        <button className={`filter-btn ${filter==='done'    ?'active':''}`} onClick={() => setFilter('done')}>Done</button>
        <button className={`filter-btn ${filter==='all'     ?'active':''}`} onClick={() => setFilter('all')}>All</button>
      </div>
      <div className="card" style={{ padding:0 }}>
        {filtered.length === 0 && <EmptyState>No tasks</EmptyState>}
        {filtered.map(t => (
          <div className="task-row" key={t.id}>
            <div className="task-body">
              <div className="task-text">{t.text}</div>
              <div className="task-meta" style={{ marginTop:5 }}>
                <Badge variant={STATUS_BADGE[t.status]?.replace('badge-','')}>{STATUS_LABEL[t.status]}</Badge>
                {t.stage && <Badge variant="gray">{t.stage}</Badge>}
                {t.deadline && <span style={{ fontSize:11, color:'#A32D2D', fontWeight:500 }}>due {t.deadline}</span>}
              </div>
              {t.photo_url && (
                <div style={{ marginTop:8 }}>
                  <img src={t.photo_url} alt="photo"
                    style={{ width:'100%', maxWidth:200, borderRadius:8, border:'1px solid #e8e8e8' }} />
                </div>
              )}
              {t.status === 'rejected' && t.reject_comment && (
                <div style={{ fontSize:12, color:'#A32D2D', marginTop:5, background:'#FCEBEB', padding:'5px 8px', borderRadius:6 }}>
                  Foreman: {t.reject_comment}
                </div>
              )}
              {['new','rejected'].includes(t.status) && (
                <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
                  <label style={{
                    display:'inline-flex', alignItems:'center', gap:6,
                    fontSize:12, padding:'5px 12px', borderRadius:8,
                    border:'1px solid #ddd', cursor:'pointer', background:'#fff'
                  }}>
                    {uploadingId === t.id ? 'Uploading...' : '📷 Photo'}
                    <input type="file" accept="image/*" capture="environment"
                      style={{ display:'none' }}
                      onChange={e => uploadPhoto(t.id, e.target.files[0])} />
                  </label>
                  <button className="btn btn-primary btn-sm" onClick={() => submitTask(t.id)}>
                    Submit for Review
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── PROJECTS ────────────────────────────────────────────────────────────────
export function Projects() {
  const { projects, tasks, fetchProjects, fetchTasks } = useStore()
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => { fetchProjects().then(() => fetchTasks()) }, [])

  const proj = projects.find(p => p.id === selectedId) || projects[0]
  if (!proj) return (
    <div>
      <div className="page-header"><h1 className="page-title">Projects</h1></div>
      <EmptyState>No projects — create one on the Dashboard</EmptyState>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <Badge variant="blue">{proj.stage}</Badge>
      </div>
      {projects.length > 1 && (
        <div className="filter-bar" style={{ marginBottom:16 }}>
          {projects.map(p => (
            <button key={p.id} className={`filter-btn ${proj.id===p.id?'active':''}`}
              onClick={() => setSelectedId(p.id)}>{p.name}</button>
          ))}
        </div>
      )}
      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        <StatCard label="Progress"     value={`${proj.progress||0}%`} />
        <StatCard label="Deadline"     value={proj.deadline||'Not set'} />
        <StatCard label="Active tasks" value={tasks.filter(t=>t.project_id===proj.id&&t.status!=='approved').length} />
      </div>
      <SectionTitle>Stages</SectionTitle>
      <div className="card" style={{ padding:0 }}>
        {PROJECT_STAGES.map(s => (
          <div className="stage-row" key={s.n}>
            <div className={`stage-num ${s.cls}`}>{s.pct===100?'✓':s.n}</div>
            <div style={{ flex:1, fontSize:13, fontWeight:500 }}>{s.name}</div>
            <div style={{ flex:1, margin:'0 12px' }}>
              <div className="progress-bar"><div className="progress-fill" style={{ width:`${s.pct}%` }} /></div>
            </div>
            <div style={{ fontSize:12, color:'#888', minWidth:32, textAlign:'right' }}>{s.pct}%</div>
          </div>
        ))}
      </div>
      <SectionTitle>Stage Photos</SectionTitle>
      <div className="photo-grid">
        {[{l:'Rebar',bg:'#E6F1FB',c:'#0C447C'},{l:'Pouring',bg:'#EAF3DE',c:'#3B6D11'},{l:'Done',bg:'#FAEEDA',c:'#854F0B'},{l:'Photo 4',bg:'#E6F1FB',c:'#0C447C'}].map(ph=>(
          <div className="photo-cell" key={ph.l} style={{ background:ph.bg, color:ph.c }}>{ph.l}</div>
        ))}
        <div className="photo-cell" style={{ border:'1px dashed #ccc', color:'#aaa' }}>+ photo</div>
      </div>
    </div>
  )
}

// ─── TOOLS ────────────────────────────────────────────────────────────────────
export function Tools({ canAdd = true }) {
  const { tools, fetchTools } = useStore()
  useEffect(() => { fetchTools() }, [])
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tools</h1>
        {canAdd && <Button variant="primary" size="sm">+ Add</Button>}
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        <StatCard label="Total"    value={tools.length} />
        <StatCard label="On site"  value={tools.filter(t=>t.status==='active').length} />
        <StatCard label="Lost"     value={tools.filter(t=>t.status==='lost').length} danger />
      </div>
      <div className="card" style={{ padding:0 }}>
        {tools.length===0 && <EmptyState>No tools added</EmptyState>}
        {tools.map(t => (
          <div className="tool-row" key={t.id}>
            <div className="tool-icon">⚙</div>
            <div style={{ flex:1 }}>
              <div className="tool-name">{t.name}</div>
              <div className="tool-loc">{t.location}</div>
            </div>
            <Badge variant={TOOL_STATUS_BADGE[t.status]?.replace('badge-','')}>{TOOL_STATUS_LABEL[t.status]}</Badge>
            {canAdd && <Button size="sm" style={{ marginLeft:8 }}>QR</Button>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── TEAM ─────────────────────────────────────────────────────────────────────
export function Team() {
  const { team, fetchTeam, projects, fetchProjects } = useStore()
  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetchProjects().then(() => {
      const { projects } = useStore.getState()
      if (projects[0]) fetchTeam(projects[0].id)
    })
  }, [])

  const invite = async () => {
    if (!email.trim()) return
    setLoading(true); setMsg('')
    const proj = useStore.getState().projects[0]
    if (!proj) { setMsg('No project found'); setLoading(false); return }

    const { data: worker, error } = await supabase
      .from('profiles').select('id, name, role')
      .eq('email', email.trim().toLowerCase()).single()

    if (error || !worker) {
      setMsg('User not found. Ask them to register first.')
      setLoading(false); return
    }

    const allProjects = useStore.getState().projects
    const inserts = allProjects.map(p => ({ project_id: p.id, worker_id: worker.id }))
    const { error: e2 } = await supabase.from('project_workers').insert(inserts)

    if (e2) {
      setMsg(e2.code === '23505' ? 'Worker already in project' : 'Error adding worker')
    } else {
      setMsg(`${worker.name} added to project!`)
      fetchTeam(proj.id); setEmail('')
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Team</h1>
        <Button variant="primary" size="sm" onClick={() => { setShowInvite(!showInvite); setMsg('') }}>
          {showInvite ? 'Close' : '+ Invite'}
        </Button>
      </div>
      {showInvite && (
        <div className="card card-body" style={{ marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>Add worker by email</div>
          <div style={{ display:'flex', gap:8 }}>
            <input className="form-input" placeholder="worker@email.com"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key==='Enter' && invite()} style={{ flex:1 }} />
            <Button variant="primary" size="sm" onClick={invite}>{loading?'...':'Add'}</Button>
          </div>
          {msg && (
            <div style={{
              marginTop:8, fontSize:12, padding:'6px 10px', borderRadius:6,
              background: msg.includes('added') ? '#EAF3DE' : '#FCEBEB',
              color: msg.includes('added') ? '#3B6D11' : '#A32D2D'
            }}>{msg}</div>
          )}
          <div style={{ fontSize:11, color:'#aaa', marginTop:6 }}>
            The worker must register in Tutuu first
          </div>
        </div>
      )}
      <div className="card" style={{ padding:0 }}>
        {team.length===0 && <EmptyState>No workers yet — invite someone!</EmptyState>}
        {team.map(m => (
          <div className="member-row" key={m.id}>
            <div className="member-avatar">{m.name?.charAt(0)?.toUpperCase()}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:500 }}>{m.name}</div>
              <div style={{ fontSize:12, color:'#888' }}>{m.role==='worker'?'Worker':m.role}</div>
            </div>
            <Badge variant="blue">Active</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export function Notifications() {
  const { notifications, fetchNotifications, markNotifRead } = useStore()
  useEffect(() => { fetchNotifications() }, [])
  return (
    <div>
      <div className="page-header"><h1 className="page-title">Notifications</h1></div>
      <div className="card" style={{ padding:0 }}>
        {notifications.length===0 && <EmptyState>No notifications</EmptyState>}
        {notifications.map(n => (
          <div className="notif-row" key={n.id} onClick={() => markNotifRead(n.id)} style={{ cursor:'pointer' }}>
            <div className={`notif-dot ${n.read?'read':''}`} />
            <div style={{ flex:1, fontSize:13, lineHeight:1.5 }}>{n.text}</div>
            <div style={{ fontSize:11, color:'#aaa', whiteSpace:'nowrap', marginLeft:8 }}>
              {new Date(n.created_at).toLocaleDateString('en')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── CLIENT DASHBOARD ────────────────────────────────────────────────────────
export function ClientDashboard() {
  const { projects, tasks, team, fetchProjects, fetchTasks, fetchTeam } = useStore()
  useEffect(() => {
    fetchProjects().then(() => {
      const { projects } = useStore.getState()
      if (projects[0]) { fetchTasks(projects[0].id); fetchTeam(projects[0].id) }
    })
  }, [])

  const proj = projects[0]
  if (!proj) return <div><div className="page-header"><h1 className="page-title">My Project</h1></div><EmptyState>No project assigned</EmptyState></div>

  const approvedTasks = tasks.filter(t => t.status==='approved')

  return (
    <div>
      <div className="page-header"><h1 className="page-title">My Project</h1></div>
      <div className="card card-body project-highlight">
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <strong style={{ color:'#0C447C' }}>{proj.name}</strong>
          <Badge variant="blue">{proj.stage}</Badge>
        </div>
        {proj.deadline && <div style={{ fontSize:12, color:'#185FA5', marginBottom:6 }}>Deadline: {proj.deadline}</div>}
        <ProgressBar value={proj.progress||0} />
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns:'1fr 1fr' }}>
        <StatCard label="Workers on site"   value={team.length} />
        <StatCard label="Tasks completed"   value={approvedTasks.length} />
      </div>
      <SectionTitle>Completed Work</SectionTitle>
      <div className="card" style={{ padding:0 }}>
        {approvedTasks.length===0 && <EmptyState>No completed tasks yet</EmptyState>}
        {approvedTasks.map(t => (
          <div className="task-row" key={t.id}>
            <div className="task-body">
              <div className="task-text">{t.text}</div>
              <div className="task-meta" style={{ marginTop:4 }}>
                <Badge variant="green">Completed</Badge>
                {t.stage && <Badge variant="gray">{t.stage}</Badge>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── CLIENT PROGRESS ─────────────────────────────────────────────────────────
export function ClientProgress() {
  const { fetchProjects } = useStore()
  useEffect(() => { fetchProjects() }, [])
  return (
    <div>
      <div className="page-header"><h1 className="page-title">Progress</h1></div>
      <div className="card" style={{ padding:0 }}>
        {PROJECT_STAGES.map(s => (
          <div className="stage-row" key={s.n}>
            <div className={`stage-num ${s.cls}`}>{s.pct===100?'✓':s.n}</div>
            <div style={{ flex:1, fontSize:13, fontWeight:500 }}>{s.name}</div>
            <div style={{ flex:1, margin:'0 12px' }}>
              <div className="progress-bar"><div className="progress-fill" style={{ width:`${s.pct}%` }} /></div>
            </div>
            <div style={{ fontSize:12, color:'#888', minWidth:32, textAlign:'right' }}>{s.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── CLIENT PHOTOS ────────────────────────────────────────────────────────────
export function ClientPhotos() {
  return (
    <div>
      <div className="page-header"><h1 className="page-title">Photo Report</h1></div>
      <SectionTitle>Foundation — completed</SectionTitle>
      <div className="photo-grid">
        {[{l:'Rebar',bg:'#E6F1FB',c:'#0C447C'},{l:'Pouring',bg:'#EAF3DE',c:'#3B6D11'},{l:'Done',bg:'#FAEEDA',c:'#854F0B'}].map(p=>(
          <div className="photo-cell" key={p.l} style={{ background:p.bg, color:p.c }}>{p.l}</div>
        ))}
      </div>
      <SectionTitle>Electrical — in progress</SectionTitle>
      <div className="photo-grid">
        <div className="photo-cell" style={{ background:'#E6F1FB', color:'#0C447C' }}>Marking</div>
        <div className="photo-cell" style={{ color:'#aaa' }}>pending</div>
        <div className="photo-cell" style={{ color:'#aaa' }}>pending</div>
      </div>
    </div>
  )
}
