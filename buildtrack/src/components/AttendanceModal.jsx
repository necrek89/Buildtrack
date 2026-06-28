import { useState, useEffect } from 'react'
import { CheckCircle, X, FirstAid, Umbrella, Clock, ClipboardText } from '@phosphor-icons/react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n/useLanguage'

const TODAY = new Date().toISOString().slice(0, 10)

const STATUS_ORDER = ['present', 'absent', 'sick', 'vacation']
const STATUS_ICON = { present: CheckCircle, absent: X, sick: FirstAid, vacation: Umbrella }

const STATUS_COLORS = {
  present:  { color: '#fff',     bg: 'var(--accent)',   border: 'var(--accent)',        dot: '#16A34A', chipBg: '#F0FDF4' },
  absent:   { color: '#DC2626',  bg: 'var(--bg)',       border: '#FCA5A5',              dot: '#DC2626', chipBg: '#FEF2F2' },
  sick:     { color: '#7C3AED',  bg: 'var(--bg)',       border: '#C4B5FD',              dot: '#7C3AED', chipBg: '#F5F3FF' },
  vacation: { color: '#0891B2',  bg: 'var(--bg)',       border: '#A5F3FC',              dot: '#0891B2', chipBg: '#ECFEFF' },
}

function formatDate(d, lang) {
  return new Date(d + 'T00:00:00').toLocaleDateString(lang, { day: 'numeric', month: 'long' })
}

