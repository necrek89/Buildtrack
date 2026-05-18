import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n/useLanguage'
import { EmptyState, Button } from './UI'
import AddExpenseModal, { CATEGORY_ICONS } from './AddExpenseModal'

function fmtMoney(amount, currency = 'USD') {
  const sym = currency === 'EUR' ? '€' : '$'
  return `${sym}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

const CAT_COLORS = {
  materials:  { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
  labor:      { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  equipment:  { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA' },
  transport:  { bg: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE' },
  other:      { bg: '#F9FAFB', color: '#374151', border: '#E5E7EB' },
}

export default function ExpensesTab({ proj, canEdit = true }) {
  const { t } = useT()
  const { expenses, fetchExpenses, addExpense, updateExpense, deleteExpense } = useStore()
  const [filter,      setFilter]      = useState('all')
  const [showAdd,     setShowAdd]     = useState(false)
  const [editExpense, setEditExpense] = useState(null)
  const [lightbox,    setLightbox]    = useState(null)
  const [deleting,    setDeleting]    = useState(null)

  useEffect(() => { fetchExpenses(proj.id) }, [proj.id])

  const projExpenses = expenses.filter(e => e.project_id === proj.id)

  const filtered = filter === 'all'
    ? projExpenses
    : projExpenses.filter(e => e.category === filter)

  // Total in mixed currencies — show per-currency breakdown if mixed
  const totals = projExpenses.reduce((acc, e) => {
    acc[e.currency || 'USD'] = (acc[e.currency || 'USD'] || 0) + Number(e.amount)
    return acc
  }, {})
  const totalStr = Object.entries(totals)
    .map(([cur, amt]) => fmtMoney(amt, cur))
    .join(' + ') || fmtMoney(0, 'USD')

  const CATEGORIES = ['materials','labor','equipment','transport','other']
  const catCount = (cat) => projExpenses.filter(e => e.category === cat).length

  const handleAdd = async (payload, file) => {
    return addExpense(payload, file)
  }

  const handleEdit = async (payload, file) => {
    return updateExpense(editExpense.id, payload, file)
  }

  const handleDelete = async (exp) => {
    if (!window.confirm(t('expenses.deleteConfirm'))) return
    setDeleting(exp.id)
    await deleteExpense(exp.id)
    setDeleting(null)
  }

  return (
    <div style={{ paddingBottom: 28 }}>

      {/* ── Header: total + add button ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#B8AFA6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {t('expenses.totalLabel')}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#A32D2D', lineHeight: 1.2, marginTop: 2 }}>
            {totalStr}
          </div>
        </div>
        {canEdit && (
          <button onClick={() => setShowAdd(true)} style={{
            padding: '8px 14px', borderRadius: 10, border: 'none',
            background: '#C96B3A', color: '#fff', fontSize: 13,
            fontWeight: 700, cursor: 'pointer', flexShrink: 0,
          }}>
            + {t('expenses.addBtn')}
          </button>
        )}
      </div>

      {/* ── Category filter ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        <button onClick={() => setFilter('all')} style={{
          padding: '4px 12px', borderRadius: 20, border: '1.5px solid',
          borderColor: filter === 'all' ? '#C96B3A' : 'var(--border,#EAE3D8)',
          background:  filter === 'all' ? '#FAECE4' : 'var(--surface,#fff)',
          color:       filter === 'all' ? '#C96B3A' : '#7A6E66',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          {t('expenses.filterAll')} {projExpenses.length > 0 && <span style={{ opacity: .6 }}>({projExpenses.length})</span>}
        </button>
        {CATEGORIES.map(cat => {
          const n = catCount(cat)
          if (n === 0) return null
          return (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              padding: '4px 10px', borderRadius: 20, border: '1.5px solid',
              borderColor: filter === cat ? '#C96B3A' : 'var(--border,#EAE3D8)',
              background:  filter === cat ? '#FAECE4' : 'var(--surface,#fff)',
              color:       filter === cat ? '#C96B3A' : '#7A6E66',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {CATEGORY_ICONS[cat]} {t(`expenses.cat_${cat}`)}
              <span style={{ opacity: .6 }}>({n})</span>
            </button>
          )
        })}
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <EmptyState>
          {projExpenses.length === 0 ? t('expenses.empty') : t('expenses.emptyFilter')}
        </EmptyState>
      )}

      {/* ── Expense list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(exp => {
          const colors = CAT_COLORS[exp.category] || CAT_COLORS.other
          return (
            <div key={exp.id} style={{
              background: 'var(--surface,#fff)',
              border: '1.5px solid var(--border,#EAE3D8)',
              borderRadius: 12, overflow: 'hidden',
              opacity: deleting === exp.id ? 0.5 : 1,
              transition: 'opacity .2s',
            }}>
              {/* Main row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px' }}>

                {/* Category badge */}
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: colors.bg, border: `1px solid ${colors.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>
                  {CATEGORY_ICONS[exp.category] || '📦'}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-1,#2E2420)', lineHeight: 1.3 }}>
                      {exp.title}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#A32D2D', flexShrink: 0 }}>
                      {fmtMoney(exp.amount, exp.currency)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                      background: colors.bg, color: colors.color, border: `1px solid ${colors.border}`,
                    }}>
                      {CATEGORY_ICONS[exp.category]} {t(`expenses.cat_${exp.category}`)}
                    </span>
                    <span style={{ fontSize: 11, color: '#B8AFA6' }}>📅 {fmtDate(exp.date)}</span>
                  </div>

                  {exp.notes && (
                    <div style={{ fontSize: 12, color: '#7A6E66', marginTop: 5, lineHeight: 1.5 }}>
                      {exp.notes}
                    </div>
                  )}
                </div>

                {/* Receipt thumbnail */}
                {exp.receipt_url && (
                  <div onClick={() => setLightbox(exp.receipt_url)}
                    style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden',
                      flexShrink: 0, cursor: 'pointer', border: '1px solid var(--border,#EAE3D8)' }}>
                    <img src={exp.receipt_url} alt="receipt"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              {/* Actions row — foreman only */}
              {canEdit && (
                <div style={{
                  display: 'flex', gap: 8, padding: '8px 14px 10px',
                  borderTop: '1px solid var(--border,#F2EDE6)',
                  background: 'var(--surface-2,#FDFBF8)',
                }}>
                  <button onClick={() => setEditExpense(exp)} style={{
                    flex: 1, padding: '5px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                    border: '1.5px solid var(--border,#EAE3D8)',
                    background: 'var(--surface,#fff)', color: '#7A6E66', cursor: 'pointer',
                  }}>
                    ✏️ {t('common.edit')}
                  </button>
                  <button onClick={() => handleDelete(exp)} disabled={deleting === exp.id} style={{
                    flex: 1, padding: '5px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                    border: '1.5px solid #FECACA',
                    background: '#FEF2F2', color: '#991B1B', cursor: 'pointer',
                  }}>
                    🗑 {t('common.delete')}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Lightbox for receipt ── */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <button onClick={() => setLightbox(null)} style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
            width: 36, height: 36, color: '#fff', fontSize: 18, cursor: 'pointer',
          }}>✕</button>
          <img src={lightbox} alt="receipt" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '94vw', maxHeight: '88dvh', borderRadius: 10, objectFit: 'contain' }} />
        </div>
      )}

      {/* ── Add modal ── */}
      {showAdd && (
        <AddExpenseModal
          projectId={proj.id}
          onClose={() => setShowAdd(false)}
          onSave={handleAdd}
        />
      )}

      {/* ── Edit modal ── */}
      {editExpense && (
        <AddExpenseModal
          projectId={proj.id}
          expense={editExpense}
          onClose={() => setEditExpense(null)}
          onSave={handleEdit}
        />
      )}
    </div>
  )
}
