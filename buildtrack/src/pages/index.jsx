import { useState, useEffect, useRef } from 'react'
import { useStore, PRIORITY_BADGE, PRIORITY_LABEL, TOOL_STATUS_BADGE, TOOL_STATUS_LABEL, STATUS_LABEL, STATUS_BADGE, STAGES, PRIORITY_OPTIONS } from '../store/useStore'
import { Badge, Button, StatCard, ProgressBar, SectionTitle, EmptyState, IconButton, FormGroup } from '../components/UI'
import { useT } from '../i18n/useLanguage'
import TaskModal from '../components/TaskModal'
import ConfirmModal from '../components/ConfirmModal'
import MaterialModal from '../components/MaterialModal'
import MaterialList  from '../components/MaterialList'
import { supabase } from '../lib/supabase'

const STAGE_OPTIONS = ['Foundation','Electrical','Walls','Roofing','Finishing']

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

// ─── MEDIA LIGHTBOX ──────────────────────────────────────────────────────────
function MediaLightbox({ urls, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex)
  const isVideo = (u) => /\.(mp4|mov|webm|avi|mkv)$/i.test(u)
  const url = urls[idx]

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape')     onClose()
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, urls.length - 1))
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [urls.length])

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}
    >
      <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:36, height:36, color:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
      {urls.length > 1 && (
        <div style={{ position:'absolute', top:20, left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,0.6)', fontSize:13 }}>{idx + 1} / {urls.length}</div>
      )}
      <div onClick={e => e.stopPropagation()} style={{ maxWidth:'94vw', maxHeight:'80dvh', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {isVideo(url) ? (
          <video key={url} src={url} controls autoPlay style={{ maxWidth:'94vw', maxHeight:'80dvh', borderRadius:10 }} />
        ) : (
          <img key={url} src={url} alt="" style={{ maxWidth:'94vw', maxHeight:'80dvh', borderRadius:10, objectFit:'contain' }} />
        )}
      </div>
      {urls.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setIdx(i => Math.max(i - 1, 0)) }} disabled={idx === 0}
            style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:40, height:40, color:'#fff', fontSize:20, cursor:'pointer', opacity: idx === 0 ? 0.3 : 1 }}>‹</button>
          <button onClick={e => { e.stopPropagation(); setIdx(i => Math.min(i + 1, urls.length - 1)) }} disabled={idx === urls.length - 1}
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:40, height:40, color:'#fff', fontSize:20, cursor:'pointer', opacity: idx === urls.length - 1 ? 0.3 : 1 }}>›</button>
        </>
      )}
      {urls.length > 1 && (
        <div style={{ position:'absolute', bottom:24, display:'flex', gap:6 }}>
          {urls.map((_, i) => (
            <div key={i} onClick={e => { e.stopPropagation(); setIdx(i) }} style={{ width:7, height:7, borderRadius:'50%', background: i === idx ? '#fff' : 'rgba(255,255,255,0.35)', cursor:'pointer' }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── TASK MEDIA THUMBNAILS ───────────────────────────────────────────────────
function TaskMedia({ urls }) {
  const [lightbox, setLightbox] = useState(null)
  if (!urls) return null
  const list = urls.split(',').filter(Boolean)
  if (!list.length) return null
  const isVideo = (u) => /\.(mp4|mov|webm|avi|mkv)$/i.test(u)
  return (
    <>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
        {list.map((url, i) => (
          <div key={i} onClick={() => setLightbox(i)} style={{ position:'relative', cursor:'pointer', flexShrink:0 }}>
            {isVideo(url)
              ? <div style={{ width:72, height:72, borderRadius:8, border:'1px solid #EAE3D8', background:'#111', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:22 }}>▶</div>
              : <img src={url} alt="" style={{ width:72, height:72, objectFit:'cover', borderRadius:8, border:'1px solid #EAE3D8', display:'block' }} />
            }
          </div>
        ))}
      </div>
      {lightbox !== null && <MediaLightbox urls={list} startIndex={lightbox} onClose={() => setLightbox(null)} />}
    </>
  )
}

// ─── TASK MATERIAL SECTION (shown inside an expanded task card) ──────────────
function TaskMaterialSection({ task }) {
  const { t } = useT()
  const { materials, role, profile, projects,
          markMaterialPurchased, markMaterialNeeded, deleteMaterial } = useStore()
  const [showModal, setShowModal] = useState(false)

  const taskMaterials = materials.filter(m => m.taskId === task.id)
  const openCount     = taskMaterials.filter(m => m.status === 'needed').length

  const toggle = (id) => {
    const m = materials.find(x => x.id === id)
    if (!m) return
    m.status === 'needed' ? markMaterialPurchased(id) : markMaterialNeeded(id)
  }

  const handleDelete = (id) => {
    const m = materials.find(x => x.id === id)
    if (!m) return
    if (role === 'foreman' || m.reportedBy === profile?.name) deleteMaterial(id)
  }

  return (
    <>
      <div style={{ height:1, background:'#EAE3D8', margin:'10px 0 8px' }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6', display:'flex', alignItems:'center', gap:6 }}>
          📦 {t('materials.title')}
          {openCount > 0 && (
            <span style={{ background:'#FCEBEB', color:'#A32D2D', fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:8 }}>
              {t('materials.needed', { n: openCount })}
            </span>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); setShowModal(true) }}
          style={{ fontSize:11, fontWeight:600, color:'#C96B3A', background:'#FAECE4', border:'none', borderRadius:8, padding:'4px 10px', cursor:'pointer' }}
        >
          {t('materials.reportShortage')}
        </button>
      </div>

      <MaterialList
        materials={taskMaterials}
        showProject={false}
        projects={projects}
        onTogglePurchased={role === 'foreman' ? toggle : undefined}
        onDelete={handleDelete}
        role={role}
        profile={profile}
      />

      {showModal && (
        <MaterialModal
          open={showModal}
          onClose={() => setShowModal(false)}
          defaultProjectId={task.project_id}
          defaultTaskId={task.id}
        />
      )}
    </>
  )
}

// ─── TASK ACCORDION CARD ─────────────────────────────────────────────────────
function TaskCard({ t, openId, setOpenId, onEdit, onDelete, onApprove, onReject, showProject, projects }) {
  const { t: tr } = useT()
  const isOpen = openId === t.id
  const projName = showProject && projects ? projects.find(p => p.id === t.project_id)?.name : null
  return (
    <div style={{
      background: '#fff',
      border: `1.5px solid ${isOpen ? '#C96B3A' : '#EAE3D8'}`,
      borderRadius: 10, overflow: 'hidden',
      boxShadow: isOpen ? '0 3px 10px rgba(201,107,58,0.10)' : 'none',
      transition: 'border-color .15s, box-shadow .15s',
    }}>
      <div onClick={() => setOpenId(prev => prev === t.id ? null : t.id)}
        style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', cursor:'pointer', background: isOpen ? '#FAECE4' : '#fff' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color: isOpen ? '#C96B3A' : '#2E2420', marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {t.text}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, alignItems:'center' }}>
            <Badge variant={PRIORITY_BADGE[t.priority]?.replace('badge-','')}>{PRIORITY_LABEL[t.priority]}</Badge>
            {t.stage    && <Badge variant="gray">{t.stage}</Badge>}
            {t.deadline && <span style={{ fontSize:10, color:'#B8AFA6' }}>📅 {t.deadline}</span>}
            {t.worker   && <span style={{ fontSize:10, color:'#B8AFA6' }}>👷 {t.worker.name}</span>}
            {projName   && <span style={{ fontSize:10, color:'#B8AFA6' }}>🏗 {projName}</span>}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
          {onEdit   && <IconButton onClick={e => { e.stopPropagation(); onEdit(t) }}>✏️</IconButton>}
          {onDelete && <IconButton className="danger" onClick={e => { e.stopPropagation(); onDelete(t.id) }}>🗑</IconButton>}
          <span style={{ fontSize:10, color:'#B8AFA6', marginLeft:2 }}>{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>
      {isOpen && (
        <div style={{ borderTop:'1px solid #EAE3D8', padding:'12px 13px', background:'#FDFBF8' }}>
          {t.description
            ? <div style={{ fontSize:13, color:'#2E2420', lineHeight:1.65, whiteSpace:'pre-wrap', marginBottom:10 }}>{t.description}</div>
            : <div style={{ fontSize:12, color:'#B8AFA6', marginBottom:10 }}>{tr('tasks.noDesc')}</div>
          }
          <TaskMedia urls={t.photo_url} />
          {t.status === 'rejected' && t.reject_comment && (
            <div style={{ marginTop:10, fontSize:12, color:'#A32D2D', background:'#FCEBEB', padding:'6px 10px', borderRadius:7 }}>↩ {t.reject_comment}</div>
          )}
          {t.status === 'pending' && onApprove && (
            <div style={{ marginTop:12, display:'flex', gap:8 }}>
              <Button size="sm" variant="primary" onClick={() => onApprove(t.id)}>{tr('tasks.approve')}</Button>
              <Button size="sm" variant="danger"  onClick={() => onReject(t.id)}>{tr('tasks.reject')}</Button>
            </div>
          )}
          <TaskMaterialSection task={t} />
        </div>
      )}
    </div>
  )
}

// ─── STATUS SECTION ──────────────────────────────────────────────────────────
function StatusSection({ icon, label, color, bg, tasks, openId, setOpenId, onEdit, onDelete, onApprove, onReject, showProject, projects }) {
  if (tasks.length === 0) return null
  return (
    <div style={{ marginBottom:6 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 2px', marginBottom:5 }}>
        <span style={{ fontSize:12 }}>{icon}</span>
        <span style={{ fontSize:11, fontWeight:700, color, letterSpacing:'.04em' }}>{label}</span>
        <span style={{ fontSize:11, background:bg, color, borderRadius:8, padding:'1px 7px', fontWeight:700 }}>{tasks.length}</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {tasks.map(t => (
          <TaskCard key={t.id} t={t} openId={openId} setOpenId={setOpenId}
            onEdit={onEdit} onDelete={onDelete} onApprove={onApprove} onReject={onReject}
            showProject={showProject} projects={projects} />
        ))}
      </div>
    </div>
  )
}

// ─── OVERVIEW TAB ────────────────────────────────────────────────────────────
function OverviewTab({ proj, tasks, tools, onEdit }) {
  const { t } = useT()
  const pTasks  = tasks.filter(t => t.project_id === proj.id)
  const pDone   = pTasks.filter(t => t.status === 'approved').length
  const pActive = pTasks.filter(t => t.status !== 'approved').length
  const pPct    = pTasks.length === 0 ? 0 : Math.round((pDone / pTasks.length) * 100)
  const daysLeft = proj.deadline ? Math.max(0, Math.ceil((new Date(proj.deadline) - new Date()) / 86400000)) : null
  const projTools = tools.filter(t => t.project_id === proj.id)

  return (
    <div style={{ padding:'0 0 24px' }}>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
        {[
          { v: pPct+'%',  l: t('detail.progress'), c: '#C96B3A' },
          { v: pActive,   l: t('detail.active'),   c: pActive > 0 ? '#C96B3A' : '#2E2420' },
          { v: daysLeft !== null ? daysLeft+'d' : '—', l: t('detail.daysLeft'), c: daysLeft !== null && daysLeft < 7 ? '#A32D2D' : '#2E2420' },
        ].map(s => (
          <div key={s.l} style={{ background:'#F2EDE4', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:700, color:s.c }}>{s.v}</div>
            <div style={{ fontSize:10, color:'#B8AFA6', marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ height:5, background:'#EAE3D8', borderRadius:5, overflow:'hidden', marginBottom:16 }}>
        <div style={{ height:5, borderRadius:5, background:'#C96B3A', width:`${pPct}%`, transition:'width .4s' }} />
      </div>

      {/* Address */}
      {(proj.address || proj.deadline) && (
        <div style={{ background:'#F2EDE4', borderRadius:10, padding:'10px 12px', marginBottom:14 }}>
          {proj.address && (
            <div onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(proj.address)}`, '_blank')}
              style={{ fontSize:12, fontWeight:600, color:'#C96B3A', cursor:'pointer', textDecoration:'underline', marginBottom:4 }}>
              📍 {proj.address}
            </div>
          )}
          {proj.deadline && (
            <div style={{ fontSize:11, color:'#B8AFA6' }}>
              📅 {t('detail.deadlineLabel')} {proj.deadline}
              {daysLeft !== null && <span style={{ color: daysLeft < 7 ? '#A32D2D' : '#C96B3A', fontWeight:600, marginLeft:6 }}>· {t('detail.daysLeftText', { n: daysLeft })}</span>}
            </div>
          )}
        </div>
      )}

      {/* Edit button */}
      {onEdit && (
        <Button size="sm" onClick={() => onEdit(proj)} style={{ marginBottom:14 }}>✏️ {t('detail.editProject')}</Button>
      )}

      {/* Active tasks preview */}
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6', marginBottom:8 }}>⚡ {t('detail.activeTasks')}</div>
      {pTasks.filter(t => t.status !== 'approved').length === 0
        ? <div style={{ fontSize:12, color:'#B8AFA6', marginBottom:14 }}>{t('detail.noActiveTasks')}</div>
        : pTasks.filter(t => t.status !== 'approved').slice(0,4).map(t => (
          <div key={t.id} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background: t.status==='pending'?'#D4A843':'#C96B3A', flexShrink:0 }} />
            <div style={{ flex:1, fontSize:12, color:'#2E2420' }}>{t.text}</div>
            <div style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10, background: t.status==='pending'?'#FBF3DC':'#FAECE4', color: t.status==='pending'?'#9A6E10':'#C96B3A' }}>
              {STATUS_LABEL[t.status]}
            </div>
          </div>
        ))
      }

      {/* Tools on site */}
      <div style={{ height:1, background:'#EAE3D8', margin:'12px 0 10px' }} />
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6', marginBottom:8 }}>🔧 {t('detail.toolsOnSite')}</div>
      {projTools.length === 0
        ? <div style={{ fontSize:12, color:'#B8AFA6' }}>{t('detail.noTools')}</div>
        : <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {projTools.map(t => (
              <div key={t.id} style={{ background:'#F2EDE4', borderRadius:6, padding:'3px 9px', fontSize:10, color:'#7A6E66' }}>{t.name}</div>
            ))}
          </div>
      }
    </div>
  )
}

// ─── PROJECT TASKS TAB ───────────────────────────────────────────────────────
function ProjectTasksTab({ proj }) {
  const { t } = useT()
  const { tasks, fetchTasks, deleteTask, approveTask, rejectTask } = useStore()
  const [filter,   setFilter]   = useState('all')
  const [showAdd,  setShowAdd]  = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [openId,   setOpenId]   = useState(null)

  useEffect(() => { fetchTasks(proj.id) }, [proj.id])

  const pTasks = tasks.filter(t => t.project_id === proj.id)
  const filtered = pTasks.filter(t =>
    filter === 'active'  ? ['new','rejected'].includes(t.status) :
    filter === 'pending' ? t.status === 'pending' :
    filter === 'done'    ? t.status === 'approved' : true
  )
  const active  = filtered.filter(t => ['new','rejected'].includes(t.status))
  const pending = filtered.filter(t => t.status === 'pending')
  const done    = filtered.filter(t => t.status === 'approved')

  return (
    <div style={{ paddingBottom:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {['all','active','pending','done'].map(f => (
            <button key={f} className={`filter-btn ${filter===f?'active':''}`} onClick={() => setFilter(f)}
              style={{ fontSize:11, padding:'4px 10px' }}>
              {f === 'all'     ? `${t('tasks.filterAll')} (${pTasks.length})` :
               f === 'active'  ? t('tasks.filterActive') :
               f === 'pending' ? `${t('tasks.filterReview')} (${pTasks.filter(t=>t.status==='pending').length})` : t('tasks.filterDone')}
            </button>
          ))}
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>{t('tasks.add')}</Button>
      </div>

      {filtered.length === 0 && <EmptyState>{t('tasks.noTasks')}</EmptyState>}

      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        <StatusSection icon="⚡" label={t('tasks.filterActive')}    color="#C96B3A" bg="#FAECE4" tasks={active}  openId={openId} setOpenId={setOpenId}
          onEdit={setEditTask} onDelete={setDeleteId} />
        <StatusSection icon="🕐" label={t('tasks.filterReview')} color="#9A6E10" bg="#FBF3DC" tasks={pending} openId={openId} setOpenId={setOpenId}
          onEdit={setEditTask} onDelete={setDeleteId} onApprove={approveTask} onReject={(id) => rejectTask(id, 'Needs revision')} />
        <StatusSection icon="✅" label={t('tasks.filterDone')}      color="#3D7A52" bg="#E8F2EB" tasks={done}    openId={openId} setOpenId={setOpenId}
          onEdit={setEditTask} onDelete={setDeleteId} />
      </div>

      {(showAdd || editTask) && (
        <TaskModal task={editTask} defaultProjectId={proj.id} onClose={() => { setShowAdd(false); setEditTask(null); fetchTasks(proj.id) }} />
      )}
      {deleteId && (
        <ConfirmModal icon="🗑️" title={t('tasks.deleteTitle')} sub={tasks.find(t => t.id === deleteId)?.text}
          onConfirm={() => { deleteTask(deleteId); setDeleteId(null) }}
          onCancel={() => setDeleteId(null)} />
      )}
    </div>
  )
}

// ─── MATERIALS TAB ───────────────────────────────────────────────────────────
function MaterialsTab({ proj }) {
  const { t } = useT()
  const { materials, role, profile, projects,
          markMaterialPurchased, markMaterialNeeded, deleteMaterial } = useStore()
  const [filter,    setFilter]    = useState('open')
  const [showModal, setShowModal] = useState(false)

  const projMaterials = materials.filter(m => m.projectId === proj.id)
  const openCount     = projMaterials.filter(m => m.status === 'needed').length
  const weekAgo       = new Date(Date.now() - 7 * 86400000)
  const purchasedWeek = projMaterials.filter(m =>
    m.status === 'purchased' && m.purchasedAt && new Date(m.purchasedAt) > weekAgo
  ).length

  const filtered = projMaterials.filter(m =>
    filter === 'open'      ? m.status === 'needed'    :
    filter === 'purchased' ? m.status === 'purchased' : true
  )

  const toggle = (id) => {
    const m = materials.find(x => x.id === id)
    if (!m) return
    m.status === 'needed' ? markMaterialPurchased(id) : markMaterialNeeded(id)
  }

  const handleDelete = (id) => {
    const m = materials.find(x => x.id === id)
    if (!m) return
    if (role === 'foreman' || m.reportedBy === profile?.name) deleteMaterial(id)
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>{t('materials.reportShortage')}</Button>
      </div>

      {/* Stat mini-cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
        <div style={{ background:'#FCEBEB', border:'1px solid #F0AAAA', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
          <div style={{ fontSize:20, fontWeight:700, color:'#A32D2D' }}>{openCount}</div>
          <div style={{ fontSize:10, color:'#B8AFA6', marginTop:2 }}>{t('materials.statOpen')}</div>
        </div>
        <div style={{ background:'#E8F2EB', border:'1px solid #A8D4B4', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
          <div style={{ fontSize:20, fontWeight:700, color:'#3D7A52' }}>{purchasedWeek}</div>
          <div style={{ fontSize:10, color:'#B8AFA6', marginTop:2 }}>{t('materials.statWeek')}</div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="filter-bar" style={{ marginBottom:10 }}>
        {[
          { k:'all',       l:t('materials.filterAll', { n: projMaterials.length }) },
          { k:'open',      l:t('materials.filterOpen', { n: openCount }) },
          { k:'purchased', l:t('materials.filterPurchased') },
        ].map(({ k, l }) => (
          <button key={k} className={`filter-btn ${filter===k?'active':''}`}
            onClick={() => setFilter(k)} style={{ fontSize:11, padding:'4px 10px' }}>
            {l}
          </button>
        ))}
      </div>

      <MaterialList
        materials={filtered}
        showProject={false}
        projects={projects}
        onTogglePurchased={role === 'foreman' ? toggle : undefined}
        onDelete={handleDelete}
        role={role}
        profile={profile}
      />

      {showModal && (
        <MaterialModal
          open={showModal}
          onClose={() => setShowModal(false)}
          defaultProjectId={proj.id}
          defaultTaskId={null}
        />
      )}
    </div>
  )
}

// ─── STAGES TAB ──────────────────────────────────────────────────────────────
function StagesTab({ proj }) {
  const { t } = useT()
  const { tasks } = useStore()
  const [openStages, setOpenStages] = useState([])

  const pTasks = tasks.filter(t => t.project_id === proj.id)
  const STATUS_DOT = { approved:'#5A9467', pending:'#D4A843', new:'#B8AFA6', rejected:'#A32D2D' }

  const stageList = STAGE_OPTIONS.map((name, i) => {
    const stageTasks = pTasks.filter(t => t.stage === name)
    const done   = stageTasks.filter(t => t.status === 'approved').length
    const inWork = stageTasks.filter(t => ['new','pending','rejected'].includes(t.status)).length
    const total  = stageTasks.length
    const pct    = total === 0 ? 0 : Math.round((done / total) * 100)
    let cls = ''
    if (pct === 100 && total > 0) cls = 'done'
    else if (inWork > 0) cls = 'current'
    return { n: i+1, name, pct, cls, done, total, inWork, tasks: stageTasks }
  })

  return (
    <div style={{ paddingBottom:24 }}>
      <div className="tl-wrap">
        {stageList.map(s => {
          const isOpen   = openStages.includes(s.name)
          const barColor = s.cls==='done' ? '#5A9467' : s.cls==='current' ? '#C96B3A' : '#EAE3D8'
          const pctColor = s.cls==='done' ? '#5A9467' : s.cls==='current' ? '#C96B3A' : '#B8AFA6'
          return (
            <div key={s.n} className="tl-stage">
              <div className={`tl-dot ${s.cls || 'future'}`}>{s.cls==='done' ? '✓' : s.n}</div>
              <div className={`tl-card ${s.cls || 'future'}`}>
                <div className="tl-card-header" onClick={() => setOpenStages(prev => prev.includes(s.name) ? prev.filter(x => x !== s.name) : [...prev, s.name])}>
                  <div className="tl-card-name">{s.name}</div>
                  {s.inWork > 0 && <div className="tl-inwork">{t('tasks.inWork', { n: s.inWork })}</div>}
                  <div className="tl-bar-bg"><div className="tl-bar" style={{ width:`${s.pct}%`, background:barColor }} /></div>
                  <div className="tl-pct" style={{ color:pctColor }}>{s.pct}%</div>
                  <div className="tl-count">{s.total===0 ? '—' : `${s.done}/${s.total}`}</div>
                  <div className="tl-arrow">{isOpen ? '▲' : '▼'}</div>
                </div>
                {isOpen && (
                  <div className="tl-card-body">
                    {s.tasks.length === 0
                      ? <div className="tl-empty">{t('tasks.noTasksStage')}</div>
                      : s.tasks.map(tk => (
                        <div key={tk.id} className="tl-task">
                          <div className="tl-task-dot" style={{ background: STATUS_DOT[tk.status] || '#B8AFA6' }} />
                          <div className="tl-task-name">{tk.text}</div>
                          <Badge variant={STATUS_BADGE[tk.status]?.replace('badge-','')}>{STATUS_LABEL[tk.status]}</Badge>
                          {tk.deadline && <div className="tl-task-due">{t('tasks.due', { date: tk.deadline })}</div>}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── PHOTOS TAB ──────────────────────────────────────────────────────────────
function PhotosTab({ proj }) {
  const { tasks } = useStore()
  const [lightbox, setLightbox] = useState(null)

  const pTasks = tasks.filter(t => t.project_id === proj.id)
  const allUrls = pTasks.flatMap(t => t.photo_url ? t.photo_url.split(',').filter(Boolean) : [])
  const isVideo = (u) => /\.(mp4|mov|webm|avi|mkv)$/i.test(u)

  if (allUrls.length === 0) return (
    <div style={{ paddingBottom:24 }}>
      <EmptyState>No photos or videos yet</EmptyState>
    </div>
  )

  return (
    <div style={{ paddingBottom:24 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6 }}>
        {allUrls.map((url, i) => (
          <div key={i} onClick={() => setLightbox(i)} style={{ aspectRatio:'1', borderRadius:8, overflow:'hidden', cursor:'pointer', background:'#111', border:'1px solid #EAE3D8' }}>
            {isVideo(url)
              ? <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:24 }}>▶</div>
              : <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
            }
          </div>
        ))}
      </div>
      {lightbox !== null && <MediaLightbox urls={allUrls} startIndex={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}

// ─── PROJECT TEAM TAB ────────────────────────────────────────────────────────
function ProjectTeamTab({ proj }) {
  const { t } = useT()
  const { team, fetchTeam } = useStore()
  useEffect(() => { fetchTeam(proj.id) }, [proj.id])
  return (
    <div style={{ paddingBottom:24 }}>
      <div className="card" style={{ padding:0 }}>
        {team.length === 0 && <EmptyState>{t('detail.noTeam')}</EmptyState>}
        {team.map(m => (
          <div className="member-row" key={m.id}>
            <div className="member-avatar">{m.name?.charAt(0)?.toUpperCase()}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500 }}>{m.name}</div>
              <div style={{ fontSize:11, color:'#B8AFA6' }}>{m.role}</div>
            </div>
            <Badge variant="green">{t('detail.active')}</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── PROJECT DETAIL ──────────────────────────────────────────────────────────
function ProjectDetail({ proj, onBack, onEdit }) {
  const { t } = useT()
  const { tasks, tools, fetchTasks, fetchTools } = useStore()
  const [tab, setTab] = useState('overview')
  const TABS = [
    { id:'overview',   label: t('detail.overview')   },
    { id:'tasks',      label: t('detail.tasks')      },
    { id:'materials',  label: t('detail.materials')  },
    { id:'stages',     label: t('detail.stages')     },
    { id:'photos',     label: t('detail.photos')     },
    { id:'team',       label: t('detail.team')       },
  ]

  useEffect(() => {
    fetchTasks(proj.id)
    fetchTools(proj.id)
  }, [proj.id])

  const pct = (() => {
    const pt = tasks.filter(t => t.project_id === proj.id)
    return pt.length === 0 ? 0 : Math.round((pt.filter(t => t.status==='approved').length / pt.length) * 100)
  })()

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4, paddingTop:4 }}>
        <button onClick={onBack} style={{ background:'#F2EDE4', border:'none', borderRadius:8, padding:'5px 10px', fontSize:12, color:'#7A6E66', cursor:'pointer', flexShrink:0 }}>
          {t('common.back')}
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'#2E2420', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            🏗 {proj.name}
          </div>
        </div>
        <IconButton onClick={() => onEdit(proj)} title="Edit project">✏️</IconButton>
      </div>

      {/* ── Progress strip ── */}
      <div style={{ height:4, background:'#EAE3D8', borderRadius:4, overflow:'hidden', marginBottom:0 }}>
        <div style={{ height:4, borderRadius:4, background:'#C96B3A', width:`${pct}%`, transition:'width .4s' }} />
      </div>

      {/* ── Inner tab bar ── */}
      <div className="inner-tab-bar">
        {TABS.map(t => (
          <button key={t.id} className={`inner-tab-btn ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === 'overview'   && <OverviewTab proj={proj} tasks={tasks} tools={tools} onEdit={onEdit} />}
      {tab === 'tasks'      && <ProjectTasksTab proj={proj} />}
      {tab === 'materials'  && <MaterialsTab proj={proj} />}
      {tab === 'stages'     && <StagesTab proj={proj} />}
      {tab === 'photos'     && <PhotosTab proj={proj} />}
      {tab === 'team'       && <ProjectTeamTab proj={proj} />}
    </div>
  )
}

// ─── PROJECT LIST ────────────────────────────────────────────────────────────
function ProjectList({ onSelect, onEdit, onDelete }) {
  const { t } = useT()
  const { projects, tasks, tools } = useStore()

  const overdueTasks = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'approved').length
  const pendingReview = tasks.filter(t => t.status === 'pending').length

  return (
    <div>
      {/* Summary chips */}
      {(overdueTasks > 0 || pendingReview > 0) && (
        <div className="summary-bar">
          {overdueTasks > 0 && (
            <div className="summary-chip danger">⚠️ {t('projects.overdue', { n: overdueTasks })}</div>
          )}
          {pendingReview > 0 && (
            <div className="summary-chip warning">🕐 {t('projects.forReview', { n: pendingReview })}</div>
          )}
        </div>
      )}

      {projects.length === 0 && <EmptyState>{t('projects.noProjects')}</EmptyState>}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {projects.map(p => {
          const pTasks  = tasks.filter(t => t.project_id === p.id)
          const pDone   = pTasks.filter(t => t.status === 'approved').length
          const pActive = pTasks.filter(t => t.status !== 'approved').length
          const pPct    = pTasks.length === 0 ? 0 : Math.round((pDone / pTasks.length) * 100)
          const pOverdue = pTasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'approved').length
          const pPending = pTasks.filter(t => t.status === 'pending').length
          return (
            <div key={p.id} onClick={() => onSelect(p.id)} className="proj-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#2E2420' }}>🏗 {p.name}</div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#C96B3A', fontFamily:'monospace' }}>{pPct}%</div>
                  <IconButton onClick={e => { e.stopPropagation(); onEdit(p) }} title="Edit">✏️</IconButton>
                  <IconButton danger onClick={e => { e.stopPropagation(); onDelete(p.id) }} title="Delete">🗑</IconButton>
                </div>
              </div>
              <div style={{ height:4, background:'#EAE3D8', borderRadius:4, overflow:'hidden', marginBottom:8 }}>
                <div style={{ height:4, borderRadius:4, background:'#C96B3A', width:`${pPct}%`, transition:'width .4s' }} />
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                <Badge variant="blue">{p.stage}</Badge>
                {p.deadline && <span style={{ fontSize:11, color:'#B8AFA6' }}>📅 {p.deadline}</span>}
                <span style={{ fontSize:11, color:'#B8AFA6' }}>✅ {pDone}/{pTasks.length}</span>
                {pActive  > 0 && <span style={{ fontSize:11, color:'#C96B3A', fontWeight:600 }}>⚡ {pActive}</span>}
                {pPending > 0 && <span style={{ fontSize:11, color:'#D4A843', fontWeight:600 }}>🕐 {pPending}</span>}
                {pOverdue > 0 && <span style={{ fontSize:11, color:'#A32D2D', fontWeight:600 }}>⚠️ {pOverdue}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── PROJECTS (two-mode: list ↔ detail) ─────────────────────────────────────
export function Projects() {
  const { t } = useT()
  const { projects, tasks, tools, fetchProjects, fetchTasks, fetchTools, updateProject, profile, selectedProjectId, setSelectedProject } = useStore()
  const [showAdd,    setShowAdd]    = useState(false)
  const [confirmId,  setConfirmId]  = useState(null)
  const [editProject, setEditProject] = useState(null)
  const [editForm,   setEditForm]   = useState({ name:'', stage:'Foundation', deadline:'', address:'', progress:0 })
  const [editSaving, setEditSaving] = useState(false)
  const [addForm,    setAddForm]    = useState({ name:'', stage:'Foundation', deadline:'', address:'' })

  useEffect(() => {
    fetchProjects()
    fetchTasks()
    fetchTools()
  }, [])

  const setA = (field) => (e) => setAddForm(f => ({ ...f, [field]: e.target.value }))
  const setE = (field) => (e) => setEditForm(f => ({ ...f, [field]: e.target.value }))

  const createProject = async () => {
    if (!addForm.name.trim()) return
    const { error } = await supabase.from('projects').insert({
      name: addForm.name, stage: addForm.stage,
      deadline: addForm.deadline || null,
      address: addForm.address || null,
      foreman_id: profile.id, progress: 0,
    })
    if (!error) {
      fetchProjects()
      setShowAdd(false)
      setAddForm({ name:'', stage:'Foundation', deadline:'', address:'' })
    }
  }

  const openEdit = (p) => {
    setEditProject(p)
    setEditForm({ name: p.name||'', stage: p.stage||'Foundation', deadline: p.deadline||'', address: p.address||'', progress: p.progress??0 })
  }

  const saveEdit = async () => {
    if (!editForm.name.trim()) return
    setEditSaving(true)
    await updateProject(editProject.id, {
      name: editForm.name.trim(), stage: editForm.stage,
      deadline: editForm.deadline || null, address: editForm.address || null,
      progress: Number(editForm.progress),
    })
    setEditSaving(false)
    setEditProject(null)
  }

  const deleteProject = async (id) => {
    await supabase.from('tasks').delete().eq('project_id', id)
    await supabase.from('tools').delete().eq('project_id', id)
    await supabase.from('project_workers').delete().eq('project_id', id)
    await supabase.from('projects').delete().eq('id', id)
    fetchProjects(); fetchTasks(); fetchTools()
    setConfirmId(null)
    if (selectedProjectId === id) setSelectedProject(null)
  }

  const selectedProj = projects.find(p => p.id === selectedProjectId)

  return (
    <div>
      {/* ── Two-mode ── */}
      {!selectedProjectId || !selectedProj ? (
        <>
          <div className="page-header">
            <h1 className="page-title">{t('projects.title')}</h1>
            <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>{t('projects.add')}</Button>
          </div>
          <ProjectList
            onSelect={(id) => setSelectedProject(id)}
            onEdit={openEdit}
            onDelete={(id) => setConfirmId(id)}
          />
        </>
      ) : (
        <ProjectDetail
          proj={selectedProj}
          onBack={() => setSelectedProject(null)}
          onEdit={openEdit}
        />
      )}

      {/* ── Add Project Modal ── */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">{t('projects.newModal')}</div>
            <FormGroup label={t('projects.nameLabel')}>
              <input className="form-input" placeholder={t('projects.namePlaceholder')}
                value={addForm.name} onChange={setA('name')} autoFocus />
            </FormGroup>
            <FormGroup label={t('projects.addressLabel')}>
              <input className="form-input" placeholder={t('projects.addressPlaceholder')}
                value={addForm.address} onChange={setA('address')} />
            </FormGroup>
            <div className="form-grid-2">
              <FormGroup label={t('projects.stageLabel')}>
                <select className="form-input" value={addForm.stage} onChange={setA('stage')}>
                  {STAGE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </FormGroup>
              <FormGroup label={t('projects.deadlineLabel')}>
                <input className="form-input" type="date" value={addForm.deadline} onChange={setA('deadline')} />
              </FormGroup>
            </div>
            <div className="modal-actions">
              <Button size="sm" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button>
              <Button variant="primary" size="sm" onClick={createProject}>{t('projects.create')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Project Modal ── */}
      {editProject && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditProject(null)}>
          <div className="modal">
            <div className="modal-title">{t('projects.editModal')}: {editProject.name}</div>
            <FormGroup label={t('projects.nameLabel')}>
              <input className="form-input" value={editForm.name} onChange={setE('name')} autoFocus />
            </FormGroup>
            <FormGroup label={t('projects.addressLabel')}>
              <input className="form-input" placeholder={t('projects.addressPlaceholder')} value={editForm.address} onChange={setE('address')} />
            </FormGroup>
            <div className="form-grid-2">
              <FormGroup label={t('projects.stageLabel')}>
                <select className="form-input" value={editForm.stage} onChange={setE('stage')}>
                  {STAGE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </FormGroup>
              <FormGroup label={t('projects.deadlineLabel')}>
                <input className="form-input" type="date" value={editForm.deadline} onChange={setE('deadline')} />
              </FormGroup>
            </div>
            <FormGroup label={t('projects.progressLabel', { pct: editForm.progress })}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <input type="range" min={0} max={100} step={1} value={editForm.progress}
                  onChange={setE('progress')} style={{ flex:1, accentColor:'#C96B3A' }} />
                <span style={{ fontSize:13, fontWeight:700, color:'#C96B3A', minWidth:36, textAlign:'right' }}>{editForm.progress}%</span>
              </div>
              <div style={{ height:4, background:'#EAE3D8', borderRadius:4, overflow:'hidden', marginTop:6 }}>
                <div style={{ height:4, borderRadius:4, background:'#C96B3A', width:`${editForm.progress}%`, transition:'width .2s' }} />
              </div>
            </FormGroup>
            <div className="modal-actions">
              <Button size="sm" onClick={() => setEditProject(null)}>{t('common.cancel')}</Button>
              <Button variant="primary" size="sm" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ── */}
      {confirmId && (
        <ConfirmModal icon="🗑️" title={t('projects.deleteTitle')}
          sub={t('projects.deleteSub', { name: projects.find(p => p.id === confirmId)?.name })}
          onConfirm={() => deleteProject(confirmId)}
          onCancel={() => setConfirmId(null)} />
      )}
    </div>
  )
}

// ─── MY TASKS (worker) ───────────────────────────────────────────────────────
export function MyTasks() {
  const { t } = useT()
  const { tasks, fetchTasks, submitTask, profile, materials } = useStore()
  const [filter, setFilter]           = useState('active')
  const [uploadingId, setUploadingId] = useState(null)
  const [openId, setOpenId]           = useState(null)

  useEffect(() => { fetchTasks() }, [])

  const mine = tasks.filter(t => t.worker_id === profile?.id)
  const filtered = mine.filter(t =>
    filter === 'active'  ? ['new','rejected'].includes(t.status) :
    filter === 'pending' ? t.status === 'pending' :
    filter === 'done'    ? t.status === 'approved' : true
  )

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
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {filtered.length === 0 && <EmptyState>{t('tasks.noTasks')}</EmptyState>}
        {filtered.map(tk => {
          const isOpen = openId === tk.id
          return (
            <div key={tk.id} style={{
              background:'#fff', border: `1.5px solid ${isOpen ? '#C96B3A' : '#EAE3D8'}`,
              borderRadius: 12, overflow: 'hidden',
              boxShadow: isOpen ? '0 4px 12px rgba(201,107,58,0.10)' : 'none',
              transition: 'border-color .15s, box-shadow .15s',
            }}>
              <div onClick={() => setOpenId(prev => prev === tk.id ? null : tk.id)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 13px', cursor:'pointer', background: isOpen ? '#FAECE4' : '#fff' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color: isOpen ? '#C96B3A' : '#2E2420', marginBottom:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {tk.text}
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5, alignItems:'center' }}>
                    <Badge variant={STATUS_BADGE[tk.status]?.replace('badge-','')}>{STATUS_LABEL[tk.status]}</Badge>
                    {tk.stage && <Badge variant="gray">{tk.stage}</Badge>}
                    {tk.deadline && <span style={{ fontSize:10, color:'#B8AFA6' }}>📅 {tk.deadline}</span>}
                  </div>
                </div>
                <span style={{ fontSize:10, color:'#B8AFA6', flexShrink:0 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
              {isOpen && (
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

// ─── PROCUREMENT (foreman-wide shortage checklist) ────────────────────────────
export function Procurement() {
  const { t } = useT()
  const { materials, projects, fetchProjects, role, profile,
          markMaterialPurchased, markMaterialNeeded, deleteMaterial } = useStore()
  const [filter,    setFilter]    = useState('open')
  const [showModal, setShowModal] = useState(false)
  const [modalProj, setModalProj] = useState(null)   // pre-selected project in modal

  useEffect(() => { fetchProjects() }, [])

  const openShortages  = materials.filter(m => m.status === 'needed')
  const today          = new Date(); today.setHours(0, 0, 0, 0)
  const purchasedToday = materials.filter(m =>
    m.status === 'purchased' && m.purchasedAt && new Date(m.purchasedAt) >= today
  ).length

  const filtered = materials.filter(m =>
    filter === 'open'      ? m.status === 'needed'    :
    filter === 'purchased' ? m.status === 'purchased' : true
  )

  const toggle = (id) => {
    const m = materials.find(x => x.id === id)
    if (!m) return
    m.status === 'needed' ? markMaterialPurchased(id) : markMaterialNeeded(id)
  }

  // Group by projectId
  const groupMap = {}
  for (const m of filtered) {
    const key = m.projectId ?? '__none__'
    if (!groupMap[key]) groupMap[key] = []
    groupMap[key].push(m)
  }
  const groups = Object.entries(groupMap).map(([key, items]) => ({
    key,
    proj:  key === '__none__' ? null : projects.find(p => String(p.id) === key),
    label: key === '__none__' ? t('materials.generalNoProject') : (projects.find(p => String(p.id) === key)?.name || `Project ${key}`),
    items,
    open:  items.filter(m => m.status === 'needed').length,
  }))

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('materials.title')}</h1>
        <Button variant="primary" size="sm" onClick={() => { setModalProj(null); setShowModal(true) }}>
          {t('materials.add')}
        </Button>
      </div>
      <p style={{ fontSize:12, color:'#B8AFA6', marginTop:-8, marginBottom:12 }}>
        {t('materials.desc')}
      </p>

      {/* Summary chips */}
      <div className="summary-bar" style={{ marginBottom:12 }}>
        <div className={`summary-chip ${openShortages.length > 0 ? 'danger' : 'neutral'}`}>
          {t('materials.openShortages', { n: openShortages.length, s: openShortages.length !== 1 ? 's' : '' })}
        </div>
        <div className="summary-chip neutral">{t('materials.purchasedToday', { n: purchasedToday })}</div>
        <div className="summary-chip neutral">{t('materials.totalChip', { n: materials.length })}</div>
      </div>

      {/* Filter chips */}
      <div className="filter-bar" style={{ marginBottom:16 }}>
        {[
          { k:'all',       l:t('materials.filterAll', { n: materials.length }) },
          { k:'open',      l:t('materials.filterOpen', { n: openShortages.length }) },
          { k:'purchased', l:t('materials.filterPurchased') },
        ].map(({ k, l }) => (
          <button key={k} className={`filter-btn ${filter===k?'active':''}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 0', color:'#B8AFA6' }}>
          <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
          <div style={{ fontSize:15, fontWeight:700, color:'#5A9467' }}>{t('materials.allCaughtUp')}</div>
          <div style={{ fontSize:12, marginTop:6 }}>{t('materials.noOpen')}</div>
        </div>
      )}

      {groups.map(g => (
        <div key={g.key} className="procurement-group">
          <div className="procurement-group-header">
            <span>{g.key === '__none__' ? '📋' : '🏗'}</span>
            <h3>{g.label}</h3>
            {g.open > 0 && <span className="procurement-count-badge">{t('materials.needed', { n: g.open })}</span>}
            <button
              onClick={() => { setModalProj(g.proj?.id || null); setShowModal(true) }}
              style={{ marginLeft:'auto', fontSize:11, fontWeight:600, color:'#C96B3A', background:'#FAECE4', border:'none', borderRadius:8, padding:'4px 10px', cursor:'pointer' }}
            >
              + Add
            </button>
          </div>
          <MaterialList
            materials={g.items}
            showProject={true}
            projects={projects}
            onTogglePurchased={toggle}
            onDelete={deleteMaterial}
            role={role}
            profile={profile}
          />
        </div>
      ))}

      {/* Кнопка добавить позицию без проекта — всегда видна снизу */}
      {groups.length === 0 && (
        <div style={{ textAlign:'center', paddingTop:8 }}>
          <button
            onClick={() => { setModalProj(null); setShowModal(true) }}
            style={{ fontSize:13, fontWeight:600, color:'#C96B3A', background:'#FAECE4', border:'1.5px dashed #E8C9B4', borderRadius:12, padding:'12px 24px', cursor:'pointer', width:'100%' }}
          >
            {t('materials.addFirst')}
          </button>
        </div>
      )}

      {showModal && (
        <MaterialModal
          open={showModal}
          onClose={() => setShowModal(false)}
          defaultProjectId={modalProj}
          defaultTaskId={null}
        />
      )}
    </div>
  )
}

// ─── TOOLS ───────────────────────────────────────────────────────────────────
export function Tools({ canAdd }) {
  const { t } = useT()
  const { tools, fetchTools, addTool, updateTool, deleteTool, profile, projects, fetchProjects, team, fetchAllWorkers } = useStore()
  const [tab, setTab]               = useState('all')
  const [showAdd, setShowAdd]       = useState(false)
  const [assigning, setAssigning]   = useState(null)
  const [deleteId, setDeleteId]     = useState(null)
  const [form, setForm]             = useState({ name:'', location:'' })
  const [formErr, setFormErr]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [assignForm, setAssignForm] = useState({ project_id:'', worker_id:'' })
  const [assignErr, setAssignErr]   = useState('')

  useEffect(() => {
    fetchProjects().then(() => {
      fetchTools()
      fetchAllWorkers()
    })
  }, [])

  const setF = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const create = async () => {
    if (!form.name.trim()) { setFormErr('Enter tool name'); return }
    setSaving(true); setFormErr('')
    const { error } = await addTool({ name: form.name.trim(), location: form.location.trim(), status: 'active' })
    setSaving(false)
    if (error) { setFormErr(error.message || 'Failed to add tool'); return }
    setShowAdd(false)
    setForm({ name:'', location:'' })
  }

  const openAssign = (tool) => {
    setAssigning(tool); setAssignErr('')
    setAssignForm({ project_id: tool.project_id || '', worker_id: tool.worker_id || '' })
  }

  const saveAssign = async () => {
    setAssignErr('')
    const updates = { project_id: assignForm.project_id || null }
    if (assignForm.worker_id !== undefined) updates.worker_id = assignForm.worker_id || null
    const { error } = await updateTool(assigning.id, updates)
    if (error) { setAssignErr(error.message || 'Failed to assign'); return }
    setAssigning(null)
  }

  const unassign = async (tool) => { await updateTool(tool.id, { project_id: null, worker_id: null }) }

  const counts = {
    all:       tools.length,
    available: tools.filter(t => !t.project_id && !t.worker_id).length,
    on_site:   tools.filter(t => !!t.project_id).length,
    assigned:  tools.filter(t => !!t.worker_id).length,
  }

  const filtered = tools.filter(t => {
    if (tab === 'available') return !t.project_id && !t.worker_id
    if (tab === 'on_site')   return !!t.project_id
    if (tab === 'assigned')  return !!t.worker_id
    return true
  })

  const projectName = (id) => projects.find(p => p.id === id)?.name
  const workerName  = (id) => team.find(m => m.id === id)?.name

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('tools.title')}</h1>
        {canAdd && <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>{t('tools.add')}</Button>}
      </div>

      {canAdd && (
        <div className="filter-bar">
          {[
            { key:'all',       label:t('tools.filterAll', { n: counts.all }) },
            { key:'available', label:t('tools.filterAvailable', { n: counts.available }) },
            { key:'on_site',   label:t('tools.filterOnSite', { n: counts.on_site }) },
            { key:'assigned',  label:t('tools.filterWithWorker', { n: counts.assigned }) },
          ].map(({ key, label }) => (
            <button key={key} className={`filter-btn ${tab===key?'active':''}`} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>
      )}

      <div className="card" style={{ padding:0 }}>
        {filtered.length === 0 && <EmptyState>{t('tools.none')}</EmptyState>}
        {filtered.map(tool => {
          const wName = workerName(tool.worker_id)
          const pName = projectName(tool.project_id)
          const isAssigned = tool.project_id || tool.worker_id
          return (
            <div className="tool-row" key={tool.id} style={{ alignItems:'flex-start', padding:'12px 14px' }}>
              <div className="tool-icon" style={{ marginTop:2 }}>🔧</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div className="tool-name">{tool.name}</div>
                {tool.location && <div className="tool-loc">{tool.location}</div>}
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:5 }}>
                  {pName && <span style={{ fontSize:10, background:'#FAECE4', color:'#C96B3A', borderRadius:6, padding:'2px 8px', fontWeight:600 }}>🏗 {pName}</span>}
                  {wName && <span style={{ fontSize:10, background:'#E8F2EB', color:'#3D7A52', borderRadius:6, padding:'2px 8px', fontWeight:600 }}>👷 {wName}</span>}
                  {!pName && !wName && <span style={{ fontSize:10, color:'#B8AFA6' }}>{t('tools.notAssigned')}</span>}
                </div>
              </div>
              {canAdd && (
                <div style={{ display:'flex', gap:5, flexShrink:0, marginTop:2 }}>
                  <Button size="sm" onClick={() => openAssign(tool)}>{t('tools.assign')}</Button>
                  {isAssigned && <Button size="sm" onClick={() => unassign(tool)}>✕</Button>}
                  <IconButton className="danger" onClick={() => setDeleteId(tool.id)}>🗑</IconButton>
                </div>
              )}
              {!canAdd && <Badge variant={TOOL_STATUS_BADGE[tool.status]?.replace('badge-','')}>{TOOL_STATUS_LABEL[tool.status]}</Badge>}
            </div>
          )
        })}
      </div>

      {showAdd && canAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">{t('tools.addModal')}</div>
            <FormGroup label={t('tools.nameLabel')}>
              <input className="form-input" placeholder={t('tools.namePlaceholder')}
                value={form.name} onChange={setF('name')} autoFocus onKeyDown={e => e.key==='Enter' && create()} />
            </FormGroup>
            <FormGroup label={t('tools.serialLabel')}>
              <input className="form-input" placeholder={t('tools.serialPlaceholder')}
                value={form.location} onChange={setF('location')} />
            </FormGroup>
            {formErr && <div style={{ fontSize:12, color:'#A32D2D', background:'#FCEBEB', padding:'6px 10px', borderRadius:6, marginBottom:8 }}>{formErr}</div>}
            <div className="modal-actions">
              <Button size="sm" onClick={() => { setShowAdd(false); setFormErr('') }}>{t('common.cancel')}</Button>
              <Button variant="primary" size="sm" onClick={create} disabled={saving}>{saving ? t('common.adding') : t('common.add')}</Button>
            </div>
          </div>
        </div>
      )}

      {assigning && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAssigning(null)}>
          <div className="modal">
            <div className="modal-title">{t('tools.assignModal', { name: assigning.name })}</div>
            <FormGroup label={t('tools.projectLabel')}>
              <select className="form-input" value={assignForm.project_id}
                onChange={e => setAssignForm(f => ({ ...f, project_id: e.target.value }))}>
                <option value="">{t('tools.notAssignedOption')}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </FormGroup>
            <FormGroup label={t('tools.workerLabel')}>
              <select className="form-input" value={assignForm.worker_id}
                onChange={e => setAssignForm(f => ({ ...f, worker_id: e.target.value }))}>
                <option value="">{t('tools.notAssignedOption')}</option>
                {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </FormGroup>
            {assignErr && <div style={{ fontSize:12, color:'#A32D2D', background:'#FCEBEB', padding:'6px 10px', borderRadius:6, marginBottom:8 }}>{assignErr}</div>}
            <div className="modal-actions">
              <Button size="sm" onClick={() => setAssigning(null)}>{t('common.cancel')}</Button>
              <Button variant="primary" size="sm" onClick={saveAssign}>{t('common.save')}</Button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <ConfirmModal icon="🗑️" title={t('tools.deleteTitle')} sub={tools.find(tool => tool.id === deleteId)?.name}
          onConfirm={() => { deleteTool(deleteId); setDeleteId(null) }}
          onCancel={() => setDeleteId(null)} />
      )}
    </div>
  )
}

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
export function Team() {
  const { t } = useT()
  const { team, projects, tasks, tools, fetchProjects, fetchAllWorkers, updateWorkerStatus, profile, joinRequests, fetchJoinRequests, approveJoinRequest, rejectJoinRequest } = useStore()
  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState('')
  const [copied, setCopied]     = useState(false)
  const [openId, setOpenId]     = useState(null)   // expanded worker card

  useEffect(() => {
    fetchProjects().then(() => {
      fetchAllWorkers()
    })
    if (profile?.role === 'foreman') fetchJoinRequests()
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

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}?join=${profile?.invite_code}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
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

      {/* ── Invite link for foreman ── */}
      {profile?.role === 'foreman' && (
        <div className="card card-body" style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#7A6E66', marginBottom:6 }}>{t('team.inviteLink')}</div>
          <div style={{ background:'#F2EDE4', borderRadius:8, padding:'8px 12px', marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
            <code style={{ flex:1, fontSize:11, color:'#C96B3A', wordBreak:'break-all' }}>
              {window.location.origin}?join={profile?.invite_code}
            </code>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <Button size="sm" onClick={copyInviteLink}>{copied ? t('team.copied') : t('team.copyLink')}</Button>
            <Button size="sm" onClick={() => { navigator.clipboard.writeText(profile?.invite_code || ''); setCopied(true); setTimeout(()=>setCopied(false),2000) }}>
              {t('team.codeBtn', { code: profile?.invite_code })}
            </Button>
          </div>
        </div>
      )}

      {/* ── Join Requests ── */}
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

      {/* ── Invite by email ── */}
      {showInvite && (
        <div className="card card-body" style={{ marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>{t('team.addByEmail')}</div>
          <div style={{ display:'flex', gap:8 }}>
            <input className="form-input" placeholder={t('team.emailPlaceholder')}
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key==='Enter' && invite()} style={{ flex:1 }} />
            <Button variant="primary" size="sm" onClick={invite}>{loading?'...':'Add'}</Button>
          </div>
          {msg && (
            <div style={{ marginTop:8, fontSize:12, padding:'6px 10px', borderRadius:6, background: msg.includes('added') ? '#E8F2EB' : '#FCEBEB', color: msg.includes('added') ? '#3D7A52' : '#A32D2D' }}>
              {msg}
            </div>
          )}
        </div>
      )}

      {/* ── Worker cards ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {team.length === 0 && <EmptyState>{t('team.noMembers')}</EmptyState>}
        {team.map(m => {
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
                onClick={() => setOpenId(prev => prev === m.id ? null : m.id)}
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

                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
function inferNotifType(n) {
  if (n.type && n.type !== 'general') return n.type
  const t = (n.text || '').toLowerCase()
  if (t.includes('needs') && (t.includes('pcs') || t.includes(' m ') || t.includes('kg') || t.includes('pack') || t.includes('roll'))) return 'material_shortage'
  if (t.includes('submitted') || t.includes('pending') || t.includes('review')) return 'task_pending'
  if (t.includes('approved') || t.includes('completed')) return 'task_approved'
  if (t.includes('rejected') || t.includes('revision')) return 'task_rejected'
  if (t.includes('returned') || t.includes('tool')) return 'tool_return'
  if (t.includes('join request') || t.includes('wants to join')) return 'join_request'
  if (t.includes('joined')) return 'worker_joined'
  return 'general'
}

const NOTIF_TYPE = {
  task_pending:       { icon:'🕐', color:'#C96B3A', bg:'#FBF3DC', border:'#F0D897', label:'Review',        navForeman:'projects',    navWorker:'my-tasks' },
  task_approved:      { icon:'✅', color:'#3D7A52', bg:'#E8F2EB', border:'#A8D4B4', label:'Approved',      navForeman:'projects',    navWorker:'my-tasks' },
  task_rejected:      { icon:'↩️', color:'#A32D2D', bg:'#FCEBEB', border:'#F0AAAA', label:'Revision',      navForeman:'projects',    navWorker:'my-tasks' },
  tool_return:        { icon:'🔧', color:'#2E6FB5', bg:'#E4EEFA', border:'#A3C2E8', label:'Tool',          navForeman:'tools',       navWorker:'tools'    },
  join_request:       { icon:'👋', color:'#6E4AAB', bg:'#F0EAF8', border:'#C4AADF', label:'Join Request',  navForeman:'team',        navWorker:null       },
  worker_joined:      { icon:'👷', color:'#2E6FB5', bg:'#E4EEFA', border:'#A3C2E8', label:'Team',          navForeman:'team',        navWorker:null       },
  material_shortage:  { icon:'📦', color:'#A32D2D', bg:'#FCEBEB', border:'#F0AAAA', label:'Shortage',      navForeman:'procurement', navWorker:null       },
  general:            { icon:'💬', color:'#7A6E66', bg:'#F2EDE4', border:'#D9D0C7', label:null,            navForeman:null,          navWorker:null       },
}

function formatNotifTime(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = (now - d) / 1000
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  if (diff < 86400*7) return `${Math.floor(diff/86400)}d ago`
  return d.toLocaleDateString('en', { day:'numeric', month:'short' })
}

export function Notifications({ onNavigate }) {
  const { t } = useT()
  const { notifications, fetchNotifications, markNotifRead, role } = useStore()
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchNotifications() }, [])

  const unread   = notifications.filter(n => !n.read).length
  const filtered = notifications.filter(n => filter === 'unread' ? !n.read : true)

  const handleClick = (n) => {
    if (!n.read) markNotifRead(n.id)
    const type   = inferNotifType(n)
    const config = NOTIF_TYPE[type] || NOTIF_TYPE.general
    const target = role === 'worker' ? config.navWorker : config.navForeman
    if (target && onNavigate) onNavigate(target)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('notifications.title')}</h1>
        {unread > 0 && <div style={{ background:'#C96B3A', color:'#fff', fontSize:11, fontWeight:700, borderRadius:10, padding:'2px 9px' }}>{t('notifications.newBadge', { n: unread })}</div>}
      </div>
      <div className="filter-bar">
        <button className={`filter-btn ${filter==='all'?'active':''}`}    onClick={() => setFilter('all')}>{t('notifications.filterAll', { n: notifications.length })}</button>
        <button className={`filter-btn ${filter==='unread'?'active':''}`} onClick={() => setFilter('unread')}>{t('notifications.filterUnread', { n: unread })}</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {filtered.length === 0 && <EmptyState>{t('notifications.none')}</EmptyState>}
        {filtered.map(n => {
          const type   = inferNotifType(n)
          const cfg    = NOTIF_TYPE[type] || NOTIF_TYPE.general
          const target = role === 'worker' ? cfg.navWorker : cfg.navForeman
          const isClickable = !!target
          return (
            <div key={n.id} onClick={() => handleClick(n)} style={{
              display:'flex', alignItems:'flex-start', gap:12,
              background: n.read ? '#fff' : cfg.bg,
              border: `1.5px solid ${n.read ? '#EAE3D8' : cfg.border}`,
              borderRadius: 14, padding:'12px 14px',
              cursor: isClickable ? 'pointer' : 'default',
              transition: 'opacity .15s', opacity: n.read ? 0.72 : 1,
            }}>
              <div style={{ width:38, height:38, borderRadius:'50%', flexShrink:0, background:cfg.bg, border:`1.5px solid ${cfg.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                {cfg.icon}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                  {cfg.label && (
                    <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:6, padding:'1px 7px' }}>
                      {type === 'task_pending'      && t('notifications.typeReview')}
                      {type === 'task_approved'     && t('notifications.typeApproved')}
                      {type === 'task_rejected'     && t('notifications.typeRevision')}
                      {type === 'tool_return'       && t('notifications.typeTool')}
                      {type === 'join_request'      && t('notifications.typeJoin')}
                      {type === 'worker_joined'     && t('notifications.typeTeam')}
                      {type === 'material_shortage' && t('notifications.typeShortage')}
                    </span>
                  )}
                  {!n.read && <span style={{ width:7, height:7, borderRadius:'50%', background:cfg.color, display:'inline-block' }} />}
                </div>
                <div style={{ fontSize:13, color:'#2E2420', lineHeight:1.45, fontWeight: n.read ? 400 : 500 }}>{n.text}</div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:5 }}>
                  <span style={{ fontSize:11, color:'#B8AFA6' }}>{formatNotifTime(n.created_at)}</span>
                  {isClickable && (
                    <span style={{ fontSize:11, color:cfg.color, fontWeight:600 }}>
                      {type === 'task_pending'  && (role === 'foreman' ? t('notifications.viewProjects') : t('notifications.viewTasks'))}
                      {type === 'task_approved' && (role === 'foreman' ? t('notifications.viewProjects') : t('notifications.viewTasks'))}
                      {type === 'task_rejected' && t('notifications.viewTasks')}
                      {type === 'tool_return'   && t('notifications.viewTools')}
                      {(type === 'join_request' || type === 'worker_joined') && t('notifications.viewTeam')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── CLIENT DASHBOARD ────────────────────────────────────────────────────────
export function ClientDashboard() {
  const { t } = useT()
  const { projects, tasks, team, fetchProjects, fetchTasks, fetchTeam } = useStore()
  useEffect(() => {
    fetchProjects().then(() => {
      const { projects } = useStore.getState()
      if (projects[0]) { fetchTasks(projects[0].id); fetchTeam(projects[0].id) }
    })
  }, [])
  const proj = projects[0]
  if (!proj) return <div><div className="page-header"><h1 className="page-title">My Project</h1></div><EmptyState>{t('client.noProject')}</EmptyState></div>
  const approvedTasks = tasks.filter(tk => tk.status==='approved')
  return (
    <div>
      <div className="page-header"><h1 className="page-title">My Project</h1></div>
      <div className="card card-body project-highlight">
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <strong style={{ color:'#A04B22' }}>{proj.name}</strong>
          <Badge variant="blue">{proj.stage}</Badge>
        </div>
        {proj.deadline && <div style={{ fontSize:12, color:'#C96B3A', marginBottom:6 }}>{t('client.deadlineLabel')} {proj.deadline}</div>}
        <ProgressBar value={proj.progress||0} />
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns:'1fr 1fr' }}>
        <StatCard label={t('client.workersOnSite')} value={team.length} />
        <StatCard label={t('client.tasksCompleted')} value={approvedTasks.length} />
      </div>
      <SectionTitle>{t('client.completedWork')}</SectionTitle>
      <div className="card" style={{ padding:0 }}>
        {approvedTasks.length===0 && <EmptyState>{t('client.noCompletedTasks')}</EmptyState>}
        {approvedTasks.map(tk => (
          <div className="task-row" key={tk.id}>
            <div className="task-body">
              <div className="task-text">{tk.text}</div>
              <div className="task-meta" style={{ marginTop:4 }}>
                <Badge variant="green">{t('client.completedBadge')}</Badge>
                {tk.stage && <Badge variant="gray">{tk.stage}</Badge>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── CLIENT PROGRESS ─────────────────────────────────────────────────────────
export function ClientProgress() {
  const { t } = useT()
  const { fetchProjects } = useStore()
  useEffect(() => { fetchProjects() }, [])
  return (
    <div>
      <div className="page-header"><h1 className="page-title">{t('client.progressTitle')}</h1></div>
      <EmptyState>{t('client.progressSoon')}</EmptyState>
    </div>
  )
}

// ─── CLIENT PHOTOS ────────────────────────────────────────────────────────────
export function ClientPhotos() {
  const { t } = useT()
  return (
    <div>
      <div className="page-header"><h1 className="page-title">{t('client.photosTitle')}</h1></div>
      <SectionTitle>Foundation — completed</SectionTitle>
      <div className="photo-grid">
        {[{l:'Rebar',bg:'#FAECE4',c:'#A04B22'},{l:'Pouring',bg:'#E8F2EB',c:'#3D7A52'},{l:'Done',bg:'#FBF3DC',c:'#9A6E10'}].map(p=>(
          <div className="photo-cell" key={p.l} style={{ background:p.bg, color:p.c }}>{p.l}</div>
        ))}
      </div>
      <SectionTitle>Electrical — in progress</SectionTitle>
      <div className="photo-grid">
        <div className="photo-cell" style={{ background:'#FAECE4', color:'#A04B22' }}>Marking</div>
        <div className="photo-cell" style={{ color:'#B8AFA6' }}>pending</div>
        <div className="photo-cell" style={{ color:'#B8AFA6' }}>pending</div>
      </div>
    </div>
  )
}
