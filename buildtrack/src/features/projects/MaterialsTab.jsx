import { useState, useEffect } from 'react'
import { Button } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'
import { useStore } from '../../store/useStore'
import MaterialModal from '../../components/MaterialModal'
import MaterialList from '../../components/MaterialList'

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

// ─── MATERIALS TAB ───────────────────────────────────────────────────────────
export default function MaterialsTab({ proj, canEdit = true }) {
  const { t } = useT()
  const { materials, role, profile, projects,
          markMaterialPurchased, markMaterialNeeded, deleteMaterial, fetchMaterials,
          materialRequests, fetchMaterialRequests,
          updateMaterialRequestStatus, deleteMaterialRequest } = useStore()
  const [filter,    setFilter]    = useState('open')
  const [showModal, setShowModal] = useState(false)
  const [reqLightbox, setReqLightbox] = useState(null)

  useEffect(() => {
    fetchMaterials()
    fetchMaterialRequests(proj.id)
  }, [proj.id])

  const projRequests = materialRequests.filter(r => r.project_id === proj.id)

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

      {/* Worker Requests Section */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1,#2E2420)', marginBottom: 10 }}>
          {t('matReq.sectionTitle')}
        </div>

        {projRequests.length === 0 && (
          <div style={{ fontSize: 13, color: '#B8AFA6', textAlign: 'center', padding: '16px 0' }}>
            {t('matReq.empty')}
          </div>
        )}

        {projRequests.map(req => (
          <div key={req.id} style={{
            background: 'var(--surface,#fff)', border: '1.5px solid var(--border,#EAE3D8)',
            borderRadius: 10, padding: '10px 12px', marginBottom: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-1,#2E2420)' }}>
                  {req.name}
                  {req.qty != null && (
                    <span style={{ fontWeight: 400, fontSize: 12, color: '#7A6E66', marginLeft: 6 }}>
                      {req.qty} {req.unit}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: '#7A6E66' }}>👷 {req.worker_name}</span>
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
                  <div style={{ fontSize: 12, color: '#7A6E66', marginTop: 4 }}>{req.notes}</div>
                )}
                {req.photo_url && (
                  <div style={{ marginTop: 6 }}>
                    <img
                      src={req.photo_url} alt="photo"
                      onClick={() => setReqLightbox(req.photo_url)}
                      style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 7,
                        border: '1px solid var(--border,#EAE3D8)', cursor: 'pointer', display: 'block' }}
                    />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: req.status === 'closed' ? '#E8F2EB' : '#FEF3CD',
                  color:      req.status === 'closed' ? '#3D7A52' : '#C96B3A',
                }}>
                  {req.status === 'closed' ? t('matReq.statusClosed') : t('matReq.statusOpen')}
                </span>
                <button
                  onClick={() => updateMaterialRequestStatus(req.id, req.status === 'closed' ? 'open' : 'closed')}
                  style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 7, cursor: 'pointer',
                    background: 'var(--surface-2,#FDFBF8)', border: '1px solid var(--border,#EAE3D8)',
                    color: '#7A6E66',
                  }}
                >
                  {req.status === 'closed' ? t('matReq.reopenBtn') : t('matReq.closeBtn')}
                </button>
                <button
                  onClick={() => deleteMaterialRequest(req.id)}
                  style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 7, cursor: 'pointer',
                    background: '#FCEBEB', border: '1px solid #F0AAAA', color: '#A32D2D',
                  }}
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox for request photo */}
      {reqLightbox && (
        <div
          onClick={() => setReqLightbox(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <button onClick={() => setReqLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)',
              border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff',
              fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>
          <img src={reqLightbox} alt="full" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '94vw', maxHeight: '80dvh', borderRadius: 10, objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )
}
