import { useState, useEffect, useMemo } from 'react'
import { CaretLeft, CaretRight, Buildings } from '@phosphor-icons/react'
import { useT } from '../../i18n/useLanguage'
import { useStore } from '../../store/useStore'
import { EmptyState } from '../../components/UI'
import { toLocalDateStr, todayStr } from '../../lib/date'

// ── Date helpers (no date-fns in this app — plain Date math, Mon-first week) ──
function mondayOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  const dow = d.getDay() // 0=Sun
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return toLocalDateStr(d)
}
function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + n)
  return toLocalDateStr(d)
}

// Small deterministic palette — there's no per-project color in the data
// model yet, so each project gets a stable color from a hash of its id
// (same project always lands on the same color, across users/sessions).
const PALETTE = ['#3B82C4', '#2E9E6C', '#C9683A', '#8E6FCE', '#D9534F', '#4A5568', '#C9A227', '#4FA8A0']
function colorForProject(id) {
  if (!id) return '#8A8378'
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

const DAY_W  = 100 / 7
const LANE_H = 40

export default function Schedule({ onNavigate }) {
  const { t, lang } = useT()
  const {
    roster, fetchRoster, projects, fetchProjects, tasks, fetchTasks,
    setSelectedProject, setPendingOpenTask,
  } = useStore()
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayStr()))

  useEffect(() => {
    fetchRoster()
    fetchProjects().then(() => fetchTasks())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const days    = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const weekEnd = days[6]
  const today   = todayStr()

  const dayHeaderFmt = useMemo(() => new Intl.DateTimeFormat(lang, { weekday: 'short' }), [lang])
  const rangeStartFmt = useMemo(() => new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }), [lang])
  const rangeEndFmt   = useMemo(() => new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' }), [lang])

  const goPrev  = () => setWeekStart(w => addDays(w, -7))
  const goNext  = () => setWeekStart(w => addDays(w, 7))
  const goToday = () => setWeekStart(mondayOf(today))

  const openTask = (task) => {
    setSelectedProject(task.project_id)
    setPendingOpenTask(String(task.id))
    onNavigate?.('projects')
  }

  const rows = useMemo(
    () => [...roster].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [roster]
  )

  // Per worker: tasks overlapping the visible week, laid out into
  // non-overlapping lanes (greedy interval scheduling) so simultaneous
  // assignments stack instead of colliding, with day-index clipped to
  // this week's 7 columns (a task can run longer — it just shows as
  // touching the edge, same idea as the reference screenshot).
  const laneMap = useMemo(() => {
    const map = {}
    for (const row of rows) {
      const own = tasks.filter(tk => {
        if (tk.worker_id !== row.id) return false
        const start = tk.start_date || tk.deadline
        const end   = tk.deadline || tk.start_date
        if (!start || !end) return false
        return start <= weekEnd && end >= weekStart
      })
      const withRange = own
        .map(tk => {
          const start = tk.start_date || tk.deadline
          const end   = tk.deadline || tk.start_date
          const startIdx = Math.max(0, days.findIndex(d => d >= start))
          const rawEndIdx = days.findIndex(d => d >= end)
          const endIdx = rawEndIdx === -1 ? 6 : Math.max(startIdx, rawEndIdx)
          return { task: tk, startIdx, endIdx }
        })
        .sort((a, b) => a.startIdx - b.startIdx)

      const lanes = []
      for (const item of withRange) {
        let lane = lanes.find(l => l.length === 0 || l[l.length - 1].endIdx < item.startIdx)
        if (!lane) { lane = []; lanes.push(lane) }
        lane.push(item)
      }
      map[row.id] = lanes
    }
    return map
  }, [rows, tasks, weekStart, weekEnd, days])

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* ── Week navigation ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:4 }}>
          <button onClick={goPrev} className="btn-icon" aria-label="prev"><CaretLeft size={14} weight="bold" /></button>
          <button onClick={goNext} className="btn-icon" aria-label="next"><CaretRight size={14} weight="bold" /></button>
        </div>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--text-1,#2E2420)' }}>
          {rangeStartFmt.format(new Date(`${weekStart}T00:00:00`))} — {rangeEndFmt.format(new Date(`${weekEnd}T00:00:00`))}
        </div>
        {weekStart !== mondayOf(today) && (
          <button onClick={goToday} className="filter-btn">{t('schedule.today')}</button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState>{t('schedule.noWorkers')}</EmptyState>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <div style={{ minWidth: 720 }}>

            {/* ── Day-of-week header ── */}
            <div style={{ display:'flex', borderBottom:'1.5px solid var(--border-medium)', paddingBottom:6, marginBottom:6 }}>
              <div style={{ width:180, flexShrink:0 }} />
              <div style={{ flex:1, display:'flex' }}>
                {days.map(d => {
                  const dow       = new Date(`${d}T00:00:00`).getDay()
                  const isWeekend = dow === 0 || dow === 6
                  const isToday   = d === today
                  return (
                    <div key={d} style={{ flex:1, textAlign:'center' }}>
                      <div style={{
                        fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.03em',
                        color: isToday ? 'var(--accent)' : isWeekend ? 'var(--text-faint)' : 'var(--text-muted)',
                      }}>
                        {dayHeaderFmt.format(new Date(`${d}T00:00:00`))}
                      </div>
                      <div style={{ fontSize:13, fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--accent)' : 'var(--text-1,#2E2420)' }}>
                        {Number(d.slice(8, 10))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Worker rows ── */}
            {rows.map(row => {
              const lanes  = laneMap[row.id] || []
              const height = Math.max(1, lanes.length) * LANE_H

              return (
                <div key={row.id} style={{ display:'flex', borderBottom:'1px solid var(--border,#EAE3D8)', minHeight: height + 12, alignItems:'center' }}>
                  {/* Label */}
                  <div style={{ width:180, flexShrink:0, display:'flex', alignItems:'center', gap:8, paddingRight:8 }}>
                    <div style={{
                      width:32, height:32, borderRadius:'50%', flexShrink:0,
                      background:'var(--accent-light,var(--accent-light))', color:'var(--accent)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700,
                    }}>
                      {row.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1,#2E2420)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {row.name}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                        {t(`roles.${row.role}`)}
                      </div>
                    </div>
                  </div>

                  {/* Day columns + bars */}
                  <div style={{ flex:1, position:'relative', height }}>
                    {/* weekend/today background tint, aligned with the header above */}
                    <div style={{ position:'absolute', inset:0, display:'flex' }}>
                      {days.map(d => {
                        const dow       = new Date(`${d}T00:00:00`).getDay()
                        const isWeekend = dow === 0 || dow === 6
                        const isToday   = d === today
                        return (
                          <div key={d} style={{
                            flex:1, borderLeft:'1px solid var(--border,#EAE3D8)',
                            background: isToday ? 'var(--accent-light)' : isWeekend ? 'var(--bg-accent,#F2EDE4)' : 'transparent',
                          }} />
                        )
                      })}
                    </div>

                    {lanes.map((lane, li) => lane.map(({ task, startIdx, endIdx }) => {
                      const project = projects.find(p => p.id === task.project_id)
                      return (
                        <div
                          key={task.id}
                          onClick={() => openTask(task)}
                          title={project ? `${task.text} — ${project.name}` : task.text}
                          style={{
                            position:'absolute', top: li * LANE_H + 3, height: LANE_H - 6,
                            left: `calc(${startIdx * DAY_W}% + 2px)`,
                            width: `calc(${(endIdx - startIdx + 1) * DAY_W}% - 4px)`,
                            background: colorForProject(task.project_id), color:'#fff',
                            borderRadius:7, padding:'3px 8px', cursor:'pointer', overflow:'hidden',
                            display:'flex', flexDirection:'column', justifyContent:'center',
                          }}
                        >
                          <div style={{ fontSize:12, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {task.text}
                          </div>
                          {project && (
                            <div style={{ fontSize:10, opacity:.85, display:'flex', alignItems:'center', gap:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                              <Buildings size={9} weight="bold" /> {project.name}
                            </div>
                          )}
                        </div>
                      )
                    }))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
