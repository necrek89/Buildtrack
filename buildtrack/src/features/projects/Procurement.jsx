import { useState, useEffect } from 'react'
import { Button } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'
import { useStore } from '../../store/useStore'
import MaterialModal from '../../components/MaterialModal'
import MaterialList from '../../components/MaterialList'

// ─── PROCUREMENT (foreman-wide shortage checklist) ────────────────────────────
export default function Procurement({ canDelete = true, canEdit = true }) {
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
