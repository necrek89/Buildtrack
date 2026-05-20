import { useState, useEffect } from 'react'
import { Button } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'
import { useStore } from '../../store/useStore'
import MaterialModal from '../../components/MaterialModal'
import MaterialList from '../../components/MaterialList'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 2)  return 'just now'
  if (mins < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  return `${days}d`
}

// ─── PROCUREMENT (foreman-wide shortage checklist) ────────────────────────────
export default function Procurement({ canDelete = true, canEdit = true }) {
  const { t } = useT()
  const { materials, projects, fetchProjects, role, profile,
          markMaterialPurchased, markMaterialNeeded, deleteMaterial,
          materialRequests, fetchMaterialRequests,
          updateMaterialRequestStatus, deleteMaterialRequest } = useStore()
  const [filter,       setFilter]    = useState('open')
  const [reqFilter,    setReqFilter] = useState('open') // 'open' | 'all'
  const [showModal,    setShowModal] = useState(false)
  const [modalProj,    setModalProj] = useState(null)

  useEffect(() => {
    fetchProjects()
    fetchMaterialRequests() // load all requests across all projects
  }, [])

  const openRequests   = materialRequests.filter(r => r.status === 'open')
  const shownRequests  = reqFilter === 'open' ? openRequests : materialRequests
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
        {openRequests.length > 0 && (
          <div className="summary-chip warning" style={{ background:'#FEF3C7', color:'#92400E', borderColor:'#FDE68A' }}>
            📦 {openRequests.length} {t('matReq.statusOpen').toLowerCase()}
          </div>
        )}
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

      {/* ── Заявки от рабочих (все объекты) ── */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text-1,#2E2420)', flex:1 }}>
            {t('matReq.sectionTitle')}
            {openRequests.length > 0 && (
              <span style={{ marginLeft:8, fontSize:12, background:'#FEF3C7', color:'#92400E',
                border:'1px solid #FDE68A', borderRadius:20, padding:'1px 8px', fontWeight:700 }}>
                {openRequests.length}
              </span>
            )}
          </div>
          {/* Toggle open / all */}
          <div style={{ display:'flex', gap:4 }}>
            {['open','all'].map(f => (
              <button key={f} onClick={() => setReqFilter(f)} style={{
                fontSize:11, padding:'3px 10px', borderRadius:20, border:'1.5px solid',
                borderColor: reqFilter === f ? '#C96B3A' : 'var(--border,#EAE3D8)',
                background:  reqFilter === f ? '#FAECE4' : 'var(--surface,#fff)',
                color:       reqFilter === f ? '#C96B3A' : '#7A6E66',
                fontWeight:600, cursor:'pointer',
              }}>
                {f === 'open' ? t('matReq.statusOpen') : t('common.all')}
              </button>
            ))}
          </div>
        </div>

        {shownRequests.length === 0 && (
          <div style={{ textAlign:'center', padding:'24px 0', color:'#B8AFA6', fontSize:13 }}>
            {t('matReq.empty')}
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {shownRequests.map(req => {
            const proj = projects.find(p => p.id === req.project_id)
            return (
              <div key={req.id} style={{
                background:'var(--surface,#fff)',
                border:`1.5px solid ${req.status === 'open' ? '#FDE68A' : 'var(--border,#EAE3D8)'}`,
                borderRadius:12, padding:'12px 14px',
              }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    {/* Name + qty */}
                    <div style={{ fontWeight:700, fontSize:14, color:'var(--text-1,#2E2420)' }}>
                      {req.name}
                      {req.qty != null && (
                        <span style={{ fontWeight:400, fontSize:13, color:'#7A6E66', marginLeft:6 }}>
                          {req.qty} {req.unit}
                        </span>
                      )}
                    </div>
                    {/* Badges */}
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:5 }}>
                      <span style={{ fontSize:11, fontWeight:600, color:'#7A6E66' }}>👷 {req.worker_name}</span>
                      {proj && (
                        <span style={{ fontSize:11, color:'#C96B3A', fontWeight:600, background:'#FAECE4',
                          borderRadius:6, padding:'1px 7px' }}>
                          📍 {proj.name}
                        </span>
                      )}
                      {req.task?.text && (
                        <span style={{ fontSize:11, color:'#7A6E66', background:'var(--bg-accent,#F2EDE4)',
                          borderRadius:5, padding:'1px 6px' }}>
                          {req.task.text}
                        </span>
                      )}
                      <span style={{ fontSize:11, color:'#B8AFA6', marginLeft:'auto' }}>
                        {timeAgo(req.created_at)}
                      </span>
                    </div>
                    {req.notes && (
                      <div style={{ fontSize:12, color:'#7A6E66', marginTop:5, lineHeight:1.5 }}>
                        {req.notes}
                      </div>
                    )}
                    {req.photo_url && (
                      <img src={req.photo_url} alt="photo"
                        style={{ width:56, height:56, objectFit:'cover', borderRadius:7,
                          border:'1px solid var(--border,#EAE3D8)', marginTop:6, display:'block', cursor:'pointer' }}
                        onClick={() => window.open(req.photo_url, '_blank')}
                      />
                    )}
                  </div>
                  {/* Actions */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5, flexShrink:0 }}>
                    <span style={{
                      fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20,
                      background: req.status === 'closed' ? '#E8F2EB' : '#FEF3C7',
                      color:      req.status === 'closed' ? '#3D7A52' : '#92400E',
                    }}>
                      {req.status === 'closed' ? t('matReq.statusClosed') : t('matReq.statusOpen')}
                    </span>
                    <button onClick={() => updateMaterialRequestStatus(req.id, req.status === 'closed' ? 'open' : 'closed')}
                      style={{ fontSize:11, padding:'3px 9px', borderRadius:7, cursor:'pointer',
                        background:'var(--surface-2,#FDFBF8)', border:'1px solid var(--border,#EAE3D8)', color:'#7A6E66' }}>
                      {req.status === 'closed' ? t('matReq.reopenBtn') : t('matReq.closeBtn')}
                    </button>
                    {canDelete && (
                      <button onClick={() => deleteMaterialRequest(req.id)}
                        style={{ fontSize:11, padding:'3px 9px', borderRadius:7, cursor:'pointer',
                          background:'#FCEBEB', border:'1px solid #F0AAAA', color:'#A32D2D' }}>
                        {t('common.delete')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
