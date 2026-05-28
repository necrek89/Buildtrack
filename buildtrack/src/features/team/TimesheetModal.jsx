import { useState, useEffect } from 'react'
import { useStore, currencySymbol } from '../../store/useStore'

export default function TimesheetModal({ onClose }) {
  const { team, projects, profile, fetchWorkLogsByDate, addWorkLog, updateWorkLog, deleteWorkLog } = useStore()
  const currSym = currencySymbol(profile?.currency)

  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate]     = useState(today)
  const [rows, setRows]     = useState({})   // workerId → { value, type, rate, notes, existingId }
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)

  const workers = team.filter(m => m.role !== 'client')

  const loadLogs = async (d) => {
    setLoading(true)
    const logs = await fetchWorkLogsByDate(d)
    const byWorker = {}
    for (const log of logs) {
      byWorker[log.worker_id] = {
        value:      String(log.value),
        type:       log.log_type,
        rate:       String(log.rate),
        notes:      log.notes || '',
        existingId: log.id,
      }
    }
    // Fill empty rows for workers without logs on this date
    for (const w of workers) {
      if (!byWorker[w.id]) {
        byWorker[w.id] = {
          value:      '',
          type:       w.rate_type || 'shift',
          rate:       w.default_rate ? String(w.default_rate) : '',
          notes:      '',
          existingId: null,
        }
      }
    }
    setRows(byWorker)
    setLoading(false)
  }

  useEffect(() => { if (workers.length) loadLogs(date) }, [date, workers.length])

  const setCell = (wid, field, val) =>
    setRows(r => ({ ...r, [wid]: { ...r[wid], [field]: val } }))

  const save = async () => {
    setSaving(true)
    for (const w of workers) {
      const row = rows[w.id]
      if (!row) continue
      const val  = parseFloat(row.value)
      const rate = parseFloat(row.rate) || 0

      if (row.existingId) {
        if (!row.value || isNaN(val) || val <= 0) {
          await deleteWorkLog(row.existingId, w.id)
        } else {
          await updateWorkLog(row.existingId, w.id, {
            log_type: row.type,
            value:    val,
            rate,
            notes:    row.notes || null,
          })
        }
      } else {
        if (row.value && !isNaN(val) && val > 0) {
          await addWorkLog({
            worker_id:  w.id,
            log_date:   date,
            log_type:   row.type,
            value:      val,
            rate,
            notes:      row.notes || null,
            created_by: profile.id,
          })
        }
      }
    }
    setSaving(false)
    onClose()
  }

  const filledCount = workers.filter(w => {
    const v = parseFloat(rows[w.id]?.value)
    return !isNaN(v) && v > 0
  }).length

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580, width: '96vw', maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Табель</div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ fontSize: 13, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border-medium)', background: 'var(--bg)', color: 'var(--text-primary)', cursor: 'pointer' }}
          />
        </div>

        {/* Column labels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 72px 72px 60px', gap: 6, padding: '0 0 6px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {['Рабочий', 'Тип', 'Кол-во', 'Ставка', 'Итого'].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div style={{ overflowY: 'auto', flex: 1, paddingTop: 6 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
          ) : workers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'var(--text-muted)' }}>Нет рабочих</div>
          ) : workers.map(w => {
            const row   = rows[w.id] || { value: '', type: 'shift', rate: '', notes: '', existingId: null }
            const val   = parseFloat(row.value)
            const rate  = parseFloat(row.rate) || 0
            const total = (!isNaN(val) && val > 0) ? val * rate : 0
            const hasSaved = !!row.existingId

            return (
              <div key={w.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 72px 72px 60px',
                gap: 6, marginBottom: 7, alignItems: 'center',
                padding: '4px 6px', borderRadius: 8,
                background: hasSaved ? 'var(--accent-light,#FFF3ED)' : 'transparent',
              }}>
                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--accent-light,#FAECE4)', color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                  }}>{w.name?.charAt(0)?.toUpperCase()}</div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</span>
                </div>

                {/* Type */}
                <select
                  value={row.type}
                  onChange={e => setCell(w.id, 'type', e.target.value)}
                  style={{ fontSize: 11, padding: '5px 4px', borderRadius: 6, border: '0.5px solid var(--border-medium)', background: 'var(--bg)', color: 'var(--text-primary)' }}
                >
                  <option value="shift">смены</option>
                  <option value="hours">часы</option>
                </select>

                {/* Value */}
                <input
                  type="number" min="0" step="0.5"
                  placeholder="—"
                  value={row.value}
                  onChange={e => setCell(w.id, 'value', e.target.value)}
                  style={{ fontSize: 12, padding: '5px 6px', borderRadius: 6, border: `0.5px solid ${hasSaved ? 'var(--accent)' : 'var(--border-medium)'}`, background: 'var(--bg)', color: 'var(--text-primary)', textAlign: 'center', width: '100%' }}
                />

                {/* Rate */}
                <input
                  type="number" min="0" step="1"
                  placeholder="—"
                  value={row.rate}
                  onChange={e => setCell(w.id, 'rate', e.target.value)}
                  style={{ fontSize: 12, padding: '5px 6px', borderRadius: 6, border: '0.5px solid var(--border-medium)', background: 'var(--bg)', color: 'var(--text-primary)', textAlign: 'center', width: '100%' }}
                />

                {/* Total */}
                <span style={{ fontSize: 12, fontWeight: 600, color: total > 0 ? 'var(--accent)' : 'var(--text-muted)', textAlign: 'right' }}>
                  {total > 0 ? `${total.toLocaleString()} ${currSym}` : '—'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {filledCount > 0 ? `${filledCount} из ${workers.length} рабочих` : 'Нет записей'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, border: '0.5px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              Отмена
            </button>
            <button
              onClick={save}
              disabled={saving}
              style={{ fontSize: 12, padding: '6px 16px', borderRadius: 7, background: 'var(--accent,#EA580C)', color: '#fff', border: 'none', cursor: saving ? 'default' : 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Сохраняю...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
