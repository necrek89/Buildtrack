import { useState, useEffect } from 'react'
import { MapPin, X } from '@phosphor-icons/react'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n/useLanguage'
import { Button } from '../../components/UI'
import MaterialRequestModal from '../../components/MaterialRequestModal'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 2)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function RequestCard({ req, t }) {
  const [lightbox, setLightbox] = useState(false)

  return (
    <div style={{
      background: 'var(--surface,#fff)',
      border: '1.5px solid var(--border,#EAE3D8)',
      borderRadius: 10, padding: '12px 14px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1,#2E2420)', flex: 1 }}>
          {req.name}
          {req.qty != null && (
            <span style={{ fontWeight: 400, fontSize: 13, color: '#7A6E66', marginLeft: 6 }}>
              {req.qty} {req.unit}
            </span>
          )}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
          background: req.status === 'closed' ? '#E8F2EB' : '#FEF3CD',
          color:      req.status === 'closed' ? '#3D7A52' : '#C96B3A',
          flexShrink: 0,
        }}>
          {req.status === 'closed' ? t('matReq.statusClosed') : t('matReq.statusOpen')}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
        {req.project?.name && (
          <span style={{ fontSize: 11, color: '#C96B3A', fontWeight: 600, display:'flex', alignItems:'center', gap:2 }}>
            <MapPin size={11} weight="bold" /> {req.project.name}
          </span>
        )}
        {req.task?.text && (
          <span style={{ fontSize: 11, background: 'var(--bg-accent,#F2EDE4)', color: '#7A6E66', borderRadius: 5, padding: '1px 6px' }}>
            {req.task.text}
          </span>
        )}
        <span style={{ fontSize: 11, color: '#B8AFA6', marginLeft: 'auto' }}>
          {timeAgo(req.created_at)}
        </span>
      </div>

      {req.notes && (
        <div style={{ fontSize: 12, color: '#7A6E66', marginTop: 6, lineHeight: 1.5 }}>{req.notes}</div>
      )}

      {req.photo_url && (
        <div style={{ marginTop: 8 }}>
          <img
            src={req.photo_url} alt="photo"
            onClick={() => setLightbox(true)}
            style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8,
              border: '1px solid var(--border,#EAE3D8)', cursor: 'pointer', display: 'block' }}
          />
          {lightbox && (
            <div
              onClick={() => setLightbox(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.88)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <button onClick={() => setLightbox(false)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)',
                  border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff',
                  fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} weight="bold" />
              </button>
              <img src={req.photo_url} alt="full" onClick={e => e.stopPropagation()}
                style={{ maxWidth: '94vw', maxHeight: '80dvh', borderRadius: 10, objectFit: 'contain' }} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function WorkerMaterials() {
  const { t } = useT()
  const {
    materialRequests, fetchMaterialRequests,
    addMaterialRequest,
    fetchProjects, projects,
    fetchTasks, tasks,
  } = useStore()

  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchMaterialRequests()
    fetchProjects()
    fetchTasks()
  }, [])

  const open   = materialRequests.filter(r => r.status === 'open')
  const closed = materialRequests.filter(r => r.status === 'closed')

  const handleSave = async (payload, photoFile) => {
    return await addMaterialRequest(payload, photoFile)
  }

  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1,#2E2420)', margin: 0 }}>
          {t('matReq.title')}
        </h2>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          {t('matReq.newBtn')}
        </Button>
      </div>

      {materialRequests.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#B8AFA6', fontSize: 14 }}>
          {t('matReq.emptyWorker')}
        </div>
      )}

      {open.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#B8AFA6', letterSpacing: '.08em',
            textTransform: 'uppercase', marginBottom: 8 }}>
            {t('matReq.statusOpen')} ({open.length})
          </div>
          {open.map(req => <RequestCard key={req.id} req={req} t={t} />)}
        </div>
      )}

      {closed.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#B8AFA6', letterSpacing: '.08em',
            textTransform: 'uppercase', marginBottom: 8 }}>
            {t('matReq.statusClosed')} ({closed.length})
          </div>
          {closed.map(req => <RequestCard key={req.id} req={req} t={t} />)}
        </div>
      )}

      {showModal && (
        <MaterialRequestModal
          projectId={null}
          taskId={null}
          tasks={tasks}
          projects={projects}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
