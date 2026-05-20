import { useEffect } from 'react'
import { Badge, ProgressBar, StatCard, SectionTitle, EmptyState } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'
import { useStore } from '../../store/useStore'

// ─── CLIENT DASHBOARD ────────────────────────────────────────────────────────
export default function ClientDashboard() {
  const { t } = useT()
  const { projects, tasks, team, fetchProjects, fetchTasks, fetchTeam } = useStore()
  useEffect(() => {
    fetchProjects().then(() => {
      const { projects } = useStore.getState()
      if (projects[0]) { fetchTasks(projects[0].id); fetchTeam(projects[0].id) }
    })
  }, [])
  const proj = projects[0]
  if (!proj) return <div><div className="page-header"><h1 className="page-title">My Project</h1></div><EmptyState>{t('client.noProject')}</EmptyState></div>
  const approvedTasks = tasks.filter(tk => tk.status==='approved')
  return (
    <div>
      <div className="page-header"><h1 className="page-title">My Project</h1></div>
      <div className="card card-body project-highlight">
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <strong style={{ color:'#A04B22' }}>{proj.name}</strong>
          <Badge variant="blue">{proj.stage}</Badge>
        </div>
        {proj.deadline && <div style={{ fontSize:12, color:'#C96B3A', marginBottom:6 }}>{t('client.deadlineLabel')} {proj.deadline}</div>}
        <ProgressBar value={proj.progress||0} />
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns:'1fr 1fr' }}>
        <StatCard label={t('client.workersOnSite')} value={team.length} />
        <StatCard label={t('client.tasksCompleted')} value={approvedTasks.length} />
      </div>
      <SectionTitle>{t('client.completedWork')}</SectionTitle>
      <div className="card" style={{ padding:0 }}>
        {approvedTasks.length===0 && <EmptyState>{t('client.noCompletedTasks')}</EmptyState>}
        {approvedTasks.map(tk => (
          <div className="task-row" key={tk.id}>
            <div className="task-body">
              <div className="task-text">{tk.text}</div>
              <div className="task-meta" style={{ marginTop:4 }}>
                <Badge variant="green">{t('client.completedBadge')}</Badge>
                {tk.stage && <Badge variant="gray">{tk.stage}</Badge>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
