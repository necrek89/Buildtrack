import { useState, useEffect, useRef } from 'react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore, PRIORITY_BADGE, PRIORITY_LABEL, TOOL_STATUS_BADGE, TOOL_STATUS_LABEL, STATUS_LABEL, STATUS_BADGE, STAGES, PRIORITY_OPTIONS } from '../store/useStore'
import { Badge, Button, StatCard, ProgressBar, SectionTitle, EmptyState, IconButton, FormGroup } from '../components/UI'
import { useT } from '../i18n/useLanguage'
import TaskModal from '../components/TaskModal'
import ConfirmModal from '../components/ConfirmModal'
import MaterialModal from '../components/MaterialModal'
import MaterialList  from '../components/MaterialList'
import DatePicker from '../components/DatePicker'
import TaskComments from '../components/TaskComments'
import { supabase } from '../lib/supabase'


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
        onTogglePurchased={(role === 'foreman' || role === 'manager') ? toggle : undefined}
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
function TaskCard({ t, openId, setOpenId, onEdit, onDelete, onApprove, onReject, onMarkDone, showProject, projects }) {
  const { t: tr } = useT()
  const isOpen = openId === t.id
  const projName = showProject && projects ? projects.find(p => p.id === t.project_id)?.name : null
  return (
    <div style={{
      background: 'var(--surface, #fff)',
      border: `1.5px solid ${isOpen ? '#C96B3A' : 'var(--border, #EAE3D8)'}`,
      borderRadius: 10, overflow: 'hidden',
      boxShadow: isOpen ? '0 3px 10px rgba(201,107,58,0.10)' : 'none',
      transition: 'border-color .15s, box-shadow .15s',
    }}>
      <div onClick={() => setOpenId(prev => prev === t.id ? null : t.id)}
        style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', cursor:'pointer', background: isOpen ? '#FAECE4' : 'var(--surface, #fff)' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color: isOpen ? '#C96B3A' : 'var(--text-1, #2E2420)', marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
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
        <div style={{ borderTop:'1px solid var(--border, #EAE3D8)', padding:'12px 13px', background:'var(--surface-2, #FDFBF8)' }}>
          {t.description
            ? <div style={{ fontSize:13, color:'var(--text-1, #2E2420)', lineHeight:1.65, whiteSpace:'pre-wrap', marginBottom:10 }}>{t.description}</div>
            : <div style={{ fontSize:12, color:'#B8AFA6', marginBottom:10 }}>{tr('tasks.noDesc')}</div>
          }
          <TaskMedia urls={t.photo_url} />
          {t.status === 'rejected' && t.reject_comment && (
            <div style={{ marginTop:10, fontSize:12, color:'#A32D2D', background:'#FCEBEB', padding:'6px 10px', borderRadius:7 }}>↩ {t.reject_comment}</div>
          )}
          {/* Foreman actions */}
          <div style={{ marginTop:12, display:'flex', gap:8, flexWrap:'wrap' }}>
            {t.status === 'pending' && onApprove && (
              <>
                <Button size="sm" variant="primary" onClick={() => onApprove(t.id)}>{tr('tasks.approve')}</Button>
                <Button size="sm" variant="danger"  onClick={() => onReject(t.id)}>{tr('tasks.reject')}</Button>
              </>
            )}
            {t.status !== 'approved' && onMarkDone && (
              <button
                onClick={() => onMarkDone(t.id)}
                style={{
                  fontSize:12, fontWeight:600, padding:'5px 12px', borderRadius:8,
                  background:'#E8F2EB', color:'#3D7A52', border:'1px solid #A8D4B4',
                  cursor:'pointer',
                }}
              >
                {tr('tasks.markDone')}
              </button>
            )}
          </div>
          <TaskMaterialSection task={t} />
          <TaskComments taskId={t.id} />
        </div>
      )}
    </div>
  )
}

// ─── STATUS SECTION ──────────────────────────────────────────────────────────
function StatusSection({ icon, label, color, bg, tasks, openId, setOpenId, onEdit, onDelete, onApprove, onReject, onMarkDone, showProject, projects }) {
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
            onEdit={onEdit} onDelete={onDelete} onApprove={onApprove} onReject={onReject} onMarkDone={onMarkDone}
            showProject={showProject} projects={projects} />
        ))}
      </div>
    </div>
  )
}

