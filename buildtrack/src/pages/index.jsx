export function Projects() {
  const { projects, tasks, fetchProjects, fetchTasks } = useStore()
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => { fetchProjects().then(() => fetchTasks()) }, [])

  const proj = projects.find(p => p.id === selectedId) || projects[0]
  if (!proj) return (
    <div>
      <div className="page-header"><h1 className="page-title">Projects</h1></div>
      <EmptyState>No projects — create one on the Dashboard</EmptyState>
    </div>
  )

  const projectTasks = tasks.filter(t => t.project_id === proj.id)

  const STAGE_LIST = [
    'Foundation',
    'Electrical',
    'Walls',
    'Roofing',
    'Finishing',
  ]

  const stages = STAGE_LIST.map((name, i) => {
    const stageTasks = projectTasks.filter(t => t.stage === name)
    const done = stageTasks.filter(t => t.status === 'approved').length
    const total = stageTasks.length
    const pct = total === 0 ? 0 : Math.round((done / total) * 100)

    // определяем класс для иконки
    let cls = ''
    if (pct === 100) cls = 'done'
    else if (pct > 0) cls = 'current'

    return { n: i + 1, name, pct, cls, done, total }
  })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <Badge variant="blue">{proj.stage}</Badge>
      </div>
      {projects.length > 1 && (
        <div className="filter-bar" style={{ marginBottom:16 }}>
          {projects.map(p => (
            <button key={p.id} className={`filter-btn ${proj.id===p.id?'active':''}`}
              onClick={() => setSelectedId(p.id)}>{p.name}</button>
          ))}
        </div>
      )}
      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        <StatCard label="Progress"     value={`${proj.progress||0}%`} />
        <StatCard label="Deadline"     value={proj.deadline||'Not set'} />
        <StatCard label="Active tasks" value={projectTasks.filter(t=>t.status!=='approved').length} />
      </div>
      <SectionTitle>Stages</SectionTitle>
      <div className="card" style={{ padding:0 }}>
        {stages.map(s => (
          <div className="stage-row" key={s.n}>
            <div className={`stage-num ${s.cls}`}>{s.pct===100?'✓':s.n}</div>
            <div style={{ flex:1, fontSize:13, fontWeight:500 }}>{s.name}</div>
            <div style={{ flex:1, margin:'0 12px' }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width:`${s.pct}%` }} />
              </div>
            </div>
            <div style={{ fontSize:11, color:'#B8AFA6', minWidth:60, textAlign:'right' }}>
              {s.total === 0
                ? <span style={{ color:'#D4C8BE' }}>no tasks</span>
                : `${s.done}/${s.total}`
              }
            </div>
          </div>
        ))}
      </div>
      <SectionTitle>Stage Photos</SectionTitle>
      <div className="photo-grid">
        {[{l:'Rebar',bg:'#FAECE4',c:'#A04B22'},{l:'Pouring',bg:'#E8F2EB',c:'#3D7A52'},{l:'Done',bg:'#FBF3DC',c:'#9A6E10'},{l:'Photo 4',bg:'#FAECE4',c:'#A04B22'}].map(ph=>(
          <div className="photo-cell" key={ph.l} style={{ background:ph.bg, color:ph.c }}>{ph.l}</div>
        ))}
        <div className="photo-cell" style={{ border:'1px dashed #D4C8BE', color:'#B8AFA6' }}>+ photo</div>
      </div>
    </div>
  )
}
