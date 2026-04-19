import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { Button, FormGroup } from './UI'

const WORKERS_DEFAULT = ['Мигель', 'Алексей', 'Карим', 'Иван']
const STAGES = ['Фундамент', 'Электрика', 'Стены', 'Кровля', 'Отделка']
const PRIORITY_OPTIONS = [
  { value: 'high',   label: 'Высокий' },
  { value: 'normal', label: 'Обычный' },
  { value: 'low',    label: 'Низкий'  },
]

export default function TaskModal({ task, onClose }) {
  const { addTask, updateTask, projects, fetchProjects } = useStore()
  const isEdit = !!task

  const [form, setForm] = useState({
    text:     task?.text     || '',
    stage:    task?.stage    || 'Электрика',
    priority: task?.priority || 'normal',
    deadline: task?.deadline || '',
  })

  useEffect(() => {
    if (projects.length === 0) fetchProjects()
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const save = async () => {
    if (!form.text.trim()) return
    const projectId = useStore.getState().projects[0]?.id
    console.log('Saving task, project_id:', projectId)
    if (isEdit) {
      await updateTask(task.id, form)
    } else {
      const result = await addTask({ 
        ...form, 
        project_id: projectId,
        worker_id: null,
        status: 'new'
      })
      console.log('Add result:', result)
    }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{isEdit ? 'Редактировать задачу' : 'Новая задача'}</div>

        <FormGroup label="Описание *">
          <textarea
            className="form-input" rows={2}
            placeholder="Что нужно сделать..."
            value={form.text} onChange={set('text')} autoFocus
          />
        </FormGroup>

        <div className="form-grid-2">
          <FormGroup label="Этап">
            <select className="form-input" value={form.stage} onChange={set('stage')}>
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Приоритет">
            <select className="form-input" value={form.priority} onChange={set('priority')}>
              {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </FormGroup>
        </div>

        <FormGroup label="Дедлайн">
          <input
            className="form-input" type="date"
            value={form.deadline} onChange={set('deadline')}
          />
        </FormGroup>

        <div className="modal-actions">
          <Button size="sm" onClick={onClose}>Отмена</Button>
          <Button variant="primary" size="sm" onClick={save}>
            {isEdit ? 'Сохранить' : 'Добавить'}
          </Button>
        </div>
      </div>
    </div>
  )
}