// ─── OVERVIEW TAB ────────────────────────────────────────────────────────────
function OverviewTab({ proj, tasks, tools, team, onEdit }) {
  const { t } = useT()

  const pTasks   = tasks.filter(tk => tk.project_id === proj.id)
  const pDone    = pTasks.filter(tk => tk.status === 'approved').length
  const pPct     = pTasks.length === 0 ? 0 : Math.round((pDone / pTasks.length) * 100)
  const daysLeft = proj.deadline ? Math.max(0, Math.ceil((new Date(proj.deadline) - new Date()) / 86400000)) : null
  const projTools = tools.filter(tk => tk.project_id === proj.id)

  const projectStages = Array.isArray(proj.stages) && proj.stages.length > 0
    ? proj.stages
    : [...new Set(pTasks.map(tk => tk.stage).filter(Boolean))]

  const [openStages, setOpenStages] = useState([])

  const STATUS_DOT = { approved:'#5A9467', pending:'#D4A843', new:'#B8AFA6', rejected:'#A32D2D' }

  const toggleStage = (name) =>
    setOpenStages(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name])

  return (
    <div style={{ padding:'0 0 24px' }}>
      {/* ── 2×2 Stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:12 }}>
        {[
          { v: pPct+'%',                    l: t('detail.progress'),  c: '#C96B3A' },
          { v: team.length,                 l: t('detail.workers'),   c: '#2E2420' },
          { v: daysLeft !== null ? daysLeft+'d' : '—',
            l: t('detail.daysLeft'),
            c: daysLeft !== null && daysLeft < 7 ? '#A32D2D' : '#2E2420' },
          { v: `${pDone}/${pTasks.length}`, l: t('detail.tasksDone'), c: '#2E2420' },
        ].map(s => (
          <div key={s.l} style={{ background:'var(--bg-accent, #F2EDE4)', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:700, color:s.c }}>{s.v}</div>
            <div style={{ fontSize:10, color:'#B8AFA6', marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height:5, background:'var(--border, #EAE3D8)', borderRadius:5, overflow:'hidden', marginBottom:12 }}>
        <div style={{ height:5, borderRadius:5, background:'#C96B3A', width:`${pPct}%`, transition:'width .4s' }} />
      </div>

      {/* ── Address / Deadline ── */}
      {(proj.address || proj.deadline) && (
        <div style={{ background:'var(--bg-accent, #F2EDE4)', borderRadius:10, padding:'10px 12px', marginBottom:12 }}>
          {proj.address && (
            <div onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(proj.address)}`, '_blank')}
              style={{ fontSize:12, fontWeight:600, color:'#C96B3A', cursor:'pointer', textDecoration:'underline', marginBottom: proj.deadline ? 4 : 0 }}>
              📍 {proj.address}
            </div>
          )}
          {proj.deadline && (
            <div style={{ fontSize:11, color:'#B8AFA6' }}>
              📅 {t('detail.deadlineLabel')} {proj.deadline}
              {daysLeft !== null && (
                <span style={{ color: daysLeft < 7 ? '#A32D2D' : '#C96B3A', fontWeight:600, marginLeft:6 }}>
                  · {t('detail.daysLeftText', { n: daysLeft })}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Edit button ── */}
      {onEdit && (
        <Button size="sm" onClick={() => onEdit(proj)} style={{ marginBottom:14 }}>✏️ {t('detail.editProject')}</Button>
      )}

      {/* ── Stages header ── */}
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6', marginBottom:8 }}>
        📋 {t('detail.stages')}
      </div>

      {/* ── Stage cards ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {projectStages.length === 0 && (
          <div style={{ fontSize:12, color:'#B8AFA6', textAlign:'center', padding:'10px 0 6px' }}>
            {t('detail.noStages')}
          </div>
        )}

        {projectStages.map((stageName, idx) => {
          const stageTasks = pTasks.filter(tk => tk.stage === stageName)
          const sDone  = stageTasks.filter(tk => tk.status === 'approved').length
          const inWork = stageTasks.filter(tk => ['new','pending','rejected'].includes(tk.status)).length
          const total  = stageTasks.length
          const pct    = total === 0 ? 0 : Math.round((sDone / total) * 100)
          const isOpen   = openStages.includes(stageName)
          const isDone   = pct === 100 && total > 0
          const barColor = isDone ? '#5A9467' : inWork > 0 ? '#C96B3A' : 'var(--border, #EAE3D8)'

          return (
            <div key={idx} style={{
              background:'var(--surface, #fff)',
              border:`1.5px solid ${isOpen ? '#C96B3A' : 'var(--border, #EAE3D8)'}`,
              borderRadius:10, overflow:'hidden', transition:'border-color .15s',
            }}>
              {/* Card header */}
              <div
                onClick={() => total > 0 && toggleStage(stageName)}
                style={{
                  display:'flex', alignItems:'center', gap:8, padding:'10px 12px',
                  cursor: total > 0 ? 'pointer' : 'default',
                  background: isOpen ? '#FAECE4' : 'var(--surface, #fff)',
                }}
              >
                {/* Number / done dot */}
                <div style={{
                  width:22, height:22, borderRadius:'50%', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontWeight:700,
                  background: isDone ? '#E8F2EB' : inWork > 0 ? '#FAECE4' : 'var(--bg-accent, #F2EDE4)',
                  color: isDone ? '#3D7A52' : inWork > 0 ? '#C96B3A' : '#B8AFA6',
                }}>
                  {isDone ? '✓' : idx + 1}
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color: isOpen ? '#C96B3A' : 'var(--text-1, #2E2420)', marginBottom:3 }}>
                    {stageName}
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <div style={{ flex:1, height:3, background:'var(--border, #EAE3D8)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:3, borderRadius:3, background:barColor, width:`${pct}%`, transition:'width .3s' }} />
                    </div>
                    <span style={{ fontSize:10, color:'#B8AFA6', flexShrink:0 }}>{sDone}/{total}</span>
                  </div>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                  {inWork > 0 && (
                    <span style={{ fontSize:10, background:'#FAECE4', color:'#C96B3A', borderRadius:6, padding:'2px 7px', fontWeight:700 }}>
                      {inWork}
                    </span>
                  )}
                  {total > 0 && (
                    <span style={{ fontSize:12, color:'#B8AFA6' }}>{isOpen ? '▲' : '▼'}</span>
                  )}
                </div>
              </div>

              {/* Task list */}
              {isOpen && stageTasks.length > 0 && (
                <div style={{ borderTop:'1px solid var(--border, #EAE3D8)', background:'var(--surface-2, #FDFBF8)' }}>
                  {stageTasks.map((tk, i) => (
                    <div key={tk.id} style={{
                      display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
                      borderBottom: i < stageTasks.length - 1 ? '1px solid var(--border, #F0EAE0)' : 'none',
                    }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background: STATUS_DOT[tk.status] || '#B8AFA6', flexShrink:0 }} />
                      <div style={{ flex:1, fontSize:12, color:'var(--text-1, #2E2420)' }}>{tk.text}</div>
                      <Badge variant={STATUS_BADGE[tk.status]?.replace('badge-','')}>{STATUS_LABEL[tk.status]}</Badge>
                      {tk.deadline && <span style={{ fontSize:10, color:'#B8AFA6' }}>{tk.deadline}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Tools on site ── */}
      {projTools.length > 0 && (
        <>
          <div style={{ height:1, background:'var(--border, #EAE3D8)', margin:'14px 0 10px' }} />
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6', marginBottom:8 }}>🔧 {t('detail.toolsOnSite')}</div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {projTools.map(tk => (
              <div key={tk.id} style={{ background:'var(--bg-accent, #F2EDE4)', borderRadius:6, padding:'3px 9px', fontSize:10, color:'#7A6E66' }}>{tk.name}</div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── PROJECT TASKS TAB ───────────────────────────────────────────────────────
// ─── SORTABLE STAGE ITEM ─────────────────────────────────────────────────────
function SortableStageItem({ stage, stageIndex, projStages, items, isOpen, toggleStage, openId, setOpenId,
  canEdit, canDelete, setEditTask, setDeleteId, approveTask, rejectTask, color, isDragging }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: stage })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  const total    = items.length
  const done     = items.filter(tk => tk.status === 'approved').length
  const pct      = total ? Math.round((done / total) * 100) : 0
  const hasAlert = items.some(tk => tk.status === 'rejected')
  const hasPend  = items.some(tk => tk.status === 'pending')
  const num      = stageIndex >= 0 ? stageIndex + 1 : null
  const isDone   = pct === 100 && total > 0

  return (
    <div ref={setNodeRef} style={{ ...style, borderRadius:14, overflow:'hidden', border:'1.5px solid var(--border,#EAE3D8)', background:'var(--surface,#fff)' }}>
      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'12px 14px',
        background: isOpen ? 'var(--surface-2,#FDFBF8)' : 'var(--surface,#fff)',
        borderBottom: isOpen ? '1px solid var(--border,#EAE3D8)' : 'none',
      }}>
        {/* Drag handle */}
        {canEdit && (
          <div {...attributes} {...listeners} style={{
            cursor:'grab', color:'#C8C0B8', fontSize:16, flexShrink:0,
            padding:'2px 4px', touchAction:'none', lineHeight:1,
          }}>⠿</div>
        )}

        {/* Number badge */}
        <div onClick={() => toggleStage(stage)} style={{
          width:24, height:24, borderRadius:'50%', flexShrink:0, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:11, fontWeight:700,
          background: isDone ? '#E8F2EB' : 'var(--bg-accent,#F2EDE4)',
          color: isDone ? '#3D7A52' : color,
          border: `2px solid ${isDone ? '#A8D4B4' : color}`,
        }}>
          {isDone ? '✓' : (num ?? '·')}
        </div>

        <div onClick={() => toggleStage(stage)} style={{ flex:1, minWidth:0, cursor:'pointer' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text-1,#2E2420)', letterSpacing:'.02em' }}>{stage}</span>
            {hasAlert && <span style={{ fontSize:11, color:'#A32D2D', fontWeight:600 }}>⚡</span>}
            {hasPend  && <span style={{ fontSize:11, color:'#9A6E10', fontWeight:600 }}>🕐</span>}
            <span style={{ marginLeft:'auto', fontSize:11, color:'#B8AFA6', fontWeight:500, flexShrink:0 }}>{done}/{total}</span>
          </div>
          <div style={{ height:5, borderRadius:3, background:'var(--border,#EAE3D8)', overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:3, width:`${pct}%`, background: isDone ? '#5A9467' : color, transition:'width .4s ease' }} />
          </div>
        </div>
        <span onClick={() => toggleStage(stage)} style={{ fontSize:11, color:'#B8AFA6', flexShrink:0, marginLeft:4, cursor:'pointer' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {items.length === 0 && (
            <div style={{ padding:'12px 14px', fontSize:12, color:'#B8AFA6', textAlign:'center' }}>Нет задач в этом этапе</div>
          )}
          {items.map((tk, ti) => (
            <div key={tk.id} style={{ borderTop: ti > 0 ? '1px solid var(--border,#F2EDE6)' : 'none' }}>
              <TaskCard t={tk} openId={openId} setOpenId={setOpenId}
                onEdit={canEdit    ? setEditTask  : null}
                onDelete={canDelete ? setDeleteId : null}
                onApprove={canEdit && tk.status === 'pending' ? approveTask : null}
                onReject={canEdit  && tk.status === 'pending' ? (id) => rejectTask(id, 'Needs revision') : null}
                onMarkDone={canEdit && tk.status !== 'approved' ? approveTask : null}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SortableStageList({ stageGroups, projStages, openStages, toggleStage, openId, setOpenId,
  canEdit, canDelete, setEditTask, setDeleteId, approveTask, rejectTask, STAGE_COLORS, onReorder }) {
  const [activeId, setActiveId] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const sortableIds = stageGroups.map(g => g.stage)

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over || active.id === over.id) return
    // Work with the current displayed order
    const currentOrder = stageGroups.map(g => g.stage)
    const oldIdx = currentOrder.indexOf(active.id)
    const newIdx = currentOrder.indexOf(over.id)
    if (oldIdx === -1 || newIdx === -1) return
    onReorder(arrayMove(currentOrder, oldIdx, newIdx))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragEnd={handleDragEnd}>
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {stageGroups.map(({ stage, stageIndex, items }, gi) => (
            <SortableStageItem
              key={stage}
              stage={stage}
              stageIndex={stageIndex}
              projStages={projStages}
              items={items}
              isOpen={!!openStages[stage]}
              toggleStage={toggleStage}
              openId={openId}
              setOpenId={setOpenId}
              canEdit={canEdit}
              canDelete={canDelete}
              setEditTask={setEditTask}
              setDeleteId={setDeleteId}
              approveTask={approveTask}
              rejectTask={rejectTask}
              color={STAGE_COLORS[gi % STAGE_COLORS.length]}
              isDragging={activeId === stage}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeId && (() => {
          const g = stageGroups.find(x => x.stage === activeId)
          if (!g) return null
          return (
            <div style={{
              borderRadius:14, border:'2px solid #C96B3A',
              background:'#FAECE4', padding:'12px 14px',
              boxShadow:'0 8px 24px rgba(201,107,58,0.25)',
              fontSize:13, fontWeight:700, color:'#C96B3A',
            }}>
              ⠿ {activeId}
            </div>
          )
        })()}
      </DragOverlay>
    </DndContext>
  )
}

// ─── PROJECT TASKS TAB ───────────────────────────────────────────────────────
function ProjectTasksTab({ proj, canDelete = true, canEdit = true, tools = [], team = [] }) {
  const { t } = useT()
  const { tasks, fetchTasks, deleteTask, approveTask, rejectTask, updateProject } = useStore()
  const [filter,       setFilter]       = useState('all')
  const [showAdd,      setShowAdd]      = useState(false)
  const [editTask,     setEditTask]     = useState(null)
  const [deleteId,     setDeleteId]     = useState(null)
  const [openId,       setOpenId]       = useState(null)
  const [openStages,   setOpenStages]   = useState({})
  const [newStageName, setNewStageName] = useState('')
  const [addingStage,  setAddingStage]  = useState(false)

  useEffect(() => { fetchTasks(proj.id) }, [proj.id])

  const pTasks    = tasks.filter(t => t.project_id === proj.id)
  const pDone     = pTasks.filter(tk => tk.status === 'approved').length
  const pPct      = pTasks.length === 0 ? 0 : Math.round((pDone / pTasks.length) * 100)
  const daysLeft  = proj.deadline ? Math.max(0, Math.ceil((new Date(proj.deadline) - new Date()) / 86400000)) : null
  const projTools = tools.filter(tk => tk.project_id === proj.id)

  // Project's ordered stages list
  const projStages = Array.isArray(proj.stages) && proj.stages.length > 0 ? proj.stages : []

  const filtered = pTasks.filter(t =>
    filter === 'active'  ? ['new','rejected'].includes(t.status) :
    filter === 'pending' ? t.status === 'pending' :
    filter === 'done'    ? t.status === 'approved' : true
  )

  const STATUS_ORDER   = { rejected: 0, new: 1, pending: 2, approved: 3 }
  const PRIORITY_ORDER = { high: 0, normal: 1, low: 2 }
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

  const STAGE_COLORS = [
    '#C96B3A','#5A9467','#4A7FC1','#D4A843','#9B6B9B',
    '#E07B6A','#6BAA8E','#7B8EC8','#A67C52','#3A5FAB',
  ]

  // Build ordered stage list: proj.stages order first, then any task stages not in list
  const stageGroups = (() => {
    const taskStageKeys = [...new Set(filtered.map(tk => tk.stage || '—'))]
    // All stages from proj.stages that have tasks in filtered, in order
    const ordered = projStages.filter(s => taskStageKeys.includes(s))
    // Stages in tasks but not in proj.stages
    const extra = taskStageKeys.filter(s => s !== '—' && !projStages.includes(s))
    // No-stage tasks last
    const all = [...ordered, ...extra, ...(taskStageKeys.includes('—') ? ['—'] : [])]
    return all.map(stage => ({
      stage,
      stageIndex: projStages.indexOf(stage), // -1 if not in proj.stages
      items: sortTasks(filtered.filter(tk => (tk.stage || '—') === stage)),
    }))
  })()

  const addStage = async () => {
    const name = newStageName.trim()
    if (!name) return
    const updated = [...projStages, name]
    await updateProject(proj.id, { stages: updated })
    setNewStageName('')
    setAddingStage(false)
  }

  const moveStage = async (stageName, dir) => {
    const idx = projStages.indexOf(stageName)
    if (idx === -1) return
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= projStages.length) return
    const updated = [...projStages]
    ;[updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]]
    await updateProject(proj.id, { stages: updated })
  }

  useEffect(() => {
    const initial = {}
    stageGroups.forEach(({ stage }) => { initial[stage] = true })
    setOpenStages(initial)
  }, [filter, proj.id, tasks.length])

  const toggleStage = (stage) => setOpenStages(prev => ({ ...prev, [stage]: !prev[stage] }))

  return (
    <div style={{ paddingBottom:24 }}>

      {/* ── Stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:10 }}>
        {[
          { v: pPct+'%',                    l: t('detail.progress'),  c: '#C96B3A' },
          { v: team.length,                 l: t('detail.workers'),   c: '#2E2420' },
          { v: daysLeft !== null ? daysLeft+'d' : '—', l: t('detail.daysLeft'), c: daysLeft !== null && daysLeft < 7 ? '#A32D2D' : '#2E2420' },
          { v: `${pDone}/${pTasks.length}`, l: t('detail.tasksDone'), c: '#2E2420' },
        ].map(s => (
          <div key={s.l} style={{ background:'var(--bg-accent,#F2EDE4)', borderRadius:10, padding:'8px 6px', textAlign:'center' }}>
            <div style={{ fontSize:15, fontWeight:700, color:s.c }}>{s.v}</div>
            <div style={{ fontSize:9, color:'#B8AFA6', marginTop:2, lineHeight:1.2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height:5, background:'var(--border,#EAE3D8)', borderRadius:5, overflow:'hidden', marginBottom:10 }}>
        <div style={{ height:5, borderRadius:5, background:'#C96B3A', width:`${pPct}%`, transition:'width .4s' }} />
      </div>

      {/* ── Address / Deadline ── */}
      {(proj.address || proj.deadline) && (
        <div style={{ background:'var(--bg-accent,#F2EDE4)', borderRadius:10, padding:'8px 12px', marginBottom:10, display:'flex', flexWrap:'wrap', gap:8, alignItems:'center' }}>
          {proj.address && (
            <span onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(proj.address)}`, '_blank')}
              style={{ fontSize:12, fontWeight:600, color:'#C96B3A', cursor:'pointer', textDecoration:'underline' }}>
              📍 {proj.address}
            </span>
          )}
          {proj.deadline && (
            <span style={{ fontSize:11, color:'#B8AFA6' }}>
              📅 {proj.deadline}
              {daysLeft !== null && (
                <span style={{ color: daysLeft < 7 ? '#A32D2D' : '#C96B3A', fontWeight:600, marginLeft:4 }}>
                  · {t('detail.daysLeftText', { n: daysLeft })}
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {/* ── Filter + Add ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, gap:6 }}>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {['all','active','pending','done'].map(f => (
            <button key={f} className={`filter-btn ${filter===f?'active':''}`} onClick={() => setFilter(f)}
              style={{ fontSize:11, padding:'4px 10px' }}>
              {f === 'all'     ? `${t('tasks.filterAll')} (${pTasks.length})` :
               f === 'active'  ? t('tasks.filterActive') :
               f === 'pending' ? `${t('tasks.filterReview')} (${pTasks.filter(t=>t.status==='pending').length})` : t('tasks.filterDone')}
            </button>
          ))}
        </div>
        {canEdit && <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>{t('tasks.add')}</Button>}
      </div>

      {filtered.length === 0 && stageGroups.length === 0 && <EmptyState>{t('tasks.noTasks')}</EmptyState>}

      {/* ── Stage accordions with drag-and-drop ── */}
      <SortableStageList
        stageGroups={stageGroups}
        projStages={projStages}
        openStages={openStages}
        toggleStage={toggleStage}
        openId={openId}
        setOpenId={setOpenId}
        canEdit={canEdit}
        canDelete={canDelete}
        setEditTask={setEditTask}
        setDeleteId={setDeleteId}
        approveTask={approveTask}
        rejectTask={rejectTask}
        STAGE_COLORS={STAGE_COLORS}
        onReorder={async (newOrder) => { await updateProject(proj.id, { stages: newOrder }) }}
      />

      {/* ── Add Stage button (foreman only) ── */}
      {canEdit && (
        <div style={{ marginTop: 10 }}>
          {addingStage ? (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input
                className="form-input"
                style={{ flex:1, fontSize:13 }}
                placeholder="Название этапа..."
                value={newStageName}
                onChange={e => setNewStageName(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter') addStage(); if (e.key==='Escape') setAddingStage(false) }}
                autoFocus
              />
              <Button variant="primary" size="sm" onClick={addStage}>Добавить</Button>
              <button onClick={() => { setAddingStage(false); setNewStageName('') }}
                style={{ background:'none', border:'none', fontSize:18, color:'#B8AFA6', cursor:'pointer', lineHeight:1 }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setAddingStage(true)} style={{
              display:'flex', alignItems:'center', gap:6, padding:'10px 14px',
              background:'none', border:'1.5px dashed var(--border,#D9D0C7)',
              borderRadius:14, cursor:'pointer', fontSize:13, color:'#B8AFA6',
              fontWeight:500, width:'100%',
            }}>
              <span style={{ fontSize:16, lineHeight:1 }}>＋</span> Добавить этап
            </button>
          )}
        </div>
      )}

      {/* ── Tools on site ── */}
      {projTools.length > 0 && (
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6', marginBottom:8 }}>
            🔧 {t('detail.toolsOnSite')}
          </div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {projTools.map(tk => (
              <div key={tk.id} style={{ background:'var(--bg-accent,#F2EDE4)', borderRadius:6, padding:'3px 9px', fontSize:10, color:'#7A6E66' }}>{tk.name}</div>
            ))}
          </div>
        </div>
      )}

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
function MaterialsTab({ proj, canEdit = true }) {
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
      {canEdit && (
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
          <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>{t('materials.reportShortage')}</Button>
        </div>
      )}

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
        onTogglePurchased={(role === 'foreman' || role === 'manager') ? toggle : undefined}
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
function ProjectDetail({ proj, onBack, onEdit, canDelete = true, canEdit = true }) {
  const { t } = useT()
  const { tasks, tools, team, fetchTasks, fetchTools, fetchTeam } = useStore()
  const [tab, setTab] = useState('tasks')
  const TABS = [
    { id:'tasks',     label: t('detail.tasks')     },
    { id:'materials', label: t('detail.materials') },
    { id:'photos',    label: t('detail.photos')    },
    { id:'team',      label: t('detail.team')      },
  ]

  useEffect(() => {
    fetchTasks(proj.id)
    fetchTools(proj.id)
    fetchTeam(proj.id)
  }, [proj.id])

  const pct = (() => {
    const pt = tasks.filter(tk => tk.project_id === proj.id)
    return pt.length === 0 ? 0 : Math.round((pt.filter(tk => tk.status==='approved').length / pt.length) * 100)
  })()

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4, paddingTop:4 }}>
        <button onClick={onBack} style={{ background:'#F2EDE4', border:'none', borderRadius:8, padding:'5px 10px', fontSize:12, color:'#7A6E66', cursor:'pointer', flexShrink:0 }}>
          {t('common.back')}
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text-1, #2E2420)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            🏗 {proj.name}
          </div>
        </div>
        {onEdit && <IconButton onClick={() => onEdit(proj)} title="Edit project">✏️</IconButton>}
      </div>

      {/* ── Progress strip ── */}
      <div style={{ height:4, background:'var(--border, #EAE3D8)', borderRadius:4, overflow:'hidden', marginBottom:0 }}>
        <div style={{ height:4, borderRadius:4, background:'#C96B3A', width:`${pct}%`, transition:'width .4s' }} />
      </div>

      {/* ── Inner tab bar ── */}
      <div className="inner-tab-bar">
        {TABS.map(tb => (
          <button key={tb.id} className={`inner-tab-btn ${tab===tb.id?'active':''}`} onClick={() => setTab(tb.id)}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === 'tasks'     && <ProjectTasksTab proj={proj} canDelete={canDelete} canEdit={canEdit} tools={tools} team={team} />}
      {tab === 'materials' && <MaterialsTab proj={proj} canEdit={canEdit} />}
      {tab === 'photos'    && <PhotosTab proj={proj} />}
      {tab === 'team'      && <ProjectTeamTab proj={proj} />}
    </div>
  )
}

// ─── PROJECT LIST ────────────────────────────────────────────────────────────
function ProjectList({ onSelect, onEdit, onDelete = null }) {
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
                  {onEdit && <IconButton onClick={e => { e.stopPropagation(); onEdit(p) }} title="Edit">✏️</IconButton>}
                  {onDelete && <IconButton danger onClick={e => { e.stopPropagation(); onDelete(p.id) }} title="Delete">🗑</IconButton>}
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

// ─── EDIT STAGES WIDGET (used inside Edit Project modal) ─────────────────────
function EditStages({ stages, onChange, placeholder }) {
  const [newName,     setNewName]     = useState('')
  const [editingIdx,  setEditingIdx]  = useState(null)
  const [editingName, setEditingName] = useState('')

  const safe = Array.isArray(stages) ? stages : []

  const add = () => {
    const t = newName.trim(); if (!t) return
    onChange([...safe, t]); setNewName('')
  }
  const remove  = (i) => onChange(safe.filter((_, j) => j !== i))
  const move    = (i, d) => {
    const j = i + d; if (j < 0 || j >= safe.length) return
    const next = [...safe]; [next[i], next[j]] = [next[j], next[i]]; onChange(next)
  }
  const startEdit   = (i) => { setEditingIdx(i); setEditingName(safe[i]) }
  const confirmEdit = (i) => {
    const t = editingName.trim()
    if (t && t !== safe[i]) onChange(safe.map((s, j) => j === i ? t : s))
    setEditingIdx(null)
  }

  const row = { display:'flex', alignItems:'center', gap:6, padding:'7px 10px', borderBottom:'1px solid var(--border,#EAE3D8)' }
  const arrowStyle = (dis) => ({
    background:'none', border:'none', cursor: dis ? 'default' : 'pointer',
    fontSize:12, color: dis ? '#D9D0C7' : '#B8AFA6', padding:'2px 4px', lineHeight:1,
  })
  const iconStyle = (col='#7A6E66') => ({
    background:'none', border:'none', cursor:'pointer',
    fontSize:13, color:col, padding:'3px 5px', lineHeight:1, borderRadius:5,
  })

  return (
    <div style={{ border:'1.5px solid var(--border,#EAE3D8)', borderRadius:10, overflow:'hidden' }}>
      {safe.length === 0 && (
        <div style={{ padding:'10px 12px', fontSize:12, color:'#B8AFA6' }}>—</div>
      )}
      {safe.map((s, i) => (
        <div key={i} style={row}>
          {/* Reorder */}
          <div style={{ display:'flex', flexDirection:'column', gap:1, flexShrink:0 }}>
            <button type="button" style={arrowStyle(i===0)} disabled={i===0} onClick={() => move(i,-1)}>▲</button>
            <button type="button" style={arrowStyle(i===safe.length-1)} disabled={i===safe.length-1} onClick={() => move(i,1)}>▼</button>
          </div>
          {/* Number */}
          <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--bg-accent,#F2EDE4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#7A6E66', flexShrink:0 }}>{i+1}</div>
          {/* Name / input */}
          {editingIdx === i ? (
            <input
              type="text" autoFocus
              value={editingName} onChange={e => setEditingName(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter'){e.preventDefault();confirmEdit(i)} if(e.key==='Escape')setEditingIdx(null) }}
              style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:13, fontWeight:500, fontFamily:'inherit', color:'var(--text-1,#2E2420)' }}
            />
          ) : (
            <span style={{ flex:1, fontSize:13, fontWeight:500, color:'var(--text-1,#2E2420)' }}>{s}</span>
          )}
          {/* Actions */}
          <div style={{ display:'flex', gap:2, flexShrink:0 }}>
            {editingIdx === i ? (
              <>
                <button type="button" style={iconStyle('#3D7A52')} onClick={() => confirmEdit(i)}>✓</button>
                <button type="button" style={iconStyle('#A32D2D')} onClick={() => setEditingIdx(null)}>✕</button>
              </>
            ) : (
              <>
                <button type="button" style={iconStyle()} onClick={() => startEdit(i)}>✏️</button>
                <button type="button" style={iconStyle('#A32D2D')} onClick={() => remove(i)}>🗑</button>
              </>
            )}
          </div>
        </div>
      ))}
      {/* Add new */}
      <div style={{ display:'flex', gap:0 }}>
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter'){e.preventDefault();add()} }}
          placeholder={placeholder}
          style={{ flex:1, border:'none', outline:'none', padding:'9px 12px', fontSize:13, background:'transparent', fontFamily:'inherit', color:'var(--text-1,#2E2420)' }}
        />
        <button
          type="button" onClick={add} disabled={!newName.trim()}
          style={{
            width:42, flexShrink:0, background: newName.trim() ? '#C96B3A' : 'var(--bg-accent,#F2EDE4)',
            color: newName.trim() ? '#fff' : '#B8AFA6',
            border:'none', fontSize:22, cursor: newName.trim() ? 'pointer' : 'default',
            transition:'background .15s, color .15s',
          }}
        >+</button>
      </div>
    </div>
  )
}

// ─── PROJECTS (two-mode: list ↔ detail) ─────────────────────────────────────
export function Projects({ canDelete = true, canEdit = true }) {
  const { t } = useT()
  const { projects, tasks, tools, fetchProjects, fetchTasks, fetchTools, updateProject, profile, selectedProjectId, setSelectedProject } = useStore()
  const [showAdd,    setShowAdd]    = useState(false)
  const [confirmId,  setConfirmId]  = useState(null)
  const [editProject, setEditProject] = useState(null)
  const [editForm,   setEditForm]   = useState({ name:'', stage:'Foundation', deadline:'', address:'', progress:0, stages:[] })
  const [editSaving, setEditSaving] = useState(false)
  const [addForm,    setAddForm]    = useState({ name:'', stage:'Foundation', deadline:'', address:'', stages:[] })

  useEffect(() => {
    fetchProjects()
    fetchTasks()
    fetchTools()
  }, [])

  const setA = (field) => (e) => setAddForm(f => ({ ...f, [field]: e.target.value }))
  const setE = (field) => (e) => setEditForm(f => ({ ...f, [field]: e.target.value }))

  const createProject = async () => {
    if (!addForm.name.trim()) return
    const { data: newProj, error } = await supabase.from('projects').insert({
      name: addForm.name,
      deadline: addForm.deadline || null,
      address: addForm.address || null,
      foreman_id: profile.id, progress: 0,
      stages: addForm.stages || [],
    }).select().single()
    if (!error && newProj) {
      // Добавляем всех существующих менеджеров в новый проект
      const managers = team.filter(m => m.role === 'manager')
      if (managers.length) {
        await supabase.from('project_workers').insert(
          managers.map(m => ({ project_id: newProj.id, worker_id: m.id }))
        )
      }
      fetchProjects()
      setShowAdd(false)
      setAddForm({ name:'', stage:'Foundation', deadline:'', address:'', stages:[] })
    }
  }

  const openEdit = (p) => {
    setEditProject(p)
    setEditForm({ name: p.name||'', stage: p.stage||'Foundation', deadline: p.deadline||'', address: p.address||'', progress: p.progress??0, stages: p.stages || [] })
  }

  const saveEdit = async () => {
    if (!editForm.name.trim()) return
    setEditSaving(true)
    await updateProject(editProject.id, {
      name: editForm.name.trim(),
      deadline: editForm.deadline || null, address: editForm.address || null,
      stages: editForm.stages || [],
      // progress is auto-calculated from tasks, not saved here
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
            {canEdit && <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>{t('projects.add')}</Button>}
          </div>
          <ProjectList
            onSelect={(id) => setSelectedProject(id)}
            onEdit={canEdit ? openEdit : null}
            onDelete={canDelete ? (id) => setConfirmId(id) : null}
          />
        </>
      ) : (
        <ProjectDetail
          proj={selectedProj}
          onBack={() => setSelectedProject(null)}
          onEdit={canEdit ? openEdit : null}
          canDelete={canDelete}
          canEdit={canEdit}
        />
      )}

      {/* ── Add Project Modal ── */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal" style={{ maxHeight:'90dvh', display:'flex', flexDirection:'column' }}>
            <div className="modal-title">{t('projects.newModal')}</div>
            <div style={{ overflowY:'auto', flex:1 }}>
              <FormGroup label={t('projects.nameLabel')}>
                <input className="form-input" placeholder={t('projects.namePlaceholder')}
                  value={addForm.name} onChange={setA('name')} autoFocus />
              </FormGroup>
              <FormGroup label={t('projects.addressLabel')}>
                <input className="form-input" placeholder={t('projects.addressPlaceholder')}
                  value={addForm.address} onChange={setA('address')} />
              </FormGroup>
              <FormGroup label={t('projects.deadlineLabel')}>
                <DatePicker value={addForm.deadline} onChange={v => setAddForm(f => ({ ...f, deadline: v }))} />
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
          <div className="modal" style={{ maxHeight:'90dvh', display:'flex', flexDirection:'column' }}>
            <div className="modal-title">{t('projects.editModal')}: {editProject.name}</div>
            <div style={{ overflowY:'auto', flex:1 }}>
              <FormGroup label={t('projects.nameLabel')}>
                <input className="form-input" value={editForm.name} onChange={setE('name')} autoFocus />
              </FormGroup>
              <FormGroup label={t('projects.addressLabel')}>
                <input className="form-input" placeholder={t('projects.addressPlaceholder')} value={editForm.address} onChange={setE('address')} />
              </FormGroup>
              <FormGroup label={t('projects.deadlineLabel')}>
                <DatePicker value={editForm.deadline} onChange={v => setEditForm(f => ({ ...f, deadline: v }))} />
              </FormGroup>

              {/* ── Stage manager ── */}
              <FormGroup label={t('projects.stagesLabel')}>
                <EditStages
                  stages={editForm.stages || []}
                  onChange={stages => setEditForm(f => ({ ...f, stages }))}
                  placeholder={t('projects.stagePlaceholder')}
                />
              </FormGroup>
            </div>
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

// ─── PROCUREMENT (foreman-wide shortage checklist) ────────────────────────────
export function Procurement({ canDelete = true, canEdit = true }) {
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
        {canEdit && (
          <Button variant="primary" size="sm" onClick={() => { setModalProj(null); setShowModal(true) }}>
            {t('materials.add')}
          </Button>
        )}
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
            {canEdit && (
              <button
                onClick={() => { setModalProj(g.proj?.id || null); setShowModal(true) }}
                style={{ marginLeft:'auto', fontSize:11, fontWeight:600, color:'#C96B3A', background:'#FAECE4', border:'none', borderRadius:8, padding:'4px 10px', cursor:'pointer' }}
              >
                + Add
              </button>
            )}
          </div>
          <MaterialList
            materials={g.items}
            showProject={true}
            projects={projects}
            onTogglePurchased={toggle}
            onDelete={canDelete ? deleteMaterial : null}
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
export function Tools({ canAdd, canDelete = true }) {
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
    const isAssigning = !!(assignForm.project_id || assignForm.worker_id)
    const updates = {
      project_id: assignForm.project_id || null,
      worker_id:  assignForm.worker_id  || null,
      assigned_at:       isAssigning ? new Date().toISOString() : null,
      assigned_by_name:  isAssigning ? (profile?.name || '') : null,
    }
    const { error } = await updateTool(assigning.id, updates)
    if (error) { setAssignErr(error.message || 'Failed to assign'); return }
    setAssigning(null)
  }

  const unassign = async (tool) => {
    await updateTool(tool.id, { project_id: null, worker_id: null, assigned_at: null, assigned_by_name: null })
  }

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
                {isAssigned && tool.assigned_at && (
                  <div style={{ marginTop:5, display:'flex', flexWrap:'wrap', gap:5 }}>
                    <span style={{ fontSize:10, color:'#7A6E66' }}>
                      📅 {t('tools.assignedOn')} {new Date(tool.assigned_at).toLocaleDateString()}
                    </span>
                    {tool.assigned_by_name && (
                      <span style={{ fontSize:10, color:'#7A6E66' }}>
                        · {t('tools.assignedBy')} <strong>{tool.assigned_by_name}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
              {canAdd && (
                <div style={{ display:'flex', gap:5, flexShrink:0, marginTop:2 }}>
                  <Button size="sm" onClick={() => openAssign(tool)}>{t('tools.assign')}</Button>
                  {isAssigned && <Button size="sm" onClick={() => unassign(tool)}>✕</Button>}
                  {canDelete && <IconButton className="danger" onClick={() => setDeleteId(tool.id)}>🗑</IconButton>}
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
  const { team, projects, tasks, tools, fetchProjects, fetchAllWorkers, updateWorkerStatus, profile, joinRequests, fetchJoinRequests, approveJoinRequest, rejectJoinRequest, addClientToProject, addManagerToTeam } = useStore()
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

          {/* Менеджер по email */}
          <div style={{ borderBottom:'1px solid #EAE3D8', paddingTop:14, paddingBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#7A6E66', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>
              {t('team.managerMethod')}
            </div>
            <div style={{ fontSize:12, color:'#7A6E66', marginBottom:8 }}>{t('team.managerDesc')}</div>
            <div style={{ display:'flex', gap:8 }}>
              <input className="form-input" placeholder={t('team.managerPlaceholder')}
                value={managerEmail} onChange={e => setManagerEmail(e.target.value)}
                onKeyDown={e => e.key==='Enter' && inviteManager()} style={{ flex:1 }} />
              <Button variant="primary" size="sm" onClick={inviteManager} disabled={managerLoading}>{managerLoading ? '...' : t('common.add')}</Button>
            </div>
            {managerMsg && (
              <div style={{ marginTop:8, fontSize:12, padding:'6px 10px', borderRadius:6, background: managerMsg.includes('added') ? '#E8F2EB' : '#FCEBEB', color: managerMsg.includes('added') ? '#3D7A52' : '#A32D2D' }}>
                {managerMsg}
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

// ─── NOTIFICATIONS / ACTIVITY LOG ────────────────────────────────────────────

const ACTIVITY_CFG = {
  task_created:       { icon:'📝', color:'#2E6FB5', bg:'#E4EEFA', border:'#A3C2E8', group:'tasks'     },
  task_submitted:     { icon:'🕐', color:'#C96B3A', bg:'#FBF3DC', border:'#F0D897', group:'tasks'     },
  task_approved:      { icon:'✅', color:'#3D7A52', bg:'#E8F2EB', border:'#A8D4B4', group:'tasks'     },
  task_rejected:      { icon:'↩️', color:'#A32D2D', bg:'#FCEBEB', border:'#F0AAAA', group:'tasks'     },
  material_added:     { icon:'📦', color:'#C96B3A', bg:'#FBF3DC', border:'#F0D897', group:'materials' },
  material_purchased: { icon:'🛒', color:'#3D7A52', bg:'#E8F2EB', border:'#A8D4B4', group:'materials' },
  tool_added:         { icon:'🔧', color:'#2E6FB5', bg:'#E4EEFA', border:'#A3C2E8', group:'tools'     },
  worker_joined:      { icon:'👷', color:'#6E4AAB', bg:'#F0EAF8', border:'#C4AADF', group:'team'      },
  comment_added:      { icon:'💬', color:'#7A6E66', bg:'#F2EDE4', border:'#D9D0C7', group:'tasks'     },
}
const ACTIVITY_CFG_DEFAULT = { icon:'📋', color:'#7A6E66', bg:'#F2EDE4', border:'#D9D0C7', group:'other' }

const ACTIVITY_GROUPS = ['all', 'tasks', 'materials', 'tools', 'team']

const ACTIVITY_LABELS = {
  ru: {
    all: 'Все', tasks: 'Задачи', materials: 'Материалы', tools: 'Инструменты', team: 'Команда',
    title: 'Активность', none: 'Нет активности',
  },
  en: {
    all: 'All', tasks: 'Tasks', materials: 'Materials', tools: 'Tools', team: 'Team',
    title: 'Activity', none: 'No activity yet',
  },
}
function activityLabel(lang, key) {
  return (ACTIVITY_LABELS[lang] || ACTIVITY_LABELS.en)[key] || (ACTIVITY_LABELS.en)[key]
}

function formatActivityText(e, lang) {
  const a  = e.actor_name || '—'
  const nm = e.entity_name ? `"${e.entity_name}"` : ''
  const m  = e.meta || {}
  const ru = lang === 'ru'

  switch (e.action_type) {
    case 'task_created':       return ru ? `${a} создал(а) задачу ${nm}` : `${a} created task ${nm}`
    case 'task_submitted':     return ru ? `${a} отправил(а) задачу ${nm} на проверку` : `${a} submitted task ${nm} for review`
    case 'task_approved':      return ru ? `${a} принял(а) задачу ${nm}` : `${a} approved task ${nm}`
    case 'task_rejected':      return ru ? `${a} отправил(а) задачу ${nm} на доработку` : `${a} sent task ${nm} for revision`
    case 'material_added':     return ru
      ? `${a} запросил(а) ${m.qty || ''} ${m.unit || ''} — ${e.entity_name || ''}`
      : `${a} requested ${m.qty || ''} ${m.unit || ''} — ${e.entity_name || ''}`
    case 'material_purchased': return ru ? `${a} закупил(а) ${nm}` : `${a} purchased ${nm}`
    case 'tool_added':         return ru ? `${a} добавил(а) инструмент ${nm}` : `${a} added tool ${nm}`
    case 'worker_joined':      return ru ? `${e.entity_name || a} присоединился к команде` : `${e.entity_name || a} joined the team`
    case 'comment_added':      return ru ? `${a} прокомментировал(а) задачу ${nm}` : `${a} commented on task ${nm}`
    default:                   return `${a} — ${e.action_type}`
  }
}

function formatActivityTime(dateStr, lang) {
  if (!dateStr) return ''
  const d    = new Date(dateStr)
  const diff = (Date.now() - d) / 1000
  const ru   = lang === 'ru'
  if (diff < 60)         return ru ? 'только что' : 'just now'
  if (diff < 3600)       return ru ? `${Math.floor(diff / 60)} мин` : `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)      return ru ? `${Math.floor(diff / 3600)} ч` : `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7)  return ru ? `${Math.floor(diff / 86400)} д` : `${Math.floor(diff / 86400)}d ago`
  return new Intl.DateTimeFormat(lang === 'ru' ? 'ru' : 'en', { day: 'numeric', month: 'short' }).format(d)
}

export function Notifications() {
  const { lang } = useT()
  const { activityLog, fetchActivityLog } = useStore()
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchActivityLog() }, [])

  const counts = ACTIVITY_GROUPS.reduce((acc, g) => {
    acc[g] = g === 'all'
      ? activityLog.length
      : activityLog.filter(e => (ACTIVITY_CFG[e.action_type] || ACTIVITY_CFG_DEFAULT).group === g).length
    return acc
  }, {})

  const filtered = filter === 'all'
    ? activityLog
    : activityLog.filter(e => (ACTIVITY_CFG[e.action_type] || ACTIVITY_CFG_DEFAULT).group === filter)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{activityLabel(lang, 'title')}</h1>
      </div>

      {/* Filter bar */}
      <div className="filter-bar" style={{ flexWrap:'wrap', gap:6 }}>
        {ACTIVITY_GROUPS.map(g => (
          <button key={g} className={`filter-btn ${filter === g ? 'active' : ''}`} onClick={() => setFilter(g)}>
            {activityLabel(lang, g)}{counts[g] > 0 ? ` · ${counts[g]}` : ''}
          </button>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {filtered.length === 0 && <EmptyState>{activityLabel(lang, 'none')}</EmptyState>}

        {filtered.map(entry => {
          const cfg = ACTIVITY_CFG[entry.action_type] || ACTIVITY_CFG_DEFAULT
          return (
            <div key={entry.id} style={{
              display:'flex', alignItems:'flex-start', gap:12,
              background: cfg.bg,
              border: `1.5px solid ${cfg.border}`,
              borderRadius: 14, padding:'12px 14px',
            }}>
              {/* Icon */}
              <div style={{
                width:40, height:40, borderRadius:'50%', flexShrink:0,
                background:'#fff', border:`1.5px solid ${cfg.border}`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:19,
              }}>
                {cfg.icon}
              </div>

              {/* Content */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, color:'var(--text-1,#2E2420)', lineHeight:1.5, fontWeight:500 }}>
                  {formatActivityText(entry, lang)}
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6, flexWrap:'wrap' }}>
                  {/* Project badge */}
                  {entry.project?.name && (
                    <span style={{
                      fontSize:11, color:cfg.color, fontWeight:600,
                      background:'#fff', border:`1px solid ${cfg.border}`,
                      borderRadius:7, padding:'2px 8px',
                    }}>
                      📍 {entry.project.name}
                    </span>
                  )}
                  {/* Time — pushed to the right */}
                  <span style={{ marginLeft:'auto', fontSize:11, color:'#B8AFA6', whiteSpace:'nowrap' }}>
                    {formatActivityTime(entry.created_at, lang)}
                  </span>
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
