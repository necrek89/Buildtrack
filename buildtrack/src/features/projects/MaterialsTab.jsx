import { useState } from 'react'
import { Button } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'
import { useStore } from '../../store/useStore'
import MaterialModal from '../../components/MaterialModal'
import MaterialList from '../../components/MaterialList'

// ─── MATERIALS TAB ───────────────────────────────────────────────────────────
export default function MaterialsTab({ proj, canEdit = true }) {
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
