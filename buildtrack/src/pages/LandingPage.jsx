import { useT } from '../i18n/useLanguage'
import { LANGUAGES } from '../i18n/useLanguage'
import translations from '../i18n/translations'

function nav(to) { window.__navigate?.(to) }

const FEATURES = (l) => [
  { n: '01', title: l.f1t, desc: l.f1d, tags: [l.f1tag1, l.f1tag2] },
  { n: '02', title: l.f2t, desc: l.f2d, tags: [l.f2tag1, l.f2tag2] },
  { n: '03', title: l.f3t, desc: l.f3d, tags: [l.f3tag1, l.f3tag2, l.f3tag3] },
  { n: '04', title: l.f4t, desc: l.f4d, tags: [l.f4tag1, l.f4tag2, l.f4tag3] },
  { n: '05', title: l.f5t, desc: l.f5d, tags: [l.f5tag1, l.f5tag2] },
  { n: '06', title: l.f6t, desc: l.f6d, tags: [l.f6tag1, l.f6tag2] },
]

// ── Phone mockup component ──────────────────────────────────────────────────
function PhoneMockup({ size = 'center', children }) {
  const isCenter = size === 'center'
  return (
    <div style={{
      width: isCenter ? 190 : 155,
      height: isCenter ? 380 : 310,
      borderRadius: 24,
      border: '0.5px solid #E8E4DC',
      boxShadow: '0 16px 40px rgba(0,0,0,0.08)',
      background: '#fff',
      overflow: 'hidden',
      flexShrink: 0,
      opacity: isCenter ? 1 : 0.78,
      alignSelf: isCenter ? 'center' : 'center',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Status bar */}
      <div style={{ height: 20, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', flexShrink: 0 }}>
        <span style={{ fontSize: 7, fontWeight: 600, color: '#1C1917' }}>9:41</span>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <svg width="8" height="6" viewBox="0 0 12 9" fill="#1C1917"><path d="M1 7L4 4L7 5L11 1" stroke="#1C1917" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
          <svg width="8" height="6" viewBox="0 0 12 9" fill="none" stroke="#1C1917" strokeWidth="1.5"><rect x="1" y="2" width="10" height="6" rx="1"/><path d="M11 4v2"/></svg>
        </div>
      </div>
      {/* App topbar */}
      <div style={{ height: 28, background: '#fff', borderBottom: '0.5px solid #F0EEE8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 500, color: '#1C1917' }}>tutuu<span style={{ color: '#EA580C' }}>.</span></span>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: '#fff', fontWeight: 600 }}>ТБ</div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', fontSize: 9 }}>
        {children}
      </div>
      {/* Bottom nav */}
      <div style={{ height: 36, borderTop: '0.5px solid #F0EEE8', display: 'flex', background: '#fff', flexShrink: 0 }}>
        {[
          <svg key="0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
          <svg key="1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
          <svg key="2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
          <svg key="3" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
        ].map((icon, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: i === 0 ? '#EA580C' : '#C4B5A5' }}>
            {icon}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tasks phone content ──────────────────────────────────────────────────────
function TasksPhone() {
  return (
    <div style={{ padding: '8px 8px 0' }}>
      {/* Project card */}
      <div style={{ border: '0.5px solid #F0EEE8', borderRadius: 10, padding: '8px 10px', marginBottom: 6 }}>
        <div style={{ fontSize: 9, fontWeight: 500, marginBottom: 4 }}>Квартира ЖК Восток</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
          <div style={{ flex: 1, background: '#FFF7ED', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#EA580C' }}>31%</div>
            <div style={{ fontSize: 7, color: '#A8A29E' }}>Прогресс</div>
          </div>
          <div style={{ flex: 1, background: '#F9F8F6', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600 }}>40d</div>
            <div style={{ fontSize: 7, color: '#A8A29E' }}>Осталось</div>
          </div>
          <div style={{ flex: 1, background: '#F9F8F6', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600 }}>4/13</div>
            <div style={{ fontSize: 7, color: '#A8A29E' }}>Задач</div>
          </div>
        </div>
        <div style={{ height: 3, background: '#F0EEE8', borderRadius: 2 }}>
          <div style={{ height: 3, width: '31%', background: '#EA580C', borderRadius: 2 }} />
        </div>
      </div>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid #F0EEE8', marginBottom: 6 }}>
        {['Задачи', 'Материалы', 'Расходы'].map((tab, i) => (
          <div key={tab} style={{ flex: 1, textAlign: 'center', padding: '4px 0', fontSize: 8, fontWeight: 500, color: i === 0 ? '#EA580C' : '#C4B5A5', borderBottom: i === 0 ? '1.5px solid #EA580C' : '1.5px solid transparent' }}>{tab}</div>
        ))}
      </div>
      {/* Tasks */}
      {[
        { name: 'Потолок', done: true, prog: 100 },
        { name: 'Двери', done: false, prog: 0 },
        { name: 'Полы', done: false, prog: 40 },
        { name: 'Электрика', done: true, prog: 100 },
      ].map((task, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 0', borderBottom: '0.5px solid #F9F8F6' }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, border: task.done ? 'none' : '0.5px solid #E8E4DC', background: task.done ? '#EA580C' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {task.done && <span style={{ color: '#fff', fontSize: 8, fontWeight: 700 }}>✓</span>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 500, textDecoration: task.done ? 'line-through' : 'none', color: task.done ? '#C4B5A5' : '#1C1917' }}>{task.name}</div>
            <div style={{ height: 2, background: '#F0EEE8', borderRadius: 1, marginTop: 2 }}>
              <div style={{ height: 2, width: `${task.prog}%`, background: task.done ? '#16A34A' : '#EA580C', borderRadius: 1 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Materials phone content ──────────────────────────────────────────────────
function MaterialsPhone() {
  const items = [
    { name: 'Цемент М400', qty: '20 мешков', worker: 'Иван', status: 'pending', color: '#EA580C' },
    { name: 'Плиточный клей', qty: '10 мешков', worker: 'Алексей', status: 'delivered', color: '#16A34A' },
    { name: 'Грунтовка', qty: '5 л', worker: 'Михаил', status: 'ordered', color: '#2563EB' },
    { name: 'Шпатлёвка', qty: '8 кг', worker: 'Иван', status: 'pending', color: '#EA580C' },
    { name: 'Краска белая', qty: '3 кг', worker: 'Алексей', status: 'delivered', color: '#16A34A' },
  ]
  const statusLabel = { pending: 'Ожидает', delivered: 'Доставлено', ordered: 'Заказано' }
  const statusBg = { pending: '#FFF7ED', delivered: '#F0FDF4', ordered: '#EFF6FF' }
  return (
    <div style={{ padding: '8px 8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 500 }}>Материалы</span>
        <div style={{ background: '#EA580C', color: '#fff', borderRadius: 5, padding: '2px 7px', fontSize: 8 }}>+ Заявка</div>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 0', borderBottom: '0.5px solid #F0EEE8' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
            <div style={{ fontSize: 7, color: '#A8A29E' }}>{item.qty} · {item.worker}</div>
          </div>
          <div style={{ background: statusBg[item.status], color: item.color, borderRadius: 4, padding: '2px 5px', fontSize: 7, fontWeight: 500, flexShrink: 0 }}>
            {statusLabel[item.status]}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Team/Salary phone content ────────────────────────────────────────────────
function TeamPhone() {
  const workers = [
    { name: 'Иван С.', initials: 'ИС', color: '#EA580C', shifts: 22, rate: 2500, salary: 55000 },
    { name: 'Алексей М.', initials: 'АМ', color: '#16A34A', shifts: 20, rate: 3000, salary: 60000 },
    { name: 'Михаил К.', initials: 'МК', color: '#2563EB', shifts: 18, rate: 2000, salary: 36000 },
    { name: 'Дмитрий Р.', initials: 'ДР', color: '#7C3AED', shifts: 21, rate: 2800, salary: 58800 },
  ]
  const total = workers.reduce((s, w) => s + w.salary, 0)
  return (
    <div style={{ padding: '8px 8px 0' }}>
      <div style={{ background: '#FFF7ED', borderRadius: 8, padding: '7px 10px', marginBottom: 7 }}>
        <div style={{ fontSize: 7, color: '#A8A29E', marginBottom: 2 }}>Май 2026 · {workers.length} рабочих</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#EA580C' }}>{total.toLocaleString()} ₽</div>
        <div style={{ fontSize: 7, color: '#A8A29E' }}>Итого к выплате</div>
      </div>
      {workers.map((w, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 0', borderBottom: '0.5px solid #F0EEE8' }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: w.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: '#fff', fontWeight: 700, flexShrink: 0 }}>{w.initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 500 }}>{w.name}</div>
            <div style={{ fontSize: 7, color: '#A8A29E' }}>{w.shifts} смен × {w.rate.toLocaleString()}</div>
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#EA580C' }}>{w.salary.toLocaleString()}</div>
        </div>
      ))}
    </div>
  )
}

// ── MAIN LANDING PAGE ────────────────────────────────────────────────────────
export default function LandingPage() {
  const { lang, setLang } = useT()
  const l = translations[lang]?.landing || translations.en.landing

  const btnPrimary = {
    background: '#EA580C', color: '#fff', border: 'none',
    borderRadius: 8, padding: '12px 24px', fontSize: 14,
    fontWeight: 500, cursor: 'pointer', display: 'inline-block',
    textDecoration: 'none',
  }
  const btnSecondary = {
    background: 'transparent', color: '#EA580C',
    border: '1px solid #EA580C', borderRadius: 8,
    padding: '11px 22px', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', display: 'inline-block',
  }

  return (
    <div className="landing-page" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: '#1C1917', background: '#fff', minHeight: '100dvh' }}>

      {/* ── NAV ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '0.5px solid #F0EEE8', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#1C1917' }}>
          tutuu<span style={{ color: '#EA580C' }}>.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            style={{ fontSize: 12, border: 'none', background: 'transparent', color: '#A8A29E', cursor: 'pointer', outline: 'none' }}
          >
            {LANGUAGES.map(lg => <option key={lg.code} value={lg.code}>{lg.label}</option>)}
          </select>
          <button onClick={() => nav('/app')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#A8A29E', fontWeight: 500 }}>
            {l.navSignin || 'Sign in'}
          </button>
          <button onClick={() => nav('/app')} style={{ ...btnPrimary, padding: '8px 16px', fontSize: 13 }}>
            {l.navStart || 'Get started →'}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ textAlign: 'center', padding: 'clamp(48px, 8vw, 96px) 24px clamp(40px, 6vw, 72px)', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#EA580C', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
          {l.eyebrow}
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 58px)', fontWeight: 500, lineHeight: 1.1, letterSpacing: -1.5, margin: '0 0 20px', color: '#1C1917' }}>
          {l.h1_1}<br />
          <span style={{ color: '#EA580C' }}>{l.h1_2}</span>
        </h1>
        <p style={{ fontSize: 16, color: '#A8A29E', maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.6 }}>
          {l.sub}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
          <button onClick={() => nav('/app')} style={btnPrimary}>{l.ctaHero}</button>
          <button style={btnSecondary} onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>{l.how}</button>
        </div>
        {/* Social proof */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center', fontSize: 12, color: '#A8A29E', marginBottom: 24 }}>
          {[l.proof1, l.proof2, l.proof3].filter(Boolean).map((p, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && <span style={{ color: '#E8E4DC' }}>·</span>}
              <span>✓ {p}</span>
            </span>
          ))}
        </div>
        {/* Platform badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[
            { icon: '🖥️', name: 'Web', status: l.platLive, live: true },
            { icon: '🍎', name: 'App Store', status: l.platSoon, live: false },
            { icon: '▶', name: 'Google Play', status: l.platSoon, live: false },
          ].map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '0.5px solid #E8E4DC', fontSize: 12, color: '#A8A29E' }}>
              <span>{p.icon}</span>
              <span style={{ fontWeight: 500, color: '#1C1917' }}>{p.name}</span>
              <span style={{ fontSize: 10, background: p.live ? '#F0FDF4' : '#FFF7ED', color: p.live ? '#16A34A' : '#EA580C', padding: '1px 6px', borderRadius: 4 }}>{p.status}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── PHONE MOCKUPS ── */}
      <section style={{ background: '#F9F8F6', borderTop: '0.5px solid #F0EEE8', borderBottom: '0.5px solid #F0EEE8', padding: 'clamp(32px, 5vw, 64px) 24px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, maxWidth: 700, margin: '0 auto' }}>
          <PhoneMockup size="side"><TasksPhone /></PhoneMockup>
          <PhoneMockup size="center"><MaterialsPhone /></PhoneMockup>
          <PhoneMockup size="side"><TeamPhone /></PhoneMockup>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ maxWidth: 880, margin: '0 auto', padding: 'clamp(48px, 6vw, 80px) 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: '#EA580C', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>{l.featLbl}</div>
        </div>
        {FEATURES(l).map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 20, padding: '24px 0', borderBottom: '0.5px solid #F0EEE8', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#EA580C', minWidth: 28, paddingTop: 3, flexShrink: 0 }}>{f.n}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6, color: '#1C1917' }}>{f.title}</div>
              <div style={{ fontSize: 13, color: '#A8A29E', lineHeight: 1.6, marginBottom: 10 }}>{f.desc}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {f.tags.filter(Boolean).map(tag => (
                  <span key={tag} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#FFF7ED', color: '#EA580C', border: '0.5px solid #FED7AA' }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── STEPS ── */}
      <section style={{ background: '#F9F8F6', borderTop: '0.5px solid #F0EEE8', padding: 'clamp(48px, 6vw, 80px) 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 500, marginBottom: 48, color: '#1C1917' }}>{l.stepsTitle}</h2>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            {[
              { n: '1', t: l.s1t, d: l.s1d },
              { n: '2', t: l.s2t, d: l.s2d },
              { n: '3', t: l.s3t, d: l.s3d },
            ].map((step, i) => (
              <div key={i} style={{ flex: '1 1 180px', minWidth: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '0 16px', position: 'relative' }}>
                {i < 2 && (
                  <div style={{ position: 'absolute', top: 18, left: 'calc(50% + 30px)', right: 0, height: 1, background: '#E8E4DC', display: 'block' }} />
                )}
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#EA580C', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 500, flexShrink: 0, position: 'relative', zIndex: 1 }}>{step.n}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: '#1C1917' }}>{step.t}</div>
                  <div style={{ fontSize: 12, color: '#A8A29E' }}>{step.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ background: '#292524', padding: 'clamp(48px, 6vw, 80px) 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 500, color: '#fff', marginBottom: 8, lineHeight: 1.2 }}>
            {l.ctaT1}<br /><span style={{ color: '#EA580C' }}>{l.ctaT2}</span>
          </h2>
          <p style={{ fontSize: 14, color: '#A8A29E', marginBottom: 32, marginTop: 16 }}>{l.ctaS}</p>
          <button onClick={() => nav('/app')} style={{ ...btnPrimary, padding: '14px 32px', fontSize: 15 }}>
            {l.ctaB}
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '0.5px solid #F0EEE8', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>tutuu<span style={{ color: '#EA580C' }}>.</span></div>
        <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#A8A29E' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>{l.ftFeat}</span>
          <span style={{ cursor: 'pointer' }}>{l.ftPrice}</span>
          <span style={{ cursor: 'pointer' }} onClick={() => nav('/app')}>{l.ftSignin}</span>
        </div>
        <div style={{ fontSize: 11, color: '#C4B5A5' }}>© 2026 Tutuu</div>
      </footer>
    </div>
  )
}
