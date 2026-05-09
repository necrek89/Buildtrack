import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// ── Theme init ────────────────────────────────────────────────────────────────
const savedTheme = localStorage.getItem('tutuu_theme') || 'light'
// apply immediately on load
if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark')

// ── localStorage helpers for materials ────────────────────────────────────────
const LS_KEY = 'tutuu_materials'
function loadMaterials() {
  try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : [] } catch { return [] }
}
function saveMaterials(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)) } catch {}
}

export const MATERIAL_UNITS = ['pcs', 'm', 'm²', 'm³', 'kg', 'l', 'pack', 'roll']

export const useStore = create((set, get) => ({
  user: null,
  profile: null,
  role: null,
  tasks: [],
  tools: [],
  projects: [],
  team: [],
  notifications: [],
  activityLog: [],
  joinRequests: [],
  materials: loadMaterials(),
  loading: false,
  selectedProjectId: null,
  setSelectedProject: (id) => set({ selectedProjectId: id }),

  // ── THEME ─────────────────────────────────────────────────
  theme: savedTheme,
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('tutuu_theme', next)
    document.documentElement.setAttribute('data-theme', next)
    set({ theme: next })
  },

  // ── AUTH ──────────────────────────────────────────────────
  signIn: async (email, password) => {
    set({ loading: true })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { set({ loading: false }); return { error } }
    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', data.user.id).single()
    set({ user: data.user, profile, role: profile.role, loading: false })
    return { error: null }
  },

  signUp: async (email, password, name, role) => {
    set({ loading: true })
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, role } }
    })
    if (error) { set({ loading: false }); return { error } }
    // Генерируем invite_code для прораба
    if (role === 'foreman' && data.user) {
      const code = Math.random().toString(36).substring(2, 10)
      await supabase.from('profiles').update({ invite_code: code }).eq('id', data.user.id)
    }
    set({ loading: false })
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, role: null, tasks: [], projects: [], tools: [], team: [], joinRequests: [] })
  },

  checkSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single()
    // Если прораб без invite_code — генерируем
    if (profile?.role === 'foreman' && !profile?.invite_code) {
      const code = Math.random().toString(36).substring(2, 10)
      await supabase.from('profiles').update({ invite_code: code }).eq('id', session.user.id)
      profile.invite_code = code
    }
    set({ user: session.user, profile, role: profile?.role })
  },

  fetchProfile: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single()
    set({ profile })
  },

  // ── PROJECTS ──────────────────────────────────────────────
  fetchProjects: async () => {
    const { profile, role } = get()
    let query = supabase.from('projects').select('*')
    if (role === 'foreman') {
      query = query.eq('foreman_id', profile.id)
    } else if (role === 'manager') {
      if (!profile?.linked_foreman_id) { set({ projects: [] }); return }
      query = query.eq('foreman_id', profile.linked_foreman_id)
    } else if (role === 'client') {
      const { data: pw } = await supabase
        .from('project_workers').select('project_id').eq('worker_id', profile.id)
      const ids = (pw || []).map(r => r.project_id)
      if (!ids.length) { set({ projects: [] }); return }
      query = query.in('id', ids)
    }
    const { data } = await query
    set({ projects: data || [] })
  },

  updateProject: async (id, updates) => {
    const { error } = await supabase.from('projects').update(updates).eq('id', id)
    if (!error) set(s => ({ projects: s.projects.map(p => p.id === id ? { ...p, ...updates } : p) }))
    return { error }
  },

  // ── TASKS ─────────────────────────────────────────────────
  fetchTasks: async (projectId) => {
    const { role, projects } = get()
    let query = supabase.from('tasks').select(`
      id, text, description, status, priority, stage, deadline,
      photo_url, reject_comment, worker_id, project_id,
      worker:profiles(id, name)
    `)
    if (projectId) {
      query = query.eq('project_id', projectId)
    } else if (role === 'manager') {
      const ids = projects.map(p => p.id)
      if (!ids.length) { set({ tasks: [] }); return }
      query = query.in('project_id', ids)
    }
    const { data } = await query.order('created_at', { ascending: false })
    set({ tasks: data || [] })
  },

  // Recalculate project progress = approved / total * 100 (auto, no manual slider)
  recalcProgress: async (projectId) => {
    if (!projectId) return
    const all = get().tasks.filter(t => t.project_id === projectId)
    if (!all.length) return
    const approved = all.filter(t => t.status === 'approved').length
    const pct = Math.round((approved / all.length) * 100)
    await get().updateProject(projectId, { progress: pct })
  },

  addTask: async (task) => {
    const { data, error } = await supabase.from('tasks').insert(task).select().single()
    if (!error) {
      set(s => ({ tasks: [data, ...s.tasks] }))
      get().logActivity({ action_type: 'task_created', entity_name: task.text, entity_id: String(data.id), project_id: task.project_id })
      get().recalcProgress(task.project_id)
    }
    return { error }
  },

  updateTask: async (id, updates) => {
    const { error } = await supabase.from('tasks').update(updates).eq('id', id)
    if (!error) set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t) }))
    return { error }
  },

  deleteTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) {
      set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
      if (task?.project_id) get().recalcProgress(task.project_id)
    }
  },

  submitTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    const result = await get().updateTask(id, { status: 'pending' })
    if (!result?.error && task) {
      get().logActivity({ action_type: 'task_submitted', entity_name: task.text, entity_id: String(id), project_id: task.project_id })
      get().recalcProgress(task.project_id)
    }
    return result
  },

  approveTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    const result = await get().updateTask(id, { status: 'approved' })
    if (!result?.error && task) {
      get().logActivity({ action_type: 'task_approved', entity_name: task.text, entity_id: String(id), project_id: task.project_id })
      get().recalcProgress(task.project_id)
    }
    return result
  },

  rejectTask: async (id, comment) => {
    const task = get().tasks.find(t => t.id === id)
    const result = await get().updateTask(id, { status: 'rejected', reject_comment: comment })
    if (!result?.error && task) {
      get().logActivity({ action_type: 'task_rejected', entity_name: task.text, entity_id: String(id), project_id: task.project_id })
      get().recalcProgress(task.project_id)
    }
    return result
  },

  // ── TOOLS ─────────────────────────────────────────────────
  fetchTools: async (projectId) => {
    const { profile, role, projects } = get()
    let query = supabase.from('tools').select('*')
    if (projectId) {
      query = query.eq('project_id', projectId)
    } else if (role === 'foreman') {
      query = query.eq('foreman_id', profile.id)
    } else if (role === 'manager') {
      query = query.eq('foreman_id', profile.linked_foreman_id || '__none__')
    } else if (role === 'worker') {
      // Worker sees only tools from projects they belong to
      const { data: pw } = await supabase.from('project_workers').select('project_id').eq('worker_id', profile.id)
      const ids = (pw || []).map(r => r.project_id)
      if (!ids.length) { set({ tools: [] }); return }
      query = query.in('project_id', ids)
    }
    const { data } = await query
    set({ tools: data || [] })
  },

  addTool: async (tool) => {
    const { profile } = get()
    const payload = { name: tool.name, status: tool.status || 'active', foreman_id: profile?.id }
    if (tool.location)   payload.location   = tool.location
    if (tool.project_id) payload.project_id = tool.project_id
    if (tool.worker_id)  payload.worker_id  = tool.worker_id
    const { data, error } = await supabase.from('tools').insert(payload).select().single()
    if (!error) {
      set(s => ({ tools: [data, ...s.tools] }))
      get().logActivity({ action_type: 'tool_added', entity_name: tool.name, entity_id: String(data.id), project_id: tool.project_id || null })
    }
    return { error }
  },

  updateTool: async (id, updates) => {
    const { data, error } = await supabase.from('tools').update(updates).eq('id', id).select().single()
    if (!error) set(s => ({ tools: s.tools.map(t => t.id === id ? data : t) }))
    return { error }
  },

  deleteTool: async (id) => {
    const { error } = await supabase.from('tools').delete().eq('id', id)
    if (!error) set(s => ({ tools: s.tools.filter(t => t.id !== id) }))
    return { error }
  },

  // ── TEAM ──────────────────────────────────────────────────
  fetchTeam: async (projectId) => {
    const { data } = await supabase
      .from('project_workers')
      .select('worker:profiles(id, name, role, worker_status)')
      .eq('project_id', projectId)
    set({ team: data?.map(d => d.worker) || [] })
  },

  fetchWorkers: async (projectId) => {
    const { data } = await supabase
      .from('project_workers')
      .select('worker:profiles(id, name, role, worker_status)')
      .eq('project_id', projectId)
    const workers = data?.map(d => d.worker) || []
    set({ team: workers })
    return workers
  },

  // Fetch all unique workers across all foreman's projects, with project membership
  fetchAllWorkers: async () => {
    const { profile, projects } = get()
    const map = {}

    // Source 1: via project_workers
    if (projects.length) {
      const { data } = await supabase
        .from('project_workers')
        .select('worker:profiles(id, name, role, worker_status), project_id')
        .in('project_id', projects.map(p => p.id))
      for (const row of data || []) {
        const w = row.worker
        if (!w) continue
        if (!map[w.id]) map[w.id] = { ...w, project_ids: [] }
        map[w.id].project_ids.push(row.project_id)
      }
    }

    // Source 2: via approved join_requests (catches workers added before any project existed)
    if (profile?.role === 'foreman') {
      // Step 1: get worker_ids from approved requests
      const { data: reqData } = await supabase
        .from('join_requests')
        .select('worker_id')
        .eq('foreman_id', profile.id)
        .eq('status', 'approved')
      const workerIds = (reqData || []).map(r => r.worker_id).filter(id => id && !map[id])
      // Step 2: fetch profiles for those workers
      if (workerIds.length) {
        const { data: profData } = await supabase
          .from('profiles')
          .select('id, name, role, worker_status')
          .in('id', workerIds)
        for (const w of profData || []) {
          if (!map[w.id]) map[w.id] = { ...w, project_ids: [] }
        }
      }
    }

    const workers = Object.values(map)
    set({ team: workers })
    return workers
  },

  updateWorkerStatus: async (workerId, status) => {
    await supabase.from('profiles').update({ worker_status: status }).eq('id', workerId)
    set(s => ({ team: s.team.map(m => m.id === workerId ? { ...m, worker_status: status } : m) }))
  },

  // ── JOIN REQUESTS ─────────────────────────────────────────
  // Рабочий отправляет заявку прорабу по invite_code
  sendJoinRequest: async (inviteCode) => {
    const { profile } = get()
    // Найти прораба по коду
    const { data: foreman, error: fErr } = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('invite_code', inviteCode.trim().toLowerCase())
      .single()
    if (fErr || !foreman) return { error: 'Foreman not found. Check the code.' }
    if (foreman.role !== 'foreman') return { error: 'This code does not belong to a foreman.' }
    if (foreman.id === profile.id) return { error: 'You cannot join yourself.' }
    // Создать заявку
    const { error } = await supabase.from('join_requests').insert({
      foreman_id: foreman.id,
      worker_id: profile.id,
    })
    if (error) {
      if (error.code === '23505') return { error: 'Request already sent.' }
      return { error: error.message }
    }
    return { error: null, foremanName: foreman.name }
  },

  // Прораб получает список заявок
  fetchJoinRequests: async () => {
    const { profile } = get()
    const { data } = await supabase
      .from('join_requests')
      .select(`
        id, status, created_at,
        worker:profiles!join_requests_worker_id_fkey(id, name, email, role)
      `)
      .eq('foreman_id', profile.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    set({ joinRequests: data || [] })
  },

  // Прораб одобряет заявку
  approveJoinRequest: async (requestId, workerId) => {
    const { projects, joinRequests, profile } = get()
    const req = joinRequests.find(r => r.id === requestId)
    const workerName = req?.worker?.name || 'Unknown'
    const workerRole = req?.worker?.role

    if (workerRole === 'manager') {
      // Менеджер получает ссылку на прораба, а не добавляется в project_workers
      await supabase.from('profiles').update({ linked_foreman_id: profile.id }).eq('id', workerId)
    } else {
      // Рабочий добавляется во все проекты прораба
      const inserts = projects.map(p => ({ project_id: p.id, worker_id: workerId }))
      await supabase.from('project_workers').insert(inserts)
    }

    await supabase.from('join_requests').update({ status: 'approved' }).eq('id', requestId)
    set(s => ({ joinRequests: s.joinRequests.filter(r => r.id !== requestId) }))
    get().logActivity({ action_type: 'worker_joined', entity_name: workerName, entity_id: workerId })
  },

  // Прораб отклоняет заявку
  rejectJoinRequest: async (requestId) => {
    await supabase.from('join_requests').update({ status: 'rejected' }).eq('id', requestId)
    set(s => ({ joinRequests: s.joinRequests.filter(r => r.id !== requestId) }))
  },

  addClientToProject: async (email, projectId) => {
    const { data: client, error } = await supabase
      .from('profiles').select('id, name, role').eq('email', email.trim().toLowerCase()).single()
    if (error || !client) return { error: 'User not found. Ask them to register first.' }
    if (client.role !== 'client') return { error: 'This user is not registered as a Client.' }
    const { error: e2 } = await supabase
      .from('project_workers').insert({ project_id: projectId, worker_id: client.id })
    if (e2) return { error: e2.code === '23505' ? 'Client already added to this project.' : e2.message }
    return { error: null, name: client.name }
  },

  // ── MATERIALS ────────────────────────────────────────────
  addMaterial: (material) => {
    const { materials } = get()
    const nextId = Math.max(0, ...materials.map(m => m.id)) + 1
    const entry = {
      ...material,
      id: nextId,
      status: 'needed',
      createdAt: new Date().toISOString(),
      purchasedAt: null,
    }
    const next = [...materials, entry]
    saveMaterials(next)
    set({ materials: next })
    get().logActivity({
      action_type: 'material_added',
      entity_name: material.name,
      project_id:  material.projectId || null,
      meta: { qty: material.qty, unit: material.unit },
    })
  },

  markMaterialPurchased: (id) => {
    const material = get().materials.find(m => m.id === id)
    set(s => {
      const next = s.materials.map(m =>
        m.id === id ? { ...m, status: 'purchased', purchasedAt: new Date().toISOString() } : m
      )
      saveMaterials(next)
      return { materials: next }
    })
    if (material) get().logActivity({ action_type: 'material_purchased', entity_name: material.name, project_id: material.projectId || null })
  },

  markMaterialNeeded: (id) => set(s => {
    const next = s.materials.map(m =>
      m.id === id ? { ...m, status: 'needed', purchasedAt: null } : m
    )
    saveMaterials(next)
    return { materials: next }
  }),

  deleteMaterial: (id) => set(s => {
    const next = s.materials.filter(m => m.id !== id)
    saveMaterials(next)
    return { materials: next }
  }),

  getProjectMaterials: (projectId) => get().materials.filter(m => m.projectId === projectId),
  getTaskMaterials:    (taskId)     => get().materials.filter(m => m.taskId    === taskId),
  getOpenShortages:    ()           => get().materials.filter(m => m.status === 'needed'),

  // ── NOTIFICATIONS ─────────────────────────────────────────
  fetchNotifications: async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
    set({ notifications: data || [] })
  },

  markNotifRead: async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) }))
  },

  // ── ACTIVITY LOG ──────────────────────────────────────────
  logActivity: async ({ action_type, entity_name, entity_id, project_id, meta }) => {
    const { profile } = get()
    if (!profile) return
    try {
      await supabase.from('activity_log').insert({
        actor_id:    profile.id,
        actor_name:  profile.name || 'Unknown',
        action_type,
        entity_name: entity_name || null,
        entity_id:   entity_id ? String(entity_id) : null,
        project_id:  project_id || null,
        meta:        meta || null,
      })
    } catch (_) { /* silent — log failures never break the app */ }
  },

  fetchActivityLog: async () => {
    const { profile, role, projects } = get()
    let query = supabase.from('activity_log').select('*, project:projects(name)').order('created_at', { ascending: false }).limit(200)
    if (role === 'worker') {
      // Worker sees only activity from their assigned projects
      const { data: pw } = await supabase.from('project_workers').select('project_id').eq('worker_id', profile.id)
      const ids = (pw || []).map(r => r.project_id)
      if (!ids.length) { set({ activityLog: [] }); return }
      query = query.in('project_id', ids)
    } else if (role === 'manager') {
      // Manager sees activity from the linked foreman's projects
      const ids = projects.map(p => p.id)
      if (!ids.length) { set({ activityLog: [] }); return }
      query = query.in('project_id', ids)
    }
    const { data } = await query
    set({ activityLog: data || [] })
  },

  // ── TASK COMMENTS ─────────────────────────────────────────────────
  fetchComments: async (taskId) => {
    const { data } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    return data || []
  },

  addComment: async (taskId, text) => {
    const { profile, tasks } = get()
    if (!profile) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id:     taskId,
        author_id:   profile.id,
        author_name: profile.name || 'Unknown',
        text:        text.trim(),
      })
      .select()
      .single()
    if (!error) {
      const task = tasks.find(t => t.id === taskId || t.id === Number(taskId))
      get().logActivity({ action_type: 'comment_added', entity_name: task?.text || null, entity_id: String(taskId), project_id: task?.project_id || null })
    }
    return { data, error }
  },
}))

export const STAGES = ['Foundation', 'Electrical', 'Walls', 'Roofing', 'Finishing']
export const PRIORITY_OPTIONS = [
  { value: 'high',   label: 'High'   },
  { value: 'normal', label: 'Normal' },
  { value: 'low',    label: 'Low'    },
]
export const PRIORITY_BADGE = { high: 'red', normal: 'blue', low: 'gray' }
export const PRIORITY_LABEL = { high: 'High', normal: 'Normal', low: 'Low' }
export const TOOL_STATUS_BADGE  = { active: 'blue', stored: 'green', lost: 'red' }
export const TOOL_STATUS_LABEL  = { active: 'On Site', stored: 'In Storage', lost: 'Lost' }
export const STATUS_LABEL = { new: 'New', pending: 'In Review', approved: 'Completed', rejected: 'Revision' }
export const STATUS_BADGE = { new: 'gray', pending: 'amber', approved: 'green', rejected: 'red' }