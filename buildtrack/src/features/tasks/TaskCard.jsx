import { useState, useEffect } from 'react'
import { Badge, Button, IconButton } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'
import { useStore } from '../../store/useStore'
import TaskComments from '../../components/TaskComments'
import MaterialModal from '../../components/MaterialModal'
import MaterialList from '../../components/MaterialList'

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
export function TaskMedia({ urls }) {
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
export default function TaskCard({ t, openId, setOpenId, onEdit, onDelete, onApprove, onReject, onMarkDone, showProject, projects }) {
  const { t: tr } = useT()
  const isOpen = openId === t.id
  const projName = showProject && projects ? projects.find(p => p.id === t.project_id)?.name : null
  return (
    <div id={`task-card-${t.id}`} style={{
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
            {t.stage    && <Badge variant="gray">{t.stage}</Badge>}
            {t.quantity != null && t.unit && (
              <span style={{ fontSize:10, background:'#EEF3FD', color:'#4A7FC1', borderRadius:5, padding:'1px 6px', fontWeight:600 }}>
                {t.quantity} {t.unit}
              </span>
            )}
            {t.cost != null && (
              <span style={{ fontSize:10, background:'#EDFAF2', color:'#2E7D52', borderRadius:5, padding:'1px 6px', fontWeight:600 }}>
                {t.currency || '₽'} {Number(t.cost).toLocaleString('ru-RU')}
              </span>
            )}
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
