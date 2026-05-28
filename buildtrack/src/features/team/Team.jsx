import { useState, useEffect } from 'react'
import { Badge, Button, StatCard, EmptyState } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'
import { useStore, currencySymbol } from '../../store/useStore'
import { supabase } from '../../lib/supabase'
import AttendanceModal from '../../components/AttendanceModal'
import { generateMonthlyReport, generateAnnualReport } from './SalaryReportGenerator'
import { DownloadSimple, FileCsv, CalendarBlank, ChartBar } from '@phosphor-icons/react'
import TimesheetModal from './TimesheetModal'

// ─── WORKER STATUS CONFIG ────────────────────────────────────────────────────
const WORKER_STATUS = {
  on_site:   { label: 'On Site',     color: '#3D7A52', bg: '#E8F2EB', border: '#A8D4B4', dot: '#3D7A52' },
  day_off:   { label: 'Day Off',     color: '#7A6E66', bg: '#F2EDE4', border: '#D9D0C7', dot: '#B8AFA6' },
  sick:      { label: 'Sick Leave',  color: '#A32D2D', bg: '#FCEBEB', border: '#F0AAAA', dot: '#A32D2D' },
  vacation:  { label: 'Vacation',    color: '#2E6FB5', bg: '#E4EEFA', border: '#A3C2E8', dot: '#2E6FB5' },
  other:     { label: 'Not Available', color: '#9A6E10', bg: '#FBF3DC', border: '#F0D897', dot: '#D4A843' },
}
const STATUS_CYCLE = ['on_site', 'day_off', 'sick', 'vacation', 'other']

