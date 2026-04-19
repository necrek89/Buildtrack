import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useStore = create((set, get) => ({
  user: null,
  profile: null,
  role: null,
  tasks: [],
  tools: [],
  projects: [],
  team: [],
  notifications: [],
  loading: false,

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
    set({ loading: false })
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, role: null, tasks: [], projects: [], tools: [], team: [] })
  },

  checkSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single()
    set({ user: session.user, profile, role: profile?.role })
  },

  // ── PROJECTS ──────────────────────────────────────────────
  fetchProjects: async () => {
    const { data } = await supabase.from('projects').select('*')
    set({ projects: data || [] })
  },

  // ── TASKS ─────────────────────────────────────────────────
  fetchTasks: async (projectId) => {
    let query = supabase.from('tasks').select(`
      *, worker:profiles(id, name)
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

  // Рабочий отправляет на проверку
  submitTask: async (id) => {
    return get().updateTask(id, { status: 'pending' })
  },

  // Прораб подтверждает
  approveTask: async (id) => {
    return get().updateTask(id, { status: 'approved' })
  },

  // Прораб возвращает на доработку
  rejectTask: async (id, comment) => {
    return get().updateTask(id, { status: 'rejected', reject_comment: comment })
  },

  // ── TOOLS ─────────────────────────────────────────────────
  fetchTools: async (projectId) => {
    let query = supabase.from('tools').select('*')
    if (projectId) query = query.eq('project_id', projectId)
    const { data } = await query
    set({ tools: data || [] })
  },

  addTool: async (tool) => {
    const { data, error } = await supabase.from('tools').insert(tool).select().single()
    if (!error) set(s => ({ tools: [data, ...s.tools] }))
    return { error }
  },

  // ── TEAM ──────────────────────────────────────────────────
  fetchTeam: async (projectId) => {
    const { data } = await supabase
      .from('project_workers')
      .select('worker:profiles(id, name, role)')
      .eq('project_id', projectId)
    set({ team: data?.map(d => d.worker) || [] })
  },

  // ── NOTIFICATIONS ─────────────────────────────────────────
  fetchNotifications: async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    set({ notifications: data || [] })
  },

  markNotifRead: async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) }))
  },
}))

export const PRIORITY_BADGE = { high: 'badge-red', normal: 'badge-blue', low: 'badge-gray' }
export const PRIORITY_LABEL = { high: 'Высокий', normal: 'Обычный', low: 'Низкий' }
