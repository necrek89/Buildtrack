import { useState, useEffect } from 'react'
import { PencilSimple } from '@phosphor-icons/react'
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
    { id:'tasks',     label: t('detail.tasks')     },
    { id:'materials', label: t('detail.materials') },
    { id:'expenses',  label: t('expenses.tab')     },
    { id:'photos',    label: t('detail.photos')    },
    { id:'docs',      label: t('detail.docs')      },
    { id:'team',      label: t('detail.team')      },
  ]

  useEffect(() => {
    fetchTasks(proj.id)
    fetchTools(proj.id)
    fetchTeam(proj.id)
  }, [proj.id])

  const pct = (() => {
    const pt = tasks.filter(tk => tk.project_id === proj.id)
    return pt.length === 0 ? 0 : Math.round((pt.filter(tk => tk.status==='approved').length / pt.length) * 100)
  })()

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4, paddingTop:4 }}>
        <button onClick={onBack} style={{ background:'#F2EDE4', border:'none', borderRadius:8, padding:'5px 10px', fontSize:12, color:'#7A6E66', cursor:'pointer', flexShrink:0 }}>
          {t('common.back')}
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text-1, #2E2420)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {proj.name}
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowInvoice(true)}
            title={t('invoice.title')}
            style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'5px 10px', borderRadius:8, border:'1.5px solid #BFDBFE',
              background:'#EFF6FF', color:'#2563EB', fontSize:12, fontWeight:600,
              cursor:'pointer', flexShrink:0,
            }}
          >
            {t('invoice.title')}
          </button>
        )}
        {onEdit && <IconButton onClick={() => onEdit(proj)} title="Edit project"><PencilSimple size={13} weight="bold" /></IconButton>}
      </div>

      {showInvoice && (
        <InvoiceModal
          proj={proj}
          tasks={tasks}
          onClose={() => setShowInvoice(false)}
        />
      )}

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
      {tab === 'tasks'     && <ProjectTasksTab proj={proj} canDelete={canDelete} canEdit={canEdit} tools={tools} team={team} />}
      {tab === 'materials' && <MaterialsTab proj={proj} canEdit={canEdit} />}
      {tab === 'expenses'  && <ExpensesTab proj={proj} canEdit={canEdit} />}
      {tab === 'photos'    && <PhotosTab proj={proj} />}
      {tab === 'docs'      && <DocumentsTab proj={proj} />}
      {tab === 'team'      && <ProjectTeamTab proj={proj} />}
    </div>
  )
}
