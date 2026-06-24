import { useState, useEffect } from 'react'
import { Button } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'
import { useStore } from '../../store/useStore'
import MaterialModal from '../../components/MaterialModal'
import { FileXls, FilePdf, Check, Trash, X, CheckCircle, CalendarBlank, ClipboardText, Buildings, HardHat } from '@phosphor-icons/react'
import * as XLSX from 'xlsx'

function fmtCreatedAt(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMins = Math.floor((now - d) / 60000)
  if (diffMins < 2)   return 'только что'
  if (diffMins < 60)  return `${diffMins} мин`
  if (diffMins < 120) return '1 час назад'
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── PROCUREMENT (unified foreman + worker requests) ─────────────────────────
export default function Procurement({ canDelete = true, canEdit = true }) {
  const { t } = useT()
  const { materials, projects, fetchProjects, fetchMaterials, role, profile,
          markMaterialPurchased, markMaterialNeeded, deleteMaterial,
          materialRequests, fetchMaterialRequests,
          updateMaterialRequestStatus, deleteMaterialRequest } = useStore()
  const [filter,    setFilter]  = useState('open')
  const [showModal, setShowModal] = useState(false)
  const [modalProj, setModalProj] = useState(null)
  const [lightbox,  setLightbox]  = useState(null)

  useEffect(() => {
    fetchProjects()
    fetchMaterials()
    fetchMaterialRequests()
  }, [])

  // ── Normalize into unified items ──────────────────────────────────────────
  // type: 'material' | 'request'
  // isOpen: bool — to allow uniform filtering
  // isPurchased: bool
  const allItems = [
    ...materials.map(m => ({
      type:        'material',
      id:          m.id,
      projectId:   m.projectId != null ? String(m.projectId) : '__none__',
      name:        m.name,
      qty:         m.qty,
      unit:        m.unit,
      notes:       m.note,
      reportedBy:  m.reportedBy,
      taskName:    m.taskText || null,
      photo:       null,
      createdAt:   m.createdAt,
      purchasedAt: m.purchasedAt || null,
      isOpen:      m.status === 'needed',
      isPurchased: m.status === 'purchased',
      raw:         m,
    })),
    ...materialRequests.map(r => ({
      type:        'request',
      id:          `req_${r.id}`,
      projectId:   r.project_id != null ? String(r.project_id) : '__none__',
      name:        r.name,
      qty:         r.qty,
      unit:        r.unit,
      notes:       r.notes,
      reportedBy:  r.worker_name,
      taskName:    r.task?.text || null,
      photo:       r.photo_url,
      createdAt:   r.created_at,
      purchasedAt: r.status === 'closed' ? r.updated_at || r.created_at : null,
      isOpen:      r.status === 'open',
      isPurchased: r.status === 'closed',
      raw:         r,
    })),
  ]

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = allItems.filter(item =>
    filter === 'open'      ? item.isOpen      :
    filter === 'purchased' ? item.isPurchased  : true
  )

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalOpen      = allItems.filter(i => i.isOpen).length
  const totalPurchased = allItems.filter(i => i.isPurchased).length
  const openRequests   = materialRequests.filter(r => r.status === 'open').length
  const today          = new Date(); today.setHours(0, 0, 0, 0)
  const purchasedToday = materials.filter(m =>
    m.status === 'purchased' && m.purchasedAt && new Date(m.purchasedAt) >= today
  ).length

  // ── Group by purchase date (when purchased filter) or by project ─────────
  const groupByDate = filter === 'purchased'

  const fmtDay = (iso) => {
    if (!iso) return 'Дата неизвестна'
    const d = new Date(iso)
    const today = new Date(); today.setHours(0,0,0,0)
    const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
    if (d >= today) return 'Сегодня'
    if (d >= yesterday) return 'Вчера'
    return d.toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' })
  }

  const groupMap = {}
  for (const item of filtered) {
    const key = groupByDate
      ? (item.purchasedAt ? new Date(item.purchasedAt).toISOString().slice(0,10) : '__unknown__')
      : item.projectId
    if (!groupMap[key]) groupMap[key] = []
    groupMap[key].push(item)
  }

  const groups = Object.entries(groupMap)
    .map(([key, items]) => ({
      key,
      proj:  !groupByDate && key !== '__none__' ? projects.find(p => String(p.id) === key) : null,
      label: groupByDate
        ? fmtDay(key === '__unknown__' ? null : key + 'T00:00:00')
        : key === '__none__'
          ? (t('materials.generalNoProject') || 'No project')
          : (projects.find(p => String(p.id) === key)?.name || `Project ${key}`),
      items,
      openCount: items.filter(i => i.isOpen).length,
      dateKey: groupByDate ? key : null,
    }))
    .sort((a, b) => {
      if (groupByDate) {
        if (a.key === '__unknown__') return 1
        if (b.key === '__unknown__') return -1
        return b.key.localeCompare(a.key) // newest first
      }
      return a.key === '__none__' ? 1 : b.key === '__none__' ? -1 : 0
    })

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggleItem = (item) => {
    if (item.type === 'material') {
      item.isOpen ? markMaterialPurchased(item.id) : markMaterialNeeded(item.id)
    } else {
      updateMaterialRequestStatus(item.raw.id, item.isOpen ? 'closed' : 'open')
    }
  }

  const deleteItem = (item) => {
    if (item.type === 'material') {
      if (role === 'foreman' || item.reportedBy === profile?.name) deleteMaterial(item.id)
    } else {
      deleteMaterialRequest(item.raw.id)
    }
  }

  // ── XLSX export ───────────────────────────────────────────────────────────
  const exportPurchased = () => {
    const purchased = allItems.filter(i => i.isPurchased)
    if (!purchased.length) { alert('Нет купленных материалов для экспорта'); return }

    const sorted = [...purchased].sort((a, b) => {
      if (!a.purchasedAt && !b.purchasedAt) return 0
      if (!a.purchasedAt) return 1
      if (!b.purchasedAt) return -1
      return b.purchasedAt.localeCompare(a.purchasedAt)
    })

    const fmtDate = (iso) => iso
      ? new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—'

    const wb = XLSX.utils.book_new()

    // ── Sheet 1: all purchases ──────────────────────────────────────────────
    const rows = [
      ['Дата покупки', 'Наименование', 'Кол-во', 'Ед. изм.', 'Объект', 'Кто запросил', 'Источник', 'Заметки'],
    ]
    for (const item of sorted) {
      const projName = projects.find(p => String(p.id) === item.projectId)?.name || '—'
      rows.push([
        fmtDate(item.purchasedAt),
        item.name,
        item.qty ?? '',
        item.unit ?? '',
        projName,
        item.reportedBy || '—',
        item.type === 'request' ? 'Рабочий' : 'Прораб',
        item.notes || '',
      ])
    }
    const ws1 = XLSX.utils.aoa_to_sheet(rows)
    ws1['!cols'] = [{ wch:14 }, { wch:28 }, { wch:8 }, { wch:8 }, { wch:22 }, { wch:18 }, { wch:10 }, { wch:30 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Закупки')

    // ── Sheet 2: summary by project ─────────────────────────────────────────
    const byProj = {}
    for (const item of sorted) {
      const projName = projects.find(p => String(p.id) === item.projectId)?.name || 'Без объекта'
      if (!byProj[projName]) byProj[projName] = { total: 0, foreman: 0, worker: 0 }
      byProj[projName].total++
      if (item.type === 'request') byProj[projName].worker++
      else byProj[projName].foreman++
    }
    const sumRows = [
      ['Объект', 'Всего позиций', 'От прораба', 'От рабочих'],
      ...Object.entries(byProj).map(([name, d]) => [name, d.total, d.foreman, d.worker]),
      ['ИТОГО',
        sorted.length,
        sorted.filter(i => i.type === 'material').length,
        sorted.filter(i => i.type === 'request').length,
      ],
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(sumRows)
    ws2['!cols'] = [{ wch:24 }, { wch:14 }, { wch:12 }, { wch:14 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'По объектам')

    XLSX.writeFile(wb, `закупки_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // ── PDF / Print report ────────────────────────────────────────────────────
  const printPurchased = () => {
    // Must open window synchronously — mobile Safari blocks popup after async
    const w = window.open('', '_blank')
    if (!w) { alert('Разрешите открытие новых вкладок в браузере'); return }

    const purchased = allItems.filter(i => i.isPurchased)
    const sorted = [...purchased].sort((a, b) => {
      if (!a.purchasedAt && !b.purchasedAt) return 0
      if (!a.purchasedAt) return 1
      if (!b.purchasedAt) return -1
      return b.purchasedAt.localeCompare(a.purchasedAt)
    })

    const fmtDate = (iso) => iso
      ? new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—'

    // Group by project
    const projMap = {}
    for (const item of sorted) {
      const projName = projects.find(p => String(p.id) === item.projectId)?.name || 'Без объекта'
      if (!projMap[projName]) projMap[projName] = []
      projMap[projName].push(item)
    }

    let rowNum = 1
    const tableRows = Object.entries(projMap).map(([projName, items]) => {
      const itemRows = items.map(item => `
        <tr>
          <td class="col-num">${rowNum++}</td>
          <td class="col-date">${fmtDate(item.purchasedAt)}</td>
          <td>${item.name}</td>
          <td class="col-qty">${item.qty != null ? item.qty : ''}${item.unit ? ' ' + item.unit : ''}</td>
          <td class="col-who">${item.reportedBy || '—'}</td>
          <td class="col-src">${item.type === 'request' ? '👷 Рабочий' : 'Прораб'}</td>
          <td class="col-notes">${item.notes || ''}</td>
        </tr>`).join('')
      return `
        <tr class="proj-row">
          <td colspan="7">🏗 ${projName} <span class="proj-count">${items.length} поз.</span></td>
        </tr>
        ${itemRows}`
    }).join('')

    const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    const html = `<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Отчёт по закупкам</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1C1917; padding: 24px; }
        .top-bar { display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 20px; }
        .btn { padding: 8px 18px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; font-family: inherit; font-weight: 500; }
        .btn-primary { background: #EA580C; color: #fff; }
        .btn-secondary { background: #F0EEE8; color: #1C1917; }
        .rpt-header { margin-bottom: 18px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        .meta { font-size: 11px; color: #666; }
        .summary { display: flex; gap: 24px; margin-bottom: 18px; }
        .chip { background: #F5F1EB; border-radius: 6px; padding: 8px 14px; }
        .chip .cl { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 2px; }
        .chip .cv { font-size: 18px; font-weight: 700; color: #1C1917; }
        table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; }
        thead th { background: #f0f0f0; font-weight: 700; font-size: 11px; text-align: left; }
        .col-num  { width: 34px; text-align: center; }
        .col-date { width: 120px; }
        .col-qty  { width: 80px; text-align: center; }
        .col-who  { width: 110px; }
        .col-src  { width: 90px; text-align: center; }
        .col-notes { width: 140px; color: #666; font-style: italic; }
        .proj-row td { background: #E8E4DC; font-weight: 700; font-size: 12px; padding: 6px 10px; }
        .proj-count { font-weight: 400; color: #666; font-size: 11px; margin-left: 8px; }
        .footer { margin-top: 14px; font-size: 10px; color: #aaa; text-align: right; }
        @media print {
          .top-bar { display: none !important; }
          body { padding: 10px; }
          @page { margin: 15mm; }
        }
      </style>
    </head><body>
      <div class="top-bar">
        <button class="btn btn-primary" onclick="window.print()">Сохранить как PDF</button>
        <button class="btn btn-secondary" onclick="window.close()">Закрыть</button>
      </div>
      <div class="rpt-header">
        <h1>Отчёт по закупкам</h1>
        <div class="meta">Сформировано: ${today}</div>
      </div>
      <div class="summary">
        <div class="chip"><div class="cl">Всего куплено</div><div class="cv">${sorted.length}</div></div>
        <div class="chip"><div class="cl">Объектов</div><div class="cv">${Object.keys(projMap).length}</div></div>
        <div class="chip"><div class="cl">От рабочих</div><div class="cv">${sorted.filter(i => i.type === 'request').length}</div></div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="col-num">№</th>
            <th class="col-date">Дата покупки</th>
            <th>Наименование</th>
            <th class="col-qty">Кол-во / Ед.</th>
            <th class="col-who">Кто запросил</th>
            <th class="col-src">Источник</th>
            <th class="col-notes">Заметки</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div class="footer">tutuu.net · ${today}</div>
    </body></html>`

    w.document.open()
    w.document.write(html)
    w.document.close()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('materials.title')}</h1>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button
            onClick={exportPurchased}
            style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'6px 12px', borderRadius:8, cursor:'pointer',
              background:'var(--bg,#fff)', color:'var(--text-secondary,#7A6E66)',
              border:'0.5px solid var(--border-medium,#D9D0C7)',
              fontSize:12, fontWeight:500, fontFamily:'inherit',
            }}
            title="Скачать отчёт по закупкам (.xlsx)"
          >
            <FileXls size={15} weight="bold" />
            .xlsx
          </button>
          <button
            onClick={printPurchased}
            style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'6px 12px', borderRadius:8, cursor:'pointer',
              background:'var(--bg,#fff)', color:'var(--text-secondary,#7A6E66)',
              border:'0.5px solid var(--border-medium,#D9D0C7)',
              fontSize:12, fontWeight:500, fontFamily:'inherit',
            }}
            title="Открыть отчёт для печати / PDF"
          >
            <FilePdf size={15} weight="bold" />
            PDF
          </button>
          {canEdit && (
            <Button variant="primary" size="sm" onClick={() => { setModalProj(null); setShowModal(true) }}>
              {t('materials.add')}
            </Button>
          )}
        </div>
      </div>
      <p style={{ fontSize:12, color:'#B8AFA6', marginTop:-8, marginBottom:12 }}>
        {t('materials.desc')}
      </p>

      {/* Summary chips */}
      <div className="summary-bar" style={{ marginBottom:12 }}>
        <div className={`summary-chip ${totalOpen > 0 ? 'danger' : 'neutral'}`}>
          {t('materials.openShortages', { n: totalOpen, s: totalOpen !== 1 ? 's' : '' })}
        </div>
        <div className="summary-chip neutral">
          {t('materials.purchasedToday', { n: purchasedToday })}
        </div>
        <div className="summary-chip neutral">
          {t('materials.totalChip', { n: allItems.length })}
        </div>
        {openRequests > 0 && (
          <div className="summary-chip" style={{ background:'#FEF3C7', color:'#92400E', border:'1px solid #FDE68A' }}>
            <HardHat size={11} weight="bold" /> {openRequests} {t('matReq.statusOpen').toLowerCase()}
          </div>
        )}
      </div>

      {/* Filter chips */}
      <div className="filter-bar" style={{ marginBottom:16 }}>
        {[
          { k:'all',       l: t('materials.filterAll',  { n: allItems.length }) },
          { k:'open',      l: t('materials.filterOpen', { n: totalOpen }) },
          { k:'purchased', l: t('materials.filterPurchased') },
        ].map(({ k, l }) => (
          <button key={k} className={`filter-btn ${filter===k?'active':''}`}
            onClick={() => setFilter(k)}>{l}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 0', color:'#B8AFA6' }}>
          <div style={{ fontSize:40, marginBottom:10, display:'flex', justifyContent:'center' }}><CheckCircle size={40} weight="bold" color="#5A9467" /></div>
          <div style={{ fontSize:15, fontWeight:700, color:'#5A9467' }}>{t('materials.allCaughtUp')}</div>
          <div style={{ fontSize:12, marginTop:6 }}>{t('materials.noOpen')}</div>
        </div>
      )}

      {/* Groups */}
      {groups.map(g => (
        <div key={g.key} className="procurement-group">
          <div className="procurement-group-header">
            <span style={{ display:'flex', alignItems:'center' }}>{groupByDate ? <CalendarBlank size={13} weight="bold" /> : g.key === '__none__' ? <ClipboardText size={13} weight="bold" /> : <Buildings size={13} weight="bold" />}</span>
            <h3>{g.label}</h3>
            {groupByDate && (
              <span style={{ fontSize:11, color:'#B8AFA6', marginLeft:4 }}>
                {g.items.length} позиц{g.items.length === 1 ? 'ия' : g.items.length < 5 ? 'ии' : 'ий'}
              </span>
            )}
            {!groupByDate && g.openCount > 0 && (
              <span className="procurement-count-badge">
                {t('materials.needed', { n: g.openCount })}
              </span>
            )}
            {canEdit && !groupByDate && (
              <button
                onClick={() => { setModalProj(g.proj?.id || null); setShowModal(true) }}
                style={{ marginLeft:'auto', fontSize:11, fontWeight:600, color:'#C96B3A',
                  background:'var(--accent-light,#FAECE4)', border:'none', borderRadius:8, padding:'4px 10px', cursor:'pointer' }}
              >
                + {t('common.add')}
              </button>
            )}
          </div>

          {/* Unified items list */}
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {g.items.map((item, idx) => (
              <div key={item.id} style={{
                display:'flex', alignItems:'flex-start', gap:10,
                padding:'10px 12px',
                borderTop: idx > 0 ? '1px solid var(--border,#EAE3D8)' : 'none',
                background: item.isPurchased ? 'var(--surface-2,#FDFBF8)' : 'var(--surface,#fff)',
                opacity: item.isPurchased ? 0.7 : 1,
              }}>
                {/* Checkbox */}
                <div
                  onClick={() => toggleItem(item)}
                  style={{
                    width:20, height:20, borderRadius:5, flexShrink:0, marginTop:1,
                    border:`2px solid ${item.isPurchased ? '#3D7A52' : item.type === 'request' ? '#C96B3A' : '#D1D5DB'}`,
                    background: item.isPurchased ? '#3D7A52' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer', transition:'all .15s',
                  }}
                >
                  {item.isPurchased && <Check size={11} weight="bold" color="#fff" />}
                </div>

                {/* Content */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600,
                    color: item.isPurchased ? '#B8AFA6' : 'var(--text-1,#2E2420)',
                    textDecoration: item.isPurchased ? 'line-through' : 'none',
                  }}>
                    {item.name}
                    {item.qty != null && (
                      <span style={{ fontWeight:400, color:'#7A6E66', marginLeft:6 }}>
                        × {item.qty} {item.unit}
                      </span>
                    )}
                    {/* Worker badge */}
                    {item.type === 'request' && (
                      <span style={{ marginLeft:8, fontSize:10, background:'#FEF3C7',
                        color:'#92400E', borderRadius:5, padding:'1px 6px', fontWeight:700 }}>
                        <HardHat size={10} weight="bold" /> {item.reportedBy}
                      </span>
                    )}
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:3, alignItems:'center' }}>
                    {item.reportedBy && item.type === 'material' && (
                      <span style={{ fontSize:11, color:'#B8AFA6' }}>{item.reportedBy}</span>
                    )}
                    {item.taskName && (
                      <span style={{ fontSize:11, background:'var(--bg-accent,#F2EDE4)',
                        color:'#7A6E66', borderRadius:5, padding:'1px 6px' }}>
                        {item.taskName}
                      </span>
                    )}
                    {item.notes && (
                      <span style={{ fontSize:11, color:'#B8AFA6', fontStyle:'italic' }}>
                        {item.notes}
                      </span>
                    )}
                    {item.isPurchased && item.purchasedAt ? (
                      <span style={{ fontSize:11, color:'#3D7A52', marginLeft:'auto', fontWeight:500, display:'flex', alignItems:'center', gap:2 }}>
                        <Check size={11} weight="bold" /> {new Date(item.purchasedAt).toLocaleDateString('ru-RU', { day:'numeric', month:'short' })}
                      </span>
                    ) : (
                      <span style={{ fontSize:11, color:'#C8C0B8', marginLeft:'auto' }}>
                        {fmtCreatedAt(item.createdAt)}
                      </span>
                    )}
                  </div>
                  {/* Photo thumbnail */}
                  {item.photo && (
                    <img src={item.photo} alt="photo"
                      onClick={() => setLightbox(item.photo)}
                      style={{ width:48, height:48, objectFit:'cover', borderRadius:6,
                        border:'1px solid var(--border,#EAE3D8)', marginTop:5,
                        display:'block', cursor:'pointer' }}
                    />
                  )}
                </div>

                {/* Delete */}
                {canDelete && (
                  <button onClick={() => deleteItem(item)}
                    style={{ background:'none', border:'none', cursor:'pointer',
                      color:'#D1C8C0', fontSize:15, padding:'2px 4px', flexShrink:0,
                      lineHeight:1 }}
                    title={t('common.delete')}
                  ><Trash size={15} weight="bold" /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add first item */}
      {groups.length === 0 && filtered.length === 0 && (
        <div style={{ textAlign:'center', paddingTop:8 }}>
          <button
            onClick={() => { setModalProj(null); setShowModal(true) }}
            style={{ fontSize:13, fontWeight:600, color:'#C96B3A', background:'var(--accent-light,#FAECE4)',
              border:'1.5px dashed #E8C9B4', borderRadius:12, padding:'12px 24px',
              cursor:'pointer', width:'100%' }}
          >
            {t('materials.addFirst')}
          </button>
        </div>
      )}

      {showModal && (
        <MaterialModal
          open={showModal}
          onClose={() => setShowModal(false)}
          defaultProjectId={modalProj}
          defaultTaskId={null}
        />
      )}

      {/* Photo lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.88)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
          <button onClick={() => setLightbox(null)}
            style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.15)',
              border:'none', borderRadius:'50%', width:36, height:36, color:'#fff',
              fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={18} weight="bold" />
          </button>
          <img src={lightbox} alt="full" onClick={e => e.stopPropagation()}
            style={{ maxWidth:'94vw', maxHeight:'80dvh', borderRadius:10, objectFit:'contain' }} />
        </div>
      )}
    </div>
  )
}
