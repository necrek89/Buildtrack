import { useState, useEffect } from 'react'
import { CalendarBlank, PencilSimple, Trash, CaretUp, CaretDown, X } from '@phosphor-icons/react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n/useLanguage'
import { EmptyState } from './UI'
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

const CATEGORIES = ['materials', 'labor', 'equipment', 'transport', 'other']

const CAT_COLORS = {
  materials: { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', bar: '#3B82F6' },
  labor:     { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0', bar: '#22C55E' },
  equipment: { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA', bar: '#F97316' },
  transport: { bg: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE', bar: '#8B5CF6' },
  other:     { bg: '#F9FAFB', color: '#374151', border: '#E5E7EB', bar: '#9CA3AF' },
}

// ── Category Breakdown Chart ────────────────────────────────────────────────
function CategoryBreakdown({ expenses, onSelect, selected, t }) {
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
  if (total === 0) return null

  // group by category
  const groups = CATEGORIES.map(cat => {
    const items = expenses.filter(e => e.category === cat)
    const amt   = items.reduce((s, e) => s + Number(e.amount), 0)
    // pick dominant currency
    const cur   = items.length > 0 ? (items[0].currency || 'USD') : 'USD'
    return { cat, amt, count: items.length, pct: total ? Math.round((amt / total) * 100) : 0, cur }
  }).filter(g => g.count > 0).sort((a, b) => b.amt - a.amt)

  return (
    <div style={{
      background: 'var(--surface,#fff)',
      border: '1.5px solid var(--border,#EAE3D8)',
      borderRadius: 14, overflow: 'hidden', marginBottom: 14,
    }}>
      {/* Stacked bar */}
      <div style={{ display: 'flex', height: 6 }}>
        {groups.map(g => (
          <div key={g.cat} style={{
            width: `${g.pct}%`, background: CAT_COLORS[g.cat]?.bar,
            transition: 'width .4s', minWidth: g.pct > 0 ? 2 : 0,
          }} />
        ))}
      </div>

      {/* Category rows */}
      <div style={{ padding: '4px 0' }}>
        {groups.map((g, i) => {
          const c = CAT_COLORS[g.cat] || CAT_COLORS.other
          const isActive = selected === g.cat
          return (
            <div
              key={g.cat}
              onClick={() => onSelect(isActive ? 'all' : g.cat)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 14px',
                background: isActive ? c.bg : 'transparent',
                borderBottom: i < groups.length - 1 ? '1px solid var(--border,#F2EDE6)' : 'none',
                cursor: 'pointer', transition: 'background .15s',
              }}
            >
              {/* Icon */}
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: c.bg, border: `1px solid ${c.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
              }}>
                {(() => { const IC = CATEGORY_ICONS[g.cat]; return <IC size={15} weight="bold" /> })()}
              </div>

              {/* Label + bar */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? c.color : 'var(--text-1,#2E2420)' }}>
                    {t(`expenses.cat_${g.cat}`)}
                    <span style={{ fontSize: 10, color: '#B8AFA6', marginLeft: 5 }}>({g.count})</span>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: isActive ? c.color : '#A32D2D', flexShrink: 0 }}>
                    {fmtMoney(g.amt, g.cur)}
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ height: 4, borderRadius: 2, background: 'var(--border,#EAE3D8)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${g.pct}%`, background: c.bar,
                    transition: 'width .4s',
                  }} />
                </div>
              </div>

              {/* Percent */}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#B8AFA6', flexShrink: 0, minWidth: 32, textAlign: 'right' }}>
                {g.pct}%
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Single expense card ─────────────────────────────────────────────────────
function ExpenseCard({ exp, canEdit, onEdit, onDelete, onLightbox, deleting, t }) {
  const colors = CAT_COLORS[exp.category] || CAT_COLORS.other
  return (
    <div style={{
      background: 'var(--surface,#fff)',
      border: '1.5px solid var(--border,#EAE3D8)',
      borderRadius: 12, overflow: 'hidden',
      opacity: deleting === exp.id ? 0.5 : 1,
      transition: 'opacity .2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px' }}>
        {/* Category icon */}
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: colors.bg, border: `1px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>
          {(() => { const IC = CATEGORY_ICONS[exp.category] || CATEGORY_ICONS.other; return <IC size={18} weight="bold" /> })()}
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
            <span style={{ fontSize: 11, color: '#B8AFA6', display:'flex', alignItems:'center', gap:2 }}><CalendarBlank size={11} weight="bold" /> {fmtDate(exp.date)}</span>
          </div>
          {exp.notes && (
            <div style={{ fontSize: 12, color: '#7A6E66', marginTop: 5, lineHeight: 1.5 }}>
              {exp.notes}
            </div>
          )}
        </div>

        {/* Receipt thumbnail */}
        {exp.receipt_url && (
          <div onClick={() => onLightbox(exp.receipt_url)}
            style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden',
              flexShrink: 0, cursor: 'pointer', border: '1px solid var(--border,#EAE3D8)' }}>
            <img src={exp.receipt_url} alt="receipt"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
      </div>

      {canEdit && (
        <div style={{
          display: 'flex', gap: 8, padding: '8px 14px 10px',
          borderTop: '1px solid var(--border,#F2EDE6)',
          background: 'var(--surface-2,#FDFBF8)',
        }}>
          <button onClick={() => onEdit(exp)} style={{
            flex: 1, padding: '5px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            border: '1.5px solid var(--border,#EAE3D8)',
            background: 'var(--surface,#fff)', color: '#7A6E66', cursor: 'pointer',
          }}><PencilSimple size={12} weight="bold" /> {t('common.edit')}</button>
          <button onClick={() => onDelete(exp)} disabled={deleting === exp.id} style={{
            flex: 1, padding: '5px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#991B1B', cursor: 'pointer',
          }}><Trash size={12} weight="bold" /> {t('common.delete')}</button>
        </div>
      )}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ExpensesTab({ proj, canEdit = true }) {
  const { t } = useT()
  const { expenses, fetchExpenses, addExpense, updateExpense, deleteExpense } = useStore()
  const [filter,      setFilter]      = useState('all')
  const [showAdd,     setShowAdd]     = useState(false)
  const [editExpense, setEditExpense] = useState(null)
  const [lightbox,    setLightbox]    = useState(null)
  const [deleting,    setDeleting]    = useState(null)
  const [openCats,    setOpenCats]    = useState({}) // for grouped view collapse

  useEffect(() => { fetchExpenses(proj.id) }, [proj.id])

  const projExpenses = expenses.filter(e => e.project_id === proj.id)

  // Total per currency
  const totals = projExpenses.reduce((acc, e) => {
    acc[e.currency || 'USD'] = (acc[e.currency || 'USD'] || 0) + Number(e.amount)
    return acc
  }, {})
  const totalStr = Object.entries(totals)
    .map(([cur, amt]) => fmtMoney(amt, cur))
    .join(' + ') || fmtMoney(0, 'USD')

  // Filtered list
  const filtered = filter === 'all'
    ? projExpenses
    : projExpenses.filter(e => e.category === filter)

  // Grouped view (when filter === 'all')
  const groups = CATEGORIES.map(cat => ({
    cat,
    items: projExpenses.filter(e => e.category === cat),
    total: projExpenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0),
    cur:   projExpenses.find(e => e.category === cat)?.currency || 'USD',
  })).filter(g => g.items.length > 0)

  const toggleCat = (cat) => setOpenCats(prev => ({ ...prev, [cat]: !prev[cat] }))

  const handleDelete = async (exp) => {
    if (!window.confirm(t('expenses.deleteConfirm'))) return
    setDeleting(exp.id)
    await deleteExpense(exp.id)
    setDeleting(null)
  }

  const cardProps = { canEdit, onEdit: setEditExpense, onDelete: handleDelete, onLightbox: setLightbox, deleting, t }

  return (
    <div style={{ paddingBottom: 28 }}>

      {/* ── Header ── */}
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

      {/* ── Category breakdown chart (always visible when data exists) ── */}
      {projExpenses.length > 0 && (
        <CategoryBreakdown
          expenses={projExpenses}
          selected={filter}
          onSelect={setFilter}
          t={t}
        />
      )}

      {/* ── Empty state ── */}
      {projExpenses.length === 0 && <EmptyState>{t('expenses.empty')}</EmptyState>}

      {/* ── Grouped view (when filter = all) ── */}
      {filter === 'all' && groups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map(({ cat, items, total, cur }) => {
            const c      = CAT_COLORS[cat] || CAT_COLORS.other
            const isOpen = openCats[cat] !== false // default open
            return (
              <div key={cat} style={{
                borderRadius: 12, overflow: 'hidden',
                border: `1.5px solid ${c.border}`,
              }}>
                {/* Group header */}
                <div
                  onClick={() => toggleCat(cat)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px', cursor: 'pointer',
                    background: c.bg,
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{CATEGORY_ICONS[cat]}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: c.color }}>
                      {t(`expenses.cat_${cat}`)}
                    </span>
                    <span style={{ fontSize: 11, color: c.color, opacity: .65, marginLeft: 6 }}>
                      ({items.length})
                    </span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#A32D2D', flexShrink: 0 }}>
                    {fmtMoney(total, cur)}
                  </span>
                  <span style={{ fontSize: 11, color: c.color, opacity: .7, marginLeft: 4, display:'flex', alignItems:'center' }}>
                    {isOpen ? <CaretUp size={11} weight="bold" /> : <CaretDown size={11} weight="bold" />}
                  </span>
                </div>

                {/* Items */}
                {isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {items.map((exp, i) => (
                      <div key={exp.id} style={{ borderTop: i > 0 ? '1px solid var(--border,#F2EDE6)' : '1px solid var(--border,#EAE3D8)' }}>
                        <ExpenseCard exp={exp} {...cardProps} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Flat filtered view (when a category is selected) ── */}
      {filter !== 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0
            ? <EmptyState>{t('expenses.emptyFilter')}</EmptyState>
            : filtered.map(exp => <ExpenseCard key={exp.id} exp={exp} {...cardProps} />)
          }
        </div>
      )}

      {/* ── Receipt lightbox ── */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <button onClick={() => setLightbox(null)} style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
            width: 36, height: 36, color: '#fff', fontSize: 18, cursor: 'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}><X size={18} weight="bold" /></button>
          <img src={lightbox} alt="receipt" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '94vw', maxHeight: '88dvh', borderRadius: 10, objectFit: 'contain' }} />
        </div>
      )}

      {/* ── Modals ── */}
      {showAdd && (
        <AddExpenseModal projectId={proj.id}
          onClose={() => setShowAdd(false)}
          onSave={(p, f) => addExpense(p, f)} />
      )}
      {editExpense && (
        <AddExpenseModal projectId={proj.id} expense={editExpense}
          onClose={() => setEditExpense(null)}
          onSave={(p, f) => updateExpense(editExpense.id, p, f)} />
      )}
    </div>
  )
}
