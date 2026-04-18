import { create } from 'zustand'

const INITIAL_TASKS = [
  { id: 1, text: 'Залить фундамент секции A',        done: true,  who: 'Алексей', stage: 'Фундамент', priority: 'normal' },
  { id: 2, text: 'Установить опалубку секции B',      done: true,  who: 'Алексей', stage: 'Фундамент', priority: 'high'   },
  { id: 3, text: 'Проложить электропроводку 1 этаж', done: false, who: 'Мигель',  stage: 'Электрика', priority: 'high'   },
  { id: 4, text: 'Монтаж щитка распределительного',  done: false, who: 'Мигель',  stage: 'Электрика', priority: 'normal' },
  { id: 5, text: 'Кладка стен восточный фасад',       done: false, who: 'Карим',   stage: 'Стены',     priority: 'low'    },
  { id: 6, text: 'Гидроизоляция цоколя',             done: true,  who: 'Алексей', stage: 'Фундамент', priority: 'normal' },
  { id: 7, text: 'Разметка под розетки 2 этаж',      done: false, who: 'Мигель',  stage: 'Электрика', priority: 'low'    },
]

const INITIAL_TOOLS = [
  { id: 1, name: 'Перфоратор Bosch',    loc: 'Объект А-1',  status: 'active' },
  { id: 2, name: 'Болгарка DeWalt',     loc: 'Объект А-1',  status: 'active' },
  { id: 3, name: 'Уровень лазерный',    loc: 'Склад',        status: 'stored' },
  { id: 4, name: 'Дрель Makita',        loc: 'Объект Б',     status: 'active' },
  { id: 5, name: 'Шуруповёрт Hitachi',  loc: 'Не найден',    status: 'lost'   },
]

const INITIAL_PROJECTS = [
  { id: 1, name: 'ЖК "Северный" кв.14',   progress: 62, stage: 'Электрика',        client: 'Марк Иванов'  },
  { id: 2, name: 'Офис на Ленина 22',      progress: 35, stage: 'Стены',            client: 'ООО СтройПром' },
  { id: 3, name: 'Дача Петровых',          progress: 88, stage: 'Финишная отделка', client: 'Петров А.В.'  },
]

const INITIAL_TEAM = [
  { id: 1, name: 'Мигель Р.',  role: 'Электрик',   initials: 'МГ', tasks: 3 },
  { id: 2, name: 'Алексей С.', role: 'Бетонщик',   initials: 'АС', tasks: 0 },
  { id: 3, name: 'Карим Б.',   role: 'Каменщик',   initials: 'КБ', tasks: 1 },
]

let nextId = 100

export const useStore = create((set, get) => ({
  role: 'foreman',
  tasks: INITIAL_TASKS,
  tools: INITIAL_TOOLS,
  projects: INITIAL_PROJECTS,
  team: INITIAL_TEAM,

  setRole: (role) => set({ role }),

  // Tasks CRUD
  addTask: (task) => set((s) => ({
    tasks: [...s.tasks, { ...task, id: nextId++, done: false }]
  })),
  updateTask: (id, updates) => set((s) => ({
    tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  deleteTask: (id) => set((s) => ({
    tasks: s.tasks.filter(t => t.id !== id)
  })),
  toggleTask: (id) => set((s) => ({
    tasks: s.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)
  })),

  // Tools CRUD
  addTool: (tool) => set((s) => ({
    tools: [...s.tools, { ...tool, id: nextId++ }]
  })),
  deleteTool: (id) => set((s) => ({
    tools: s.tools.filter(t => t.id !== id)
  })),

  // Selectors
  getMyTasks: () => get().tasks.filter(t => t.who === 'Мигель'),
}))

export const WORKERS  = ['Мигель', 'Алексей', 'Карим', 'Иван']
export const STAGES   = ['Фундамент', 'Электрика', 'Стены', 'Кровля', 'Отделка']
export const PRIORITY_OPTIONS = [
  { value: 'high',   label: 'Высокий' },
  { value: 'normal', label: 'Обычный' },
  { value: 'low',    label: 'Низкий'  },
]
export const PRIORITY_BADGE = { high: 'badge-red', normal: 'badge-blue', low: 'badge-gray' }
export const PRIORITY_LABEL = { high: 'Высокий', normal: 'Обычный', low: 'Низкий' }
export const TOOL_STATUS_LABEL = { active: 'На объекте', stored: 'На складе', lost: 'Не найден' }
export const TOOL_STATUS_BADGE = { active: 'badge-blue', stored: 'badge-green', lost: 'badge-red' }
