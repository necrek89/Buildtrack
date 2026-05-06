import { useState } from 'react'
import { useStore, MATERIAL_UNITS } from '../store/useStore'
import { Button, FormGroup } from './UI'

export default function MaterialModal({ open, onClose, defaultProjectId, defaultTaskId }) {
  const { addMaterial, profile, projects } = useStore()

  const [form, setForm] = useState({
    name:      '',
    qty:       1,
    unit:      'pcs',
    note:      '',
    projectId: defaultProjectId || '',
  })
  const [err,    setErr]    = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const submit = () => {
    if (!form.name.trim())               { setErr('Enter material name'); return }
    if (!form.qty || Number(form.qty) <= 0) { setErr('Enter a valid quantity'); return }
    setSaving(true)
    addMaterial({
      projectId:  form.projectId || null,
      taskId:     defaultTaskId  || null,
      name:       form.name.trim(),
      qty:        Number(form.qty),
      unit:       form.unit,
      note:       form.note.trim(),
      reportedBy: profile?.name || 'Worker',
    })
    setSaving(false)
    setForm({ name: '', qty: 1, unit: 'pcs', note: '', projectId: defaultProjectId || '' })
    setErr('')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Add to Shopping List</div>

        {/* Project selector — показываем всегда, pre-select если передан */}
        <FormGroup label="Project">
          <select
            className="form-input"
            value={form.projectId}
            onChange={set('projectId')}
          >
            <option value="">— General (no project) —</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </FormGroup>

        <FormGroup label="Material name *">
          <input
            className="form-input"
            placeholder="e.g. White wall sockets"
            value={form.name}
            onChange={set('name')}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
        </FormGroup>

        <div className="form-grid-2">
          <FormGroup label="Quantity *">
            <input
              className="form-input"
              type="number"
              min="0.1"
              step="0.1"
              value={form.qty}
              onChange={set('qty')}
            />
          </FormGroup>
          <FormGroup label="Unit">
            <select className="form-input" value={form.unit} onChange={set('unit')}>
              {MATERIAL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </FormGroup>
        </div>

        <FormGroup label="Note">
          <textarea
            className="form-input"
            rows={2}
            placeholder="Brand, spec, where to buy…"
            value={form.note}
            onChange={set('note')}
            style={{ resize: 'vertical', minHeight: 60 }}
          />
        </FormGroup>

        {err && (
          <div style={{ fontSize:12, color:'#A32D2D', background:'#FCEBEB', padding:'6px 10px', borderRadius:6, marginBottom:8 }}>
            {err}
          </div>
        )}

        <div className="modal-actions">
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={saving}>
            {saving ? 'Adding…' : 'Add to list'}
          </Button>
        </div>
      </div>
    </div>
  )
}
