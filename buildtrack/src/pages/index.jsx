import { useState, useEffect } from 'react'
import { useStore, PRIORITY_BADGE, PRIORITY_LABEL, TOOL_STATUS_BADGE, TOOL_STATUS_LABEL, STATUS_LABEL, STATUS_BADGE, STAGES, PRIORITY_OPTIONS } from '../store/useStore'
import { Badge, Button, StatCard, ProgressBar, SectionTitle, EmptyState, IconButton, FormGroup } from '../components/UI'
import TaskModal from '../components/TaskModal'
import ConfirmModal from '../components/ConfirmModal'

// ─── FOREMAN DASHBOARD ───────────────────────────────────────────────────────
export function Dashboard() {
  const { tasks, tools, projects, team, fetchProjects, fetchTasks, fetchTools } = useStore()

  useEffect(() => {
    fetchProjects()
    fetchTasks()
    fetchTools()
  }, [])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Дашборд</h1>
        <Button variant="primary" size="sm">+ Объект</Button>
      </div>
      <div className="stat-grid">
        <StatCard label="Объектов"       value={projects.length} />
        <StatCard label="Активных задач" value={tasks.filter(t => t.status !== 'approved').length} />
        <StatCard label="Инструментов"   value={tools.length} />
        <StatCard label="На проверке"    value={tasks.filter(t => t.status === 'pending').length} />
      </div>
      <SectionTitle>Объекты</SectionTitle>
      {projects.length === 0 && <EmptyState>Нет объектов</EmptyState>}
      {projects.map(p => (
        <div className="card card-body" key={p.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <strong style={{ fontSize: 14 }}>{p.name}</strong>
            <Badge variant="blue">{p.stage}</Badge>
          </div>
          {p.deadline && <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Дедлайн: {p.deadline}</div>}
          <ProgressBar value={p.progress || 0} />
        </div>
      ))}
    </div>
  )
}

