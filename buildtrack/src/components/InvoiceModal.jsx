import { useState, useEffect } from 'react'
import { Check, X, Warning, Receipt, File, ClipboardText, ArrowLeft, ArrowRight } from '@phosphor-icons/react'
import { useT } from '../i18n/useLanguage'

// ── LocalStorage helpers ───────────────────────────────────────────────────────
const LS_KEY     = 'tutuu_invoice_settings'
const LS_NUM_KEY = 'tutuu_invoice_number'
const LS_HIS_KEY = 'tutuu_invoice_history'

function loadSettings() {
  try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : {} } catch { return {} }
}
function saveSettings(obj) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(obj)) } catch {}
}
function nextInvoiceNumber() {
  try {
    const n = parseInt(localStorage.getItem(LS_NUM_KEY) || '0', 10) + 1
    localStorage.setItem(LS_NUM_KEY, String(n))
    return `INV-${String(n).padStart(3, '0')}`
  } catch { return 'INV-001' }
}
function loadHistory() {
  try { const s = localStorage.getItem(LS_HIS_KEY); return s ? JSON.parse(s) : [] } catch { return [] }
}
function saveToHistory(entry) {
  try {
    const hist = loadHistory()
    hist.unshift(entry)
    localStorage.setItem(LS_HIS_KEY, JSON.stringify(hist.slice(0, 50)))
  } catch {}
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function today()   { return new Date().toISOString().slice(0, 10) }
function dueDate() {
  const d = new Date(); d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}
function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// ── Format currency ────────────────────────────────────────────────────────────
function fmtMoney(amount, currency = '$') {
  const n = Number(amount) || 0
  return `${currency}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ── Print invoice in new window ────────────────────────────────────────────────
function printInvoice(html) {
  const win = window.open('', '_blank', 'width=900,height=700')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 400)
}

// ── Build full HTML document for print ────────────────────────────────────────
function buildInvoiceHTML({ form, items, subtotal, taxAmount, total, isPartial, stageNames }) {
  const taxLine = form.taxRate > 0
    ? `<tr><td colspan="5" style="text-align:right;padding:6px 12px;color:#555">Tax (${form.taxRate}%)</td>
       <td style="text-align:right;padding:6px 12px;font-weight:600">${fmtMoney(taxAmount, items[0]?.currency || '$')}</td></tr>`
    : ''

  const rows = items.map((it, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#F8FAFF'}">
      <td style="padding:9px 12px;border-bottom:1px solid #E5E7EB">${it.text}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #E5E7EB;color:#555">${it.stage || '—'}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #E5E7EB;text-align:center">${it.quantity != null ? it.quantity : '—'}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #E5E7EB;text-align:center">${it.unit || '—'}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #E5E7EB;text-align:right">${fmtMoney(it.cost, it.currency)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #E5E7EB;text-align:right;font-weight:600">${fmtMoney((it.quantity || 1) * it.cost, it.currency)}</td>
    </tr>`).join('')

  const currency = items[0]?.currency || '$'
  const badgeLabel = isPartial ? 'Partial Invoice' : 'Invoice'
  const stagesNote = isPartial && stageNames.length > 0
    ? `<div style="margin-top:6px;font-size:11px;color:#CBD5E1">Stages: ${stageNames.join(', ')}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${badgeLabel} ${form.invoiceNumber}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
           font-size:13px; color:#1F2937; background:#fff; }
    @page { margin:18mm 15mm; }
    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    }
    .page { max-width:860px; margin:0 auto; padding:40px 40px 60px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:36px; }
    .company-name { font-size:26px; font-weight:800; color:#1E3A5F; letter-spacing:-.5px; }
    .company-meta { margin-top:6px; font-size:12px; color:#6B7280; line-height:1.7; }
    .invoice-badge {
      background:#2563EB; color:#fff; font-size:18px; font-weight:800;
      letter-spacing:1px; padding:6px 20px; border-radius:6px; text-transform:uppercase;
    }
    .invoice-meta { text-align:right; margin-top:10px; font-size:12px; color:#6B7280; line-height:1.8; }
    .invoice-meta strong { color:#1F2937; }
    .divider { border:none; border-top:2px solid #2563EB; margin:0 0 24px; }
    .bill-section { margin-bottom:28px; }
    .bill-label { font-size:10px; font-weight:700; text-transform:uppercase;
                  letter-spacing:.08em; color:#2563EB; margin-bottom:6px; }
    .bill-name { font-size:15px; font-weight:700; color:#1F2937; }
    .bill-addr { font-size:12px; color:#6B7280; line-height:1.7; margin-top:3px; }
    table { width:100%; border-collapse:collapse; margin-bottom:0; }
    thead tr { background:#2563EB; color:#fff; }
    thead th { padding:10px 12px; text-align:left; font-size:11px; font-weight:700;
               text-transform:uppercase; letter-spacing:.06em; }
    thead th:nth-child(3),
    thead th:nth-child(4) { text-align:center; }
    thead th:nth-child(5),
    thead th:nth-child(6) { text-align:right; }
    .totals { margin-top:0; }
    .totals table { width:auto; min-width:280px; margin-left:auto; }
    .totals td { padding:6px 12px; font-size:13px; }
    .totals .total-row { background:#1E3A5F; color:#fff; font-size:15px; font-weight:800; }
    .totals .total-row td { padding:10px 12px; }
    .notes { margin-top:36px; padding:16px 18px;
             border-left:4px solid #2563EB; background:#EFF6FF;
             border-radius:0 6px 6px 0; }
    .notes-label { font-size:10px; font-weight:700; text-transform:uppercase;
                   letter-spacing:.08em; color:#2563EB; margin-bottom:6px; }
    .notes-text { font-size:12px; color:#374151; line-height:1.6; white-space:pre-wrap; }
    .footer { margin-top:48px; padding-top:16px; border-top:1px solid #E5E7EB;
              text-align:center; font-size:11px; color:#9CA3AF; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="company-name">${form.contractorName || 'Contractor'}</div>
      <div class="company-meta">
        ${[form.contractorAddress, form.contractorPhone, form.contractorEmail]
          .filter(Boolean).join('<br/>')}
      </div>
    </div>
    <div style="text-align:right">
      <div class="invoice-badge">${badgeLabel}</div>
      ${stagesNote}
      <div class="invoice-meta">
        <div><strong># ${form.invoiceNumber}</strong></div>
        <div>Date: <strong>${fmtDate(form.invoiceDate)}</strong></div>
        <div>Due: <strong>${fmtDate(form.dueDate)}</strong></div>
      </div>
    </div>
  </div>
  <hr class="divider"/>
  <div class="bill-section">
    <div class="bill-label">Bill To</div>
    <div class="bill-name">${form.clientName || '—'}</div>
    <div class="bill-addr">${(form.clientAddress || '').replace(/\n/g, '<br/>')}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:32%">Description</th>
        <th style="width:18%">Stage</th>
        <th style="width:8%">Qty</th>
        <th style="width:8%">Unit</th>
        <th style="width:14%">Unit Price</th>
        <th style="width:14%">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <table>
      <tbody>
        <tr>
          <td style="text-align:right;padding:6px 12px;color:#555">Subtotal</td>
          <td style="text-align:right;padding:6px 12px;font-weight:600">${fmtMoney(subtotal, currency)}</td>
        </tr>
        ${taxLine}
        <tr class="total-row">
          <td style="text-align:right">Total Due</td>
          <td style="text-align:right">${fmtMoney(total, currency)}</td>
        </tr>
      </tbody>
    </table>
  </div>
  ${form.notes ? `
  <div class="notes">
    <div class="notes-label">Notes &amp; Payment Terms</div>
    <div class="notes-text">${form.notes}</div>
  </div>` : ''}
  <div class="footer">Generated by Tutuu · ${form.invoiceDate}</div>
</div>
</body>
</html>`
}

