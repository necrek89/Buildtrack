import { useState, useEffect } from 'react'
import { useStore } from './store/useStore'
import { useT } from './i18n/useLanguage'
import LanguagePicker from './components/LanguagePicker'
import LoginPage from './pages/LoginPage'
import AccountPage from './pages/AccountPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import {
  Projects, MyTasks, Tools, Team, Notifications, Procurement,
  ClientDashboard, ClientProgress, ClientPhotos
} from './pages/index'
import { supabase } from './lib/supabase'

// ── SVG Tab Icons ─────────────────────────────────────────────────────────────
function TabIcon({ name, size = 22 }) {
  const s = { width: size, height: size, display: 'block' }
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'projects':
      return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
    case 'materials':
      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
    case 'tools':
      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
    case 'team':
      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
    case 'notifications':
      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
    case 'tasks':
      return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
    case 'account':
      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    default:
      return null
  }
}

// ── Nav icons for sidebar (slightly smaller) ──────────────────────────────────
function NavIcon({ name }) { return <TabIcon name={name} size={18} /> }

// labelKey maps to translations.nav.*
const NAV = {
  foreman: [
    { id: 'projects',      icon: 'projects',      labelKey: 'projects'      },
    { id: 'materials',     icon: 'materials',     labelKey: 'materials'     },
    { id: 'tools',         icon: 'tools',         labelKey: 'tools'         },
    { id: 'team',          icon: 'team',          labelKey: 'team'          },
    { id: 'notifications', icon: 'notifications', labelKey: 'alerts'        },
  ],
  worker: [
    { id: 'my-tasks',      icon: 'tasks',         labelKey: 'myTasks'       },
    { id: 'tools',         icon: 'tools',         labelKey: 'tools'         },
    { id: 'notifications', icon: 'notifications', labelKey: 'alerts'        },
    { id: 'account',       icon: 'account',       labelKey: 'account'       },
  ],
  client: [
    { id: 'dashboard',     icon: 'projects',      labelKey: 'myProject'     },
    { id: 'progress',      icon: 'tasks',         labelKey: 'progress'      },
    { id: 'photos',        icon: 'materials',     labelKey: 'photos'        },
    { id: 'notifications', icon: 'notifications', labelKey: 'alerts'        },
    { id: 'account',       icon: 'account',       labelKey: 'account'       },
  ],
}

const DEFAULT_PAGE = { foreman: 'projects', worker: 'my-tasks', client: 'dashboard' }

function PageContent({ role, page, onNavigate }) {
  if (page === 'account') return <AccountPage />
  if (role === 'foreman') {
    if (page === 'projects')      return <Projects />
    if (page === 'materials')     return <Procurement />
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
  const { role, profile, checkSession, signOut, setSelectedProject, theme, toggleTheme } = useStore()
  const { t } = useT()
  const [page, setPage]               = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authed, setAuthed]           = useState(false)
  const [checking, setChecking]       = useState(true)
  const [recovering, setRecovering]   = useState(false)   // password recovery mode

  useEffect(() => {
    // Detect PASSWORD_RECOVERY event — fires when user opens reset link from email
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecovering(true)
        setChecking(false)
      }
    })
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
    return () => subscription.unsubscribe()
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

  // Password recovery — shown when user opens reset link from email
  if (recovering) return (
    <ResetPasswordPage onDone={() => { setRecovering(false); setAuthed(false) }} />
  )

  if (!authed) return <LoginPage onLogin={handleLogin} />

  const navItems = (NAV[role] || NAV.worker).map(item => ({
    ...item,
    label: t(`nav.${item.labelKey}`),
  }))
  const tabItems = navItems.slice(0, 4)

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
              <div className="sidebar-user-role">{t(`roles.${role}`)}</div>
            </div>
          </div>

          {navItems.map(item => (
            <div
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => { setPage(item.id); setSidebarOpen(false); if (item.id !== 'projects') setSelectedProject(null); }}
            >
              <span className="nav-icon"><NavIcon name={item.icon} /></span>
              <span>{item.label}</span>
            </div>
          ))}

          {/* Language picker in sidebar */}
          <div style={{ padding: '8px 16px', borderTop: '1px solid #EAE3D8', marginTop: 4 }}>
            <LanguagePicker />
          </div>

          {/* Theme toggle */}
          <div style={{ padding: '8px 16px' }}>
            <div className="nav-item" onClick={toggleTheme} style={{ borderRadius: 8 }}>
              <span className="nav-icon">
                {theme === 'dark'
                  ? <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  : <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                }
              </span>
              <span>{theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}</span>
            </div>
          </div>

          <div className="nav-signout">
            <div className="nav-item" style={{ color:'#A32D2D' }} onClick={handleSignOut}>
              <span className="nav-icon">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </span>
              <span>{t('nav.signOut')}</span>
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
            <TabIcon name={item.icon} />
            <span className="tab-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
