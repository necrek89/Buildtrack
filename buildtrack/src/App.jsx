import { useState } from 'react'
import { useStore } from './store/useStore'
import {
  Dashboard, Projects, Tasks, MyTasks, Tools, Team, Notifications,
  ClientDashboard, ClientProgress, ClientPhotos
} from './pages/index'

const NAV = {
  foreman: [
    { id: 'dashboard',     icon: '▦', label: 'Дашборд'       },
    { id: 'projects',      icon: '◫', label: 'Объекты'       },
    { id: 'tasks',         icon: '☑', label: 'Задачи'        },
    { id: 'tools',         icon: '⚙', label: 'Инструменты'   },
    { id: 'team',          icon: '◉', label: 'Команда'       },
    { id: 'notifications', icon: '◆', label: 'Уведомления'   },
  ],
  worker: [
    { id: 'my-tasks',      icon: '☑', label: 'Мои задачи'    },
    { id: 'tools',         icon: '⚙', label: 'Инструменты'   },
    { id: 'notifications', icon: '◆', label: 'Уведомления'   },
  ],
  client: [
    { id: 'dashboard',     icon: '▦', label: 'Мой объект'    },
    { id: 'progress',      icon: '◫', label: 'Прогресс'      },
    { id: 'photos',        icon: '◧', label: 'Фотоотчёт'     },
    { id: 'notifications', icon: '◆', label: 'Уведомления'   },
  ],
}

const DEFAULT_PAGE  = { foreman: 'dashboard', worker: 'my-tasks', client: 'dashboard' }
const ROLE_INITIALS = { foreman: 'ДЖ', worker: 'МГ', client: 'МА' }
const ROLE_LABEL    = { foreman: 'Прораб', worker: 'Рабочий', client: 'Заказчик' }

function PageContent({ role, page }) {
  if (role === 'foreman') {
    if (page === 'dashboard')     return <Dashboard />
    if (page === 'projects')      return <Projects />
    if (page === 'tasks')         return <Tasks />
    if (page === 'tools')         return <Tools canAdd={true} />
    if (page === 'team')          return <Team />
    if (page === 'notifications') return <Notifications />
  }
  if (role === 'worker') {
    if (page === 'my-tasks')      return <MyTasks />
    if (page === 'tools')         return <Tools canAdd={false} />
    if (page === 'notifications') return <Notifications />
  }
  if (role === 'client') {
    if (page === 'dashboard')     return <ClientDashboard />
    if (page === 'progress')      return <ClientProgress />
    if (page === 'photos')        return <ClientPhotos />
    if (page === 'notifications') return <Notifications />
  }
  return <div style={{ padding: 24, color: '#aaa' }}>Страница не найдена</div>
}

export default function App() {
  const { role, setRole } = useStore()
  const [page, setPage] = useState('dashboard')

  const switchRole = (r) => {
    setRole(r)
    setPage(DEFAULT_PAGE[r])
  }

  return (
    <div className="app">
      {/* Topbar */}
      <header className="topbar">
        <span className="topbar-logo">BuildTrack</span>

        <div className="role-tabs">
          {['foreman', 'worker', 'client'].map(r => (
            <button
              key={r}
              className={`rtab ${role === r ? 'active' : ''}`}
              onClick={() => switchRole(r)}
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>

        <div className="avatar">{ROLE_INITIALS[role]}</div>
      </header>

      <div className="layout">
        {/* Sidebar */}
        <nav className="sidebar">
          {NAV[role].map(item => (
            <div
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Main content */}
        <main className="main">
          <PageContent role={role} page={page} />
        </main>
      </div>
    </div>
  )
}
