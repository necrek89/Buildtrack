import { useState, useRef, useEffect } from 'react'
import { useT } from '../i18n/useLanguage'
import { FormGroup, Button } from './UI'
import { MATERIAL_UNITS } from '../store/useStore'

const inp = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1.5px solid var(--border,#EAE3D8)', background: 'var(--surface-2,#FDFBF8)',
  fontSize: 13, color: 'var(--text-1,#2E2420)', fontFamily: 'inherit', outline: 'none',
}

export default function MaterialRequestModal({ projectId, taskId, taskName, tasks = [], onClose, onSave }) {
  const { t } = useT()
  const fileRef = useRef()
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState(null)
  const [photoFile, setPhotoFile]     = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const [form, setForm] = useState({
    name:    '',
    qty:     '',
    unit:    MATERIAL_UNITS[0],
    task_id: taskId != null ? String(taskId) : '',
    notes:   '',
  })

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const setField = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    setSaveError(null)
    const payload = {
      project_id: projectId,
      task_id:    form.task_id ? Number(form.task_id) : null,
      name:       form.name.trim(),
      qty:        form.qty ? parseFloat(form.qty) : null,
      unit:       form.unit || null,
      notes:      form.notes.trim() || null,
    }
    const { error } = await onSave(payload, photoFile)
    setSaving(false)
    if (error) { setSaveError(error.message || 'Failed to save'); return }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}>

        <div className="modal-title">{t('matReq.addTitle')}</div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 2 }}>

          {/* Material name */}
          <FormGroup label={t('matReq.nameLabel')}>
            <input
              style={inp} autoFocus
              value={form.name} onChange={setField('name')}
              placeholder={t('matReq.namePlaceholder')}
            />
          </FormGroup>

          {/* Qty + Unit */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <FormGroup label={t('matReq.qtyLabel')}>
                <input
                  style={inp} type="number" min="0" step="any"
                  value={form.qty} onChange={setField('qty')}
                  placeholder="0"
                />
              </FormGroup>
            </div>
            <div style={{ flex: 1 }}>
              <FormGroup label={t('matReq.unitLabel')}>
                <select style={inp} value={form.unit} onChange={setField('unit')}>
                  {MATERIAL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </FormGroup>
            </div>
          </div>

          {/* Task link */}
          <FormGroup label={t('matReq.taskLabel')}>
            <select style={inp} value={form.task_id} onChange={setField('task_id')}>
              <option value="">{t('matReq.noTask')}</option>
              {tasks.map(tk => (
                <option key={tk.id} value={String(tk.id)}>{tk.text}</option>
              ))}
            </select>
          </FormGroup>

          {/* Notes */}
          <FormGroup label={t('matReq.notesLabel')}>
            <textarea
              style={{ ...inp, resize: 'vertical', minHeight: 72 }}
              rows={3} value={form.notes} onChange={setField('notes')}
              placeholder={t('matReq.notesPlaceholder')}
            />
          </FormGroup>

          {/* Photo */}
          <FormGroup label={t('matReq.photoLabel')}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={handleFile} />
            <button type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%', padding: '10px', borderRadius: 10,
                border: '1.5px dashed var(--border,#D9D0C7)',
                background: 'var(--surface-2,#FDFBF8)',
                cursor: 'pointer', fontSize: 13, color: '#7A6E66',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              {t('matReq.photoBtn')}
            </button>
            {photoPreview && (
              <div style={{ marginTop: 10, position: 'relative', width: 'fit-content' }}>
                <img src={photoPreview} alt="preview"
                  style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 8,
                    border: '1px solid var(--border,#EAE3D8)', objectFit: 'contain' }} />
                <button
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                  style={{
                    position: 'absolute', top: -6, right: -6,
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#A32D2D', color: '#fff',
                    border: 'none', fontSize: 11, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>✕</button>
              </div>
            )}
          </FormGroup>

        </div>

        {saveError && (
          <div style={{ margin: '8px 0 0', padding: '8px 12px', background: '#FEE2E2',
            color: '#991B1B', borderRadius: 8, fontSize: 12 }}>
            ⚠️ {saveError}
          </div>
        )}

        <div className="modal-actions" style={{ paddingTop: 12, borderTop: '1px solid var(--border,#EAE3D8)', marginTop: 4 }}>
          <Button size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? '...' : t('matReq.saveBtn')}
          </Button>
        </div>
      </div>
    </div>
  )
}
