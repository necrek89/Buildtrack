import { useState, useRef, useEffect } from 'react'
import { useT } from '../i18n/useLanguage'
import { FormGroup, Button } from './UI'
import { useStore } from '../store/useStore'

const today = () => new Date().toISOString().slice(0, 10)

const inp = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1.5px solid var(--border,#EAE3D8)', background: 'var(--surface-2,#FDFBF8)',
  fontSize: 13, color: 'var(--text-1,#2E2420)', fontFamily: 'inherit', outline: 'none',
}

export const CATEGORY_ICONS = {
  materials:  '🧱',
  labor:      '👷',
  equipment:  '🔧',
  transport:  '🚛',
  other:      '📦',
}

export default function AddExpenseModal({ projectId, expense, onClose, onSave }) {
  const { t } = useT()
  const fileRef = useRef()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState(expense?.receipt_url || null)

  const [form, setForm] = useState({
    title:    expense?.title    || '',
    amount:   expense?.amount   != null ? String(expense.amount) : '',
    currency: expense?.currency || useStore.getState().profile?.currency || 'USD',
    category: expense?.category || 'other',
    date:     expense?.date     || today(),
    notes:    expense?.notes    || '',
  })

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file)
    setReceiptPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.amount) return
    setSaving(true)
    setSaveError(null)
    const payload = {
      project_id: projectId,
      title:      form.title.trim(),
      amount:     parseFloat(form.amount),
      currency:   form.currency,
      category:   form.category,
      date:       form.date,
      notes:      form.notes.trim() || null,
      receipt_url: expense?.receipt_url || null,
    }
    const { error } = await onSave(payload, receiptFile)
    setSaving(false)
    if (error) { setSaveError(error.message || t('expenses.saveError')); return }
    onClose()
  }

  const categories = ['materials','labor','equipment','transport','other']

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}>

        <div className="modal-title">
          {expense ? t('expenses.editTitle') : t('expenses.addTitle')}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 2 }}>

          {/* Title */}
          <FormGroup label={`${t('expenses.titleLabel')} *`}>
            <input
              style={inp} autoFocus
              value={form.title} onChange={set('title')}
              placeholder={t('expenses.titlePlaceholder')}
            />
          </FormGroup>

          {/* Amount + Currency */}
          <FormGroup label={`${t('expenses.amountLabel')} *`}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...inp, flex: 1 }}
                type="number" min="0" step="any"
                value={form.amount} onChange={set('amount')}
                placeholder="0.00"
              />
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {['USD','EUR'].map(cur => (
                  <button key={cur} type="button"
                    onClick={() => setForm(f => ({ ...f, currency: cur }))}
                    style={{
                      width: 48, height: 38, borderRadius: 8, border: '1.5px solid',
                      borderColor: form.currency === cur ? '#C96B3A' : 'var(--border,#EAE3D8)',
                      background:  form.currency === cur ? '#FAECE4' : 'var(--surface,#fff)',
                      color:       form.currency === cur ? '#C96B3A' : '#7A6E66',
                      fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    }}>
                    {cur === 'USD' ? '$' : '€'}
                  </button>
                ))}
              </div>
            </div>
          </FormGroup>

          {/* Category */}
          <FormGroup label={t('expenses.categoryLabel')}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {categories.map(cat => (
                <button key={cat} type="button"
                  onClick={() => setForm(f => ({ ...f, category: cat }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 20, border: '1.5px solid',
                    borderColor: form.category === cat ? '#C96B3A' : 'var(--border,#EAE3D8)',
                    background:  form.category === cat ? '#FAECE4' : 'var(--surface,#fff)',
                    color:       form.category === cat ? '#C96B3A' : '#7A6E66',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>
                  {CATEGORY_ICONS[cat]} {t(`expenses.cat_${cat}`)}
                </button>
              ))}
            </div>
          </FormGroup>

          {/* Date */}
          <FormGroup label={t('expenses.dateLabel')}>
            <input style={inp} type="date" value={form.date} onChange={set('date')} />
          </FormGroup>

          {/* Notes */}
          <FormGroup label={t('expenses.notesLabel')}>
            <textarea
              style={{ ...inp, resize: 'vertical', minHeight: 72 }}
              rows={3} value={form.notes} onChange={set('notes')}
              placeholder={t('expenses.notesPlaceholder')}
            />
          </FormGroup>

          {/* Receipt photo */}
          <FormGroup label={t('expenses.receiptLabel')}>
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
              📷 {t('expenses.receiptBtn')}
            </button>
            {receiptPreview && (
              <div style={{ marginTop: 10, position: 'relative', width: 'fit-content' }}>
                <img src={receiptPreview} alt="receipt"
                  style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 8,
                    border: '1px solid var(--border,#EAE3D8)', objectFit: 'contain' }} />
                <button
                  onClick={() => { setReceiptFile(null); setReceiptPreview(null) }}
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
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !form.title.trim() || !form.amount}>
            {saving ? '...' : expense ? t('common.save') : t('expenses.saveBtn')}
          </Button>
        </div>
      </div>
    </div>
  )
}
