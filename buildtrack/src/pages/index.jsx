import { useState } from 'react'
import { useStore, PRIORITY_BADGE, PRIORITY_LABEL, TOOL_STATUS_BADGE, TOOL_STATUS_LABEL } from '../store/useStore'
import { Badge, Button, StatCard, ProgressBar, SectionTitle, EmptyState, IconButton } from '../components/UI'
import TaskList from '../components/TaskList'
import TaskModal from '../components/TaskModal'
import ConfirmModal from '../components/ConfirmModal'

// ─── FOREMAN DASHBOARD ───────────────────────────────────────────────────────
export function Dashboard() {
  const { tasks, tools, projects, team } = useStore()
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Дашборд</h1>
        <Button variant="primary" size="sm">+ Объект</Button>
      </div>
      <div className="stat-grid">
        <StatCard label="Объектов"       value={projects.length} />
        <StatCard label="Задач активных" value={tasks.filter(t => !t.done).length} />
        <StatCard label="Инструментов"   value={tools.length} />
        <StatCard label="Рабочих"        value={team.length} />
      </div>
      <SectionTitle>Активные объекты</SectionTitle>
      {projects.map(p => (
        <div className="card card-body" key={p.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <strong style={{ fontSize: 14 }}>{p.name}</strong>
            <Badge variant="blue">{p.stage}</Badge>
          </div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{p.client}</div>
          <ProgressBar value={p.progress} />
        </div>
      ))}
    </div>
  )
}

// ─── PROJECTS ────────────────────────────────────────────────────────────────
const PROJECT_STAGES = [
  { n: 1, name: 'Фундамент',        pct: 100, cls: 'done'    },
  { n: 2, name: 'Электрика',        pct: 45,  cls: 'current' },
  { n: 3, name: 'Стены',            pct: 10,  cls: ''        },
  { n: 4, name: 'Кровля',           pct: 0,   cls: ''        },
  { n: 5, name: 'Финишная отделка', pct: 0,   cls: ''        },
]
const PHOTOS = [
  { label: 'Арматура', bg: '#E6F1FB', color: '#0C447C' },
  { label: 'Заливка',  bg: '#EAF3DE', color: '#3B6D11' },
  { label: 'Готово',   bg: '#FAEEDA', color: '#854F0B' },
  { label: 'Фото 4',   bg: '#E6F1FB', color: '#0C447C' },
]

