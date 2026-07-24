import { useState, useEffect, useRef } from 'react'
import { useT, LANGUAGES } from '../i18n/useLanguage'
import translations from '../i18n/translations'
import './landing.css'

function nav(to) { window.__navigate?.(to) }

// ── Inline stroke icons (marquee + bento) ────────────────────────────────────
const ICONS = {
  clipboard: <><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 14 2 2 4-4"/></>,
  tool: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  calc: <><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h4"/></>,
  box: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
  camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
  invoice: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></>,
  clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  user: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></>,
}

function Ic({ name, size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  )
}

// ── Hero H1 with word-by-word blur reveal ────────────────────────────────────
function AnimatedH1({ line1, line2 }) {
  let i = 0
  const word = (text, orange) => (
    <span key={`${text}-${i}`} className="w" style={{ animationDelay: `${0.1 + (i++) * 0.1}s`, color: orange ? 'var(--ld-orange)' : undefined }}>
      {text}&nbsp;
    </span>
  )
  return (
    <h1 className="ld-h1">
      {line1.split(' ').map(w => word(w, false))}
      <br />
      {line2.split(' ').map(w => word(w, true))}
    </h1>
  )
}

// ── Animated number ticker ───────────────────────────────────────────────────
function Ticker({ items }) {
  const refs = useRef([])
  useEffect(() => {
    const rafs = []
    items.forEach((item, i) => {
      const el = refs.current[i]
      if (!el) return
      const start = performance.now() + 800 + i * 200
      const tick = (now) => {
        const p = Math.min(Math.max((now - start) / 2000, 0), 1)
        const ease = 1 - Math.pow(1 - p, 3)
        el.textContent = Math.round(item.target * ease).toLocaleString()
        if (p < 1) rafs[i] = requestAnimationFrame(tick)
      }
      rafs[i] = requestAnimationFrame(tick)
    })
    return () => rafs.forEach(r => cancelAnimationFrame(r))
  }, [])
  return (
    <div className="ld-ticker">
      {items.map((item, i) => (
        <div key={i}>
          <div className="ld-tick-num" ref={el => refs.current[i] = el}>0</div>
          <div className="ld-tick-label">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Phone mockups (generic frame, screens at real app scale) ────────────────
function PhoneFrame({ secondary, children }) {
  return (
    <div className={`ld-phone ${secondary ? 'secondary' : ''}`}>
      <div className="ld-cam" />
      <div className="ld-clip">
        <div className="scr">{children}</div>
      </div>
    </div>
  )
}

function ScreenHeader() {
  return (
    <div className="s-hdr">
      <div className="s-logo">tutuu<em>.</em></div>
      <div className="s-av">ТБ</div>
    </div>
  )
}

function MaterialsScreen({ l }) {
  return (
    <>
      <ScreenHeader />
      <div className="s-body">
        <div className="s-card">
          <div className="s-pname">Project A</div>
          <div className="s-pbar"><div className="s-pbar-f" /></div>
          <div className="s-stats">
            <div className="s-stat"><div className="s-sv">41d</div><div className="s-sl">{l.scrDaysLeft}</div></div>
            <div className="s-stat"><div className="s-sv">4/13</div><div className="s-sl">{l.scrTasksLabel}</div></div>
          </div>
        </div>
        <div className="s-card">
          <div className="s-sec-label">{l.scrMatTitle}</div>
          <div className="s-row"><span>Cement M400</span><span style={{ color: '#F59E0B' }}>{l.scrStatusPending}</span></div>
          <div className="s-row"><span>Tile adhesive</span><span style={{ color: '#16A34A' }}>{l.scrStatusDelivered}</span></div>
          <div className="s-row"><span>Primer</span><span style={{ color: '#2563EB' }}>{l.scrStatusOrdered}</span></div>
        </div>
      </div>
    </>
  )
}

function TasksScreen({ l, navL }) {
  const tasks = [
    { name: l.scrTask1, done: true,  count: '1/1' },
    { name: l.scrTask2, done: false, count: '0/3' },
    { name: l.scrTask3, done: false, count: '1/5' },
    { name: l.scrTask4, done: true,  count: '2/2' },
  ]
  const navItems = [
    { icon: 'grid', label: navL.projects, on: true },
    { icon: 'box',  label: navL.materials },
    { icon: 'tool', label: navL.tools },
    { icon: 'user', label: navL.team },
  ]
  return (
    <>
      <ScreenHeader />
      <div className="s-body" style={{ flex: '0 0 auto' }}>
        <div className="s-card">
          <div className="s-pname">Project A</div>
          <div className="s-pbar"><div className="s-pbar-f" /></div>
          <div className="s-stats">
            <div className="s-stat"><div className="s-sv">31%</div><div className="s-sl">{l.scrProgress}</div></div>
            <div className="s-stat"><div className="s-sv">41d</div><div className="s-sl">{l.scrDaysLeft}</div></div>
            <div className="s-stat"><div className="s-sv">4/13</div><div className="s-sl">{l.scrTasksLabel}</div></div>
          </div>
        </div>
      </div>
      <div className="s-tabs">
        <div className="s-tab on">{l.scrTabTasks}</div>
        <div className="s-tab">{l.scrTabMats}</div>
        <div className="s-tab">{l.scrTabExp}</div>
      </div>
      <div className="s-tasks">
        {tasks.map((task, i) => (
          <div key={i} className="s-task">
            {task.done ? <div className="s-chk-done">✓</div> : <div className="s-chk-todo" />}
            <div className="s-tn">{task.name}</div>
            <div className="s-tc">{task.count}</div>
          </div>
        ))}
      </div>
      <div className="s-nav">
        {navItems.map((item, i) => (
          <div key={i} className="s-ni">
            <Ic name={item.icon} size={20} color={item.on ? 'var(--ld-orange)' : 'var(--ld-muted)'} />
            <div className={`s-nl ${item.on ? 'on' : ''}`}>{item.label}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function TeamScreen({ l }) {
  const workers = [
    { initials: 'АФ', color: '#EA580C', name: 'Aleksei F.', shifts: 12, sum: '€540' },
    { initials: 'ИС', color: '#6366F1', name: 'Ivan S.',    shifts: 10, sum: '€450' },
    { initials: 'МК', color: '#0891B2', name: 'Maxim K.',   shifts: 8,  sum: '€400' },
  ]
  return (
    <>
      <ScreenHeader />
      <div className="s-body">
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ld-ink)' }}>{l.scrTeamTitle} · {l.scrTeamTotal}</div>
        <div>
          {workers.map((w, i) => (
            <div key={i} className="s-member">
              <div className="s-mav" style={{ background: w.color }}>{w.initials}</div>
              <div style={{ flex: 1 }}>
                <div className="s-mname">{w.name}</div>
                <div className="s-mshifts">{w.shifts} {l.shiftsWord}</div>
              </div>
              <div className="s-msum">{w.sum}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Beta pricing popup ───────────────────────────────────────────────────────
function BetaModal({ l, onClose }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(28,25,23,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, padding: '32px 28px',
        maxWidth: 420, width: '100%', textAlign: 'center',
        border: '0.5px solid #F0EEE8',
        boxShadow: '0 24px 60px rgba(0,0,0,0.12)',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#FFF7ED', border: '0.5px solid #FED7AA',
          borderRadius: 20, padding: '4px 14px', marginBottom: 20,
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#EA580C' }}>{l.betaTitle}</span>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 500, color: '#1C1917', margin: '0 0 12px', lineHeight: 1.2 }}>
          {l.ftPrice}
        </h2>
        <p style={{ fontSize: 14, color: '#78716C', lineHeight: 1.7, margin: '0 0 28px' }}>
          {l.betaMsg}
        </p>
        <div style={{
          background: '#F0FDF4', border: '0.5px solid #BBF7D0',
          borderRadius: 10, padding: '16px', marginBottom: 24,
        }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: '#16A34A', marginBottom: 4 }}>$0</div>
          <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 500 }}>Free forever during beta</div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#EA580C', color: '#fff', border: 'none',
            borderRadius: 8, padding: '12px 32px', fontSize: 14,
            fontWeight: 500, cursor: 'pointer', width: '100%',
          }}
        >
          {l.betaClose}
        </button>
      </div>
    </div>
  )
}

// ── MAIN LANDING PAGE ────────────────────────────────────────────────────────
export default function LandingPage() {
  const { lang, setLang } = useT()
  const l    = translations[lang]?.landing || translations.en.landing
  const navL = translations[lang]?.nav     || translations.en.nav
  const [showPricing, setShowPricing] = useState(false)

  const onCardMove = (e) => {
    const card = e.currentTarget
    const r = card.getBoundingClientRect()
    card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%')
    card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%')
  }

  const marquee = [
    { icon: 'clipboard', label: l.mq1 },
    { icon: 'tool',      label: l.mq2 },
    { icon: 'users',     label: l.mq3 },
    { icon: 'calc',      label: l.mq4 },
    { icon: 'box',       label: l.mq5 },
    { icon: 'camera',    label: l.mq6 },
    { icon: 'invoice',   label: l.mq7 },
    { icon: 'clock',     label: l.mq8 },
  ]

  const avatars = [
    { txt: 'АФ', color: '#3B82F6' },
    { txt: 'ИС', color: '#10B981' },
    { txt: 'МК', color: '#8B5CF6' },
    { txt: 'ВП', color: '#F59E0B' },
    { txt: '+',  color: '#EF4444' },
  ]

  return (
    <div className="ldg">

      {/* ── NAV ── */}
      <nav className="ld-nav">
        <div className="ld-logo">tutuu<em>.</em></div>
        <div className="ld-nav-r">
          <select className="ld-lang" value={lang} onChange={e => setLang(e.target.value)}>
            {LANGUAGES.map(lg => <option key={lg.code} value={lg.code}>{lg.label}</option>)}
          </select>
          <button className="ld-nav-link" onClick={() => nav('/app')}>{l.navSignin}</button>
          <button className="ld-btn-nav" onClick={() => nav('/app')}>{l.navStart}</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="ld-hero">
        <div className="ld-dots" />
        <div className="ld-hero-content">
          <div className="ld-eyebrow">
            <span className="ld-eyebrow-dot" />
            {l.eyebrow}
          </div>

          <AnimatedH1 line1={l.h1_1} line2={l.h1_2} />

          <p className="ld-sub">{l.sub}</p>

          <div className="ld-btns">
            <button className="ld-btn-p" onClick={() => nav('/app')}>{l.ctaHero}</button>
            <button className="ld-btn-s" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>{l.how}</button>
          </div>

          {/* Social proof */}
          <div className="ld-avatars">
            {avatars.map((a, i) => (
              <div key={i} className="ld-av" style={{ background: a.color }}>{a.txt}</div>
            ))}
            <span className="ld-av-label">{l.join1} <strong>{l.join2}</strong> {l.join3}</span>
          </div>

          {/* Number ticker */}
          <Ticker items={[
            { target: 12400, label: l.tick1 },
            { target: 890,   label: l.tick2 },
            { target: 3200,  label: l.tick3 },
          ]} />

          {/* Platforms */}
          <div className="ld-platforms">
            <div className="ld-plat">
              <span className="ic">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </span>
              Web <span className="ld-plat-live">{l.platLive}</span>
            </div>
            <div className="ld-plat">
              <span className="ic">
                <svg width="14" height="14" viewBox="0 0 814 1000" fill="currentColor">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.9-49 192.5-49 30.9 0 110.8 2.6 168.1 83zM554.1 158.3c21.4-25.3 36.5-60.6 36.5-95.9 0-4.9-.3-9.9-1.1-14.1-34.6 1.3-75.7 23.1-100.3 51.5-19.8 22.2-38.2 57.2-38.2 93.1 0 5.5.9 11 1.3 12.8 2.2.4 5.8.6 9.3.6 31.3 0 70.6-21 92.5-47.9z"/>
                </svg>
              </span>
              App Store <span className="ld-plat-soon">{l.platSoon}</span>
            </div>
            <div className="ld-plat">
              <span className="ic">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.18 23.76c.37.21.8.25 1.21.1l12.44-7.19-2.8-2.8-10.85 9.89zM.49 1.4A1.55 1.55 0 0 0 .25 2.2v19.6c0 .28.08.54.24.77l.1.1 10.98-10.97v-.26L.59 1.3l-.1.1zM20.54 10.27l-2.94-1.7-3.08 3.08 3.08 3.08 2.97-1.72c.85-.49.85-1.28-.03-1.74zM4.39.14L16.83 7.33l-2.8 2.8L3.18.24C3.57.07 4.02.11 4.39.34z"/>
                </svg>
              </span>
              Google Play <span className="ld-plat-soon">{l.platSoon}</span>
            </div>
          </div>

          {/* Phone mockups */}
          <div className="ld-phones">
            <PhoneFrame secondary><MaterialsScreen l={l} /></PhoneFrame>
            <PhoneFrame><TasksScreen l={l} navL={navL} /></PhoneFrame>
            <PhoneFrame secondary><TeamScreen l={l} /></PhoneFrame>
          </div>
        </div>
      </div>

      {/* ── MARQUEE ── */}
      <div className="ld-marquee">
        <div className="ld-marquee-track">
          {[...marquee, ...marquee].map((item, i) => (
            <div key={i} className="ld-mq-item">
              <span className="ic"><Ic name={item.icon} /></span>
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── BENTO GRID ── */}
      <div className="ld-bento-section" id="features">
        <div className="ld-sec-eyebrow">{l.featLbl}</div>
        <h2 className="ld-sec-title">{l.bentoTitle}</h2>
        <div className="ld-bento">

          <div className="ld-card featured" onMouseMove={onCardMove}>
            <div className="ld-card-icon"><Ic name="clipboard" />{l.bl1}</div>
            <div className="ld-card-title">{l.f1t}</div>
            <div className="ld-card-desc">{l.f1d}</div>
            <div className="ld-mini">
              <div className="ld-mini-row">
                <div className="ld-mini-dot" style={{ background: 'var(--ld-orange)' }} />
                <span className="ld-mini-name">{l.scrTask1}</span>
                <span className="ld-mini-status" style={{ background: '#DCFCE7', color: '#16A34A' }}>{l.stDone}</span>
              </div>
              <div className="ld-mini-row">
                <div className="ld-mini-dot" style={{ background: '#F59E0B' }} />
                <span className="ld-mini-name">{l.scrTask3}</span>
                <span className="ld-mini-status" style={{ background: '#FEF9C3', color: '#CA8A04' }}>{l.stInProg}</span>
              </div>
              <div className="ld-mini-row">
                <div className="ld-mini-dot" style={{ background: 'var(--ld-border)' }} />
                <span className="ld-mini-name">{l.scrTask2}</span>
                <span className="ld-mini-status" style={{ background: 'var(--ld-sand)', color: 'var(--ld-muted)' }}>{l.stTodo}</span>
              </div>
            </div>
          </div>

          <div className="ld-card tall" onMouseMove={onCardMove}>
            <div className="ld-card-icon"><Ic name="calc" />{l.bl2}</div>
            <div className="ld-card-title">{l.f3t}</div>
            <div className="ld-card-desc">{l.f3d}</div>
            <div className="ld-mini" style={{ marginTop: 16 }}>
              {[
                { initials: 'АФ', color: '#EA580C', name: 'Aleksei', shifts: 12, sum: '€540' },
                { initials: 'ИС', color: '#6366F1', name: 'Ivan',    shifts: 10, sum: '€450' },
                { initials: 'МК', color: '#0891B2', name: 'Maxim',   shifts: 8,  sum: '€400' },
              ].map((w, i) => (
                <div key={i} className="ld-mini-row">
                  <div className="ld-mini-mav" style={{ background: w.color }}>{w.initials}</div>
                  <span className="ld-mini-name" style={{ fontSize: 11 }}>{w.name} · {w.shifts} {l.shiftsWord}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ld-orange)' }}>{w.sum}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ld-card" onMouseMove={onCardMove}>
            <div className="ld-card-icon"><Ic name="box" />{l.bl3}</div>
            <div className="ld-card-title">{l.f2t}</div>
            <div className="ld-card-desc">{l.f2d}</div>
          </div>

          <div className="ld-card" onMouseMove={onCardMove}>
            <div className="ld-card-icon"><Ic name="tool" />{l.bl4}</div>
            <div className="ld-card-title">{l.f4t}</div>
            <div className="ld-card-desc">{l.f4d}</div>
          </div>

          <div className="ld-card" onMouseMove={onCardMove}>
            <div className="ld-card-icon"><Ic name="invoice" />{l.bl5}</div>
            <div className="ld-card-title">{l.f6t}</div>
            <div className="ld-card-desc">{l.f6d}</div>
          </div>

          <div className="ld-card" onMouseMove={onCardMove}>
            <div className="ld-card-icon"><Ic name="camera" />{l.bl6}</div>
            <div className="ld-card-title">{l.f5t}</div>
            <div className="ld-card-desc">{l.f5d}</div>
          </div>

        </div>
      </div>

      {/* ── STEPS ── */}
      <div className="ld-steps">
        <h2 className="ld-sec-title">{l.stepsTitle}</h2>
        <div className="ld-steps-row">
          {[
            { n: '1', t: l.s1t, d: l.s1d, line: true },
            { n: '2', t: l.s2t, d: l.s2d, line: true },
            { n: '3', t: l.s3t, d: l.s3d, line: false },
          ].map((step, i) => (
            <div key={i} className="ld-step">
              <div className="ld-step-num">{step.n}</div>
              <div className="ld-step-t">{step.t}</div>
              <div className="ld-step-d">{step.d}</div>
              {step.line && <div className="ld-step-line" />}
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="ld-cta">
        <h2 className="ld-cta-title">{l.ctaT1}<br /><em>{l.ctaT2}</em></h2>
        <p className="ld-cta-sub">{l.ctaS}</p>
        <button className="ld-cta-btn" onClick={() => nav('/app')}>{l.ctaB}</button>
      </div>

      {/* ── FOOTER ── */}
      <footer className="ld-footer">
        <div className="ld-logo" style={{ fontSize: 15 }}>tutuu<em>.</em></div>
        <div className="ld-footer-links">
          <span onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>{l.ftFeat}</span>
          <span onClick={() => setShowPricing(true)}>{l.ftPrice}</span>
          <span onClick={() => nav('/app')}>{l.ftSignin}</span>
        </div>
        <div>© 2026 Tutuu</div>
      </footer>

      {showPricing && <BetaModal l={l} onClose={() => setShowPricing(false)} />}
    </div>
  )
}