// ─── TEAM ────────────────────────────────────────────────────────────────────
export default function Team() {
  const { t } = useT()
  const { team, projects, tasks, tools, fetchProjects, fetchAllWorkers, updateWorkerStatus, updateWorkerContact, profile, joinRequests, fetchJoinRequests, approveJoinRequest, rejectJoinRequest, addClientToProject, addManagerToTeam, workLogs, fetchWorkLogs, addWorkLog, deleteWorkLog, updateMemberRate, attendance, payments, fetchPayments, addPayment, deletePayment } = useStore()
  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [msg, setMsg]               = useState('')
  const [openId, setOpenId]         = useState(null)
  const [clientEmail,   setClientEmail]   = useState('')
  const [clientProjId,  setClientProjId]  = useState('')
  const [clientMsg,     setClientMsg]     = useState('')
  const [clientLoading, setClientLoading] = useState(false)
  const [managerEmail,   setManagerEmail]   = useState('')
  const [managerMsg,     setManagerMsg]     = useState('')
  const [managerLoading, setManagerLoading] = useState(false)
  const [logForm, setLogForm]   = useState({}) // keyed by workerId
  const [showLogForm, setShowLogForm] = useState(null) // workerId or null
  const [rateEditId, setRateEditId]   = useState(null) // workerId editing rate
  const [rateInput, setRateInput]     = useState({ rate: '', type: 'shift' })
  const [showAttendance, setShowAttendance] = useState(false)
  const [showReportMenu, setShowReportMenu] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState({}) // keyed by workerId
  const [showTimesheet, setShowTimesheet] = useState(false)
  const [payForm, setPayForm] = useState({})      // keyed by workerId
  const [showPayForm, setShowPayForm] = useState(null) // workerId
  const [contactEditId, setContactEditId] = useState(null) // workerId
  const [contactForm, setContactForm] = useState({}) // keyed by workerId
  const now = new Date()
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1)
  const [reportYear,  setReportYear]  = useState(now.getFullYear())
  const currSym = currencySymbol(profile?.currency)

  useEffect(() => {
    fetchProjects().then(() => {
      fetchAllWorkers()
    })
    if (profile?.role === 'foreman') fetchJoinRequests()
    useStore.getState().fetchAttendance(new Date().toISOString().slice(0, 10))
  }, [])

  const invite = async () => {
    if (!email.trim()) return
    setLoading(true); setMsg('')
    const allProjects = useStore.getState().projects
    if (!allProjects.length) { setMsg('No project found'); setLoading(false); return }
    const { data: worker, error } = await supabase
      .from('profiles').select('id, name, role').eq('email', email.trim().toLowerCase()).single()
    if (error || !worker) { setMsg('User not found. Ask them to register first.'); setLoading(false); return }
    const inserts = allProjects.map(p => ({ project_id: p.id, worker_id: worker.id }))
    const { error: e2 } = await supabase.from('project_workers').insert(inserts)
    if (e2) {
      setMsg(e2.code === '23505' ? 'Worker already in team' : 'Error adding worker')
    } else {
      setMsg(`${worker.name} added!`)
      fetchAllWorkers(); setEmail('')
    }
    setLoading(false)
  }

  const inviteClient = async () => {
    if (!clientEmail.trim() || !clientProjId) { setClientMsg('Select a project and enter email'); return }
    setClientLoading(true); setClientMsg('')
    const { error, name } = await addClientToProject(clientEmail.trim(), clientProjId)
    setClientLoading(false)
    if (error) { setClientMsg(error); return }
    setClientMsg(`${name} added as client!`)
    setClientEmail(''); fetchAllWorkers()
  }

  const inviteManager = async () => {
    if (!managerEmail.trim()) return
    setManagerLoading(true); setManagerMsg('')
    const { error, name } = await addManagerToTeam(managerEmail.trim())
    setManagerLoading(false)
    if (error) { setManagerMsg(error); return }
    setManagerMsg(`${name} added as manager!`)
    setManagerEmail('')
  }

  const removeWorker = async (workerId, workerName) => {
    if (!window.confirm(`Удалить ${workerName} из бригады?`)) return
    const allProjects = useStore.getState().projects
    await supabase.from('project_workers')
      .delete()
      .eq('worker_id', workerId)
      .in('project_id', allProjects.map(p => p.id))
    setOpenId(null)
    fetchAllWorkers()
  }

  const exportPayroll = async () => {
    // Fetch all projects for this foreman, then all work_logs
    const { profile: p, projects: projs } = useStore.getState()
    console.log('[export] profile:', p?.id, 'projects:', projs.length)
    if (!p) return

    let workerIds = []

    if (projs.length) {
      const { data: pwRows, error: pwErr } = await supabase
        .from('project_workers')
        .select('worker_id')
        .in('project_id', projs.map(pr => pr.id))
      console.log('[export] project_workers:', pwRows, pwErr)
      workerIds = [...new Set((pwRows || []).map(r => r.worker_id))]
    }

    // fallback: try join_requests
    if (!workerIds.length) {
      const { data: jrRows, error: jrErr } = await supabase
        .from('join_requests')
        .select('worker_id')
        .eq('foreman_id', p.id)
        .eq('status', 'approved')
      console.log('[export] join_requests fallback:', jrRows, jrErr)
      workerIds = [...new Set((jrRows || []).map(r => r.worker_id))]
    }

    console.log('[export] workerIds:', workerIds)
    if (!workerIds.length) { alert('В бригаде нет рабочих'); return }

    const { data: logs, error: logsErr } = await supabase
      .from('work_logs')
      .select('*, worker:profiles!worker_id(name)')
      .in('worker_id', workerIds)
      .order('worker_id').order('log_date', { ascending: true })
    console.log('[export] logs:', logs, logsErr)

    const { data: pays, error: paysErr } = await supabase
      .from('worker_payments')
      .select('*, worker:profiles!worker_id(name)')
      .in('worker_id', workerIds)
      .order('paid_at', { ascending: true })
    console.log('[export] pays:', pays, paysErr)

    if (!logs?.length && !pays?.length) { alert('Нет записей для экспорта'); return }

    // Group by worker
    const byWorker = {}
    for (const id of workerIds) byWorker[id] = { name: '', logs: [], pays: [] }
    ;(logs || []).forEach(l => { if (byWorker[l.worker_id]) { byWorker[l.worker_id].name = l.worker?.name || l.worker_id; byWorker[l.worker_id].logs.push(l) } })
    ;(pays || []).forEach(p => { if (byWorker[p.worker_id]) { byWorker[p.worker_id].name = p.worker?.name || p.worker_id; byWorker[p.worker_id].pays.push(p) } })

    const rows = []

    // ── 1. Summary table ──
    rows.push(['СВОДКА', '', '', ''])
    rows.push(['Рабочий', `Начислено (${currSym})`, `Выплачено (${currSym})`, `Остаток (${currSym})`])
    let totalEarned = 0, totalPaid = 0
    for (const w of Object.values(byWorker)) {
      const earned = w.logs.reduce((s, l) => s + l.value * l.rate, 0)
      const paid   = w.pays.reduce((s, p) => s + Number(p.amount), 0)
      totalEarned += earned; totalPaid += paid
      if (earned || paid) rows.push([w.name || '—', earned.toFixed(0), paid.toFixed(0), (earned - paid).toFixed(0)])
    }
    rows.push(['ИТОГО', totalEarned.toFixed(0), totalPaid.toFixed(0), (totalEarned - totalPaid).toFixed(0)])
    rows.push(['', '', '', ''])

    // ── 2. Shift logs per worker ──
    if (logs?.length) {
      rows.push(['СМЕНЫ / ЧАСЫ', '', '', '', '', '', ''])
      rows.push(['Рабочий', 'Дата', 'Тип', 'Кол-во', 'Ставка', `Сумма (${currSym})`, 'Заметка'])
      for (const w of Object.values(byWorker)) {
        w.logs.forEach(l => rows.push([
          w.name, l.log_date,
          l.log_type === 'hours' ? 'Часы' : 'Смены',
          l.value, l.rate,
          (l.value * l.rate).toFixed(0),
          l.notes || '',
        ]))
      }
      rows.push(['', '', '', '', '', '', ''])
    }

    // ── 3. Payments per worker ──
    if (pays?.length) {
      rows.push(['ВЫПЛАТЫ', '', '', '', ''])
      rows.push(['Рабочий', 'Дата', `Сумма (${currSym})`, 'Заметка'])
      for (const w of Object.values(byWorker)) {
        w.pays.forEach(p => rows.push([w.name, p.paid_at, Number(p.amount).toFixed(0), p.notes || '']))
      }
    }

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `зарплата_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const cycleStatus = (workerId, currentStatus) => {
    const idx  = STATUS_CYCLE.indexOf(currentStatus || 'on_site')
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
    updateWorkerStatus(workerId, next)
  }

  // Stat counters
  const onSite  = team.filter(m => !m.worker_status || m.worker_status === 'on_site').length
  const away    = team.length - onSite

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('team.title')}</h1>
        {profile?.role === 'foreman' && (() => {
          const today = new Date().toISOString().slice(0, 10)
          const todayDone = attendance.filter(a => a.date === today).length > 0
          return (
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => setShowAttendance(true)} style={{
                display:'flex', alignItems:'center', gap:5,
                padding:'6px 12px', borderRadius:8,
                background: todayDone ? '#F0FDF4' : 'var(--accent-light)',
                color: todayDone ? '#16A34A' : 'var(--accent)',
                border: `0.5px solid ${todayDone ? '#86EFAC' : 'var(--accent-border)'}`,
                cursor:'pointer', fontSize:12, fontWeight:500,
              }}>
                {todayDone ? '✅ Проведена' : '📋 Перекличка'}
              </button>
              <button onClick={() => setShowTimesheet(true)} style={{
                display:'flex', alignItems:'center', gap:5,
                padding:'6px 12px', borderRadius:8,
                background:'var(--bg)', color:'var(--text-secondary)',
                border:'0.5px solid var(--border-medium)',
                cursor:'pointer', fontSize:12, fontWeight:500,
              }}>
                📅 Табель
              </button>
            </div>
          )
        })()}
        {profile?.role === 'foreman' && (
          <div style={{ display:'flex', alignItems:'center', gap:4, position:'relative' }}>
            <select
              value={reportMonth}
              onChange={e => setReportMonth(Number(e.target.value))}
              style={{ fontSize:11, padding:'6px 6px', borderRadius:7, border:'0.5px solid var(--border-medium)', background:'var(--bg)', color:'var(--text-primary)', cursor:'pointer', outline:'none' }}
            >
              {['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={reportYear}
              onChange={e => setReportYear(Number(e.target.value))}
              style={{ fontSize:11, padding:'6px 6px', borderRadius:7, border:'0.5px solid var(--border-medium)', background:'var(--bg)', color:'var(--text-primary)', cursor:'pointer', outline:'none', width:58 }}
            >
              {[now.getFullYear() - 1, now.getFullYear()].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={() => setShowReportMenu(v => !v)}
              style={{
                display:'flex', alignItems:'center', gap:5,
                padding:'6px 11px', borderRadius:7, border:'0.5px solid var(--border-medium)',
                background:'var(--bg)', color:'var(--text-secondary)',
                cursor:'pointer', fontSize:12, fontWeight:500,
              }}
            >
              <DownloadSimple size={15} weight="bold" />
              {t('team.reportBtn')}
              <span style={{ fontSize:9, marginLeft:1 }}>▾</span>
            </button>

            {showReportMenu && (
              <>
                <div style={{ position:'fixed', inset:0, zIndex:99 }} onClick={() => setShowReportMenu(false)} />
                <div style={{
                  position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:100,
                  background:'var(--bg,#fff)', border:'0.5px solid var(--border-medium)',
                  borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.10)', minWidth:210, overflow:'hidden',
                }}>
                  {[
                    { icon: <FileCsv size={15} weight="bold" />,      label: t('team.downloadCsv'),    action: exportPayroll },
                    { icon: <CalendarBlank size={15} weight="bold" />, label: t('team.monthlyReport'),  action: () => generateMonthlyReport(reportMonth, reportYear) },
                    { icon: <ChartBar size={15} weight="bold" />,      label: t('team.annualReport'),   action: () => generateAnnualReport(reportYear) },
                  ].map((item, i, arr) => (
                    <button key={i} onClick={() => { item.action(); setShowReportMenu(false) }} style={{
                      display:'flex', alignItems:'center', gap:10,
                      width:'100%', padding:'10px 14px', border:'none', background:'transparent',
                      cursor:'pointer', fontSize:13, textAlign:'left',
                      color:'var(--text-primary,#2E2420)',
                      borderBottom: i < arr.length - 1 ? '0.5px solid var(--border,#EAE3D8)' : 'none',
                    }}>
                      <span style={{ color:'var(--text-secondary)' }}>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <Button variant="primary" size="sm" onClick={() => { setShowInvite(!showInvite); setMsg('') }}>
          {showInvite ? t('team.close') : t('team.invite')}
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:12 }}>
        <StatCard label={t('team.statTotal')}   value={team.length} />
        <StatCard label={t('team.statOnSite')} value={onSite} />
        <StatCard label={t('team.statAway')}    value={away} danger={away > 0} />
      </div>

      {/* ── Add workers panel (foreman only) ── */}
      {profile?.role === 'foreman' && showInvite && (
        <div className="card card-body" style={{ marginBottom:12 }}>

          {/* Рабочий по email */}
          <div style={{ paddingBottom:14, borderBottom:'1px solid #EAE3D8' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#7A6E66', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>
              {t('team.emailMethod')}
            </div>
            <div style={{ fontSize:12, color:'#7A6E66', marginBottom:8 }}>{t('team.emailDesc')}</div>
            <div style={{ display:'flex', gap:8 }}>
              <input className="form-input" placeholder={t('team.emailPlaceholder')}
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key==='Enter' && invite()} style={{ flex:1 }} />
              <Button variant="primary" size="sm" onClick={invite} disabled={loading}>{loading ? '...' : t('common.add')}</Button>
            </div>
            {msg && (
              <div style={{ marginTop:8, fontSize:12, padding:'6px 10px', borderRadius:6, background: msg.includes('added') || msg.includes('!') ? '#E8F2EB' : '#FCEBEB', color: msg.includes('added') || msg.includes('!') ? '#3D7A52' : '#A32D2D' }}>
                {msg}
              </div>
            )}
          </div>

          {/* Заказчик по email + проект */}
          <div style={{ paddingTop:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#7A6E66', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>
              {t('team.clientMethod')}
            </div>
            <div style={{ fontSize:12, color:'#7A6E66', marginBottom:8 }}>{t('team.clientDesc')}</div>
            <select className="form-input" value={clientProjId} onChange={e => setClientProjId(e.target.value)} style={{ marginBottom:8 }}>
              <option value="">{t('team.clientProjectSelect')}</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div style={{ display:'flex', gap:8 }}>
              <input className="form-input" placeholder={t('team.clientPlaceholder')}
                value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                onKeyDown={e => e.key==='Enter' && inviteClient()} style={{ flex:1 }} />
              <Button variant="primary" size="sm" onClick={inviteClient} disabled={clientLoading}>{clientLoading ? '...' : t('common.add')}</Button>
            </div>
            {clientMsg && (
              <div style={{ marginTop:8, fontSize:12, padding:'6px 10px', borderRadius:6, background: clientMsg.includes('added') ? '#E8F2EB' : '#FCEBEB', color: clientMsg.includes('added') ? '#3D7A52' : '#A32D2D' }}>
                {clientMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Pending join requests ── */}
      {profile?.role === 'foreman' && joinRequests.length > 0 && (
        <div className="card" style={{ marginBottom:12, padding:0 }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid #EAE3D8', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#C96B3A', letterSpacing:'.08em', textTransform:'uppercase' }}>{t('team.joinRequests')}</div>
            <div style={{ background:'#FAECE4', color:'#C96B3A', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>{joinRequests.length}</div>
          </div>
          {joinRequests.map(r => (
            <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderBottom:'1px solid #EAE3D8' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'#FAECE4', color:'#C96B3A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, flexShrink:0 }}>
                {r.worker?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#2E2420' }}>{r.worker?.name}</div>
                <div style={{ fontSize:11, color:'#B8AFA6' }}>{t('team.wantsToJoin')}</div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <Button size="sm" variant="primary" onClick={() => approveJoinRequest(r.id, r.worker.id)}>{t('team.accept')}</Button>
                <Button size="sm" variant="danger"  onClick={() => rejectJoinRequest(r.id)}>{t('team.decline')}</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Worker cards ── */}
      {team.length === 0 && <EmptyState>{t('team.noMembers')}</EmptyState>}

      {/* Workers section */}
      {team.filter(m => m.role !== 'client').length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:8, paddingLeft:2 }}>
            Рабочие ({team.filter(m => m.role !== 'client').length})
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {team.filter(m => m.role !== 'client').map(m => {
          const st       = m.worker_status || 'on_site'
          const stCfg    = WORKER_STATUS[st] || WORKER_STATUS.on_site
          const isOpen   = openId === m.id
          // Worker's projects
          const workerProjects = (m.project_ids || []).map(pid => projects.find(p => p.id === pid)).filter(Boolean)
          // Worker's tools
          const workerTools = tools.filter(t => t.worker_id === m.id)
          // Worker's active tasks
          const workerTasks = tasks.filter(t => t.worker_id === m.id && t.status !== 'approved')
          const workerDone  = tasks.filter(t => t.worker_id === m.id && t.status === 'approved').length

          return (
            <div key={m.id} style={{
              background: '#fff',
              border: `1.5px solid ${isOpen ? '#C96B3A' : '#EAE3D8'}`,
              borderRadius: 14, overflow: 'hidden',
              boxShadow: isOpen ? '0 3px 10px rgba(201,107,58,0.10)' : 'none',
              transition: 'border-color .15s, box-shadow .15s',
            }}>
              {/* ── Collapsed row ── */}
              <div
                onClick={() => {
                  const newId = openId === m.id ? null : m.id
                  setOpenId(newId)
                  if (newId && !workLogs[newId]) fetchWorkLogs(newId)
                  if (newId && !payments[newId]) fetchPayments(newId)
                }}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', cursor:'pointer', background: isOpen ? '#FAECE4' : '#fff' }}
              >
                {/* Avatar with status dot */}
                <div style={{ position:'relative', flexShrink:0 }}>
                  <div style={{
                    width:40, height:40, borderRadius:'50%',
                    background: isOpen ? '#C96B3A' : '#F2EDE4',
                    color: isOpen ? '#fff' : '#C96B3A',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:15, fontWeight:700,
                  }}>
                    {m.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{
                    position:'absolute', bottom:0, right:0,
                    width:11, height:11, borderRadius:'50%',
                    background: stCfg.dot, border:'2px solid #fff',
                  }} />
                  {(() => {
                    const today = new Date().toISOString().slice(0, 10)
                    const rec = attendance.find(a => a.worker_id === m.id && a.date === today)
                    if (!rec) return null
                    const dotColor = rec.status === 'present' ? '#16A34A' : rec.status === 'absent' ? '#DC2626' : rec.status === 'sick' ? '#7C3AED' : '#0891B2'
                    return (
                      <div style={{
                        position:'absolute', bottom:0, left:0,
                        width:10, height:10, borderRadius:'50%',
                        background: dotColor, border:'2px solid var(--bg)',
                      }} />
                    )
                  })()}
                </div>

                {/* Name + quick info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color: isOpen ? '#C96B3A' : '#2E2420', marginBottom:3 }}>{m.name}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5, alignItems:'center' }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background: stCfg.bg, color: stCfg.color, border:`1px solid ${stCfg.border}` }}>
                      {t('team.ws_' + st)}
                    </span>
                    {workerTasks.length > 0 && (
                      <span style={{ fontSize:10, color:'#C96B3A', fontWeight:600 }}>⚡ {workerTasks.length} tasks</span>
                    )}
                    {workerTools.length > 0 && (
                      <span style={{ fontSize:10, color:'#7A6E66' }}>🔧 {workerTools.length}</span>
                    )}
                    {m.phone && (
                      <a
                        href={`tel:${m.phone}`}
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize:10, color:'var(--accent)', textDecoration:'none', display:'flex', alignItems:'center', gap:2 }}
                      >
                        📞 {m.phone}
                      </a>
                    )}
                  </div>
                </div>

                {/* Status cycle button (foreman only) */}
                {profile?.role === 'foreman' && (
                  <button
                    onClick={e => { e.stopPropagation(); cycleStatus(m.id, st) }}
                    title="Tap to change status"
                    style={{
                      flexShrink:0, padding:'5px 10px', borderRadius:8, fontSize:11, fontWeight:600,
                      background: stCfg.bg, color: stCfg.color,
                      border: `1px solid ${stCfg.border}`,
                      cursor:'pointer', transition:'opacity .15s',
                    }}
                  >
                    ⟳
                  </button>
                )}

                <span style={{ fontSize:10, color:'#B8AFA6' }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {/* ── Expanded detail ── */}
              {isOpen && (
                <div style={{ borderTop:'1px solid #EAE3D8', padding:'12px 14px', background:'#FDFBF8' }}>

                  {/* Status picker row */}
                  {profile?.role === 'foreman' && (
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6', marginBottom:6 }}>{t('team.statusHeader')}</div>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        {STATUS_CYCLE.map(s => {
                          const cfg = WORKER_STATUS[s]
                          const isActive = st === s
                          return (
                            <button key={s}
                              onClick={() => updateWorkerStatus(m.id, s)}
                              style={{
                                padding:'5px 11px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer',
                                background: isActive ? cfg.bg : '#F2EDE4',
                                color: isActive ? cfg.color : '#B8AFA6',
                                border: isActive ? `1.5px solid ${cfg.border}` : '1.5px solid #EAE3D8',
                                transition:'all .12s',
                              }}
                            >
                              {t('team.ws_' + s)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Contacts */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6' }}>Контакты</div>
                      {(profile?.role === 'foreman' || profile?.id === m.id) && (
                        <button
                          onClick={() => {
                            setContactEditId(contactEditId === m.id ? null : m.id)
                            setContactForm(f => ({ ...f, [m.id]: { phone: m.phone || '', telegram: m.telegram || '' } }))
                          }}
                          style={{ fontSize:11, fontWeight:500, color:'var(--accent)', background:'var(--accent-light)', border:'none', borderRadius:6, padding:'3px 10px', cursor:'pointer' }}
                        >
                          {contactEditId === m.id ? 'Отмена' : 'Изменить'}
                        </button>
                      )}
                    </div>

                    {contactEditId === m.id ? (
                      <div style={{ background:'var(--bg-subtle,#FAFAF9)', border:'0.5px solid var(--border)', borderRadius:8, padding:'10px 12px' }}>
                        <div style={{ marginBottom:8 }}>
                          <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>Телефон</div>
                          <input
                            type="tel"
                            placeholder="+7 999 123 45 67"
                            value={contactForm[m.id]?.phone || ''}
                            onChange={e => setContactForm(f => ({ ...f, [m.id]: { ...f[m.id], phone: e.target.value } }))}
                            style={{ width:'100%', fontSize:12, padding:'6px 8px', borderRadius:6, border:'0.5px solid var(--border-medium)', background:'var(--bg)', color:'var(--text-primary)' }}
                          />
                        </div>
                        <div style={{ marginBottom:10 }}>
                          <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>Telegram</div>
                          <input
                            type="text"
                            placeholder="@username"
                            value={contactForm[m.id]?.telegram || ''}
                            onChange={e => setContactForm(f => ({ ...f, [m.id]: { ...f[m.id], telegram: e.target.value } }))}
                            style={{ width:'100%', fontSize:12, padding:'6px 8px', borderRadius:6, border:'0.5px solid var(--border-medium)', background:'var(--bg)', color:'var(--text-primary)' }}
                          />
                        </div>
                        <div style={{ display:'flex', justifyContent:'flex-end' }}>
                          <button
                            onClick={async () => {
                              const cf = contactForm[m.id] || {}
                              await updateWorkerContact(m.id, cf.phone?.trim(), cf.telegram?.trim())
                              setContactEditId(null)
                            }}
                            style={{ fontSize:11, padding:'5px 14px', borderRadius:6, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer', fontWeight:500 }}
                          >Сохранить</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                        {m.phone ? (
                          <a href={`tel:${m.phone}`} style={{ fontSize:12, color:'var(--accent)', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                            📞 {m.phone}
                          </a>
                        ) : null}
                        {m.telegram ? (
                          <a
                            href={`https://t.me/${m.telegram.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize:12, color:'#229ED9', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}
                          >
                            ✈️ {m.telegram.startsWith('@') ? m.telegram : `@${m.telegram}`}
                          </a>
                        ) : null}
                        {!m.phone && !m.telegram && (
                          <span style={{ fontSize:11, color:'#B8AFA6' }}>Не указаны</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Projects */}
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6', marginBottom:5 }}>{t('team.projectsHeader')}</div>
                    {workerProjects.length === 0
                      ? <span style={{ fontSize:11, color:'#B8AFA6' }}>{t('common.none')}</span>
                      : <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                          {workerProjects.map(p => (
                            <span key={p.id} style={{ fontSize:11, fontWeight:600, background:'#FAECE4', color:'#C96B3A', borderRadius:8, padding:'3px 10px' }}>{p.name}</span>
                          ))}
                        </div>
                    }
                  </div>

                  {/* Tools */}
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6', marginBottom:5 }}>{t('team.toolsHeader')}</div>
                    {workerTools.length === 0
                      ? <span style={{ fontSize:11, color:'#B8AFA6' }}>{t('team.noTools')}</span>
                      : <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                          {workerTools.map(t => (
                            <span key={t.id} style={{ fontSize:11, fontWeight:500, background:'#F2EDE4', color:'#7A6E66', borderRadius:8, padding:'3px 10px', border:'1px solid #EAE3D8' }}>{t.name}</span>
                          ))}
                        </div>
                    }
                  </div>

                  {/* Task summary */}
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6', marginBottom:5 }}>{t('team.tasksHeader')}</div>
                    <div style={{ display:'flex', gap:10 }}>
                      {workerTasks.filter(t=>['new','rejected'].includes(t.status)).length > 0 && (
                        <span style={{ fontSize:11, fontWeight:600, color:'#C96B3A' }}>⚡ {workerTasks.filter(t=>['new','rejected'].includes(t.status)).length} active</span>
                      )}
                      {workerTasks.filter(t=>t.status==='pending').length > 0 && (
                        <span style={{ fontSize:11, fontWeight:600, color:'#D4A843' }}>🕐 {workerTasks.filter(t=>t.status==='pending').length} in review</span>
                      )}
                      {workerDone > 0 && (
                        <span style={{ fontSize:11, fontWeight:600, color:'#3D7A52' }}>✅ {workerDone} done</span>
                      )}
                      {workerTasks.length === 0 && workerDone === 0 && (
                        <span style={{ fontSize:11, color:'#B8AFA6' }}>{t('team.noTasks')}</span>
                      )}
                    </div>
                  </div>

                  {/* ── Payments section ── */}
                  {profile?.role === 'foreman' && (() => {
                    const logs     = workLogs[m.id] || []
                    const earned   = logs.reduce((s, l) => s + l.value * l.rate, 0)
                    const pays     = payments[m.id] || []
                    const paid     = pays.reduce((s, p) => s + p.amount, 0)
                    const balance  = earned - paid
                    const pf = payForm[m.id] || { date: new Date().toISOString().slice(0, 10), amount: '', notes: '' }
                    const setPf = patch => setPayForm(f => ({ ...f, [m.id]: { ...pf, ...patch } }))
                    return (
                      <div style={{ marginTop:12, borderTop:'0.5px solid var(--border)', paddingTop:12 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                          <div style={{ fontSize:10, fontWeight:500, letterSpacing:'.06em', textTransform:'uppercase', color:'var(--text-muted)' }}>Выплаты</div>
                          <button
                            onClick={() => { setShowPayForm(prev => prev === m.id ? null : m.id); if (!payments[m.id]) fetchPayments(m.id) }}
                            style={{ fontSize:11, fontWeight:500, color:'var(--accent)', background:'var(--accent-light)', border:'none', borderRadius:6, padding:'3px 10px', cursor:'pointer' }}
                          >+ Выплата</button>
                        </div>

                        {/* Balance summary */}
                        <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                          <div style={{ flex:1, background:'var(--bg-subtle,#F9F8F6)', borderRadius:8, padding:'7px 10px', textAlign:'center' }}>
                            <div style={{ fontSize:11, fontWeight:600, color:'var(--text-primary)' }}>{earned.toLocaleString()} {currSym}</div>
                            <div style={{ fontSize:9, color:'var(--text-muted)' }}>Начислено</div>
                          </div>
                          <div style={{ flex:1, background:'var(--bg-subtle,#F9F8F6)', borderRadius:8, padding:'7px 10px', textAlign:'center' }}>
                            <div style={{ fontSize:11, fontWeight:600, color:'#16A34A' }}>{paid.toLocaleString()} {currSym}</div>
                            <div style={{ fontSize:9, color:'var(--text-muted)' }}>Выплачено</div>
                          </div>
                          <div style={{ flex:1, background: balance > 0 ? '#FFF7ED' : '#F0FDF4', borderRadius:8, padding:'7px 10px', textAlign:'center', border:`0.5px solid ${balance > 0 ? '#FED7AA' : '#BBF7D0'}` }}>
                            <div style={{ fontSize:11, fontWeight:600, color: balance > 0 ? 'var(--accent)' : '#16A34A' }}>{balance.toLocaleString()} {currSym}</div>
                            <div style={{ fontSize:9, color:'var(--text-muted)' }}>Остаток</div>
                          </div>
                        </div>

                        {/* Add payment form */}
                        {showPayForm === m.id && (
                          <div style={{ background:'var(--bg-subtle,#FAFAF9)', border:'0.5px solid var(--border)', borderRadius:8, padding:'10px 12px', marginBottom:10 }}>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
                              <div>
                                <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>Дата</div>
                                <input type="date" value={pf.date} onChange={e => setPf({ date: e.target.value })}
                                  style={{ width:'100%', fontSize:11, padding:'5px 8px', borderRadius:6, border:'0.5px solid var(--border-medium)', background:'var(--bg)', color:'var(--text-primary)' }} />
                              </div>
                              <div>
                                <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>Сумма ({currSym})</div>
                                <input type="number" min="0" step="any" placeholder="0" value={pf.amount} onChange={e => setPf({ amount: e.target.value })}
                                  style={{ width:'100%', fontSize:11, padding:'5px 8px', borderRadius:6, border:'0.5px solid var(--border-medium)', background:'var(--bg)', color:'var(--text-primary)' }} />
                              </div>
                            </div>
                            <input placeholder="Заметка (напр: аванс, за 2 недели...)" value={pf.notes} onChange={e => setPf({ notes: e.target.value })}
                              style={{ width:'100%', fontSize:11, padding:'5px 8px', borderRadius:6, border:'0.5px solid var(--border-medium)', background:'var(--bg)', color:'var(--text-primary)', marginBottom:8 }} />
                            <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                              <button onClick={() => setShowPayForm(null)} style={{ fontSize:11, padding:'5px 12px', borderRadius:6, border:'0.5px solid var(--border)', background:'var(--bg)', cursor:'pointer', color:'var(--text-secondary)' }}>Отмена</button>
                              <button
                                onClick={async () => {
                                  if (!pf.amount) return
                                  await addPayment({ worker_id: m.id, amount: pf.amount, notes: pf.notes, paid_at: pf.date })
                                  setShowPayForm(null)
                                  setPayForm(f => { const n = { ...f }; delete n[m.id]; return n })
                                }}
                                style={{ fontSize:11, padding:'5px 14px', borderRadius:6, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer', fontWeight:500 }}
                              >Сохранить</button>
                            </div>
                          </div>
                        )}

                        {/* Payment list */}
                        {pays.map(p => (
                          <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'0.5px solid var(--border)' }}>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:11, color:'var(--text-primary)' }}>
                                {p.paid_at}
                                <span style={{ fontWeight:600, color:'#16A34A', marginLeft:8 }}>−{parseFloat(p.amount).toLocaleString()} {currSym}</span>
                              </div>
                              {p.notes && <div style={{ fontSize:10, color:'var(--text-muted)' }}>{p.notes}</div>}
                            </div>
                            <button onClick={() => deletePayment(p.id, m.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:14, padding:'0 4px', flexShrink:0 }}>🗑</button>
                          </div>
                        ))}
                        {pays.length === 0 && !showPayForm && (
                          <div style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', padding:'6px 0' }}>Выплат нет</div>
                        )}
                      </div>
                    )
                  })()}

                  {/* ── Remove from team ── */}
                  {profile?.role === 'foreman' && (
                    <div style={{ marginTop:10, paddingTop:10, borderTop:'0.5px solid var(--border)' }}>
                      <button
                        onClick={() => removeWorker(m.id, m.name)}
                        style={{
                          fontSize:12, color:'#A32D2D', background:'#FCEBEB',
                          border:'0.5px solid #F0AAAA', borderRadius:7,
                          padding:'5px 14px', cursor:'pointer', fontWeight:500,
                        }}
                      >
                        Удалить из бригады
                      </button>
                    </div>
                  )}

                  {/* ── Payroll section ── */}
                  {profile?.role === 'foreman' && (
                    <div style={{ marginTop: 12, borderTop: '0.5px solid var(--border)', paddingTop: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                            Зарплата
                          </div>
                          <button
                            onClick={() => generateMonthlyReport(reportMonth, reportYear, m.id)}
                            style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 5, padding: '2px 7px', cursor: 'pointer' }}
                            title="Отчёт за месяц"
                          >📄 месяц</button>
                          <button
                            onClick={() => generateAnnualReport(reportYear, m.id)}
                            style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 5, padding: '2px 7px', cursor: 'pointer' }}
                            title="Отчёт за год"
                          >📊 год</button>
                        </div>
                        <button
                          onClick={() => setShowLogForm(prev => prev === m.id ? null : m.id)}
                          style={{ fontSize: 11, fontWeight: 500, color: 'var(--accent)', background: 'var(--accent-light)', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
                        >
                          + Добавить
                        </button>
                      </div>

                      {/* Rate settings */}
                      {rateEditId === m.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                          <select
                            value={rateInput.type}
                            onChange={e => setRateInput(r => ({ ...r, type: e.target.value }))}
                            style={{ fontSize: 11, padding: '4px 6px', borderRadius: 6, border: '0.5px solid var(--border-medium)', background: 'var(--bg)', color: 'var(--text-primary)', flex: 1 }}
                          >
                            <option value="shift">За смену</option>
                            <option value="hours">За час</option>
                          </select>
                          <input
                            type="number" min="0" step="any"
                            placeholder="Ставка"
                            value={rateInput.rate}
                            onChange={e => setRateInput(r => ({ ...r, rate: e.target.value }))}
                            style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--border-medium)', background: 'var(--bg)', color: 'var(--text-primary)', width: 90 }}
                          />
                          <button
                            onClick={async () => {
                              await updateMemberRate(m.id, parseFloat(rateInput.rate) || 0, rateInput.type)
                              setRateEditId(null)
                            }}
                            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
                          >
                            ОК
                          </button>
                          <button onClick={() => setRateEditId(null)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, background: 'var(--bg-subtle,#F5F5F5)', border: '0.5px solid var(--border)', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>Ставка: <strong style={{ color: 'var(--text-primary)' }}>{m.default_rate || 0} / {m.rate_type === 'hours' ? 'час' : 'смена'}</strong></span>
                          <button
                            onClick={() => { setRateEditId(m.id); setRateInput({ rate: m.default_rate || '', type: m.rate_type || 'shift' }) }}
                            style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                          >
                            изменить
                          </button>
                        </div>
                      )}

                      {/* Add log form */}
                      {showLogForm === m.id && (() => {
                        const lf = logForm[m.id] || { date: new Date().toISOString().slice(0, 10), type: m.rate_type || 'shift', value: '1', rate: m.default_rate || '', notes: '' }
                        const setLf = (patch) => setLogForm(f => ({ ...f, [m.id]: { ...lf, ...patch } }))
                        return (
                          <div style={{ background: 'var(--bg-subtle,#FAFAF9)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                              <div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Дата</div>
                                <input type="date" value={lf.date} onChange={e => setLf({ date: e.target.value })}
                                  style={{ width: '100%', fontSize: 11, padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--border-medium)', background: 'var(--bg)', color: 'var(--text-primary)' }} />
                              </div>
                              <div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Тип</div>
                                <select value={lf.type} onChange={e => setLf({ type: e.target.value })}
                                  style={{ width: '100%', fontSize: 11, padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--border-medium)', background: 'var(--bg)', color: 'var(--text-primary)' }}>
                                  <option value="shift">Смена</option>
                                  <option value="hours">Часы</option>
                                </select>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{lf.type === 'hours' ? 'Часов' : 'Смен'}</div>
                                <input type="number" min="0" step="any" placeholder={lf.type === 'hours' ? '8' : '1'} value={lf.value} onChange={e => setLf({ value: e.target.value })}
                                  style={{ width: '100%', fontSize: 11, padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--border-medium)', background: 'var(--bg)', color: 'var(--text-primary)' }} />
                              </div>
                              <div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Ставка</div>
                                <input type="number" min="0" step="any" placeholder="0" value={lf.rate} onChange={e => setLf({ rate: e.target.value })}
                                  style={{ width: '100%', fontSize: 11, padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--border-medium)', background: 'var(--bg)', color: 'var(--text-primary)' }} />
                              </div>
                            </div>
                            <input placeholder="Заметка (необязательно)" value={lf.notes} onChange={e => setLf({ notes: e.target.value })}
                              style={{ width: '100%', fontSize: 11, padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--border-medium)', background: 'var(--bg)', color: 'var(--text-primary)', marginBottom: 8 }} />
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button onClick={() => setShowLogForm(null)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', color: 'var(--text-secondary)' }}>Отмена</button>
                              <button
                                onClick={async () => {
                                  if (!lf.value) return
                                  const { profile: p } = useStore.getState()
                                  await addWorkLog({
                                    worker_id: m.id,
                                    project_id: (m.project_ids || [])[0] || null,
                                    log_date: lf.date,
                                    log_type: lf.type,
                                    value: parseFloat(lf.value),
                                    rate: parseFloat(lf.rate) || 0,
                                    notes: lf.notes || null,
                                    created_by: p?.id,
                                  })
                                  setShowLogForm(null)
                                  setLogForm(f => { const n = { ...f }; delete n[m.id]; return n })
                                }}
                                style={{ fontSize: 11, padding: '5px 14px', borderRadius: 6, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                              >
                                Сохранить
                              </button>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Log entries list */}
                      {(() => {
                        const logs = workLogs[m.id] || []
                        const total = logs.reduce((s, l) => s + (l.value * l.rate), 0)
                        const PREVIEW = 3
                        const isExpanded = expandedLogs[m.id]
                        const visible = isExpanded ? logs : logs.slice(0, PREVIEW)
                        return (
                          <>
                            {logs.length > 0 && (
                              <div style={{ marginBottom: 6, padding: '6px 10px', background: 'var(--accent-light)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{logs.length} записей</span>
                                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)' }}>{total.toLocaleString()} {currSym}</span>
                              </div>
                            )}
                            {logs.length === 0 && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>Записей нет</div>
                            )}
                            {visible.map(log => (
                              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 11, color: 'var(--text-primary)' }}>
                                    {log.log_date} · {log.log_type === 'hours' ? `${log.value}ч` : `${log.value} смен`}
                                    <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>× {log.rate}</span>
                                    <span style={{ fontWeight: 500, color: 'var(--accent)', marginLeft: 6 }}>= {(log.value * log.rate).toLocaleString()} {currSym}</span>
                                  </div>
                                  {log.notes && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{log.notes}</div>}
                                </div>
                                <button
                                  onClick={() => deleteWorkLog(log.id, m.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 4px', flexShrink: 0 }}
                                >🗑</button>
                              </div>
                            ))}
                            {logs.length > PREVIEW && (
                              <button
                                onClick={() => setExpandedLogs(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                                style={{ marginTop: 6, width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--accent)', padding: '4px 0', textAlign: 'center' }}
                              >
                                {isExpanded ? 'Свернуть' : `Показать все (${logs.length})`}
                              </button>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  )}

                </div>
              )}
            </div>
          )
        })}
          </div>
        </div>
      )}

      {/* Clients section */}
      {team.filter(m => m.role === 'client').length > 0 && (
        <div>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:8, paddingLeft:2 }}>
            Заказчики ({team.filter(m => m.role === 'client').length})
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {team.filter(m => m.role === 'client').map(m => {
              const isOpen = openId === m.id
              const workerProjects = (m.project_ids || []).map(pid => projects.find(p => p.id === pid)).filter(Boolean)
              return (
                <div key={m.id} style={{ background:'#fff', border:`1.5px solid ${isOpen ? '#C96B3A' : '#EAE3D8'}`, borderRadius:14, overflow:'hidden' }}>
                  <div onClick={() => setOpenId(isOpen ? null : m.id)} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', cursor:'pointer', background: isOpen ? '#FAECE4' : '#fff' }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background: isOpen ? '#C96B3A' : '#F2EDE4', color: isOpen ? '#fff' : '#C96B3A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, flexShrink:0 }}>
                      {m.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color: isOpen ? '#C96B3A' : '#2E2420' }}>{m.name}</div>
                      <div style={{ fontSize:10, color:'var(--text-muted)' }}>Заказчик</div>
                    </div>
                    {m.phone && (
                      <a href={`tel:${m.phone}`} onClick={e => e.stopPropagation()} style={{ fontSize:10, color:'var(--accent)', textDecoration:'none' }}>📞 {m.phone}</a>
                    )}
                    <span style={{ fontSize:10, color:'#B8AFA6' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                  {isOpen && (
                    <div style={{ borderTop:'1px solid #EAE3D8', padding:'12px 14px', background:'#FDFBF8' }}>
                      {/* Contacts */}
                      <div style={{ marginBottom:10 }}>
                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6', marginBottom:5 }}>Контакты</div>
                        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                          {m.phone ? <a href={`tel:${m.phone}`} style={{ fontSize:12, color:'var(--accent)', textDecoration:'none' }}>📞 {m.phone}</a> : null}
                          {m.telegram ? <a href={`https://t.me/${m.telegram.replace(/^@/,'')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:'#229ED9', textDecoration:'none' }}>✈️ {m.telegram.startsWith('@') ? m.telegram : `@${m.telegram}`}</a> : null}
                          {!m.phone && !m.telegram && <span style={{ fontSize:11, color:'#B8AFA6' }}>Не указаны</span>}
                        </div>
                      </div>
                      {/* Projects */}
                      <div style={{ marginBottom:10 }}>
                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6', marginBottom:5 }}>Объекты</div>
                        {workerProjects.length === 0
                          ? <span style={{ fontSize:11, color:'#B8AFA6' }}>Нет</span>
                          : <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                              {workerProjects.map(p => <span key={p.id} style={{ fontSize:11, fontWeight:600, background:'#FAECE4', color:'#C96B3A', borderRadius:8, padding:'3px 10px' }}>{p.name}</span>)}
                            </div>
                        }
                      </div>
                      <button onClick={() => removeWorker(m.id, m.name)} style={{ fontSize:11, color:'#A32D2D', background:'#FCEBEB', border:'none', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontWeight:500 }}>
                        Удалить из бригады
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showAttendance && <AttendanceModal onClose={() => { setShowAttendance(false); useStore.getState().fetchAttendance(new Date().toISOString().slice(0, 10)) }} />}
      {showTimesheet && <TimesheetModal onClose={() => setShowTimesheet(false)} />}
    </div>
  )
}
