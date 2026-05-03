import { useState, useEffect } from 'react'
import { useStore, PRIORITY_BADGE, PRIORITY_LABEL, TOOL_STATUS_BADGE, TOOL_STATUS_LABEL, STATUS_LABEL, STATUS_BADGE, STAGES, PRIORITY_OPTIONS } from '../store/useStore'
import { Badge, Button, StatCard, ProgressBar, SectionTitle, EmptyState, IconButton, FormGroup } from '../components/UI'
import TaskModal from '../components/TaskModal'
import ConfirmModal from '../components/ConfirmModal'
import { supabase } from '../lib/supabase'

const PROJECT_STAGES = []
const STAGE_OPTIONS = ['Foundation','Electrical','Walls','Roofing','Finishing']

// ─── FOREMAN DASHBOARD ───────────────────────────────────────────────────────
export function Dashboard() {
  const { tasks, tools, projects, fetchProjects, fetchTasks, fetchTools, profile } = useStore()
  const [showAdd, setShowAdd]     = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [form, setForm]           = useState({ name: '', stage: 'Foundation', deadline: '' })

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

  const deleteProject = async (id) => {
    await supabase.from('tasks').delete().eq('project_id', id)
    await supabase.from('tools').delete().eq('project_id', id)
    await supabase.from('project_workers').delete().eq('project_id', id)
    await supabase.from('projects').delete().eq('id', id)
    fetchProjects(); fetchTasks(); fetchTools()
    setConfirmId(null)
  }

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  const projectToDelete = projects.find(p => p.id === confirmId)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>+ Project</Button>
      </div>
      <div className="stat-grid">
        <StatCard label="Projects"      value={projects.length} />
        <StatCard label="Active tasks"  value={tasks.filter(t => t.status !== 'approved').length} />
        <StatCard label="Tools"         value={tools.length} />
        <StatCard label="Pending"       value={tasks.filter(t => t.status === 'pending').length} />
      </div>
      <SectionTitle>Projects</SectionTitle>
      {projects.length === 0 && <EmptyState>No projects yet — create the first one!</EmptyState>}
      {projects.map(p => (
        <div className="card card-body" key={p.id}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
            <strong style={{ fontSize:14 }}>{p.name}</strong>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <Badge variant="blue">{p.stage}</Badge>
              <IconButton className="danger" title="Delete project" onClick={() => setConfirmId(p.id)}>🗑</IconButton>
            </div>
          </div>
          {p.deadline && <div style={{ fontSize:12, color:'#B8AFA6', marginBottom:4 }}>Deadline: {p.deadline}</div>}
          <ProgressBar value={p.progress || 0} />
        </div>
      ))}

      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">New Project</div>
            <FormGroup label="Project name *">
              <input className="form-input" placeholder='e.g. Apartment Block A'
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

      {confirmId && (
        <ConfirmModal
          icon="🗑️"
          title="Delete project?"
          sub={`"${projectToDelete?.name}" and all its tasks and tools will be permanently deleted.`}
          onConfirm={() => deleteProject(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}

// ─── PROJECTS ────────────────────────────────────────────────────────────────
export function Projects() {
  const { projects, tasks, fetchProjects, fetchTasks } = useStore()
  const [selectedId, setSelectedId] = useState(null)
  const [openStages, setOpenStages] = useState([])

  useEffect(() => { fetchProjects().then(() => fetchTasks()) }, [])

  const proj = projects.find(p => p.id === selectedId) || projects[0]
  if (!proj) return (
    <div>
      <div className="page-header"><h1 className="page-title">Projects</h1></div>
      <EmptyState>No projects — create one on the Dashboard</EmptyState>
    </div>
  )

  const projectTasks = tasks.filter(t => t.project_id === proj.id)
  const STAGE_LIST = ['Foundation','Electrical','Walls','Roofing','Finishing']

  const stages = STAGE_LIST.map((name, i) => {
    const stageTasks = projectTasks.filter(t => t.stage === name)
    const done   = stageTasks.filter(t => t.status === 'approved').length
    const inWork = stageTasks.filter(t => ['new','pending','rejected'].includes(t.status)).length
    const total  = stageTasks.length
    const pct    = total === 0 ? 0 : Math.round((done / total) * 100)
    let cls = ''
    if (pct === 100 && total > 0) cls = 'done'
    else if (inWork > 0) cls = 'current'
    return { n: i + 1, name, pct, cls, done, total, inWork, tasks: stageTasks }
  })

  const toggleStage = (name) =>
    setOpenStages(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name])

  const STATUS_DOT = {
    approved: '#5A9467', pending: '#D4A843', new: '#B8AFA6', rejected: '#A32D2D'
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <Badge variant="blue">{proj.stage}</Badge>
      </div>
     <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
  {projects.map(p => {
    const pTasks  = tasks.filter(t => t.project_id === p.id)
    const pDone   = pTasks.filter(t => t.status === 'approved').length
    const pActive = pTasks.filter(t => t.status !== 'approved').length
    const pPct    = pTasks.length === 0 ? 0 : Math.round((pDone / pTasks.length) * 100)
    const isActive = proj.id === p.id
    return (
      <div key={p.id}
        onClick={() => { setSelectedId(p.id); setOpenStages([]) }}
        style={{
          background: isActive ? 'var(--accent-l, #FAECE4)' : '#fff',
          border: isActive ? '1.5px solid #C96B3A' : '1.5px solid #EAE3D8',
          borderRadius: 12,
          padding: '10px 12px',
          cursor: 'pointer',
          boxShadow: isActive ? '0 4px 12px rgba(201,107,58,0.12)' : 'none',
          transition: 'all .15s'
        }}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <div style={{ fontSize:13, fontWeight:700, color: isActive ? '#C96B3A' : '#2E2420' }}>
            🏗 {p.name}
          </div>
          <div style={{ fontSize:11, fontWeight:700, color: isActive ? '#C96B3A' : '#B8AFA6', fontFamily:'monospace' }}>
            {pPct}%
          </div>
        </div>
        <div style={{ height:3, background:'#EAE3D8', borderRadius:3, overflow:'hidden', marginBottom:6 }}>
          <div style={{ height:3, borderRadius:3, background: isActive ? '#C96B3A' : '#B8AFA6', width:`${pPct}%`, transition:'width .3s' }} />
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {p.deadline && <span style={{ fontSize:10, color:'#B8AFA6' }}>📅 {p.deadline}</span>}
          <span style={{ fontSize:10, color:'#B8AFA6' }}>✅ {pDone}/{pTasks.length} tasks</span>
          {pActive > 0 && <span style={{ fontSize:10, color:'#C96B3A' }}>⚡ {pActive} active</span>}
        </div>
      </div>
    )
  })}
</div>
      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        <StatCard label="Progress"     value={`${proj.progress||0}%`} />
        <StatCard label="Deadline"     value={proj.deadline||'Not set'} />
        <StatCard label="Active tasks" value={projectTasks.filter(t=>t.status!=='approved').length} />
      </div>
      <SectionTitle>Stages</SectionTitle>

      <div className="tl-wrap">
        {stages.map(s => {
          const isOpen   = openStages.includes(s.name)
          const barColor = s.cls==='done' ? '#5A9467' : s.cls==='current' ? '#C96B3A' : '#EAE3D8'
          const pctColor = s.cls==='done' ? '#5A9467' : s.cls==='current' ? '#C96B3A' : '#B8AFA6'

          return (
            <div key={s.n} className="tl-stage">
              <div className={`tl-dot ${s.cls || 'future'}`}>
                {s.cls==='done' ? '✓' : s.n}
              </div>
              <div className={`tl-card ${s.cls || 'future'}`}>
                <div className="tl-card-header" onClick={() => toggleStage(s.name)}>
                  <div className="tl-card-name">{s.name}</div>
                  {s.inWork > 0 && <div className="tl-inwork">{s.inWork} in work</div>}
                  <div className="tl-bar-bg">
                    <div className="tl-bar" style={{ width:`${s.pct}%`, background:barColor }} />
                  </div>
                  <div className="tl-pct" style={{ color:pctColor }}>{s.pct}%</div>
                  <div className="tl-count">
                    {s.total===0 ? '—' : `${s.done}/${s.total}`}
                  </div>
                  <div className="tl-arrow">{isOpen ? '▲' : '▼'}</div>
                </div>

                {isOpen && (
                  <div className="tl-card-body">
                    {s.tasks.length === 0
                      ? <div className="tl-empty">No tasks for this stage yet</div>
                      : s.tasks.map(t => (
                          <div key={t.id} className="tl-task">
                            <div className="tl-task-dot" style={{ background: STATUS_DOT[t.status] || '#B8AFA6' }} />
                            <div className="tl-task-name">{t.text}</div>
                            <Badge variant={STATUS_BADGE[t.status]?.replace('badge-','')}>{STATUS_LABEL[t.status]}</Badge>
                            {t.deadline && <div className="tl-task-due">due {t.deadline}</div>}
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
// ─── TASKS (foreman) ─────────────────────────────────────────────────────────
export function Tasks() {
  const { tasks, fetchTasks, deleteTask, approveTask, rejectTask } = useStore()
  const [filter, setFilter]   = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editTask, setEditTask] = useState(null)
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
        <StatCard label="Urgent"         value={tasks.filter(t => t.priority==='high' && t.status!=='approved').length} />
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
                <div style={{ marginTop:8, display:'flex', gap:6 }}>
                  {t.photo_url && (
                    <a href={t.photo_url} target="_blank" rel="noreferrer">
                      <img src={t.photo_url} alt="proof" style={{ width:60, height:60, objectFit:'cover', borderRadius:6, border:'1px solid #EAE3D8' }} />
                    </a>
                  )}
                  <Button size="sm" variant="primary" onClick={() => approveTask(t.id)}>✓ Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => rejectTask(t.id, 'Needs revision')}>✕ Reject</Button>
                </div>
              )}
              {t.status === 'rejected' && t.reject_comment && (
                <div style={{ marginTop:6, fontSize:11, color:'#A32D2D', background:'#FCEBEB', padding:'4px 8px', borderRadius:6 }}>
                  ↩ {t.reject_comment}
                </div>
              )}
            </div>
            <div className="task-actions">
              <IconButton onClick={() => setEditTask(t)}>✏️</IconButton>
              <IconButton className="danger" onClick={() => setDeleteId(t.id)}>🗑</IconButton>
            </div>
          </div>
        ))}
      </div>
      {(showAdd || editTask) && (
        <TaskModal task={editTask} onClose={() => { setShowAdd(false); setEditTask(null); fetchTasks() }} />
      )}
      {deleteId && (
        <ConfirmModal
          icon="🗑️"
          title="Delete task?"
          sub={tasks.find(t => t.id === deleteId)?.text}
          onConfirm={() => { deleteTask(deleteId); setDeleteId(null) }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}

// ─── MY TASKS (worker) ───────────────────────────────────────────────────────
export function MyTasks() {
  const { tasks, fetchTasks, submitTask, profile } = useStore()
  const [filter, setFilter]       = useState('active')
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
        {filtered.length === 0 && <EmptyState>No tasks here</EmptyState>}
        {filtered.map(t => (
          <div className="task-row" key={t.id}>
            <div className="task-body">
              <div className="task-text" style={{ fontWeight:500 }}>{t.text}</div>
              <div className="task-meta" style={{ marginTop:5 }}>
                <Badge variant={STATUS_BADGE[t.status]?.replace('badge-','')}>{STATUS_LABEL[t.status]}</Badge>
                {t.stage && <Badge variant="gray">{t.stage}</Badge>}
                {t.deadline && <span style={{ fontSize:11, color:'#888' }}>due {t.deadline}</span>}
              </div>
              {t.status === 'rejected' && t.reject_comment && (
                <div style={{ marginTop:6, fontSize:11, color:'#A32D2D', background:'#FCEBEB', padding:'4px 8px', borderRadius:6 }}>
                  ↩ {t.reject_comment}
                </div>
              )}
              {['new','rejected'].includes(t.status) && (
                <div style={{ marginTop:8, display:'flex', gap:6, alignItems:'center' }}>
                  <label className="btn btn-sm" style={{ cursor:'pointer' }}>
                    {uploadingId===t.id ? 'Uploading...' : '📷 Photo'}
                    <input type="file" accept="image/*" capture="environment"
                      style={{ display:'none' }}
                      onChange={e => uploadPhoto(t.id, e.target.files[0])} />
                  </label>
                  <Button variant="primary" size="sm" onClick={() => submitTask(t.id)}>Submit for Review</Button>
                </div>
              )}
              {t.photo_url && (
                <a href={t.photo_url} target="_blank" rel="noreferrer">
                  <img src={t.photo_url} alt="proof" style={{ marginTop:6, width:60, height:60, objectFit:'cover', borderRadius:6, border:'1px solid #EAE3D8' }} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── TOOLS ───────────────────────────────────────────────────────────────────
export function Tools({ canAdd }) {
  const { tools, fetchTools, addTool, profile, projects, fetchProjects } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name:'', location:'', status:'active', project_id:'' })

  useEffect(() => {
    fetchProjects().then(() => fetchTools())
  }, [])

  const create = async () => {
    if (!form.name.trim()) return
    const proj = useStore.getState().projects[0]
    const { error } = await addTool({ ...form, project_id: form.project_id || proj?.id })
    if (!error) { setShowAdd(false); setForm({ name:'', location:'', status:'active', project_id:'' }) }
  }

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tools</h1>
        {canAdd && <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>+ Add Tool</Button>}
      </div>
      <div className="card" style={{ padding:0 }}>
        {tools.length === 0 && <EmptyState>No tools registered</EmptyState>}
        {tools.map(t => (
          <div className="tool-row" key={t.id}>
            <div className="tool-icon">🔧</div>
            <div style={{ flex:1 }}>
              <div className="tool-name">{t.name}</div>
              {t.location && <div className="tool-loc">{t.location}</div>}
            </div>
            <Badge variant={TOOL_STATUS_BADGE[t.status]?.replace('badge-','')}>{TOOL_STATUS_LABEL[t.status]}</Badge>
            {canAdd && <Button size="sm" style={{ marginLeft:8 }}>QR</Button>}
          </div>
        ))}
      </div>
      {showAdd && canAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">Add Tool</div>
            <FormGroup label="Tool name *">
              <input className="form-input" placeholder="e.g. Drill Bosch GSB 18" value={form.name} onChange={set('name')} autoFocus />
            </FormGroup>
            <FormGroup label="Location">
              <input className="form-input" placeholder="e.g. Site A, Room 3" value={form.location} onChange={set('location')} />
            </FormGroup>
            <FormGroup label="Status">
              <select className="form-input" value={form.status} onChange={set('status')}>
                <option value="active">On site</option>
                <option value="stored">In storage</option>
                <option value="lost">Lost</option>
              </select>
            </FormGroup>
            {projects.length > 1 && (
              <FormGroup label="Project">
                <select className="form-input" value={form.project_id} onChange={set('project_id')}>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </FormGroup>
            )}
            <div className="modal-actions">
              <Button size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={create}>Add</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TEAM ────────────────────────────────────────────────────────────────────
export function Team() {
  const { team, fetchTeam, projects, fetchProjects } = useStore()
  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]       = useState('')

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
    if (error || !worker) { setMsg('User not found. Ask them to register first.'); setLoading(false); return }
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
              background: msg.includes('added') ? '#E8F2EB' : '#FCEBEB',
              color: msg.includes('added') ? '#3D7A52' : '#A32D2D'
            }}>{msg}</div>
          )}
        </div>
      )}
      <div className="card" style={{ padding:0 }}>
        {team.length === 0 && <EmptyState>No team members yet</EmptyState>}
        {team.map(m => (
          <div className="member-row" key={m.id}>
            <div className="member-avatar">{m.name?.charAt(0)?.toUpperCase()}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500 }}>{m.name}</div>
              <div style={{ fontSize:11, color:'#B8AFA6' }}>{m.role}</div>
            </div>
            <Badge variant="green">Active</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
export function Notifications() {
  const { notifications, fetchNotifications, markNotifRead } = useStore()
  useEffect(() => { fetchNotifications() }, [])
  return (
    <div>
      <div className="page-header"><h1 className="page-title">Notifications</h1></div>
      <div className="card" style={{ padding:0 }}>
        {notifications.length === 0 && <EmptyState>No notifications</EmptyState>}
        {notifications.map(n => (
          <div className="notif-row" key={n.id} onClick={() => markNotifRead(n.id)} style={{ cursor:'pointer' }}>
            <div className={`notif-dot ${n.read?'read':''}`} />
            <div style={{ flex:1, fontSize:13, lineHeight:1.5 }}>{n.text}</div>
            <div style={{ fontSize:11, color:'#B8AFA6', whiteSpace:'nowrap', marginLeft:8 }}>
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
          <strong style={{ color:'#A04B22' }}>{proj.name}</strong>
          <Badge variant="blue">{proj.stage}</Badge>
        </div>
        {proj.deadline && <div style={{ fontSize:12, color:'#C96B3A', marginBottom:6 }}>Deadline: {proj.deadline}</div>}
        <ProgressBar value={proj.progress||0} />
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns:'1fr 1fr' }}>
        <StatCard label="Workers on site"  value={team.length} />
        <StatCard label="Tasks completed"  value={approvedTasks.length} />
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
        {[{l:'Rebar',bg:'#FAECE4',c:'#A04B22'},{l:'Pouring',bg:'#E8F2EB',c:'#3D7A52'},{l:'Done',bg:'#FBF3DC',c:'#9A6E10'}].map(p=>(
          <div className="photo-cell" key={p.l} style={{ background:p.bg, color:p.c }}>{p.l}</div>
        ))}
      </div>
      <SectionTitle>Electrical — in progress</SectionTitle>
      <div className="photo-grid">
        <div className="photo-cell" style={{ background:'#FAECE4', color:'#A04B22' }}>Marking</div>
        <div className="photo-cell" style={{ color:'#B8AFA6' }}>pending</div>
        <div className="photo-cell" style={{ color:'#B8AFA6' }}>pending</div>
      </div>
    </div>
  )
}
