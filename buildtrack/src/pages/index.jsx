export function Dashboard() {
  const { tasks, tools, projects, fetchProjects, fetchTasks, fetchTools, profile } = useStore()
  const [showAdd, setShowAdd]         = useState(false)
  const [confirmId, setConfirmId]     = useState(null)
  const [form, setForm]               = useState({ name: '', stage: 'Foundation', deadline: '' })

  useEffect(() => {
    fetchProjects(); fetchTasks(); fetchTools()
  }, [])

  const createProject = async () => {
    if (!form.name.trim()) return
    const { error } = await supabase.from('projects').insert({
      name: form.name, stage: form.stage,
      deadline: form.deadline || null,
      foreman_id: profile.id, progress: 0
    })
    if (!error) { fetchProjects(); setShowAdd(false); setForm({ name: '', stage: 'Foundation', deadline: '' }) }
  }

  const deleteProject = async (id) => {
    await supabase.from('tasks').delete().eq('project_id', id)
    await supabase.from('tools').delete().eq('project_id', id)
    await supabase.from('project_workers').delete().eq('project_id', id)
    await supabase.from('projects').delete().eq('id', id)
    fetchProjects(); fetchTasks(); fetchTools()
    setConfirmId(null)
  }

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const projectToDelete = projects.find(p => p.id === confirmId)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>+ Project</Button>
      </div>
      <div className="stat-grid">
        <StatCard label="Projects"      value={projects.length} />
        <StatCard label="Active tasks"  value={tasks.filter(t => t.status !== 'approved').length} />
        <StatCard label="Tools"         value={tools.length} />
        <StatCard label="Pending"       value={tasks.filter(t => t.status === 'pending').length} />
      </div>
      <SectionTitle>Projects</SectionTitle>
      {projects.length === 0 && <EmptyState>No projects yet — create the first one!</EmptyState>}
      {projects.map(p => (
        <div className="card card-body" key={p.id}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
            <strong style={{ fontSize:14 }}>{p.name}</strong>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <Badge variant="blue">{p.stage}</Badge>
              <IconButton
                className="danger"
                title="Delete project"
                onClick={() => setConfirmId(p.id)}
              >🗑</IconButton>
            </div>
          </div>
          {p.deadline && (
            <div style={{ fontSize:12, color:'#B8AFA6', marginBottom:4 }}>Deadline: {p.deadline}</div>
          )}
          <ProgressBar value={p.progress || 0} />
        </div>
      ))}

      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">New Project</div>
            <FormGroup label="Project name *">
              <input className="form-input" placeholder='e.g. Apartment Block A'
                value={form.name} onChange={set('name')} autoFocus />
            </FormGroup>
            <div className="form-grid-2">
              <FormGroup label="Current stage">
                <select className="form-input" value={form.stage} onChange={set('stage')}>
                  {STAGE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="Deadline">
                <input className="form-input" type="date"
                  value={form.deadline} onChange={set('deadline')} />
              </FormGroup>
            </div>
            <div className="modal-actions">
              <Button size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={createProject}>Create</Button>
            </div>
          </div>
        </div>
      )}

      {confirmId && (
        <ConfirmModal
          icon="🗑️"
          title="Delete project?"
          sub={`"${projectToDelete?.name}" and all its tasks and tools will be permanently deleted.`}
          onConfirm={() => deleteProject(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