export function Projects() {
  const { projects, tasks } = useStore()
  const proj = projects[0]
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{proj.name}</h1>
        <Badge variant="blue">{proj.stage}</Badge>
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <StatCard label="Прогресс"       value={`${proj.progress}%`} />
        <StatCard label="Заказчик"       value={proj.client} />
        <StatCard label="Активных задач" value={tasks.filter(t => !t.done).length} />
      </div>
      <SectionTitle>Этапы</SectionTitle>
      <div className="card" style={{ padding: 0 }}>
        {PROJECT_STAGES.map(s => (
          <div className="stage-row" key={s.n}>
            <div className={`stage-num ${s.cls}`}>{s.pct === 100 ? '✓' : s.n}</div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{s.name}</div>
            <div style={{ flex: 1, margin: '0 12px' }}>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${s.pct}%` }} /></div>
            </div>
            <div style={{ fontSize: 12, color: '#888', minWidth: 32, textAlign: 'right' }}>{s.pct}%</div>
          </div>
        ))}
      </div>
      <SectionTitle>Фото этапа</SectionTitle>
      <div className="photo-grid">
        {PHOTOS.map(ph => (
          <div className="photo-cell" key={ph.label} style={{ background: ph.bg, color: ph.color }}>{ph.label}</div>
        ))}
        <div className="photo-cell" style={{ border: '1px dashed #ccc', color: '#aaa' }}>+ фото</div>
      </div>
    </div>
  )
}

// ─── TASKS (foreman) ─────────────────────────────────────────────────────────
export function Tasks() {
  const { tasks } = useStore()
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = tasks.filter(t =>
    filter === 'active' ? !t.done : filter === 'done' ? t.done : true
  )
  const active = tasks.filter(t => !t.done).length
  const done   = tasks.filter(t =>  t.done).length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Задачи</h1>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>+ Добавить задачу</Button>
      </div>
      <div className="stat-grid">
        <StatCard label="Всего"    value={tasks.length} />
        <StatCard label="Активных" value={active} />
        <StatCard label="Готово"   value={done} />
        <StatCard label="Срочных"  value={tasks.filter(t => t.priority === 'high' && !t.done).length} danger />
      </div>
      <div className="filter-bar">
        <button className={`filter-btn ${filter==='all'    ? 'active':''}`} onClick={() => setFilter('all')}>Все ({tasks.length})</button>
        <button className={`filter-btn ${filter==='active' ? 'active':''}`} onClick={() => setFilter('active')}>Активные ({active})</button>
        <button className={`filter-btn ${filter==='done'   ? 'active':''}`} onClick={() => setFilter('done')}>Выполненные ({done})</button>
      </div>
      <TaskList tasks={filtered} canEdit={true} />
      {showAdd && <TaskModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

// ─── MY TASKS (worker) ────────────────────────────────────────────────────────
export function MyTasks() {
  const { tasks } = useStore()
  const [filter, setFilter] = useState('all')

  const mine   = tasks.filter(t => t.who === 'Мигель')
  const active = mine.filter(t => !t.done).length
  const done   = mine.filter(t =>  t.done).length
  const filtered = mine.filter(t =>
    filter === 'active' ? !t.done : filter === 'done' ? t.done : true
  )

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Мои задачи</h1></div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <StatCard label="Всего"    value={mine.length} />
        <StatCard label="Активных" value={active} />
        <StatCard label="Готово"   value={done} />
      </div>
      <div className="filter-bar">
        <button className={`filter-btn ${filter==='all'    ? 'active':''}`} onClick={() => setFilter('all')}>Все</button>
        <button className={`filter-btn ${filter==='active' ? 'active':''}`} onClick={() => setFilter('active')}>Активные</button>
        <button className={`filter-btn ${filter==='done'   ? 'active':''}`} onClick={() => setFilter('done')}>Выполненные</button>
      </div>
      <TaskList tasks={filtered} canEdit={false} />
    </div>
  )
}

// ─── TOOLS ────────────────────────────────────────────────────────────────────
export function Tools({ canAdd = true }) {
  const { tools } = useStore()
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Инструменты</h1>
        {canAdd && <Button variant="primary" size="sm">+ Добавить</Button>}
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <StatCard label="Всего"       value={tools.length} />
        <StatCard label="На объектах" value={tools.filter(t => t.status === 'active').length} />
        <StatCard label="Потеряно"    value={tools.filter(t => t.status === 'lost').length} danger />
      </div>
      <div className="card" style={{ padding: 0 }}>
        {tools.map(t => (
          <div className="tool-row" key={t.id}>
            <div className="tool-icon">⚙</div>
            <div style={{ flex: 1 }}>
              <div className="tool-name">{t.name}</div>
              <div className="tool-loc">{t.loc}</div>
            </div>
            <Badge variant={TOOL_STATUS_BADGE[t.status].replace('badge-', '')}>{TOOL_STATUS_LABEL[t.status]}</Badge>
            {canAdd && <Button size="sm" style={{ marginLeft: 8 }}>QR</Button>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── TEAM ─────────────────────────────────────────────────────────────────────
export function Team() {
  const { team } = useStore()
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Команда</h1>
        <Button variant="primary" size="sm">+ Пригласить</Button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {team.map(m => (
          <div className="member-row" key={m.id}>
            <div className="member-avatar">{m.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{m.role}</div>
            </div>
            <div style={{ textAlign: 'right', marginRight: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{m.tasks}</div>
              <div style={{ fontSize: 11, color: '#888' }}>задач</div>
            </div>
            <Badge variant={m.tasks > 0 ? 'blue' : 'green'}>{m.tasks > 0 ? 'В работе' : 'Свободен'}</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
const NOTIFS = [
  { id: 1, text: 'Мигель отметил задачу "Монтаж щитка" как выполненную', time: '5 мин', read: false },
  { id: 2, text: 'Добавлено новое фото на объект ЖК "Северный"',         time: '1 ч',   read: false },
  { id: 3, text: 'Заказчик Марк Иванов просматривает прогресс',           time: '2 ч',   read: true  },
  { id: 4, text: 'Задача "Кладка стен" просрочена на 1 день',             time: 'вчера', read: true  },
  { id: 5, text: 'Шуруповёрт не возвращён более 5 дней',                  time: 'вчера', read: true  },
]

export function Notifications() {
  return (
    <div>
      <div className="page-header"><h1 className="page-title">Уведомления</h1></div>
      <div className="card" style={{ padding: 0 }}>
        {NOTIFS.map(n => (
          <div className="notif-row" key={n.id}>
            <div className={`notif-dot ${n.read ? 'read' : ''}`} />
            <div style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>{n.text}</div>
            <div style={{ fontSize: 11, color: '#aaa', whiteSpace: 'nowrap', marginLeft: 8 }}>{n.time}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── CLIENT DASHBOARD ────────────────────────────────────────────────────────
export function ClientDashboard() {
  const { projects, team } = useStore()
  const proj = projects[0]
  return (
    <div>
      <div className="page-header"><h1 className="page-title">Мой объект</h1></div>
      <div className="card card-body project-highlight">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong style={{ color: '#0C447C' }}>{proj.name}</strong>
          <Badge variant="blue">{proj.stage}</Badge>
        </div>
        <ProgressBar value={proj.progress} />
      </div>
      <SectionTitle>Последние обновления</SectionTitle>
      <div className="card" style={{ padding: 0 }}>
        {[
          { text: 'Завершён этап: Фундамент', time: 'вчера', read: false },
          { text: 'Добавлено 4 новых фото',   time: 'сегодня', read: false },
          { text: 'Начат этап: Электрика',    time: '2 дня назад', read: true },
        ].map((n, i) => (
          <div className="notif-row" key={i}>
            <div className={`notif-dot ${n.read ? 'read' : ''}`} />
            <div style={{ flex: 1, fontSize: 13 }}>{n.text}</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>{n.time}</div>
          </div>
        ))}
      </div>
      <SectionTitle>Команда на объекте</SectionTitle>
      <div className="card card-body">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {team.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <div className="member-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{m.initials}</div>
              {m.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── CLIENT PROGRESS ─────────────────────────────────────────────────────────
export function ClientProgress() {
  return (
    <div>
      <div className="page-header"><h1 className="page-title">Прогресс строительства</h1></div>
      <div className="card" style={{ padding: 0 }}>
        {PROJECT_STAGES.map(s => (
          <div className="stage-row" key={s.n}>
            <div className={`stage-num ${s.cls}`}>{s.pct === 100 ? '✓' : s.n}</div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{s.name}</div>
            <div style={{ flex: 1, margin: '0 12px' }}>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${s.pct}%` }} /></div>
            </div>
            <div style={{ fontSize: 12, color: '#888', minWidth: 32, textAlign: 'right' }}>{s.pct}%</div>
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
          <div className="photo-cell" key={p.l} style={{ background: p.bg, color: p.c }}>{p.l}</div>
        ))}
      </div>
      <SectionTitle>Электрика — в процессе</SectionTitle>
      <div className="photo-grid">
        <div className="photo-cell" style={{ background: '#E6F1FB', color: '#0C447C' }}>Разметка</div>
        <div className="photo-cell" style={{ color: '#aaa' }}>ожидается</div>
        <div className="photo-cell" style={{ color: '#aaa' }}>ожидается</div>
      </div>
    </div>
  )
}
