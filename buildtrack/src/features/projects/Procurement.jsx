import { useState, useEffect } from 'react'
import { Button } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'
import { useStore } from '../../store/useStore'
import MaterialModal from '../../components/MaterialModal'

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

// ─── PROCUREMENT (unified foreman + worker requests) ─────────────────────────
export default function Procurement({ canDelete = true, canEdit = true }) {
  const { t } = useT()
  const { materials, projects, fetchProjects, fetchMaterials, role, profile,
          markMaterialPurchased, markMaterialNeeded, deleteMaterial,
          materialRequests, fetchMaterialRequests,
          updateMaterialRequestStatus, deleteMaterialRequest } = useStore()
  const [filter,    setFilter]  = useState('open')
  const [showModal, setShowModal] = useState(false)
  const [modalProj, setModalProj] = useState(null)
  const [lightbox,  setLightbox]  = useState(null)

  useEffect(() => {
    fetchProjects()
    fetchMaterials()
    fetchMaterialRequests()
  }, [])

  // ── Normalize into unified items ──────────────────────────────────────────
  // type: 'material' | 'request'
  // isOpen: bool — to allow uniform filtering
  // isPurchased: bool
  const allItems = [
    ...materials.map(m => ({
      type:        'material',
      id:          m.id,
      projectId:   m.projectId != null ? String(m.projectId) : '__none__',
      name:        m.name,
      qty:         m.qty,
      unit:        m.unit,
      notes:       m.note,
      reportedBy:  m.reportedBy,
      taskName:    m.taskText || null,
      photo:       null,
      createdAt:   m.createdAt,
      purchasedAt: m.purchasedAt || null,
      isOpen:      m.status === 'needed',
      isPurchased: m.status === 'purchased',
      raw:         m,
    })),
    ...materialRequests.map(r => ({
      type:        'request',
      id:          `req_${r.id}`,
      projectId:   r.project_id != null ? String(r.project_id) : '__none__',
      name:        r.name,
      qty:         r.qty,
      unit:        r.unit,
      notes:       r.notes,
      reportedBy:  r.worker_name,
      taskName:    r.task?.text || null,
      photo:       r.photo_url,
      createdAt:   r.created_at,
      purchasedAt: r.status === 'closed' ? r.updated_at || r.created_at : null,
      isOpen:      r.status === 'open',
      isPurchased: r.status === 'closed',
      raw:         r,
    })),
  ]

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = allItems.filter(item =>
    filter === 'open'      ? item.isOpen      :
    filter === 'purchased' ? item.isPurchased  : true
  )

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalOpen      = allItems.filter(i => i.isOpen).length
  const totalPurchased = allItems.filter(i => i.isPurchased).length
  const openRequests   = materialRequests.filter(r => r.status === 'open').length
  const today          = new Date(); today.setHours(0, 0, 0, 0)
  const purchasedToday = materials.filter(m =>
    m.status === 'purchased' && m.purchasedAt && new Date(m.purchasedAt) >= today
  ).length

  // ── Group by purchase date (when purchased filter) or by project ─────────
  const groupByDate = filter === 'purchased'

  const fmtDay = (iso) => {
    if (!iso) return 'Дата неизвестна'
    const d = new Date(iso)
    const today = new Date(); today.setHours(0,0,0,0)
    const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
    if (d >= today) return 'Сегодня'
    if (d >= yesterday) return 'Вчера'
    return d.toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' })
  }

  const groupMap = {}
  for (const item of filtered) {
    const key = groupByDate
      ? (item.purchasedAt ? new Date(item.purchasedAt).toISOString().slice(0,10) : '__unknown__')
      : item.projectId
    if (!groupMap[key]) groupMap[key] = []
    groupMap[key].push(item)
  }

  const groups = Object.entries(groupMap)
    .map(([key, items]) => ({
      key,
      proj:  !groupByDate && key !== '__none__' ? projects.find(p => String(p.id) === key) : null,
      label: groupByDate
        ? fmtDay(key === '__unknown__' ? null : key + 'T00:00:00')
        : key === '__none__'
          ? (t('materials.generalNoProject') || 'No project')
          : (projects.find(p => String(p.id) === key)?.name || `Project ${key}`),
      items,
      openCount: items.filter(i => i.isOpen).length,
      dateKey: groupByDate ? key : null,
    }))
    .sort((a, b) => {
      if (groupByDate) {
        if (a.key === '__unknown__') return 1
        if (b.key === '__unknown__') return -1
        return b.key.localeCompare(a.key) // newest first
      }
      return a.key === '__none__' ? 1 : b.key === '__none__' ? -1 : 0
    })

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggleItem = (item) => {
    if (item.type === 'material') {
      item.isOpen ? markMaterialPurchased(item.id) : markMaterialNeeded(item.id)
    } else {
      updateMaterialRequestStatus(item.raw.id, item.isOpen ? 'closed' : 'open')
    }
  }

  const deleteItem = (item) => {
    if (item.type === 'material') {
      if (role === 'foreman' || item.reportedBy === profile?.name) deleteMaterial(item.id)
    } else {
      deleteMaterialRequest(item.raw.id)
    }
  }

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
        <div className={`summary-chip ${totalOpen > 0 ? 'danger' : 'neutral'}`}>
          {t('materials.openShortages', { n: totalOpen, s: totalOpen !== 1 ? 's' : '' })}
        </div>
        <div className="summary-chip neutral">
          {t('materials.purchasedToday', { n: purchasedToday })}
        </div>
        <div className="summary-chip neutral">
          {t('materials.totalChip', { n: allItems.length })}
        </div>
        {openRequests > 0 && (
          <div className="summary-chip" style={{ background:'#FEF3C7', color:'#92400E', border:'1px solid #FDE68A' }}>
            👷 {openRequests} {t('matReq.statusOpen').toLowerCase()}
          </div>
        )}
      </div>

      {/* Filter chips */}
      <div className="filter-bar" style={{ marginBottom:16 }}>
        {[
          { k:'all',       l: t('materials.filterAll',  { n: allItems.length }) },
          { k:'open',      l: t('materials.filterOpen', { n: totalOpen }) },
          { k:'purchased', l: t('materials.filterPurchased') },
        ].map(({ k, l }) => (
          <button key={k} className={`filter-btn ${filter===k?'active':''}`}
            onClick={() => setFilter(k)}>{l}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 0', color:'#B8AFA6' }}>
          <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
          <div style={{ fontSize:15, fontWeight:700, color:'#5A9467' }}>{t('materials.allCaughtUp')}</div>
          <div style={{ fontSize:12, marginTop:6 }}>{t('materials.noOpen')}</div>
        </div>
      )}

      {/* Groups */}
      {groups.map(g => (
        <div key={g.key} className="procurement-group">
          <div className="procurement-group-header">
            <span>{groupByDate ? '📅' : g.key === '__none__' ? '📋' : '🏗'}</span>
            <h3>{g.label}</h3>
            {groupByDate && (
              <span style={{ fontSize:11, color:'#B8AFA6', marginLeft:4 }}>
                {g.items.length} позиц{g.items.length === 1 ? 'ия' : g.items.length < 5 ? 'ии' : 'ий'}
              </span>
            )}
            {!groupByDate && g.openCount > 0 && (
              <span className="procurement-count-badge">
                {t('materials.needed', { n: g.openCount })}
              </span>
            )}
            {canEdit && !groupByDate && (
              <button
                onClick={() => { setModalProj(g.proj?.id || null); setShowModal(true) }}
                style={{ marginLeft:'auto', fontSize:11, fontWeight:600, color:'#C96B3A',
                  background:'#FAECE4', border:'none', borderRadius:8, padding:'4px 10px', cursor:'pointer' }}
              >
                + {t('common.add')}
              </button>
            )}
          </div>

          {/* Unified items list */}
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {g.items.map((item, idx) => (
              <div key={item.id} style={{
                display:'flex', alignItems:'flex-start', gap:10,
                padding:'10px 12px',
                borderTop: idx > 0 ? '1px solid var(--border,#EAE3D8)' : 'none',
                background: item.isPurchased ? 'var(--surface-2,#FDFBF8)' : 'var(--surface,#fff)',
                opacity: item.isPurchased ? 0.7 : 1,
              }}>
                {/* Checkbox */}
                <div
                  onClick={() => toggleItem(item)}
                  style={{
                    width:20, height:20, borderRadius:5, flexShrink:0, marginTop:1,
                    border:`2px solid ${item.isPurchased ? '#3D7A52' : item.type === 'request' ? '#C96B3A' : '#D1D5DB'}`,
                    background: item.isPurchased ? '#3D7A52' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer', transition:'all .15s',
                  }}
                >
                  {item.isPurchased && <span style={{ color:'#fff', fontSize:11, fontWeight:800 }}>✓</span>}
                </div>

                {/* Content */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600,
                    color: item.isPurchased ? '#B8AFA6' : 'var(--text-1,#2E2420)',
                    textDecoration: item.isPurchased ? 'line-through' : 'none',
                  }}>
                    {item.name}
                    {item.qty != null && (
                      <span style={{ fontWeight:400, color:'#7A6E66', marginLeft:6 }}>
                        × {item.qty} {item.unit}
                      </span>
                    )}
                    {/* Worker badge */}
                    {item.type === 'request' && (
                      <span style={{ marginLeft:8, fontSize:10, background:'#FEF3C7',
                        color:'#92400E', borderRadius:5, padding:'1px 6px', fontWeight:700 }}>
                        👷 {item.reportedBy}
                      </span>
                    )}
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:3, alignItems:'center' }}>
                    {item.reportedBy && item.type === 'material' && (
                      <span style={{ fontSize:11, color:'#B8AFA6' }}>{item.reportedBy}</span>
                    )}
                    {item.taskName && (
                      <span style={{ fontSize:11, background:'var(--bg-accent,#F2EDE4)',
                        color:'#7A6E66', borderRadius:5, padding:'1px 6px' }}>
                        {item.taskName}
                      </span>
                    )}
                    {item.notes && (
                      <span style={{ fontSize:11, color:'#B8AFA6', fontStyle:'italic' }}>
                        {item.notes}
                      </span>
                    )}
                    {item.isPurchased && item.purchasedAt ? (
                      <span style={{ fontSize:11, color:'#3D7A52', marginLeft:'auto', fontWeight:500 }}>
                        ✓ {new Date(item.purchasedAt).toLocaleDateString('ru-RU', { day:'numeric', month:'short' })}
                      </span>
                    ) : (
                      <span style={{ fontSize:11, color:'#C8C0B8', marginLeft:'auto' }}>
                        {timeAgo(item.createdAt)}
                      </span>
                    )}
                  </div>
                  {/* Photo thumbnail */}
                  {item.photo && (
                    <img src={item.photo} alt="photo"
                      onClick={() => setLightbox(item.photo)}
                      style={{ width:48, height:48, objectFit:'cover', borderRadius:6,
                        border:'1px solid var(--border,#EAE3D8)', marginTop:5,
                        display:'block', cursor:'pointer' }}
                    />
                  )}
                </div>

                {/* Delete */}
                {canDelete && (
                  <button onClick={() => deleteItem(item)}
                    style={{ background:'none', border:'none', cursor:'pointer',
                      color:'#D1C8C0', fontSize:15, padding:'2px 4px', flexShrink:0,
                      lineHeight:1 }}
                    title={t('common.delete')}
                  >🗑</button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add first item */}
      {groups.length === 0 && filtered.length === 0 && (
        <div style={{ textAlign:'center', paddingTop:8 }}>
          <button
            onClick={() => { setModalProj(null); setShowModal(true) }}
            style={{ fontSize:13, fontWeight:600, color:'#C96B3A', background:'#FAECE4',
              border:'1.5px dashed #E8C9B4', borderRadius:12, padding:'12px 24px',
              cursor:'pointer', width:'100%' }}
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

      {/* Photo lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.88)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
          <button onClick={() => setLightbox(null)}
            style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.15)',
              border:'none', borderRadius:'50%', width:36, height:36, color:'#fff',
              fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            ✕
          </button>
          <img src={lightbox} alt="full" onClick={e => e.stopPropagation()}
            style={{ maxWidth:'94vw', maxHeight:'80dvh', borderRadius:10, objectFit:'contain' }} />
        </div>
      )}
    </div>
  )
}