export default function AttendanceModal({ onClose }) {
  const { team, attendance, fetchAttendance, saveAttendance, copyYesterdayAttendance } = useStore()
  const { t, lang } = useT()
  const workers = team.filter(m => m.role === 'worker')

  const [step, setStep]         = useState('loading')
  const [rows, setRows]         = useState([])
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [timeFor, setTimeFor]   = useState(null)

  useEffect(() => {
    fetchAttendance(TODAY).then(() => {
      const todayRecs = useStore.getState().attendance.filter(a => a.date === TODAY)
      if (todayRecs.length > 0) {
        initRows(todayRecs)
        setStep('mark')
      } else {
        setStep('choose')
      }
    })
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const buildDefaultRows = () =>
    workers.map(w => ({ worker_id: w.id, name: w.name, date: TODAY, status: 'present', arrived_at: '', note: '' }))

  const initRows = (existing) => {
    const map = {}
    existing.forEach(r => { map[r.worker_id] = r })
    setRows(workers.map(w => ({
      worker_id: w.id,
      name: w.name,
      date: TODAY,
      status: map[w.id]?.status || 'present',
      arrived_at: map[w.id]?.arrived_at || '',
      note: map[w.id]?.note || '',
    })))
  }

  const startFresh = () => { setRows(buildDefaultRows()); setStep('mark') }

  const handleCopyYesterday = async () => {
    const copied = await copyYesterdayAttendance()
    if (copied) {
      const recs = useStore.getState().attendance.filter(a => a.date === TODAY)
      initRows(recs)
    } else {
      setRows(buildDefaultRows())
    }
    setStep('mark')
  }

  const setStatus = (workerId, status) =>
    setRows(r => r.map(row => row.worker_id === workerId ? { ...row, status } : row))

  const setArrived = (workerId, time) =>
    setRows(r => r.map(row => row.worker_id === workerId ? { ...row, arrived_at: time } : row))

  const handleSave = async () => {
    setSaving(true)
    const { error } = await saveAttendance(rows)
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(onClose, 700) }
  }

  const counts = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})

  const statusLabel = { present: t('team.statusPresent'), absent: t('team.statusAbsent'), sick: t('team.statusSick'), vacation: t('team.statusVacation') }

  if (step === 'loading') return null

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end' }}
    >
      <div style={{
        width:'100%', maxHeight:'92dvh', background:'var(--bg)',
        borderRadius:'20px 20px 0 0', display:'flex', flexDirection:'column',
        animation:'bs-in .3s cubic-bezier(.32,1,.23,1)',
      }}>
        {/* Drag handle */}
        <div style={{ width:40, height:4, background:'var(--border-medium)', borderRadius:4, margin:'12px auto 0', flexShrink:0 }} />

        {/* ── SCREEN A: CHOOSE ── */}
        {step === 'choose' && (
          <div style={{ padding:'28px 24px 48px', textAlign:'center' }}>
            <div style={{ fontSize:15, fontWeight:500, color:'var(--text-primary)', marginBottom:4 }}>{t('team.attendanceBtn')}</div>
            <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:36 }}>
              {formatDate(TODAY, lang)} · {workers.length} {t('team.people')}
            </div>

            <button onClick={handleCopyYesterday} style={{
              width:'100%', padding:'18px', borderRadius:14,
              background:'var(--accent)', color:'#fff',
              border:'none', cursor:'pointer', fontSize:16, fontWeight:500,
              marginBottom:10,
            }}>
              <ClipboardText size={14} weight="bold" /> {t('team.copyYesterday')}
            </button>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:28 }}>
              {t('team.copyYesterdayHint')}
            </div>

            <button onClick={startFresh} style={{
              background:'none', border:'none', cursor:'pointer',
              fontSize:13, color:'var(--text-secondary)', textDecoration:'underline',
            }}>
              {t('team.startFresh')}
            </button>
          </div>
        )}

        {/* ── SCREEN B: MARK ── */}
        {step === 'mark' && (<>
          {/* Header */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'14px 16px 12px', borderBottom:'0.5px solid var(--border)', flexShrink:0,
          }}>
            <div>
              <div style={{ fontSize:14, fontWeight:500, color:'var(--text-primary)' }}>{t('team.attendanceBtn')}</div>
              <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{formatDate(TODAY, lang)}</div>
            </div>
            <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap', flex:1, justifyContent:'center', padding:'0 8px' }}>
              {Object.entries(counts).map(([s, v]) => (
                <span key={s} style={{
                  fontSize:11, fontWeight:500, padding:'3px 8px', borderRadius:20,
                  background: STATUS_COLORS[s]?.chipBg || '#f5f5f5',
                  color: STATUS_COLORS[s]?.dot || '#333',
                }}>
                  {(() => { const IC = STATUS_ICON[s]; return <IC size={13} weight="bold" /> })()} {v}
                </span>
              ))}
            </div>
            <button onClick={handleSave} disabled={saving} style={{
              padding:'8px 18px', borderRadius:8, flexShrink:0,
              background: saved ? '#16A34A' : 'var(--accent)', color:'#fff',
              border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
            }}>
              {saving ? '...' : saved ? '✓' : t('common.save')}
            </button>
          </div>

          {/* Worker list */}
          <div style={{ overflowY:'auto', flex:1, paddingBottom:32 }}>
            {rows.map((row, idx) => {
              const cfg = STATUS_COLORS[row.status]
              return (
                <div key={row.worker_id} style={{
                  padding:'12px 14px',
                  borderBottom: idx < rows.length - 1 ? '0.5px solid var(--border)' : 'none',
                  minHeight:44,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {/* Avatar */}
                    <div style={{
                      width:36, height:36, borderRadius:'50%', flexShrink:0,
                      background: row.status === 'present' ? '#F0FDF4' : row.status === 'absent' ? '#FEF2F2' : row.status === 'sick' ? '#F5F3FF' : '#ECFEFF',
                      color: cfg.dot,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:13, fontWeight:500, border:`1.5px solid ${row.status === 'present' ? '#86EFAC' : row.status === 'absent' ? '#FCA5A5' : row.status === 'sick' ? '#C4B5FD' : '#A5F3FC'}`,
                      transition:'all .15s',
                    }}>
                      {row.name?.charAt(0)?.toUpperCase()}
                    </div>

                    {/* Name */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)' }}>{row.name}</div>
                      {row.arrived_at && (
                        <div style={{ fontSize:10, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:2 }}><Clock size={10} weight="bold" /> {row.arrived_at}</div>
                      )}
                    </div>

                    {/* Status chips */}
                    <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                      {STATUS_ORDER.map(s => {
                        const isActive = row.status === s
                        return (
                          <button key={s} onClick={() => setStatus(row.worker_id, s)} title={statusLabel[s]} style={{
                            minWidth:60, height:34, borderRadius:8, cursor:'pointer',
                            background: isActive ? 'var(--accent)' : 'var(--bg)',
                            color: isActive ? '#fff' : 'var(--text-muted)',
                            border: isActive ? '1.5px solid var(--accent)' : '0.5px solid var(--border-medium)',
                            fontSize:13, fontWeight: isActive ? 500 : 400,
                            display:'flex', alignItems:'center', justifyContent:'center', gap:3,
                            transition:'all .1s',
                          }}>
                            {(() => { const IC = STATUS_ICON[s]; return <IC size={14} weight="bold" /> })()}
                          </button>
                        )
                      })}
                      {/* Clock for arrival time */}
                      <button onClick={() => setTimeFor(prev => prev === row.worker_id ? null : row.worker_id)} style={{
                        width:34, height:34, borderRadius:8, cursor:'pointer',
                        background: row.arrived_at ? 'var(--accent-light)' : 'var(--bg)',
                        color: row.arrived_at ? 'var(--accent)' : 'var(--text-muted)',
                        border: row.arrived_at ? '0.5px solid var(--accent-border)' : '0.5px solid var(--border)',
                        fontSize:14, display:'flex', alignItems:'center', justifyContent:'center',
                      }}><Clock size={14} weight="bold" /></button>
                    </div>
                  </div>

                  {/* Time picker inline */}
                  {timeFor === row.worker_id && (
                    <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8, paddingLeft:46 }}>
                      <input type="time" value={row.arrived_at || ''} onChange={e => setArrived(row.worker_id, e.target.value)}
                        style={{ fontSize:13, padding:'5px 8px', borderRadius:7, border:'0.5px solid var(--border-medium)', background:'var(--bg)', color:'var(--text-primary)' }}
                      />
                      <button onClick={() => setTimeFor(null)} style={{ fontSize:11, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer' }}>{t('team.attendDone')}</button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Summary row */}
            {rows.length > 0 && (
              <div style={{ margin:'16px 14px 0', padding:'10px 14px', background:'var(--bg-subtle,#FAFAF9)', borderRadius:10, border:'0.5px solid var(--border)', fontSize:12, color:'var(--text-secondary)' }}>
                {t('team.attendToday')}{' '}
                <strong style={{ color:'#16A34A' }}>{counts.present || 0} {t('team.attendPresent')}</strong>
                {(counts.absent || 0) > 0 && <> · <strong style={{ color:'#DC2626' }}>{counts.absent} {t('team.attendAbsent')}</strong></>}
                {(counts.sick || 0) > 0 && <> · <strong style={{ color:'#7C3AED' }}>{counts.sick} {t('team.attendSick')}</strong></>}
                {(counts.vacation || 0) > 0 && <> · <strong style={{ color:'#0891B2' }}>{counts.vacation} {t('team.attendVacation')}</strong></>}
              </div>
            )}
          </div>
        </>)}
      </div>
    </div>
  )
}
