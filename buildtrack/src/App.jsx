import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from './store/useStore'
import { useT } from './i18n/useLanguage'
import LanguagePicker from './components/LanguagePicker'
import LoginPage from './pages/LoginPage'
import AccountPage from './pages/AccountPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import OnboardingScreen from './components/OnboardingScreen'
import {
  Projects, MyTasks, Tools, Team, Notifications, Procurement,
  ClientDashboard, ClientProgress, ClientPhotos
} from './pages/index'
import WorkerMaterials from './features/materials/WorkerMaterials'
import { supabase } from './lib/supabase'

// ── Task Search Overlay ───────────────────────────────────────────────────────
function TaskSearch({ onClose, onNavigate }) {
  const { projects, searchTasks, setSelectedProject, setPendingOpenTask } = useStore()
  const { t } = useT()
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()
  const timerRef = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (!query.trim()) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      const data = await searchTasks(query)
      setResults(data)
      setLoading(false)
    }, 300)
    return () => clearTimeout(timerRef.current)
  }, [query])

  const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }

  const goToTask = (task) => {
    setSelectedProject(task.project_id)
    setPendingOpenTask(String(task.id))
    onNavigate('projects')
    onClose()
  }

  const STATUS_COLOR = { approved:'#3D7A52', pending:'#C96B3A', rejected:'#A32D2D', new:'#4A7FC1' }
  const STATUS_LABEL = { approved:'✅', pending:'🕐', rejected:'↩️', new:'📝' }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position:'fixed', inset:0, zIndex:9999,
        background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)',
        display:'flex', flexDirection:'column', alignItems:'center',
        paddingTop:'clamp(60px,10vh,120px)', padding:'clamp(60px,10vh,120px) 16px 0',
      }}
    >
      <div style={{
        background:'var(--surface,#fff)', borderRadius:16, width:'100%', maxWidth:520,
        boxShadow:'0 8px 40px rgba(0,0,0,0.18)', overflow:'hidden',
      }}>
        {/* Search input */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:'1.5px solid var(--border,#EAE3D8)' }}>
          <span style={{ fontSize:18, flexShrink:0 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks…"
            style={{
              flex:1, border:'none', outline:'none', fontSize:15,
              background:'transparent', color:'var(--text-1,#2E2420)',
            }}
          />
          {loading && <span style={{ fontSize:12, color:'#B8AFA6' }}>…</span>}
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#B8AFA6', padding:0 }}>✕</button>
        </div>

        {/* Results */}
        <div style={{ maxHeight:360, overflowY:'auto' }}>
          {!query.trim() && (
            <div style={{ padding:'24px 16px', textAlign:'center', color:'#B8AFA6', fontSize:13 }}>
              Start typing to search tasks
            </div>
          )}
          {query.trim() && !loading && results.length === 0 && (
            <div style={{ padding:'24px 16px', textAlign:'center', color:'#B8AFA6', fontSize:13 }}>
              No tasks found
            </div>
          )}
          {results.map(task => {
            const proj = projects.find(p => p.id === task.project_id)
            return (
              <div key={task.id} onClick={() => goToTask(task)}
                style={{
                  padding:'10px 16px', cursor:'pointer', borderBottom:'1px solid var(--border,#EAE3D8)',
                  display:'flex', alignItems:'center', gap:10,
                  transition:'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg-accent,#F2EDE4)'}
                onMouseLeave={e => e.currentTarget.style.background=''}
              >
                <span style={{ fontSize:16, flexShrink:0 }}>{STATUS_LABEL[task.status] || '📋'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1,#2E2420)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {task.text}
                  </div>
                  <div style={{ display:'flex', gap:6, marginTop:3, flexWrap:'wrap' }}>
                    {proj && (
                      <span style={{ fontSize:11, color:'#C96B3A', fontWeight:600 }}>📍 {proj.name}</span>
                    )}
                    {task.stage && (
                      <span style={{ fontSize:11, color:'#7A6E66', background:'var(--bg-accent,#F2EDE4)', borderRadius:5, padding:'1px 6px' }}>
                        {task.stage}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize:11, color: STATUS_COLOR[task.status] || '#7A6E66', fontWeight:600, flexShrink:0 }}>
                  {task.status}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── SVG Tab Icons ─────────────────────────────────────────────────────────────
function TabIcon({ name, size = 22 }) {
  const s = { width: size, height: size, display: 'block' }
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'projects':
      return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
    case 'materials':
      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
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
    { id: 'materials',     icon: 'materials',     labelKey: 'procurement'   },
    { id: 'tools',         icon: 'tools',         labelKey: 'tools'         },
    { id: 'team',          icon: 'team',          labelKey: 'team'          },
    { id: 'notifications', icon: 'notifications', labelKey: 'alerts'        },
  ],
  manager: [
    { id: 'projects',      icon: 'projects',      labelKey: 'projects'      },
    { id: 'materials',     icon: 'materials',     labelKey: 'procurement'   },
    { id: 'tools',         icon: 'tools',         labelKey: 'tools'         },
    { id: 'team',          icon: 'team',          labelKey: 'team'          },
    { id: 'notifications', icon: 'notifications', labelKey: 'alerts'        },
  ],
  worker: [
    { id: 'my-tasks',          icon: 'tasks',         labelKey: 'myTasks'   },
    { id: 'worker-materials',  icon: 'materials',     labelKey: 'materials' },
    { id: 'tools',             icon: 'tools',         labelKey: 'tools'     },
    { id: 'notifications',     icon: 'notifications', labelKey: 'alerts'    },
    { id: 'account',           icon: 'account',       labelKey: 'account'   },
  ],
  client: [
    { id: 'dashboard',     icon: 'projects',      labelKey: 'myProject'     },
    { id: 'progress',      icon: 'tasks',         labelKey: 'progress'      },
    { id: 'notifications', icon: 'notifications', labelKey: 'alerts'        },
    { id: 'account',       icon: 'account',       labelKey: 'account'       },
  ],
}

const DEFAULT_PAGE = { foreman: 'projects', manager: 'projects', worker: 'my-tasks', client: 'dashboard' }

function PageContent({ role, page, onNavigate }) {
  if (page === 'account') return <AccountPage />
  if (role === 'foreman' || role === 'manager') {
    const canEdit   = role === 'foreman'
    const canDelete = role === 'foreman'
    if (page === 'projects')      return <Projects canDelete={canDelete} canEdit={canEdit} />
    if (page === 'materials')     return <Procurement canDelete={canDelete} canEdit={canEdit} />
    if (page === 'tools')         return <Tools canAdd={canEdit} canDelete={canDelete} />
    if (page === 'team')          return <Team canManage={canDelete} />
    if (page === 'notifications') return <Notifications onNavigate={onNavigate} />
  }
  if (role === 'worker') {
    if (page === 'my-tasks')          return <MyTasks />
    if (page === 'worker-materials')  return <WorkerMaterials />
    if (page === 'tools')             return <Tools canAdd={false} />
    if (page === 'notifications')     return <Notifications onNavigate={onNavigate} />
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
  const { role, profile, checkSession, signOut, setSelectedProject, theme, toggleTheme, activityLog, fetchActivityLog } = useStore()
  const { t } = useT()
  const [page, setPage]               = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen]   = useState(false)
  const [authed, setAuthed]           = useState(false)
  const [checking, setChecking]       = useState(true)
  const [recovering, setRecovering]   = useState(false)
  const [onboarding, setOnboarding]   = useState(() => !localStorage.getItem('tutuu_onboarded'))
  const [lastSeenNotif, setLastSeenNotif] = useState(() => localStorage.getItem('tutuu_notif_seen_at') || '0')

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

  useEffect(() => {
    if (authed) fetchActivityLog()
  }, [authed])

  useEffect(() => {
    const handler = (e) => {
      if (!authed) return
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (role === 'foreman' || role === 'manager' || role === 'worker') setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [authed, role])

  const handleLogin = () => {
    const { profile } = useStore.getState()
    setAuthed(true)
    window.history.pushState({}, '', '/app')
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

  // Онбординг — первый запуск
  if (onboarding) return (
    <OnboardingScreen onDone={() => setOnboarding(false)} />
  )

  // Password recovery — shown when user opens reset link from email
  if (recovering) return (
    <ResetPasswordPage onDone={() => { setRecovering(false); setAuthed(false) }} />
  )

  if (!authed) return <LoginPage onLogin={handleLogin} />

  const unreadCount = activityLog.filter(e =>
    e.created_at && new Date(e.created_at).getTime() > parseInt(lastSeenNotif || '0')
  ).length

  const handleTabNav = (itemId) => {
    if (itemId === 'notifications') {
      const now = Date.now().toString()
      localStorage.setItem('tutuu_notif_seen_at', now)
      setLastSeenNotif(now)
    }
    setPage(itemId)
    if (itemId !== 'projects') setSelectedProject(null)
  }

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
          <span className="topbar-logo" onClick={() => window.location.reload()} style={{ cursor: 'pointer' }}>tutuu<span style={{ color: 'var(--accent)' }}>.</span></span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 6px', borderRadius: 8, lineHeight: 1,
              color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center',
            }}
          >
            {theme === 'dark'
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>
          {/* Search pill — foreman/manager/worker */}
          {(role === 'foreman' || role === 'manager' || role === 'worker') && (
            <button
              onClick={() => setSearchOpen(true)}
              title="Search tasks (⌘K)"
              style={{
                display:'flex', alignItems:'center', gap:5,
                padding:'5px 10px', borderRadius:20,
                background:'var(--bg-subtle)', border:'0.5px solid var(--border-medium)',
                cursor:'pointer', color:'var(--text-2)',
                fontFamily:'inherit',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <kbd style={{
                fontSize:10, background:'var(--bg)', padding:'1px 5px',
                borderRadius:4, border:'0.5px solid var(--border)',
                color:'var(--text-muted)', fontFamily:'inherit', lineHeight:'1.6',
              }}>⌘K</kbd>
            </button>
          )}
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
              onClick={() => { handleTabNav(item.id); setSidebarOpen(false); }}
            >
              <span className="nav-icon"><NavIcon name={item.icon} /></span>
              <span>{item.label}</span>
            </div>
          ))}

          {/* Language picker in sidebar */}
          <div style={{ padding: '8px 16px', borderTop: '1px solid #EAE3D8', marginTop: 4 }}>
            <LanguagePicker />
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
            onClick={() => handleTabNav(item.id)}
            style={{ position:'relative' }}
          >
            {page === item.id && (
              <span style={{
                position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
                width:28, height:2.5, background:'var(--accent)',
                borderRadius:'0 0 3px 3px', display:'block',
              }} />
            )}
            <span style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <TabIcon name={item.icon} />
              {item.id === 'notifications' && unreadCount > 0 && (
                <span style={{
                  position:'absolute', top:-5, right:-8,
                  minWidth:15, height:15, borderRadius:8,
                  background:'var(--danger)', border:'1.5px solid var(--bg)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:9, fontWeight:700, color:'#fff', padding:'0 3px', lineHeight:1,
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span className="tab-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {searchOpen && (
        <TaskSearch onClose={() => setSearchOpen(false)} onNavigate={(p) => { setPage(p); setSidebarOpen(false) }} />
      )}
    </div>
  )
}
