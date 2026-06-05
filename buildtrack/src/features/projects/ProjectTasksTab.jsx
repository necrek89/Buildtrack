import { useState, useEffect, useRef } from 'react'
import { Button, EmptyState } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'
import TaskModal from '../../components/TaskModal'
import ConfirmModal from '../../components/ConfirmModal'
import { SortableStageList } from '../tasks/SortableStage'
import { FileText, UploadSimple, DownloadSimple, Printer, ChatCircle } from '@phosphor-icons/react'
import * as XLSX from 'xlsx'

// ─── PROJECT TASKS TAB ───────────────────────────────────────────────────────
export default function ProjectTasksTab({ proj, canDelete = true, canEdit = true, tools = [], team = [] }) {
  const { t } = useT()
  const { tasks, fetchTasks, addTask, deleteTask, approveTask, rejectTask, updateProject, updateTask,
          pendingOpenTaskId, setPendingOpenTask } = useStore()
  const [filter,       setFilter]       = useState('all')
  const [showAdd,      setShowAdd]      = useState(false)
  const [editTask,     setEditTask]     = useState(null)
  const [deleteId,     setDeleteId]     = useState(null)
  const [openId,       setOpenId]       = useState(null)
  const [openStages,   setOpenStages]   = useState({})
  const [newStageName, setNewStageName] = useState('')
  const [addingStage,  setAddingStage]  = useState(false)
  const [importPreview, setImportPreview] = useState(null) // [{text,stage,unit,quantity,cost,currency}]
  const importRef = useRef()

  useEffect(() => { fetchTasks(proj.id) }, [proj.id])

  const pTasks    = tasks.filter(t => t.project_id === proj.id)
  const pDone     = pTasks.filter(tk => tk.status === 'approved').length
  const pPct      = pTasks.length === 0 ? 0 : Math.round((pDone / pTasks.length) * 100)
  const daysLeft  = proj.deadline ? Math.max(0, Math.ceil((new Date(proj.deadline) - new Date()) / 86400000)) : null
  const projTools = tools.filter(tk => tk.project_id === proj.id)

  // Project's ordered stages list
  const projStages = Array.isArray(proj.stages) && proj.stages.length > 0 ? proj.stages : []

  const filtered = pTasks.filter(t =>
    filter === 'active'  ? ['new','rejected'].includes(t.status) :
    filter === 'pending' ? t.status === 'pending' :
    filter === 'done'    ? t.status === 'approved' : true
  )

  const STATUS_ORDER   = { rejected: 0, new: 1, pending: 2, approved: 3 }
  const PRIORITY_ORDER = { high: 0, normal: 1, low: 2 }
  const sortTasks = (arr) => [...arr].sort((a, b) => {
    const sd = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    if (sd !== 0) return sd
    const pd = (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
    if (pd !== 0) return pd
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
    if (a.deadline) return -1
    if (b.deadline) return 1
    return 0
  })

  const STAGE_COLORS = [
    '#C96B3A','#5A9467','#4A7FC1','#D4A843','#9B6B9B',
    '#E07B6A','#6BAA8E','#7B8EC8','#A67C52','#3A5FAB',
  ]

  // Build ordered stage list: proj.stages order first, then any task stages not in list
  const stageGroups = (() => {
    const taskStageKeys = [...new Set(filtered.map(tk => tk.stage || '—'))]
    // All stages from proj.stages in order (including empty ones)
    const ordered = projStages
    // Stages in tasks but not in proj.stages
    const extra = taskStageKeys.filter(s => s !== '—' && !projStages.includes(s))
    // No-stage tasks last
    const all = [...ordered, ...extra, ...(taskStageKeys.includes('—') ? ['—'] : [])]
    return all.map(stage => ({
      stage,
      stageIndex: projStages.indexOf(stage), // -1 if not in proj.stages
      items: sortTasks(filtered.filter(tk => (tk.stage || '—') === stage)),
    }))
  })()

  const addStage = async () => {
    const name = newStageName.trim()
    if (!name) return
    const updated = [...projStages, name]
    await updateProject(proj.id, { stages: updated })
    setNewStageName('')
    setAddingStage(false)
  }

  const renameStage = async (oldName, newName) => {
    if (oldName === '—') {
      // "—" means tasks without a stage — assign them to a new stage
      const updatedStages = projStages.includes(newName) ? projStages : [...projStages, newName]
      await updateProject(proj.id, { stages: updatedStages })
      const affected = pTasks.filter(tk => !tk.stage)
      await Promise.all(affected.map(tk => updateTask(tk.id, { stage: newName })))
    } else {
      const updatedStages = projStages.map(s => s === oldName ? newName : s)
      await updateProject(proj.id, { stages: updatedStages })
      const affected = pTasks.filter(tk => tk.stage === oldName)
      await Promise.all(affected.map(tk => updateTask(tk.id, { stage: newName })))
    }
  }

  const deleteStage = async (stageName) => {
    const updatedStages = projStages.filter(s => s !== stageName)
    await updateProject(proj.id, { stages: updatedStages })
    // Clear stage from tasks that had this stage
    const affected = pTasks.filter(tk => tk.stage === stageName)
    await Promise.all(affected.map(tk => updateTask(tk.id, { stage: null })))
  }

  const moveStage = async (stageName, dir) => {
    const idx = projStages.indexOf(stageName)
    if (idx === -1) return
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= projStages.length) return
    const updated = [...projStages]
    ;[updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]]
    await updateProject(proj.id, { stages: updated })
  }

  // ── Quick inline add ──────────────────────────────────────────────────────
  const quickAdd = async ({ text, stage, qty, unit, cost }) => {
    const taskData = { text, stage: stage === '—' ? null : stage, project_id: proj.id, status: 'new', priority: 'normal' }
    if (qty != null)  taskData.quantity = qty
    if (unit)         taskData.unit     = unit
    if (cost != null) taskData.cost     = cost
    await addTask(taskData)
    await fetchTasks(proj.id)
  }

  // ── CSV Import ────────────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const bom = '﻿'
    // Use semicolons — Excel (Russian locale) opens these correctly
    const csv = bom + [
      'Этап;Название задачи;Описание;Ед.изм.;Кол-во;Сумма;Валюта',
      'Фундамент;Заливка бетона;Марка М300;куб.м;50;5000;$',
      'Фундамент;Армирование;;кг;800;;',
      'Стены;Кладка кирпича;;кв.м;120;12000;€',
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'шаблон_задачи.csv'
    a.click()
  }

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const raw = ev.target.result.replace(/^﻿/, '') // strip BOM

      // Auto-detect separator from first line
      const firstNewline = raw.indexOf('\n')
      const firstLine = raw.slice(0, firstNewline < 0 ? undefined : firstNewline)
      const sep = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ','

      // Full RFC-4180 CSV parser — handles multiline quoted fields
      const parseCSV = (text) => {
        const rows = []
        let row = [], cur = '', inQ = false, i = 0
        while (i < text.length) {
          const ch = text[i]
          if (ch === '"') {
            if (inQ && text[i + 1] === '"') { cur += '"'; i += 2; continue } // escaped ""
            inQ = !inQ; i++; continue
          }
          if (ch === sep && !inQ) {
            row.push(cur.trim()); cur = ''; i++; continue
          }
          if ((ch === '\r' || ch === '\n') && !inQ) {
            if (ch === '\r' && text[i + 1] === '\n') i++ // skip \r in \r\n
            row.push(cur.trim())
            if (row.some(c => c !== '')) rows.push(row)
            row = []; cur = ''; i++; continue
          }
          cur += ch; i++
        }
        // last row
        row.push(cur.trim())
        if (row.some(c => c !== '')) rows.push(row)
        return rows
      }

      const allRows = parseCSV(raw)
      if (allRows.length < 2) return

      // Map headers → column indexes by keyword
      const headers = allRows[0].map(h => h.toLowerCase().replace(/[^а-яёa-z0-9]/gi, ''))
      const find = (...keys) => headers.findIndex(h => keys.some(k => h.includes(k)))

      const iStage    = find('этап', 'stage', 'фаза', 'раздел', 'группа')
      const iText     = find('назв', 'наим', 'задач', 'title', 'name', 'работ')
      const iDesc     = find('описан', 'desc', 'примеч', 'коммент')
      const iUnit     = find('ед', 'unit', 'един')
      const iQty      = find('кол', 'qty', 'количе', 'объём', 'объем')
      const iCost     = find('сумм', 'цен', 'стоим', 'cost', 'price')
      const iCurrency = find('валют', 'curr')

      if (iText === -1) {
        alert(t('tasks.csvColError'))
        return
      }

      const toNum = (s) => { if (!s) return null; const n = parseFloat(s.replace(',', '.')); return isNaN(n) ? null : n }

      const rows = allRows.slice(1).map(c => ({
        stage:       iStage    >= 0 ? (c[iStage]    || '') : '',
        text:                          c[iText]     || '',
        description: iDesc     >= 0 ? (c[iDesc]     || '') : '',
        unit:        iUnit     >= 0 ? (c[iUnit]     || '') : '',
        quantity:    iQty      >= 0 ? toNum(c[iQty])       : null,
        cost:        iCost     >= 0 ? toNum(c[iCost])      : null,
        currency:    iCurrency >= 0 ? (c[iCurrency] || '$') : '$',
      })).filter(r => r.text.trim())

      setImportPreview(rows)
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  const confirmImport = async () => {
    if (!importPreview?.length) return
    // Add new stages from CSV to proj.stages if not already there
    const newStages = [...projStages]
    importPreview.forEach(row => {
      if (row.stage && !newStages.includes(row.stage)) newStages.push(row.stage)
    })
    if (newStages.length !== projStages.length) {
      await updateProject(proj.id, { stages: newStages })
    }
    // Insert tasks
    for (const row of importPreview) {
      await addTask({
        text: row.text,
        description: row.description || null,
        stage: row.stage || null,
        unit: row.unit || null,
        quantity: row.quantity,
        cost: row.cost,
        currency: row.currency || '$',
        project_id: proj.id,
        status: 'new',
        priority: 'normal',
      })
    }
    await fetchTasks(proj.id)
    setImportPreview(null)
  }

  const exportXLSX = () => {
    const STATUS_RU = { new: 'Новая', pending: 'На проверке', approved: 'Выполнена', rejected: 'Отклонена' }

    const allGroups = (() => {
      const map = {}
      pTasks.forEach(tk => {
        const key = tk.stage || '—'
        if (!map[key]) map[key] = []
        map[key].push(tk)
      })
      const taskStageKeys = Object.keys(map)
      const ordered = projStages.filter(s => taskStageKeys.includes(s))
      const extra   = taskStageKeys.filter(s => s !== '—' && !projStages.includes(s))
      const all     = [...ordered, ...extra, ...(taskStageKeys.includes('—') ? ['—'] : [])]
      return all.map((stage, i) => ({ stage, num: i + 1, items: sortTasks(map[stage] || []) }))
    })()

    const wb = XLSX.utils.book_new()

    // ── Sheet 1: Tasks ────────────────────────────────────────────────────────
    const rows = [
      ['№', 'Этап', 'Наименование работы', 'Описание', 'Ед. изм.', 'Кол-во', 'Цена', 'Валюта', 'Статус'],
    ]
    let num = 1
    for (const { stage, items } of allGroups) {
      for (const tk of items) {
        rows.push([
          num++,
          stage,
          tk.text,
          tk.description || '',
          tk.unit || '',
          tk.quantity != null ? Number(tk.quantity) : '',
          tk.cost    != null ? Number(tk.cost)     : '',
          tk.currency || '',
          STATUS_RU[tk.status] || tk.status,
        ])
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)

    // Column widths
    ws['!cols'] = [
      { wch: 4 },   // №
      { wch: 18 },  // Этап
      { wch: 36 },  // Наименование
      { wch: 24 },  // Описание
      { wch: 8 },   // Ед.
      { wch: 8 },   // Кол-во
      { wch: 12 },  // Цена
      { wch: 6 },   // Валюта
      { wch: 14 },  // Статус
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Задачи')

    // ── Sheet 2: Summary by stage ─────────────────────────────────────────────
    const summaryRows = [
      ['Этап', 'Всего задач', 'Выполнено', 'На проверке', 'Активных', 'Сумма'],
    ]
    for (const { stage, items } of allGroups) {
      const done    = items.filter(t => t.status === 'approved').length
      const pending = items.filter(t => t.status === 'pending').length
      const active  = items.filter(t => ['new','rejected'].includes(t.status)).length
      const total   = items.reduce((s, t) => s + (t.cost != null ? Number(t.cost) : 0), 0)
      summaryRows.push([stage, items.length, done, pending, active, total || ''])
    }
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
    wsSummary['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Сводка по этапам')

    const date = new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')
    XLSX.writeFile(wb, `${proj.name}_задачи_${date}.xlsx`)
  }

  const [printWithComments, setPrintWithComments] = useState(true)
  const [printing, setPrinting] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const printTasks = async () => {
    // Must open window synchronously (before any await) — mobile Safari blocks popup if called after async
    const w = window.open('', '_blank')
    if (!w) { alert('Разрешите открытие новых вкладок в браузере'); return }
    w.document.write('<html><body style="font-family:system-ui;padding:32px;color:#888">Загрузка...</body></html>')

    setPrinting(true)

    // ── Fetch all comments for project tasks in one query ──
    let commentsMap = {}
    if (printWithComments && pTasks.length > 0) {
      const { data } = await supabase
        .from('task_comments')
        .select('task_id, author_name, text, created_at')
        .in('task_id', pTasks.map(tk => tk.id))
        .order('created_at', { ascending: true })
      ;(data || []).forEach(c => {
        if (!commentsMap[c.task_id]) commentsMap[c.task_id] = []
        commentsMap[c.task_id].push(c)
      })
    }

    const allGroups = (() => {
      const map = {}
      pTasks.forEach(tk => {
        const key = tk.stage || '—'
        if (!map[key]) map[key] = []
        map[key].push(tk)
      })
      const taskStageKeys = Object.keys(map)
      const ordered = projStages.filter(s => taskStageKeys.includes(s))
      const extra = taskStageKeys.filter(s => s !== '—' && !projStages.includes(s))
      const all = [...ordered, ...extra, ...(taskStageKeys.includes('—') ? ['—'] : [])]
      return all.map((stage, i) => ({ stage, num: i + 1, items: sortTasks(map[stage] || []) }))
    })()

    let globalRow = 1
    const rows = allGroups.map(({ stage, num, items }) => {
      const taskRows = items.map(tk => {
        const n = globalRow++
        const comments = commentsMap[tk.id] || []
        const commentsHtml = comments.length > 0 ? `
          <div class="comments">
            ${comments.map(c => `
              <div class="comment">
                <span class="comment-meta">
                  💬 <strong>${c.author_name || '—'}</strong>
                  <span class="comment-date">${new Date(c.created_at).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                </span>
                <div class="comment-text">${c.text}</div>
              </div>`).join('')}
          </div>` : ''
        return `<tr>
          <td class="col-num">${n}</td>
          <td class="col-name">
            ${tk.text}
            ${tk.description ? `<div class="desc">${tk.description}</div>` : ''}
            ${commentsHtml}
          </td>
          <td class="col-unit">${tk.unit || ''}</td>
          <td class="col-qty">${tk.quantity != null ? tk.quantity : ''}</td>
          <td class="col-cost">${tk.cost != null ? `${Number(tk.cost).toLocaleString('ru-RU')} ${tk.currency || ''}` : ''}</td>
        </tr>`
      }).join('')
      return `
        <tr class="stage-row">
          <td colspan="5"><span class="stage-num">${num}</span> ${stage}</td>
        </tr>
        ${taskRows}`
    }).join('')

    const totalComments = Object.values(commentsMap).reduce((s, a) => s + a.length, 0)

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${proj.name}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 24px; }
        .top-bar { display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 24px; }
        .btn { padding: 8px 18px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; font-family: inherit; font-weight: 500; }
        .btn-primary { background: #EA580C; color: #fff; }
        .btn-secondary { background: #F0EEE8; color: #1C1917; }
        h1 { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
        .meta { font-size: 11px; color: #555; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; }
        th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
        thead th { background: #f0f0f0; font-weight: bold; font-size: 11px; text-align: center; }
        .col-num  { width: 42px; text-align: center; }
        .col-unit { width: 70px; text-align: center; }
        .col-qty  { width: 80px; text-align: center; }
        .col-cost { width: 110px; text-align: right; }
        .stage-row td { background: #e8e8e8; font-weight: bold; font-size: 12px; padding: 6px 10px; }
        .stage-num { display: inline-block; width: 20px; height: 20px; border-radius: 50%; background: #333; color: #fff; text-align: center; line-height: 20px; font-size: 10px; font-weight: bold; margin-right: 6px; }
        .desc { font-size: 10px; color: #555; margin-top: 3px; }
        .comments { margin-top: 6px; padding-top: 6px; border-top: 1px dashed #ccc; display: flex; flex-direction: column; gap: 5px; }
        .comment { background: #f9f9f9; border-left: 3px solid #c96b3a; padding: 4px 7px; border-radius: 0 4px 4px 0; }
        .comment-meta { font-size: 10px; color: #666; display: block; margin-bottom: 2px; }
        .comment-date { color: #999; margin-left: 6px; }
        .comment-text { font-size: 11px; color: #333; line-height: 1.4; white-space: pre-wrap; }
        .footer { margin-top: 16px; font-size: 10px; color: #aaa; text-align: right; }
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
      <h1>${proj.name}</h1>
      <div class="meta">
        ${proj.address ? proj.address + ' · ' : ''}
        ${proj.deadline ? 'Срок: ' + proj.deadline + ' · ' : ''}
        Задач: ${pTasks.length}
        ${totalComments > 0 ? ` · Комментариев: ${totalComments}` : ''}
      </div>
      <table>
        <thead>
          <tr>
            <th class="col-num">№</th>
            <th>Наименование работы</th>
            <th class="col-unit">Ед. изм.</th>
            <th class="col-qty">Кол-во</th>
            <th class="col-cost">Сумма</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">Tutuu · ${new Date().toLocaleDateString('ru-RU')}</div>
    </body></html>`

    setPrinting(false)
    w.document.open()
    w.document.write(html)
    w.document.close()
  }

  // Sync openStages when stages are added/removed, but preserve open/closed state of existing stages.
  // Do NOT use tasks.length as a dependency — that would collapse all stages on every task add/delete.
  const stageKeyStr = stageGroups.map(g => g.stage).join('\0')
  useEffect(() => {
    setOpenStages(prev => {
      const next = {}
      stageGroups.forEach(({ stage }) => { next[stage] = prev[stage] ?? false })
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, proj.id, stageKeyStr])

  // Auto-open a task coming from notification / search
  useEffect(() => {
    if (!pendingOpenTaskId) return
    const task = pTasks.find(tk => String(tk.id) === String(pendingOpenTaskId))
    if (!task) return
    const stageName = task.stage || '—'
    setOpenStages(prev => ({ ...prev, [stageName]: true }))
    setFilter('all')
    setOpenId(task.id)
    setPendingOpenTask(null)
    setTimeout(() => {
      document.getElementById(`task-card-${task.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 200)
  }, [pendingOpenTaskId, pTasks.length])

  const toggleStage = (stage) => setOpenStages(prev => ({ ...prev, [stage]: !prev[stage] }))

  return (
    <div style={{ paddingBottom:24 }}>

      {/* ── Stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:10 }}>
        {[
          { v: pPct+'%',                    l: t('detail.progress'),  c: '#C96B3A' },
          { v: team.length,                 l: t('detail.workers'),   c: '#2E2420' },
          { v: daysLeft !== null ? daysLeft+'d' : '—', l: t('detail.daysLeft'), c: daysLeft !== null && daysLeft < 7 ? '#A32D2D' : '#2E2420' },
          { v: `${pDone}/${pTasks.length}`, l: t('detail.tasksDone'), c: '#2E2420' },
        ].map(s => (
          <div key={s.l} style={{ background:'var(--bg-accent,#F2EDE4)', borderRadius:10, padding:'8px 6px', textAlign:'center' }}>
            <div style={{ fontSize:15, fontWeight:700, color:s.c }}>{s.v}</div>
            <div style={{ fontSize:9, color:'#B8AFA6', marginTop:2, lineHeight:1.2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height:5, background:'var(--border,#EAE3D8)', borderRadius:5, overflow:'hidden', marginBottom:10 }}>
        <div style={{ height:5, borderRadius:5, background:'#C96B3A', width:`${pPct}%`, transition:'width .4s' }} />
      </div>

      {/* ── Address / Deadline ── */}
      {(proj.address || proj.deadline) && (
        <div style={{ background:'var(--bg-accent,#F2EDE4)', borderRadius:10, padding:'8px 12px', marginBottom:10, display:'flex', flexWrap:'wrap', gap:8, alignItems:'center' }}>
          {proj.address && (
            <span onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(proj.address)}`, '_blank')}
              style={{ fontSize:12, fontWeight:600, color:'#C96B3A', cursor:'pointer', textDecoration:'underline' }}>
              📍 {proj.address}
            </span>
          )}
          {proj.deadline && (
            <span style={{ fontSize:11, color:'#B8AFA6' }}>
              📅 {proj.deadline}
              {daysLeft !== null && (
                <span style={{ color: daysLeft < 7 ? '#A32D2D' : '#C96B3A', fontWeight:600, marginLeft:4 }}>
                  · {t('detail.daysLeftText', { n: daysLeft })}
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {/* ── Add + Tools row ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, gap:6 }}>
        <div style={{ display:'flex', gap:5, position:'relative' }}>
          <input ref={importRef} type="file" accept=".csv" style={{ display:'none' }} onChange={handleImportFile} />
          <button
            onClick={() => setShowExportMenu(v => !v)}
            style={{
              display:'flex', alignItems:'center', gap:5,
              background:'var(--accent-light,#FFF7ED)', border:'0.5px solid var(--border-medium,#E8E4DC)',
              borderRadius:7, padding:'5px 11px', cursor:'pointer',
              color:'var(--text-secondary)', fontSize:12, fontWeight:500,
            }}
          >
            <DownloadSimple size={15} weight="bold" />
            {t('tasks.exportBtn')}
            <span style={{ fontSize:9, marginLeft:1 }}>▾</span>
          </button>

          {showExportMenu && (
            <>
              <div style={{ position:'fixed', inset:0, zIndex:99 }} onClick={() => setShowExportMenu(false)} />
              <div style={{
                position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:100,
                background:'var(--bg,#fff)', border:'0.5px solid var(--border-medium,#E8E4DC)',
                borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.10)', minWidth:190, overflow:'hidden',
              }}>
                {[
                  canEdit && { icon: <FileText size={15} weight="bold" />,    label: t('tasks.menuTemplate'),  action: () => downloadTemplate() },
                  canEdit && { icon: <UploadSimple size={15} weight="bold" />, label: t('tasks.menuImport'),    action: () => importRef.current?.click() },
                  { icon: <DownloadSimple size={15} weight="bold" />,          label: 'Скачать .xlsx',          action: () => exportXLSX() },
                  { icon: <Printer size={15} weight="bold" />,                 label: printing ? '...' : t('tasks.menuPrint'), action: () => !printing && printTasks() },
                  {
                    icon: <ChatCircle size={15} weight="bold" />,
                    label: printWithComments ? t('tasks.menuCommentsOn') : t('tasks.menuCommentsOff'),
                    action: () => setPrintWithComments(v => !v),
                    accent: printWithComments,
                  },
                ].filter(Boolean).map((item, i) => (
                  <button key={i} onClick={() => { item.action(); setShowExportMenu(false) }} style={{
                    display:'flex', alignItems:'center', gap:10,
                    width:'100%', padding:'10px 14px', border:'none', background:'transparent',
                    cursor:'pointer', fontSize:13, textAlign:'left',
                    color: item.accent ? 'var(--accent,#EA580C)' : 'var(--text-primary,#2E2420)',
                    borderBottom: i < 4 ? '0.5px solid var(--border,#EAE3D8)' : 'none',
                  }}>
                    <span style={{ color: item.accent ? 'var(--accent,#EA580C)' : 'var(--text-secondary)' }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {canEdit && (
          <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>{t('tasks.add')}</Button>
        )}
      </div>

      {/* ── Filter chips ── */}
      <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
        {['all','active','pending','done'].map(f => (
          <button key={f} className={`filter-btn ${filter===f?'active':''}`} onClick={() => setFilter(f)}
            style={{ fontSize:11, padding:'4px 10px' }}>
            {f === 'all'     ? `${t('tasks.filterAll')} (${pTasks.length})` :
             f === 'active'  ? t('tasks.filterActive') :
             f === 'pending' ? `${t('tasks.filterReview')} (${pTasks.filter(t=>t.status==='pending').length})` : t('tasks.filterDone')}
          </button>
        ))}
      </div>

      {filtered.length === 0 && stageGroups.length === 0 && <EmptyState>{t('tasks.noTasks')}</EmptyState>}

      {/* ── Stage accordions with drag-and-drop ── */}
      <SortableStageList
        stageGroups={stageGroups}
        projStages={projStages}
        openStages={openStages}
        toggleStage={toggleStage}
        openId={openId}
        setOpenId={setOpenId}
        canEdit={canEdit}
        canDelete={canDelete}
        setEditTask={setEditTask}
        setDeleteId={setDeleteId}
        approveTask={approveTask}
        rejectTask={rejectTask}
        STAGE_COLORS={STAGE_COLORS}
        onReorder={async (newOrder) => { await updateProject(proj.id, { stages: newOrder }) }}
        onRename={canEdit ? renameStage : undefined}
        onDeleteStage={canEdit ? deleteStage : undefined}
        onQuickAdd={canEdit ? quickAdd : undefined}
      />

      {/* ── Add Stage button (foreman only) ── */}
      {canEdit && (
        <div style={{ marginTop: 10 }}>
          {addingStage ? (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input
                className="form-input"
                style={{ flex:1, fontSize:13 }}
                placeholder={t('projects.stagePlaceholder')}
                value={newStageName}
                onChange={e => setNewStageName(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter') addStage(); if (e.key==='Escape') setAddingStage(false) }}
                autoFocus
              />
              <Button variant="primary" size="sm" onClick={addStage}>{t('common.add')}</Button>
              <button onClick={() => { setAddingStage(false); setNewStageName('') }}
                style={{ background:'none', border:'none', fontSize:18, color:'#B8AFA6', cursor:'pointer', lineHeight:1 }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setAddingStage(true)} style={{
              display:'flex', alignItems:'center', gap:6, padding:'10px 14px',
              background:'none', border:'1.5px dashed var(--border,#D9D0C7)',
              borderRadius:14, cursor:'pointer', fontSize:13, color:'#B8AFA6',
              fontWeight:500, width:'100%',
            }}>
              <span style={{ fontSize:16, lineHeight:1 }}>＋</span> {t('tasks.addStage')}
            </button>
          )}
        </div>
      )}

      {/* ── Tools on site ── */}
      {projTools.length > 0 && (
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#B8AFA6', marginBottom:8 }}>
            🔧 {t('detail.toolsOnSite')}
          </div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {projTools.map(tk => (
              <div key={tk.id} style={{ background:'var(--bg-accent,#F2EDE4)', borderRadius:6, padding:'3px 9px', fontSize:10, color:'#7A6E66' }}>{tk.name}</div>
            ))}
          </div>
        </div>
      )}

      {(showAdd || editTask) && (
        <TaskModal task={editTask} defaultProjectId={proj.id} onClose={() => { setShowAdd(false); setEditTask(null); fetchTasks(proj.id) }} />
      )}
      {deleteId && (
        <ConfirmModal icon="🗑️" title={t('tasks.deleteTitle')} sub={tasks.find(t => t.id === deleteId)?.text}
          onConfirm={() => { deleteTask(deleteId); setDeleteId(null) }}
          onCancel={() => setDeleteId(null)} />
      )}

      {/* ── Import preview modal ── */}
      {importPreview && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setImportPreview(null)}>
          <div className="modal" style={{ maxWidth:700, maxHeight:'85dvh', display:'flex', flexDirection:'column' }}>
            <div className="modal-title">📥 {t('tasks.importTitle')}</div>
            <div style={{ overflowY:'auto', flex:1 }}>
              <div style={{ fontSize:12, color:'#888', marginBottom:10 }}>
                {t('tasks.importFound').replace('{n}', importPreview.length)}
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'var(--bg-accent,#F2EDE4)' }}>
                    {[t('tasks.importColStage'),t('tasks.importColName'),t('tasks.importColDesc'),t('tasks.importColUnit'),t('tasks.importColQty'),t('tasks.importColAmount')].map(h => (
                      <th key={h} style={{ padding:'6px 8px', textAlign:'left', border:'1px solid var(--border,#EAE3D8)', fontWeight:700, fontSize:11, color:'#7A6E66' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((r, i) => (
                    <tr key={i} style={{ background: i%2===0 ? 'var(--surface,#fff)' : 'var(--surface-2,#FDFBF8)' }}>
                      <td style={{ padding:'5px 8px', border:'1px solid var(--border,#EAE3D8)', color:'#888' }}>{r.stage || '—'}</td>
                      <td style={{ padding:'5px 8px', border:'1px solid var(--border,#EAE3D8)', fontWeight:600 }}>{r.text}</td>
                      <td style={{ padding:'5px 8px', border:'1px solid var(--border,#EAE3D8)', color:'#888' }}>{r.description || '—'}</td>
                      <td style={{ padding:'5px 8px', border:'1px solid var(--border,#EAE3D8)' }}>{r.unit || '—'}</td>
                      <td style={{ padding:'5px 8px', border:'1px solid var(--border,#EAE3D8)' }}>{r.quantity ?? '—'}</td>
                      <td style={{ padding:'5px 8px', border:'1px solid var(--border,#EAE3D8)' }}>{r.cost != null ? `${r.cost} ${r.currency}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-actions" style={{ paddingTop:12, borderTop:'1px solid #EAE3D8', marginTop:4 }}>
              <Button size="sm" onClick={() => setImportPreview(null)}>{t('tasks.importCancel')}</Button>
              <Button variant="primary" size="sm" onClick={confirmImport}>
                📥 {t('tasks.importConfirm').replace('{n}', importPreview.length)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