// ─── TASKS (foreman) ─────────────────────────────────────────────────────────
export function Tasks() {
  const { tasks, fetchTasks, approveTask, rejectTask, deleteTask, projects } = useStore()
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

  const pending = tasks.filter(t => t.status === 'pending').length
  const approved = tasks.filter(t => t.status === 'approved').length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Задачи</h1>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>+ Добавить</Button>
      </div>
      <div className="stat-grid">
        <StatCard label="Всего"       value={tasks.length} />
        <StatCard label="На проверке" value={pending} />
        <StatCard label="Выполнено"   value={approved} />
        <StatCard label="Срочных"     value={tasks.filter(t => t.priority === 'high' && t.status !== 'approved').length} danger />
      </div>
      <div className="filter-bar">
        <button className={`filter-btn ${filter==='all'     ?'active':''}`} onClick={() => setFilter('all')}>Все ({tasks.length})</button>
        <button className={`filter-btn ${filter==='active'  ?'active':''}`} onClick={() => setFilter('active')}>Активные</button>
        <button className={`filter-btn ${filter==='pending' ?'active':''}`} onClick={() => setFilter('pending')}>На проверке ({pending})</button>
        <button className={`filter-btn ${filter==='done'    ?'active':''}`} onClick={() => setFilter('done')}>Выполнено ({approved})</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 && <EmptyState>Задач нет</EmptyState>}
        {filtered.map(t => (
          <div className="task-row" key={t.id}>
            <div className="task-body">
              <div className="task-text" style={{ fontWeight: 500 }}>{t.text}</div>
              <div className="task-meta" style={{ marginTop: 5 }}>
                <Badge variant={STATUS_BADGE[t.status]?.replace('badge-','')}>{STATUS_LABEL[t.status]}</Badge>
                <Badge variant={PRIORITY_BADGE[t.priority]?.replace('badge-','')}>{PRIORITY_LABEL[t.priority]}</Badge>
                {t.stage && <Badge variant="gray">{t.stage}</Badge>}
                {t.deadline && <span style={{ fontSize: 11, color: '#888' }}>до {t.deadline}</span>}
                {t.worker && <span style={{ fontSize: 11, color: '#aaa' }}>{t.worker.name}</span>}
              </div>
              {t.status === 'pending' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <Button variant="primary" size="sm" onClick={() => approveTask(t.id)}>✓ Подтвердить</Button>
                  <Button variant="danger" size="sm" onClick={() => { setRejectId(t.id); setRejectComment('') }}>↩ На доработку</Button>
                </div>
              )}
              {t.status === 'rejected' && t.reject_comment && (
                <div style={{ fontSize: 12, color: '#A32D2D', marginTop: 5, background: '#FCEBEB', padding: '5px 8px', borderRadius: 6 }}>
                  Комментарий: {t.reject_comment}
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
            <div className="modal-title">Вернуть на доработку</div>
            <FormGroup label="Комментарий для рабочего">
              <textarea className="form-input" rows={3} placeholder="Что нужно исправить..."
                value={rejectComment} onChange={e => setRejectComment(e.target.value)} autoFocus />
            </FormGroup>
            <div className="modal-actions">
              <Button size="sm" onClick={() => setRejectId(null)}>Отмена</Button>
              <Button variant="danger" size="sm" onClick={() => { rejectTask(rejectId, rejectComment); setRejectId(null) }}>Вернуть</Button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <ConfirmModal
          title="Удалить задачу?"
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

  useEffect(() => { fetchTasks() }, [])

  const mine = tasks.filter(t => t.worker_id === profile?.id)
  const filtered = mine.filter(t =>
    filter === 'active'  ? ['new','rejected'].includes(t.status) :
    filter === 'pending' ? t.status === 'pending' :
    filter === 'done'    ? t.status === 'approved' : true
  )

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Мои задачи</h1></div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <StatCard label="Всего"      value={mine.length} />
        <StatCard label="Активных"   value={mine.filter(t => ['new','rejected'].includes(t.status)).length} />
        <StatCard label="Выполнено"  value={mine.filter(t => t.status === 'approved').length} />
      </div>
      <div className="filter-bar">
        <button className={`filter-btn ${filter==='active'  ?'active':''}`} onClick={() => setFilter('active')}>Активные</button>
        <button className={`filter-btn ${filter==='pending' ?'active':''}`} onClick={() => setFilter('pending')}>На проверке</button>
        <button className={`filter-btn ${filter==='done'    ?'active':''}`} onClick={() => setFilter('done')}>Выполнено</button>
        <button className={`filter-btn ${filter==='all'     ?'active':''}`} onClick={() => setFilter('all')}>Все</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 && <EmptyState>Задач нет</EmptyState>}
        {filtered.map(t => (
          <div className="task-row" key={t.id}>
            <div className="task-body">
              <div className="task-text">{t.text}</div>
              <div className="task-meta" style={{ marginTop: 5 }}>
                <Badge variant={STATUS_BADGE[t.status]?.replace('badge-','')}>{STATUS_LABEL[t.status]}</Badge>
                {t.stage && <Badge variant="gray">{t.stage}</Badge>}
                {t.deadline && (
                  <span style={{ fontSize: 11, color: '#A32D2D', fontWeight: 500 }}>до {t.deadline}</span>
                )}
              </div>
              {t.status === 'rejected' && t.reject_comment && (
                <div style={{ fontSize: 12, color: '#A32D2D', marginTop: 5, background: '#FCEBEB', padding: '5px 8px', borderRadius: 6 }}>
                  Прораб: {t.reject_comment}
                </div>
              )}
              {['new','rejected'].includes(t.status) && (
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 8 }}
                  onClick={() => submitTask(t.id)}
                >
                  Отправить на проверку
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── PROJECTS ────────────────────────────────────────────────────────────────
const PROJECT_STAGES = [
  { n:1, name:'Фундамент',        pct:100, cls:'done'    },
  { n:2, name:'Электрика',        pct:45,  cls:'current' },
  { n:3, name:'Стены',            pct:10,  cls:''        },
  { n:4, name:'Кровля',           pct:0,   cls:''        },
  { n:5, name:'Финишная отделка', pct:0,   cls:''        },
]

export function Projects() {
  const { projects, tasks, fetchProjects, fetchTasks } = useStore()
  useEffect(() => { fetchProjects(); fetchTasks() }, [])
  const proj = projects[0]
  if (!proj) return <div><div className="page-header"><h1 className="page-title">Объекты</h1></div><EmptyState>Нет объектов</EmptyState></div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{proj.name}</h1>
        <Badge variant="blue">{proj.stage}</Badge>
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <StatCard label="Прогресс"       value={`${proj.progress || 0}%`} />
        <StatCard label="Дедлайн"        value={proj.deadline || 'Не задан'} />
        <StatCard label="Активных задач" value={tasks.filter(t => t.status !== 'approved').length} />
      </div>
      <SectionTitle>Этапы</SectionTitle>
      <div className="card" style={{ padding: 0 }}>
        {PROJECT_STAGES.map(s => (
          <div className="stage-row" key={s.n}>
            <div className={`stage-num ${s.cls}`}>{s.pct === 100 ? '✓' : s.n}</div>
            <div style={{ flex:1, fontSize:13, fontWeight:500 }}>{s.name}</div>
            <div style={{ flex:1, margin:'0 12px' }}>
              <div className="progress-bar"><div className="progress-fill" style={{ width:`${s.pct}%` }} /></div>
            </div>
            <div style={{ fontSize:12, color:'#888', minWidth:32, textAlign:'right' }}>{s.pct}%</div>
          </div>
        ))}
      </div>
      <SectionTitle>Фото этапа</SectionTitle>
      <div className="photo-grid">
        {[{l:'Арматура',bg:'#E6F1FB',c:'#0C447C'},{l:'Заливка',bg:'#EAF3DE',c:'#3B6D11'},{l:'Готово',bg:'#FAEEDA',c:'#854F0B'},{l:'Фото 4',bg:'#E6F1FB',c:'#0C447C'}].map(ph=>(
          <div className="photo-cell" key={ph.l} style={{ background:ph.bg, color:ph.c }}>{ph.l}</div>
        ))}
        <div className="photo-cell" style={{ border:'1px dashed #ccc', color:'#aaa' }}>+ фото</div>
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
        <h1 className="page-title">Инструменты</h1>
        {canAdd && <Button variant="primary" size="sm">+ Добавить</Button>}
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        <StatCard label="Всего"       value={tools.length} />
        <StatCard label="На объектах" value={tools.filter(t=>t.status==='active').length} />
        <StatCard label="Потеряно"    value={tools.filter(t=>t.status==='lost').length} danger />
      </div>
      <div className="card" style={{ padding:0 }}>
        {tools.length === 0 && <EmptyState>Нет инструментов</EmptyState>}
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
  const { team, fetchTeam, projects } = useStore()
  useEffect(() => { if(projects[0]) fetchTeam(projects[0].id) }, [projects])
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Команда</h1>
        <Button variant="primary" size="sm">+ Пригласить</Button>
      </div>
      <div className="card" style={{ padding:0 }}>
        {team.length === 0 && <EmptyState>Нет рабочих</EmptyState>}
        {team.map(m => (
          <div className="member-row" key={m.id}>
            <div className="member-avatar">{m.name?.charAt(0)?.toUpperCase()}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:500 }}>{m.name}</div>
              <div style={{ fontSize:12, color:'#888' }}>{m.role}</div>
            </div>
            <Badge variant="blue">В команде</Badge>
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
      <div className="page-header"><h1 className="page-title">Уведомления</h1></div>
      <div className="card" style={{ padding:0 }}>
        {notifications.length === 0 && <EmptyState>Нет уведомлений</EmptyState>}
        {notifications.map(n => (
          <div className="notif-row" key={n.id} onClick={() => markNotifRead(n.id)} style={{ cursor:'pointer' }}>
            <div className={`notif-dot ${n.read?'read':''}`} />
            <div style={{ flex:1, fontSize:13, lineHeight:1.5 }}>{n.text}</div>
            <div style={{ fontSize:11, color:'#aaa', whiteSpace:'nowrap', marginLeft:8 }}>
              {new Date(n.created_at).toLocaleDateString('ru')}
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
      if(projects[0]) { fetchTasks(projects[0].id); fetchTeam(projects[0].id) }
    })
  }, [])

  const proj = projects[0]
  if(!proj) return <div><div className="page-header"><h1 className="page-title">Мой объект</h1></div><EmptyState>Объект не найден</EmptyState></div>

  const approvedTasks = tasks.filter(t => t.status === 'approved')

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Мой объект</h1></div>
      <div className="card card-body project-highlight">
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <strong style={{ color:'#0C447C' }}>{proj.name}</strong>
          <Badge variant="blue">{proj.stage}</Badge>
        </div>
        {proj.deadline && (
          <div style={{ fontSize:12, color:'#185FA5', marginBottom:6 }}>Дедлайн: {proj.deadline}</div>
        )}
        <ProgressBar value={proj.progress || 0} />
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns:'1fr 1fr' }}>
        <StatCard label="Рабочих на объекте" value={team.length} />
        <StatCard label="Задач выполнено"    value={approvedTasks.length} />
      </div>
      <SectionTitle>Выполненные работы</SectionTitle>
      <div className="card" style={{ padding:0 }}>
        {approvedTasks.length === 0 && <EmptyState>Нет подтверждённых работ</EmptyState>}
        {approvedTasks.map(t => (
          <div className="task-row" key={t.id}>
            <div className="task-body">
              <div className="task-text">{t.text}</div>
              <div className="task-meta" style={{ marginTop:4 }}>
                <Badge variant="green">Выполнено</Badge>
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
  const { projects, fetchProjects } = useStore()
  useEffect(() => { fetchProjects() }, [])
  return (
    <div>
      <div className="page-header"><h1 className="page-title">Прогресс</h1></div>
      <div className="card" style={{ padding:0 }}>
        {PROJECT_STAGES.map(s => (
          <div className="stage-row" key={s.n}>
            <div className={`stage-num ${s.cls}`}>{s.pct === 100 ? '✓' : s.n}</div>
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
      <div className="page-header"><h1 className="page-title">Фотоотчёт</h1></div>
      <SectionTitle>Фундамент — выполнено</SectionTitle>
      <div className="photo-grid">
        {[{l:'Арматура',bg:'#E6F1FB',c:'#0C447C'},{l:'Заливка',bg:'#EAF3DE',c:'#3B6D11'},{l:'Готово',bg:'#FAEEDA',c:'#854F0B'}].map(p=>(
          <div className="photo-cell" key={p.l} style={{ background:p.bg, color:p.c }}>{p.l}</div>
        ))}
      </div>
      <SectionTitle>Электрика — в процессе</SectionTitle>
      <div className="photo-grid">
        <div className="photo-cell" style={{ background:'#E6F1FB', color:'#0C447C' }}>Разметка</div>
        <div className="photo-cell" style={{ color:'#aaa' }}>ожидается</div>
        <div className="photo-cell" style={{ color:'#aaa' }}>ожидается</div>
      </div>
    </div>
  )
}
