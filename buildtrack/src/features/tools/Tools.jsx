import { useState, useEffect } from 'react'
import { Badge, Button, FormGroup, IconButton, EmptyState } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'
import { useStore, TOOL_STATUS_BADGE, TOOL_STATUS_LABEL } from '../../store/useStore'
import ConfirmModal from '../../components/ConfirmModal'

// ─── TOOLS ───────────────────────────────────────────────────────────────────
export default function Tools({ canAdd, canDelete = true }) {
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
