import { useState, useEffect } from 'react'
import { useStore } from './store/useStore'
import LoginPage from './pages/LoginPage'
import {
  Dashboard, Projects, Tasks, MyTasks, Tools, Team, Notifications,
  ClientDashboard, ClientProgress, ClientPhotos
} from './pages/index'

const NAV = {
  foreman: [
    { id: 'dashboard',     icon: '▦', label: 'Дашборд'     },
    { id: 'projects',      icon: '◫', label: 'Объекты'     },
    { id: 'tasks',         icon: '☑', label: 'Задачи'      },
    { id: 'tools',         icon: '⚙', label: 'Инструменты' },
    { id: 'team',          icon: '◉', label: 'Команда'     },
    { id: 'notifications', icon: '◆', label: 'Уведомления' },
  ],
  worker: [
    { id: 'my-tasks',      icon: '☑', label: 'Задачи'      },
    { id: 'tools',         icon: '⚙', label: 'Инструменты' },
    { id: 'notifications', icon: '◆', label: 'Уведомления' },
  ],
  client: [
    { id: 'dashboard',     icon: '▦', label: 'Объект'      },
    { id: 'progress',      icon: '◫', label: 'Прогресс'    },
    { id: 'photos',        icon: '◧', label: 'Фото'        },
    { id: 'notifications', icon: '◆', label: 'Уведомления' },
  ],
}

const DEFAULT_PAGE = { foreman: 'dashboard', worker: 'my-tasks', client: 'dashboard' }

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
  const { role, profile, checkSession, signOut, loading } = useStore()
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkSession().then(() => {
      const { profile } = useStore.getState()
      if (profile) {
        setAuthed(true)
        setPage(DEFAULT_PAGE[profile.role] || 'dashboard')
      } else {
        setAuthed(false)
      }
      setChecking(false)
    })
  }, [])

  const handleLogin = () => {
    const { profile } = useStore.getState()
    setAuthed(true)
    setPage(DEFAULT_PAGE[profile?.role] || 'dashboard')
  }

  const handleSignOut = async () => {
    await signOut()
    setAuthed(false)
    setPage('dashboard')
    setSidebarOpen(false)
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#888', fontSize: 14 }}>Загрузка...</div>
      </div>
    )
  }

  if (!authed) {
    return <LoginPage onLogin={handleLogin} />
  }

  const navItems = NAV[role] || NAV.worker
  const tabItems = navItems.slice(0, 4)

  return (
    <div className="app">
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="burger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span /><span /><span />
          </button>
          <span className="topbar-logo">BuildTrack</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#888' }}>
            {profile?.name}
          </span>
          <div
            className="avatar"
            title="Выйти"
            onClick={handleSignOut}
            style={{ cursor: 'pointer' }}
          >
            {profile?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        </div>
      </header>

      <div className="layout">
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>✕</button>

          <div style={{ padding: '40px 16px 12px', borderBottom: '1px solid #f0f0f0', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{profile?.name}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
              {{ foreman: 'Прораб', worker: 'Рабочий', client: 'Заказчик' }[role]}
            </div>
          </div>

          {navItems.map(item => (
            <div
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => { setPage(item.id); setSidebarOpen(false) }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}

          <div
            className="nav-item"
            style={{ marginTop: 'auto', color: '#A32D2D' }}
            onClick={handleSignOut}
          >
            <span className="nav-icon">→</span>
            <span>Выйти</span>
          </div>
        </nav>

        <main className="main">
          <PageContent role={role} page={page} />
          <div className="tab-spacer" />
        </main>
      </div>

      <nav className="tab-bar">
        {tabItems.map(item => (
          <button
            key={item.id}
            className={`tab-item ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            <span className="tab-icon">{item.icon}</span>
            <span className="tab-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