// ── Field component ────────────────────────────────────────────────────────────
function Field({ label, children, half }) {
  return (
    <div style={{ marginBottom:12, ...(half ? { flex:'1 1 calc(50% - 6px)', minWidth:120 } : {}) }}>
      <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#7A6E66', marginBottom:4, textTransform:'uppercase', letterSpacing:'.04em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inp = {
  width:'100%', padding:'8px 10px', borderRadius:8,
  border:'1.5px solid #EAE3D8', background:'var(--surface-2,#FDFBF8)',
  fontSize:13, color:'var(--text-1,#2E2420)', fontFamily:'inherit', outline:'none',
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function InvoiceModal({ proj, tasks, onClose }) {
  const { t } = useT()

  const saved = loadSettings()
  const history = loadHistory().filter(h => h.projectId === proj.id)

  // All tasks with a cost for this project
  const billableTasks = tasks.filter(tk =>
    tk.project_id === proj.id && tk.cost != null && tk.cost !== ''
  )

  // Unique stages that have billable tasks
  const stageList = [...new Set(billableTasks.map(tk => tk.stage || '—'))]

  // Track which stages were already invoiced
  const invoicedStages = new Set(history.flatMap(h => h.stages || []))

  const [step, setStep] = useState('stages') // 'stages' | 'form' | 'preview'
  const [selectedStages, setSelectedStages] = useState(() => new Set(stageList))
  const [invoiceNum] = useState(() => nextInvoiceNumber())

  const [form, setForm] = useState({
    contractorName:    saved.contractorName    || '',
    contractorAddress: saved.contractorAddress || '',
    contractorPhone:   saved.contractorPhone   || '',
    contractorEmail:   saved.contractorEmail   || '',
    clientName:        saved.clientName        || '',
    clientAddress:     saved.clientAddress     || '',
    invoiceNumber:     invoiceNum,
    invoiceDate:       today(),
    dueDate:           dueDate(),
    notes:             saved.notes ?? 'Payment due within 30 days.\nBank transfer or cash accepted.',
    taxRate:           0,
  })

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  // Tasks filtered by selected stages
  const selectedTasks = billableTasks.filter(tk => selectedStages.has(tk.stage || '—'))
  const isPartial = selectedStages.size < stageList.length
  const selectedStageNames = stageList.filter(s => selectedStages.has(s))

  const subtotal  = selectedTasks.reduce((sum, tk) => sum + (Number(tk.cost) * (tk.quantity || 1)), 0)
  const taxAmount = subtotal * (Number(form.taxRate) / 100)
  const total     = subtotal + taxAmount
  const currency  = selectedTasks[0]?.currency || billableTasks[0]?.currency || '$'

  const toggleStage = (stage) => {
    setSelectedStages(prev => {
      const next = new Set(prev)
      if (next.has(stage)) next.delete(stage)
      else next.add(stage)
      return next
    })
  }

  const handlePreview = () => {
    saveSettings({
      contractorName:    form.contractorName,
      contractorAddress: form.contractorAddress,
      contractorPhone:   form.contractorPhone,
      contractorEmail:   form.contractorEmail,
      clientName:        form.clientName,
      clientAddress:     form.clientAddress,
      notes:             form.notes,
    })
    setStep('preview')
  }

  const handlePrint = () => {
    const html = buildInvoiceHTML({
      form: { ...form, taxRate: Number(form.taxRate) },
      items: selectedTasks,
      subtotal, taxAmount, total,
      isPartial,
      stageNames: selectedStageNames,
    })
    printInvoice(html)
    // Save to history
    saveToHistory({
      invoiceNumber: form.invoiceNumber,
      projectId:     proj.id,
      projectName:   proj.name,
      date:          form.invoiceDate,
      stages:        selectedStageNames,
      total,
      currency,
      isPartial,
    })
  }

  // ── SECTION LABEL ──
  const SL = ({ children }) => (
    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em',
      color:'#2563EB', borderBottom:'1.5px solid #DBEAFE', paddingBottom:6, marginBottom:12, marginTop:20 }}>
      {children}
    </div>
  )

  const PreviewRow = ({ label, value, bold, blue, big }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
      padding:'8px 14px', background: blue ? '#1E3A5F' : 'transparent',
      color: blue ? '#fff' : '#1F2937', borderBottom: blue ? 'none' : '1px solid #F3F4F6',
    }}>
      <span style={{ fontSize: big ? 14 : 12, color: blue ? '#CBD5E1' : '#6B7280' }}>{label}</span>
      <span style={{ fontSize: big ? 15 : 13, fontWeight: bold || blue ? 700 : 400 }}>{value}</span>
    </div>
  )

  // ── Stage amount summary ──
  const stageAmounts = stageList.reduce((acc, stage) => {
    const tasks = billableTasks.filter(tk => (tk.stage || '—') === stage)
    acc[stage] = {
      count: tasks.length,
      total: tasks.reduce((s, tk) => s + (Number(tk.cost) * (tk.quantity || 1)), 0),
      currency: tasks[0]?.currency || '$',
    }
    return acc
  }, {})

  const allSelected = stageList.every(s => selectedStages.has(s))
  const noneSelected = selectedStages.size === 0

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 300 }}
    >
      <div className="modal" style={{
        maxWidth: 680, width: '95vw',
        maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
      }}>

        {/* ── Title bar ── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, paddingBottom:14, borderBottom:'1.5px solid #EAE3D8', flexShrink:0 }}>
          <div style={{ background:'#2563EB', color:'#fff', fontSize:11, fontWeight:800,
            letterSpacing:'.1em', padding:'3px 10px', borderRadius:6, textTransform:'uppercase' }}>
            Invoice
          </div>
          <div style={{ flex:1, fontSize:15, fontWeight:700, color:'#1E3A5F' }}>
            {proj.name}
          </div>
          {/* Step indicator */}
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            {['stages','form','preview'].map((s, i) => (
              <div key={s} style={{
                width: step === s ? 20 : 6, height:6, borderRadius:3,
                background: step === s ? '#2563EB' : (
                  ['stages','form','preview'].indexOf(step) > i ? '#93C5FD' : '#DBEAFE'
                ),
                transition: 'width .2s',
              }} />
            ))}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'#B8AFA6', lineHeight:1, display:'flex', alignItems:'center' }}><X size={18} weight="bold" /></button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY:'auto', flex:1, paddingRight:2 }}>

          {/* ══ STEP 1: STAGE SELECTION ══ */}
          {step === 'stages' && (
            <div style={{ paddingTop:8 }}>

              {billableTasks.length === 0 ? (
                <div style={{ margin:'16px 0', padding:'14px', background:'#FEF3C7',
                  color:'#92400E', borderRadius:10, fontSize:13, fontWeight:500, textAlign:'center' }}>
                  <Warning size={13} weight="bold" /> {t('invoice.noBillable')}
                </div>
              ) : (
                <>
                  <div style={{ fontSize:13, color:'#6B7280', marginBottom:16, lineHeight:1.5 }}>
                    Выберите этапы для включения в счёт. Можно выставить промежуточный счёт только за завершённые этапы.
                  </div>

                  {/* Select all / none */}
                  <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                    <button onClick={() => setSelectedStages(new Set(stageList))}
                      style={{ padding:'4px 12px', borderRadius:6, border:'1.5px solid #BFDBFE',
                        background: allSelected ? '#2563EB' : '#EFF6FF', color: allSelected ? '#fff' : '#2563EB',
                        fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      Все этапы
                    </button>
                    <button onClick={() => setSelectedStages(new Set())}
                      style={{ padding:'4px 12px', borderRadius:6, border:'1.5px solid #EAE3D8',
                        background:'var(--surface-2,#FDFBF8)', color:'#7A6E66', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      Снять всё
                    </button>
                  </div>

                  {/* Stage list */}
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {stageList.map(stage => {
                      const info = stageAmounts[stage]
                      const checked = selectedStages.has(stage)
                      const wasInvoiced = invoicedStages.has(stage)
                      return (
                        <div key={stage}
                          onClick={() => toggleStage(stage)}
                          style={{
                            display:'flex', alignItems:'center', gap:12,
                            padding:'12px 14px', borderRadius:12, cursor:'pointer',
                            border: `2px solid ${checked ? '#2563EB' : '#EAE3D8'}`,
                            background: checked ? '#EFF6FF' : 'var(--surface,#fff)',
                            transition: 'all .15s',
                          }}
                        >
                          {/* Checkbox */}
                          <div style={{
                            width:20, height:20, borderRadius:6, flexShrink:0,
                            border: `2px solid ${checked ? '#2563EB' : '#D1D5DB'}`,
                            background: checked ? '#2563EB' : '#fff',
                            display:'flex', alignItems:'center', justifyContent:'center',
                          }}>
                            {checked && <Check size={12} weight="bold" color="#fff" />}
                          </div>

                          {/* Stage info */}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <span style={{ fontSize:14, fontWeight:700, color: checked ? '#1E40AF' : '#2E2420' }}>
                                {stage === '—' ? 'Без этапа' : stage}
                              </span>
                              {wasInvoiced && (
                                <span style={{ fontSize:10, background:'#FEF3C7', color:'#92400E',
                                  border:'1px solid #FDE68A', borderRadius:5, padding:'1px 6px', fontWeight:600 }}>
                                  уже выставлялся
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>
                              {info.count} {info.count === 1 ? 'задача' : 'задач'} · {fmtMoney(info.total, info.currency)}
                            </div>
                          </div>

                          {/* Amount */}
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ fontSize:15, fontWeight:700, color: checked ? '#1E40AF' : '#6B7280' }}>
                              {fmtMoney(info.total, info.currency)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Running total */}
                  {selectedTasks.length > 0 && (
                    <div style={{ marginTop:16, padding:'12px 16px', background:'#1E3A5F',
                      borderRadius:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:11, color:'#93C5FD', fontWeight:600, marginBottom:2 }}>
                          {isPartial ? <><File size={11} weight="bold" /> Промежуточный счёт</> : <><ClipboardText size={11} weight="bold" /> Полный счёт</>}
                        </div>
                        <div style={{ fontSize:12, color:'#CBD5E1' }}>
                          {selectedTasks.length} позиций · {selectedStages.size} из {stageList.length} этапов
                        </div>
                      </div>
                      <div style={{ fontSize:20, fontWeight:800, color:'#fff' }}>
                        {fmtMoney(subtotal, currency)}
                      </div>
                    </div>
                  )}

                  {/* Invoice history for this project */}
                  {history.length > 0 && (
                    <div style={{ marginTop:20 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#6B7280', textTransform:'uppercase',
                        letterSpacing:'.06em', marginBottom:8 }}>История счетов по объекту</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {history.map((h, i) => (
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:10,
                            padding:'8px 12px', background:'#F8FAFF', borderRadius:8,
                            border:'1px solid #DBEAFE', fontSize:12 }}>
                            <Receipt size={14} weight="bold" color="#2563EB" />
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontWeight:600, color:'#1E40AF' }}>{h.invoiceNumber}</div>
                              <div style={{ color:'#6B7280', fontSize:11 }}>
                                {fmtDate(h.date)} · {(h.stages || []).join(', ') || 'Все этапы'}
                              </div>
                            </div>
                            <div style={{ fontWeight:700, color:'#1E3A5F', flexShrink:0 }}>
                              {fmtMoney(h.total, h.currency)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ══ STEP 2: FORM ══ */}
          {step === 'form' && (
            <div style={{ paddingTop:4 }}>

              {/* Selected stages summary */}
              <div style={{ margin:'8px 0 4px', padding:'10px 14px', background:'#EFF6FF',
                borderRadius:10, border:'1px solid #BFDBFE', fontSize:12 }}>
                <div style={{ fontWeight:700, color:'#1E40AF', marginBottom:4 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:5 }}>{isPartial ? <><File size={11} weight="bold" /> Промежуточный счёт</> : <><ClipboardText size={11} weight="bold" /> Полный счёт</>}</span> · {fmtMoney(subtotal, currency)}
                </div>
                <div style={{ color:'#374151' }}>
                  Этапы: {selectedStageNames.map(s => s === '—' ? 'Без этапа' : s).join(', ')}
                </div>
              </div>

              {/* CONTRACTOR */}
              <SL>{t('invoice.contractor')}</SL>
              <Field label={t('invoice.yourName')}>
                <input style={inp} value={form.contractorName} onChange={set('contractorName')} placeholder="e.g. John Smith Construction" />
              </Field>
              <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
                <Field label={t('invoice.phone')} half>
                  <input style={inp} value={form.contractorPhone} onChange={set('contractorPhone')} placeholder="+1 555 000 0000" />
                </Field>
                <Field label={t('invoice.email')} half>
                  <input style={inp} value={form.contractorEmail} onChange={set('contractorEmail')} placeholder="you@example.com" />
                </Field>
              </div>
              <Field label={t('invoice.yourAddress')}>
                <textarea style={{ ...inp, resize:'vertical', minHeight:60 }} rows={2}
                  value={form.contractorAddress} onChange={set('contractorAddress')}
                  placeholder="Street, City, Country" />
              </Field>

              {/* CLIENT */}
              <SL>{t('invoice.client')}</SL>
              <Field label={t('invoice.clientName')}>
                <input style={inp} value={form.clientName} onChange={set('clientName')} placeholder="Client / Company name" />
              </Field>
              <Field label={t('invoice.clientAddress')}>
                <textarea style={{ ...inp, resize:'vertical', minHeight:60 }} rows={2}
                  value={form.clientAddress} onChange={set('clientAddress')}
                  placeholder="Street, City, Country" />
              </Field>

              {/* INVOICE DETAILS */}
              <SL>{t('invoice.details')}</SL>
              <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
                <Field label={t('invoice.number')} half>
                  <input style={inp} value={form.invoiceNumber} onChange={set('invoiceNumber')} />
                </Field>
                <Field label={t('invoice.tax')} half>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <input style={{ ...inp, flex:1 }} type="number" min="0" max="100" step="0.5"
                      value={form.taxRate} onChange={set('taxRate')} />
                    <span style={{ fontSize:13, color:'#7A6E66', flexShrink:0 }}>%</span>
                  </div>
                </Field>
                <Field label={t('invoice.date')} half>
                  <input style={inp} type="date" value={form.invoiceDate} onChange={set('invoiceDate')} />
                </Field>
                <Field label={t('invoice.due')} half>
                  <input style={inp} type="date" value={form.dueDate} onChange={set('dueDate')} />
                </Field>
              </div>

              <Field label={t('invoice.notes')}>
                <textarea style={{ ...inp, resize:'vertical', minHeight:72 }} rows={3}
                  value={form.notes} onChange={set('notes')}
                  placeholder="Payment terms, bank details, notes…" />
              </Field>
            </div>
          )}

          {/* ══ STEP 3: PREVIEW ══ */}
          {step === 'preview' && (
            <div style={{ paddingTop:8 }}>

              {/* Invoice header preview */}
              <div style={{ background:'#1E3A5F', color:'#fff', borderRadius:10, padding:'16px 18px',
                display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:800, marginBottom:4 }}>{form.contractorName || '—'}</div>
                  <div style={{ fontSize:11, color:'#CBD5E1', lineHeight:1.7 }}>
                    {[form.contractorAddress, form.contractorPhone, form.contractorEmail].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ background:'#2563EB', fontSize:12, fontWeight:800, letterSpacing:'.08em',
                    padding:'3px 12px', borderRadius:5, textTransform:'uppercase', marginBottom:4 }}>
                    {isPartial ? 'Partial Invoice' : 'Invoice'}
                  </div>
                  {isPartial && (
                    <div style={{ fontSize:10, color:'#93C5FD', marginBottom:4 }}>
                      {selectedStageNames.map(s => s === '—' ? 'No stage' : s).join(', ')}
                    </div>
                  )}
                  <div style={{ fontSize:11, color:'#CBD5E1', lineHeight:1.8 }}>
                    <div>№ <strong style={{ color:'#fff' }}>{form.invoiceNumber}</strong></div>
                    <div>{t('invoice.date')}: <strong style={{ color:'#fff' }}>{fmtDate(form.invoiceDate)}</strong></div>
                    <div>{t('invoice.due')}: <strong style={{ color:'#fff' }}>{fmtDate(form.dueDate)}</strong></div>
                  </div>
                </div>
              </div>

              {/* Bill to */}
              <div style={{ padding:'10px 14px', background:'#F8FAFF', borderRadius:8,
                border:'1px solid #DBEAFE', marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase',
                  letterSpacing:'.08em', color:'#2563EB', marginBottom:4 }}>Bill To</div>
                <div style={{ fontWeight:700, color:'#1F2937' }}>{form.clientName || '—'}</div>
                <div style={{ fontSize:12, color:'#6B7280', whiteSpace:'pre-line' }}>{form.clientAddress}</div>
              </div>

              {/* Line items */}
              <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid #E5E7EB', marginBottom:4 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 110px 60px 60px 90px 90px',
                  background:'#2563EB', color:'#fff', padding:'8px 12px', fontSize:10,
                  fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', gap:8 }}>
                  <span>{t('invoice.colDesc')}</span>
                  <span>{t('invoice.colStage')}</span>
                  <span style={{ textAlign:'center' }}>{t('invoice.colQty')}</span>
                  <span style={{ textAlign:'center' }}>{t('invoice.colUnit')}</span>
                  <span style={{ textAlign:'right' }}>{t('invoice.colPrice')}</span>
                  <span style={{ textAlign:'right' }}>{t('invoice.colTotal')}</span>
                </div>
                {selectedTasks.map((tk, i) => (
                  <div key={tk.id} style={{
                    display:'grid', gridTemplateColumns:'1fr 110px 60px 60px 90px 90px',
                    padding:'9px 12px', gap:8, fontSize:12, alignItems:'center',
                    background: i % 2 === 0 ? '#fff' : '#F8FAFF',
                    borderBottom: i < selectedTasks.length - 1 ? '1px solid #F3F4F6' : 'none',
                  }}>
                    <span style={{ fontWeight:500, color:'#1F2937' }}>{tk.text}</span>
                    <span style={{ color:'#6B7280', fontSize:11 }}>{tk.stage || '—'}</span>
                    <span style={{ textAlign:'center', color:'#374151' }}>{tk.quantity != null ? tk.quantity : '—'}</span>
                    <span style={{ textAlign:'center', color:'#374151' }}>{tk.unit || '—'}</span>
                    <span style={{ textAlign:'right', color:'#374151' }}>{fmtMoney(tk.cost, tk.currency)}</span>
                    <span style={{ textAlign:'right', fontWeight:600, color:'#1F2937' }}>
                      {fmtMoney((tk.quantity || 1) * tk.cost, tk.currency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ marginLeft:'auto', width:'fit-content', minWidth:240, marginBottom:14 }}>
                <PreviewRow label={t('invoice.subtotalLabel')} value={fmtMoney(subtotal, currency)} />
                {Number(form.taxRate) > 0 && (
                  <PreviewRow label={`${t('invoice.tax')} (${form.taxRate}%)`} value={fmtMoney(taxAmount, currency)} />
                )}
                <PreviewRow label={t('invoice.total')} value={fmtMoney(total, currency)} bold blue big />
              </div>

              {/* Notes */}
              {form.notes && (
                <div style={{ padding:'12px 14px', background:'#EFF6FF',
                  borderLeft:'4px solid #2563EB', borderRadius:'0 8px 8px 0', marginBottom:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'.08em', color:'#2563EB', marginBottom:5 }}>
                    {t('invoice.notes')}
                  </div>
                  <div style={{ fontSize:12, color:'#374151', whiteSpace:'pre-wrap', lineHeight:1.6 }}>
                    {form.notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer buttons ── */}
        <div style={{ paddingTop:12, borderTop:'1.5px solid #EAE3D8', display:'flex', gap:8, flexShrink:0 }}>
          {step === 'stages' && (
            <>
              <button onClick={onClose} style={{ padding:'8px 16px', borderRadius:8, border:'1.5px solid #EAE3D8',
                background:'var(--surface-2,#FDFBF8)', color:'#7A6E66', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                {t('common.cancel')}
              </button>
              <button
                onClick={() => setStep('form')}
                disabled={noneSelected || selectedTasks.length === 0}
                style={{ flex:1, padding:'8px 16px', borderRadius:8, border:'none',
                  background: (noneSelected || selectedTasks.length === 0) ? '#EAE3D8' : '#2563EB',
                  color: (noneSelected || selectedTasks.length === 0) ? '#B8AFA6' : '#fff',
                  fontSize:13, fontWeight:700,
                  cursor: (noneSelected || selectedTasks.length === 0) ? 'default' : 'pointer' }}>
                Далее <ArrowRight size={13} weight="bold" /> Реквизиты
              </button>
            </>
          )}
          {step === 'form' && (
            <>
              <button onClick={() => setStep('stages')} style={{ padding:'8px 16px', borderRadius:8,
                border:'1.5px solid #EAE3D8', background:'var(--surface-2,#FDFBF8)', color:'#7A6E66',
                fontSize:13, fontWeight:600, cursor:'pointer' }}>
                <ArrowLeft size={13} weight="bold" /> Этапы
              </button>
              <button onClick={handlePreview} style={{ flex:1, padding:'8px 16px', borderRadius:8,
                border:'none', background:'#2563EB', color:'#fff',
                fontSize:13, fontWeight:700, cursor:'pointer' }}>
                {t('invoice.previewBtn')} <ArrowRight size={13} weight="bold" />
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => setStep('form')} style={{ padding:'8px 16px', borderRadius:8,
                border:'1.5px solid #EAE3D8', background:'var(--surface-2,#FDFBF8)', color:'#7A6E66',
                fontSize:13, fontWeight:600, cursor:'pointer' }}>
                <ArrowLeft size={13} weight="bold" /> {t('invoice.backBtn')}
              </button>
              <button onClick={handlePrint} style={{ flex:1, padding:'8px 16px', borderRadius:8,
                border:'none', background:'#2563EB', color:'#fff',
                fontSize:13, fontWeight:700, cursor:'pointer', display:'flex',
                alignItems:'center', justifyContent:'center', gap:6 }}>
                <File size={13} weight="bold" /> {t('invoice.downloadBtn')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
