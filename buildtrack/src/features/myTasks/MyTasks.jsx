import { useState, useEffect } from 'react'
import { Badge, Button, StatCard, EmptyState } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'
import { useStore, PRIORITY_BADGE, PRIORITY_LABEL, STATUS_LABEL, STATUS_BADGE, STAGES } from '../../store/useStore'
import { supabase } from '../../lib/supabase'
import TaskComments from '../../components/TaskComments'
import MaterialModal from '../../components/MaterialModal'
import { TaskMedia } from '../tasks/TaskCard'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d    = new Date(dateStr)
  const diff = (Date.now() - d) / 1000
  if (diff < 60)     return 'just now'
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString('en', { day: 'numeric', month: 'short' })
}

// ─── MY TASKS (worker) ───────────────────────────────────────────────────────
export default function MyTasks() {
  const { t } = useT()
  const { tasks, fetchTasks, submitTask, profile, materials } = useStore()
  const [filter, setFilter]             = useState('active')
  const [uploadingId, setUploadingId]   = useState(null)
  const [openId, setOpenId]             = useState(null)
  const [openStages, setOpenStages]     = useState({})

  useEffect(() => { fetchTasks() }, [])

  const mine = tasks.filter(t => t.worker_id === profile?.id)
  const filtered = mine.filter(t =>
    filter === 'active'  ? ['new','rejected'].includes(t.status) :
    filter === 'pending' ? t.status === 'pending' :
    filter === 'done'    ? t.status === 'approved' : true
  )

  const PRIORITY_ORDER = { high: 0, normal: 1, low: 2 }
  const STATUS_ORDER   = { rejected: 0, new: 1, pending: 2, approved: 3 }
  const sortTasks = (arr) => [...arr].sort((a, b) => {
    const sd = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    if (sd !== 0) return sd
    const pd = (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
    if (pd !== 0) return pd
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
    if (a.deadline) return -1
    if (b.deadline) return 1
    return 0
  })

  // Group by stage, preserve STAGES order
  const stageGroups = (() => {
    const map = {}
    filtered.forEach(tk => {
      const key = tk.stage || '—'
      if (!map[key]) map[key] = []
      map[key].push(tk)
    })
    // Sort groups: stages with active/rejected tasks first, then by STAGES order
    return Object.entries(map).sort(([a], [b]) => {
      const ai = STAGES.indexOf(a), bi = STAGES.indexOf(b)
      if (a === '—') return 1
      if (b === '—') return -1
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    }).map(([stage, items]) => ({ stage, items: sortTasks(items) }))
  })()

  // Auto-open stages that have active tasks on first load
  useEffect(() => {
    if (filtered.length === 0) return
    const initial = {}
    stageGroups.forEach(({ stage, items }) => {
      const hasUrgent = items.some(tk => ['new','rejected'].includes(tk.status))
      initial[stage] = hasUrgent || stageGroups.length === 1
    })
    setOpenStages(initial)
  }, [filter, tasks])

  const toggleStage = (stage) => setOpenStages(prev => ({ ...prev, [stage]: !prev[stage] }))

  const STAGE_COLORS = [
    '#C96B3A','#5A9467','#4A7FC1','#D4A843','#9B6B9B',
    '#E07B6A','#6BAA8E','#7B8EC8','#A67C52','#3A5FAB',
  ]

  const uploadPhoto = async (taskId, file) => {
    if (!file) return
    setUploadingId(taskId)
    try {
      const ext = file.name.split('.').pop()
      const path = `${profile.id}/${taskId}_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('task-photos').upload(path, file, { upsert: true })
      if (upErr) { alert('Upload failed'); setUploadingId(null); return }
      const { data } = supabase.storage.from('task-photos').getPublicUrl(path)
      await supabase.from('tasks').update({ photo_url: data.publicUrl }).eq('id', taskId)
      fetchTasks()
    } catch(e) { alert('Error') }
    setUploadingId(null)
  }

  return (
    <div>
      <div className="page-header"><h1 className="page-title">{t('tasks.title')}</h1></div>
      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        <StatCard label={t('tasks.statTotal')}     value={mine.length} />
        <StatCard label={t('tasks.statActive')}    value={mine.filter(tk => ['new','rejected'].includes(tk.status)).length} />
        <StatCard label={t('tasks.statCompleted')} value={mine.filter(tk => tk.status==='approved').length} />
      </div>
      <div className="filter-bar">
        <button className={`filter-btn ${filter==='active'  ?'active':''}`} onClick={() => setFilter('active')}>{t('tasks.filterActive')}</button>
        <button className={`filter-btn ${filter==='pending' ?'active':''}`} onClick={() => setFilter('pending')}>{t('tasks.filterReview')}</button>
        <button className={`filter-btn ${filter==='done'    ?'active':''}`} onClick={() => setFilter('done')}>{t('tasks.filterDone')}</button>
        <button className={`filter-btn ${filter==='all'     ?'active':''}`} onClick={() => setFilter('all')}>{t('tasks.filterAll')}</button>
      </div>

      {filtered.length === 0 && <EmptyState>{t('tasks.noTasks')}</EmptyState>}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {stageGroups.map(({ stage, items }, gi) => {
          const color    = STAGE_COLORS[gi % STAGE_COLORS.length]
          const total    = items.length
          const done     = items.filter(tk => tk.status === 'approved').length
          const pct      = total ? Math.round((done / total) * 100) : 0
          const isOpen   = !!openStages[stage]
          const hasAlert = items.some(tk => tk.status === 'rejected')

          return (
            <div key={stage} style={{ borderRadius:14, overflow:'hidden', border:'1.5px solid #EAE3D8', background:'#fff' }}>
              {/* Stage header */}
              <div onClick={() => toggleStage(stage)} style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'12px 14px', cursor:'pointer',
                background: isOpen ? '#FDFBF8' : '#fff',
                borderBottom: isOpen ? '1px solid #EAE3D8' : 'none',
              }}>
                {/* Color dot */}
                <div style={{ width:10, height:10, borderRadius:'50%', background:color, flexShrink:0 }} />

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'#2E2420', textTransform:'uppercase', letterSpacing:'.04em' }}>
                      {stage}
                    </span>
                    {hasAlert && <span style={{ fontSize:11, color:'#A32D2D', fontWeight:600 }}>⚡ требует внимания</span>}
                    <span style={{ marginLeft:'auto', fontSize:11, color:'#B8AFA6', fontWeight:500, flexShrink:0 }}>
                      {done}/{total}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height:5, borderRadius:3, background:'#EAE3D8', overflow:'hidden' }}>
                    <div style={{
                      height:'100%', borderRadius:3,
                      width: `${pct}%`,
                      background: pct === 100 ? '#5A9467' : color,
                      transition: 'width .4s ease',
                    }} />
                  </div>
                </div>

                <span style={{ fontSize:11, color:'#B8AFA6', flexShrink:0, marginLeft:4 }}>
                  {isOpen ? '▲' : '▼'}
                </span>
              </div>

              {/* Tasks inside */}
              {isOpen && (
                <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                  {items.map((tk, ti) => {
                    const isTaskOpen = openId === tk.id
                    return (
                      <div key={tk.id} style={{
                        borderTop: ti > 0 ? '1px solid #F2EDE6' : 'none',
                        background: isTaskOpen ? '#FAECE4' : '#fff',
                        transition: 'background .15s',
                      }}>
                        <div onClick={() => setOpenId(prev => prev === tk.id ? null : tk.id)}
                          style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', cursor:'pointer' }}>
                          {/* Left accent line */}
                          <div style={{ width:3, height:36, borderRadius:2, background: color, flexShrink:0, opacity: isTaskOpen ? 1 : 0.35 }} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:600, color: isTaskOpen ? '#C96B3A' : '#2E2420', marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                              {tk.text}
                            </div>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:5, alignItems:'center' }}>
                              <Badge variant={STATUS_BADGE[tk.status]?.replace('badge-','')}>{STATUS_LABEL[tk.status]}</Badge>
                              {tk.priority && tk.priority !== 'normal' && <Badge variant={PRIORITY_BADGE[tk.priority]}>{PRIORITY_LABEL[tk.priority]}</Badge>}
                              {tk.deadline && <span style={{ fontSize:10, color:'#B8AFA6' }}>📅 {tk.deadline}</span>}
                            </div>
                          </div>
                          <span style={{ fontSize:10, color:'#B8AFA6', flexShrink:0 }}>{isTaskOpen ? '▲' : '▼'}</span>
                        </div>
                        {isTaskOpen && (
                          <div style={{ borderTop:'1px solid #EAE3D8', padding:'12px 14px', background:'#FDFBF8' }}>
                            {tk.description
                              ? <div style={{ fontSize:13, color:'#2E2420', lineHeight:1.65, whiteSpace:'pre-wrap', marginBottom:10 }}>{tk.description}</div>
                              : <div style={{ fontSize:12, color:'#B8AFA6', marginBottom:10 }}>{t('tasks.noDesc')}</div>
                            }
                            <TaskMedia urls={tk.photo_url} />
                            {tk.status === 'rejected' && tk.reject_comment && (
                              <div style={{ marginTop:10, fontSize:12, color:'#A32D2D', background:'#FCEBEB', padding:'6px 10px', borderRadius:7 }}>
                                ↩ {tk.reject_comment}
                              </div>
                            )}
                            {['new','rejected'].includes(tk.status) && (
                              <div style={{ marginTop:12, display:'flex', gap:8, alignItems:'center' }}>
                                <label className="btn btn-sm" style={{ cursor:'pointer' }}>
                                  {uploadingId===tk.id ? t('tasks.uploadingBtn') : t('tasks.photoBtn')}
                                  <input type="file" accept="image/*,video/*" capture="environment"
                                    style={{ display:'none' }}
                                    onChange={e => uploadPhoto(tk.id, e.target.files[0])} />
                                </label>
                                <Button variant="primary" size="sm" onClick={() => submitTask(tk.id)}>{t('tasks.submitBtn')}</Button>
                              </div>
                            )}
                            <TaskComments taskId={tk.id} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── My open shortages ── */}
      {(() => {
        const myShortages = materials.filter(m => m.reportedBy === profile?.name && m.status === 'needed')
        if (myShortages.length === 0) return null
        return (
          <div style={{ marginTop:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#A32D2D', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:8 }}>
              {t('tasks.myOpenShortages')}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {myShortages.map(m => (
                <div key={m.id} style={{ background:'#FCEBEB', border:'1px solid #F0AAAA', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#A32D2D' }}>
                    {m.name} <span style={{ fontSize:12, fontWeight:700 }}>× {m.qty} {m.unit}</span>
                  </div>
                  <div style={{ fontSize:11, color:'#7A6E66', marginTop:3 }}>
                    {timeAgo(m.createdAt)} · <span style={{ color:'#B8AFA6' }}>{t('tasks.waitingForeman')}</span>
                  </div>
                  {m.note && <div style={{ fontSize:11, color:'#B8AFA6', fontStyle:'italic', marginTop:2 }}>"{m.note}"</div>}
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
