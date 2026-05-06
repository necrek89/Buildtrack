import { useState, useEffect } from 'react'
import { useStore } from './store/useStore'
import LoginPage from './pages/LoginPage'
import AccountPage from './pages/AccountPage'
import {
  Projects, MyTasks, Tools, Team, Notifications, Procurement,
  ClientDashboard, ClientProgress, ClientPhotos
} from './pages/index'

const NAV = {
  foreman: [
    { id: 'projects',      icon: '◫', label: 'Projects'      },
    { id: 'procurement',   icon: '◐', label: 'Procurement'   },
    { id: 'tools',         icon: '⚙', label: 'Tools'         },
    { id: 'team',          icon: '◉', label: 'Team'          },
    { id: 'notifications', icon: '◆', label: 'Notifications' },
  ],
  worker: [
    { id: 'my-tasks',      icon: '☑', label: 'My Tasks'      },
    { id: 'tools',         icon: '⚙', label: 'Tools'         },
    { id: 'notifications', icon: '◆', label: 'Notifications' },
    { id: 'account',       icon: '👤', label: 'Account'       },
  ],
  client: [
    { id: 'dashboard',     icon: '▦', label: 'My Project'    },
    { id: 'progress',      icon: '◫', label: 'Progress'      },
    { id: 'photos',        icon: '◧', label: 'Photos'        },
    { id: 'notifications', icon: '◆', label: 'Notifications' },
    { id: 'account',       icon: '👤', label: 'Account'       },
  ],
}

const DEFAULT_PAGE = { foreman: 'projects', worker: 'my-tasks', client: 'dashboard' }
const ROLE_LABEL   = { foreman: 'Foreman', worker: 'Worker', client: 'Client' }

function PageContent({ role, page, onNavigate }) {
  if (page === 'account') return <AccountPage />
  if (role === 'foreman') {
    if (page === 'projects')      return <Projects />
    if (page === 'procurement')   return <Procurement />
    if (page === 'tools')         return <Tools canAdd={true} />
    if (page === 'team')          return <Team />
    if (page === 'notifications') return <Notifications onNavigate={onNavigate} />
  }
  if (role === 'worker') {
    if (page === 'my-tasks')      return <MyTasks />
    if (page === 'tools')         return <Tools canAdd={false} />
    if (page === 'notifications') return <Notifications onNavigate={onNavigate} />
  }
  if (role === 'client') {
    if (page === 'dashboard')     return <ClientDashboard />
    if (page === 'progress')      return <ClientProgress />
    if (page === 'photos')        return <ClientPhotos />
    if (page === 'notifications') return <Notifications onNavigate={onNavigate} />
  }
  return <div style={{ padding: 24, color: '#aaa' }}>Page not found</div>
}

export default function App() {
  const { role, profile, checkSession, signOut, setSelectedProject } = useStore()
  const [page, setPage]             = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authed, setAuthed]         = useState(false)
  const [checking, setChecking]     = useState(true)

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
      <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ color:'#888', fontSize:14 }}>Loading...</div>
      </div>
    )
  }

  if (!authed) return <LoginPage onLogin={handleLogin} />

  const navItems = NAV[role] || NAV.worker
  const tabItems = navItems.slice(0, 4)

  // Аватарка в топбаре
  const avatarStyle = {
    width: 32, height: 32, borderRadius: '50%',
    background: profile?.avatar_color || '#C96B3A',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 600, color: '#fff',
    flexShrink: 0, cursor: 'pointer', overflow: 'hidden'
  }

  const initials = (profile?.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)

  return (
    <div className="app">
      <header className="topbar">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button className="burger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span /><span /><span />
          </button>
          <span className="topbar-logo">Tutuu</span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:'#888' }}>{profile?.name}</span>
          <div style={avatarStyle} onClick={() => setPage('account')} title="Account">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : initials
            }
          </div>
        </div>
      </header>

      <div className="layout">
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>✕</button>

          {/* Профиль в сайдбаре */}
          <div className="sidebar-user"
            onClick={() => { setPage('account'); setSidebarOpen(false) }}
            style={{ cursor:'pointer', padding:'44px 16px 12px', display:'flex', alignItems:'center', gap:10 }}
          >
            <div style={{ ...avatarStyle, width:40, height:40, fontSize:14 }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : initials
              }
            </div>
            <div>
              <div className="sidebar-user-name">{profile?.name}</div>
              <div className="sidebar-user-role">{ROLE_LABEL[role]}</div>
            </div>
          </div>

          {navItems.map(item => (
            <div
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => { setPage(item.id); setSidebarOpen(false); if (item.id !== 'projects') setSelectedProject(null); }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}

          <div className="nav-signout">
            <div className="nav-item" style={{ color:'#A32D2D' }} onClick={handleSignOut}>
              <span className="nav-icon">→</span>
              <span>Sign Out</span>
            </div>
          </div>
        </nav>

        <main className="main">
          <PageContent role={role} page={page} onNavigate={setPage} />
          <div className="tab-spacer" />
        </main>
      </div>

      <nav className="tab-bar">
        {tabItems.map(item => (
          <button
            key={item.id}
            className={`tab-item ${page === item.id ? 'active' : ''}`}
            onClick={() => { setPage(item.id); if (item.id !== 'projects') setSelectedProject(null); }}
          >
            <span className="tab-icon">{item.icon}</span>
            <span className="tab-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}