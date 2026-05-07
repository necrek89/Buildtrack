import { create } from 'zustand'
import { supabase } from '../lib/supabase'

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
  joinRequests: [],
  materials: loadMaterials(),
  loading: false,
  selectedProjectId: null,
  setSelectedProject: (id) => set({ selectedProjectId: id }),

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
    const { data } = await supabase.from('projects').select('*')
    set({ projects: data || [] })
  },

  updateProject: async (id, updates) => {
    const { error } = await supabase.from('projects').update(updates).eq('id', id)
    if (!error) set(s => ({ projects: s.projects.map(p => p.id === id ? { ...p, ...updates } : p) }))
    return { error }
  },

  // ── TASKS ─────────────────────────────────────────────────
  fetchTasks: async (projectId) => {
    let query = supabase.from('tasks').select(`
      id, text, description, status, priority, stage, deadline,
      photo_url, reject_comment, worker_id, project_id,
      worker:profiles(id, name)
    `)
    if (projectId) query = query.eq('project_id', projectId)
    const { data } = await query.order('created_at', { ascending: false })
    set({ tasks: data || [] })
  },

  addTask: async (task) => {
    const { data, error } = await supabase.from('tasks').insert(task).select().single()
    if (!error) set(s => ({ tasks: [data, ...s.tasks] }))
    return { error }
  },

  updateTask: async (id, updates) => {
    const { error } = await supabase.from('tasks').update(updates).eq('id', id)
    if (!error) set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t) }))
    return { error }
  },

  deleteTask: async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
  },

  submitTask: async (id) => get().updateTask(id, { status: 'pending' }),
  approveTask: async (id) => get().updateTask(id, { status: 'approved' }),
  rejectTask:  async (id, comment) => get().updateTask(id, { status: 'rejected', reject_comment: comment }),

  // ── TOOLS ─────────────────────────────────────────────────
  fetchTools: async (projectId) => {
    const { profile } = get()
    let query = supabase.from('tools').select('*')
    if (projectId) query = query.eq('project_id', projectId)
    else if (profile?.role === 'foreman') query = query.eq('foreman_id', profile.id)
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
    if (!error) set(s => ({ tools: [data, ...s.tools] }))
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
    const { projects } = get()
    if (!projects.length) return []
    const { data } = await supabase
      .from('project_workers')
      .select('worker:profiles(id, name, role, worker_status), project_id')
      .in('project_id', projects.map(p => p.id))
    // Deduplicate workers, collect project_ids per worker
    const map = {}
    for (const row of data || []) {
      const w = row.worker
      if (!w) continue
      if (!map[w.id]) map[w.id] = { ...w, project_ids: [] }
      map[w.id].project_ids.push(row.project_id)
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
    const { projects } = get()
    // Добавляем рабочего во все проекты прораба
    const inserts = projects.map(p => ({ project_id: p.id, worker_id: workerId }))
    await supabase.from('project_workers').insert(inserts)
    // Обновляем статус заявки
    await supabase.from('join_requests').update({ status: 'approved' }).eq('id', requestId)
    set(s => ({ joinRequests: s.joinRequests.filter(r => r.id !== requestId) }))
  },

  // Прораб отклоняет заявку
  rejectJoinRequest: async (requestId) => {
    await supabase.from('join_requests').update({ status: 'rejected' }).eq('id', requestId)
    set(s => ({ joinRequests: s.joinRequests.filter(r => r.id !== requestId) }))
  },

  // ── MATERIALS ────────────────────────────────────────────
  addMaterial: (material) => {
    const { materials, notifications } = get()
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
    // Push notification so foreman sees it
    set(s => ({
      notifications: [{
        id: Date.now(),
        text: `${material.reportedBy} needs ${material.qty} ${material.unit} — ${material.name}`,
        read: false,
        created_at: new Date().toISOString(),
        type: 'material_shortage',
      }, ...s.notifications]
    }))
  },

  markMaterialPurchased: (id) => set(s => {
    const next = s.materials.map(m =>
      m.id === id ? { ...m, status: 'purchased', purchasedAt: new Date().toISOString() } : m
    )
    saveMaterials(next)
    return { materials: next }
  }),

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