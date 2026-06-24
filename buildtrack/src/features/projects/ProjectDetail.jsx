import { useState, useEffect } from 'react'
import { IconButton } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'
import { useStore } from '../../store/useStore'
import InvoiceModal from '../../components/InvoiceModal'
import ExpensesTab from '../../components/ExpensesTab'
import ProjectTasksTab from './ProjectTasksTab'
import MaterialsTab from './MaterialsTab'
import PhotosTab from './PhotosTab'
import DocumentsTab from './DocumentsTab'
import ProjectTeamTab from './ProjectTeamTab'

// ─── PROJECT DETAIL ──────────────────────────────────────────────────────────
export default function ProjectDetail({ proj, onBack, onEdit, canDelete = true, canEdit = true }) {
  const { t } = useT()
  const { tasks, tools, team, fetchTasks, fetchTools, fetchTeam } = useStore()
  const [tab, setTab] = useState('tasks')
  const [showInvoice, setShowInvoice] = useState(false)
  const TABS = [
    { id:'tasks',   label: t('detail.tasks')   },
    { id:'finance', label: t('detail.finance') },
    { id:'files',   label: t('detail.files')   },
    { id:'team',    label: t('detail.team')    },
  ]

  useEffect(() => {
    fetchTasks(proj.id)
    fetchTools(proj.id)
    fetchTeam(proj.id)
  }, [proj.id])

  const projTasks    = tasks.filter(tk => tk.project_id === proj.id)
  const pct          = projTasks.length === 0 ? 0 : Math.round((projTasks.filter(tk => tk.status === 'approved').length / projTasks.length) * 100)
  const pendingCount = projTasks.filter(tk => tk.status === 'pending').length
  const overdueCount = projTasks.filter(tk => tk.deadline && new Date(tk.deadline) < new Date() && tk.status !== 'approved').length

  return (
    <div>
      {/* ── Breadcrumbs ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, paddingTop:4 }}>
        <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', gap:5, overflow:'hidden' }}>
          <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:3, padding:0, color:'var(--text-2)', flexShrink:0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            <span style={{ fontSize:12 }}>{t('projects.title')}</span>
          </button>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          <span style={{ fontSize:14, fontWeight:600, color:'var(--text-1)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{proj.name}</span>
        </div>
        {canEdit && (
          <button onClick={() => setShowInvoice(true)} title={t('invoice.title')} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:'1.5px solid #BFDBFE', background:'#EFF6FF', color:'#2563EB', fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
            {t('invoice.title')}
          </button>
        )}
        {onEdit && <IconButton onClick={() => onEdit(proj)} title="Edit project">✏️</IconButton>}
      </div>

      {showInvoice && (
        <InvoiceModal proj={proj} tasks={tasks} onClose={() => setShowInvoice(false)} />
      )}

      {/* ── Quick metrics ── */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
        <span style={{ fontSize:11, padding:'3px 9px', background:'var(--surface-2)', color:'var(--text-2)', borderRadius:6 }}>
          📋 {projTasks.length} {t('detail.tasks')}
        </span>
        {pendingCount > 0 && (
          <span style={{ fontSize:11, padding:'3px 9px', background:'var(--amber-bg)', color:'var(--amber)', borderRadius:6, border:'1px solid #F0D897' }}>
            🕐 {pendingCount}
          </span>
        )}
        {overdueCount > 0 && (
          <span style={{ fontSize:11, padding:'3px 9px', background:'var(--danger-bg)', color:'var(--danger)', borderRadius:6, border:'1px solid var(--danger-border)' }}>
            ⚠️ {overdueCount}
          </span>
        )}
      </div>

      {/* ── Progress strip ── */}
      <div style={{ height:4, background:'var(--border, #EAE3D8)', borderRadius:4, overflow:'hidden', marginBottom:0 }}>
        <div style={{ height:4, borderRadius:4, background:'#C96B3A', width:`${pct}%`, transition:'width .4s' }} />
      </div>

      {/* ── Inner tab bar ── */}
      <div className="inner-tab-bar">
        {TABS.map(tb => (
          <button key={tb.id} className={`inner-tab-btn ${tab===tb.id?'active':''}`} onClick={() => setTab(tb.id)}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === 'tasks'   && <ProjectTasksTab proj={proj} canDelete={canDelete} canEdit={canEdit} tools={tools} team={team} />}
      {tab === 'finance' && (
        <div>
          <MaterialsTab proj={proj} canEdit={canEdit} />
          <div style={{ borderTop:'1px solid var(--border)', margin:'16px 0 10px', paddingTop:12, fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>
            {t('expenses.tab')}
          </div>
          <ExpensesTab proj={proj} canEdit={canEdit} />
        </div>
      )}
      {tab === 'files'   && (
        <div>
          <PhotosTab proj={proj} />
          <div style={{ borderTop:'1px solid var(--border)', margin:'16px 0 10px', paddingTop:12, fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>
            {t('detail.docs')}
          </div>
          <DocumentsTab proj={proj} />
        </div>
      )}
      {tab === 'team'    && <ProjectTeamTab proj={proj} />}
    </div>
  )
}
