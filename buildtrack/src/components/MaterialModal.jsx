import { useState } from 'react'
import { useStore, MATERIAL_UNITS } from '../store/useStore'
import { useT } from '../i18n/useLanguage'
import { Button } from './UI'

const newRow = () => ({ _id: Math.random(), name: '', qty: 1, unit: 'pcs', note: '' })

export default function MaterialModal({ open, onClose, defaultProjectId, defaultTaskId }) {
  const { addMaterial, profile, projects } = useStore()
  const { t } = useT()

  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [rows, setRows]           = useState([newRow(), newRow(), newRow()])
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')

  if (!open) return null

  const setRow = (id, field, value) =>
    setRows(rs => rs.map(r => r._id === id ? { ...r, [field]: value } : r))

  const addRow = () => setRows(rs => [...rs, newRow()])

  const removeRow = (id) => {
    if (rows.length === 1) return
    setRows(rs => rs.filter(r => r._id !== id))
  }

  const filledRows = rows.filter(r => r.name.trim())

  const submit = async () => {
    if (!filledRows.length) { setErr('Введите хотя бы одно название'); return }
    setSaving(true)
    for (const r of filledRows) {
      await addMaterial({
        projectId:  projectId || null,
        taskId:     defaultTaskId || null,
        name:       r.name.trim(),
        qty:        Number(r.qty) || 1,
        unit:       r.unit,
        note:       r.note.trim(),
        reportedBy: profile?.name || 'Worker',
      })
    }
    setSaving(false)
    setRows([newRow(), newRow(), newRow()])
    setErr('')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560, width: '96vw', maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="modal-title" style={{ flexShrink: 0 }}>{t('materials.addModal')}</div>

        {/* Project selector */}
        <div style={{ marginBottom: 12, flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('materials.projectLabel')}</div>
          <select
            className="form-input"
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            style={{ fontSize: 13 }}
          >
            <option value="">{t('materials.generalOption')}</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 72px 80px 28px',
          gap: 6, paddingBottom: 4, borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Название *</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Кол-во</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Ед. изм.</span>
          <span />
        </div>

        {/* Rows */}
        <div style={{ overflowY: 'auto', flex: 1, paddingTop: 6 }}>
          {rows.map((r, i) => (
            <div key={r._id} style={{ display: 'grid', gridTemplateColumns: '1fr 72px 80px 28px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
              <input
                className="form-input mat-row-name"
                placeholder={`Позиция ${i + 1}`}
                value={r.name}
                onChange={e => setRow(r._id, 'name', e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (i === rows.length - 1) addRow()
                    const inputs = document.querySelectorAll('.mat-row-name')
                    if (inputs[i + 1]) inputs[i + 1].focus()
                  }
                }}
                style={{ fontSize: 13, padding: '6px 8px' }}
                autoFocus={i === 0}
              />
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="form-input"
                value={r.qty}
                onChange={e => setRow(r._id, 'qty', e.target.value)}
                style={{ fontSize: 13, padding: '6px 6px', textAlign: 'center' }}
              />
              <select
                className="form-input"
                value={r.unit}
                onChange={e => setRow(r._id, 'unit', e.target.value)}
                style={{ fontSize: 13, padding: '6px 4px' }}
              >
                {MATERIAL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button
                onClick={() => removeRow(r._id)}
                disabled={rows.length === 1}
                style={{
                  background: 'none', border: 'none', cursor: rows.length === 1 ? 'default' : 'pointer',
                  color: rows.length === 1 ? 'var(--border)' : 'var(--text-muted)',
                  fontSize: 16, padding: 0, lineHeight: 1,
                }}
              >×</button>
            </div>
          ))}

          {/* Add row button */}
          <button
            onClick={addRow}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: '1.5px dashed var(--border)', borderRadius: 8,
              color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
              padding: '6px 12px', width: '100%', marginTop: 4, marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Добавить строку
          </button>
        </div>

        {/* Error */}
        {err && (
          <div style={{ fontSize: 12, color: '#A32D2D', background: '#FCEBEB', padding: '6px 10px', borderRadius: 6, marginBottom: 8, flexShrink: 0 }}>
            {err}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {filledRows.length > 0 ? `${filledRows.length} позиц${filledRows.length === 1 ? 'ия' : filledRows.length < 5 ? 'ии' : 'ий'}` : 'Нет позиций'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" onClick={onClose}>{t('common.cancel')}</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={submit}
              disabled={saving || !filledRows.length}
            >
              {saving ? t('common.adding') : `Добавить (${filledRows.length})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
