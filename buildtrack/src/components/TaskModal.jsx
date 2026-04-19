import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { Button, FormGroup } from './UI'

const STAGES = ['Фундамент', 'Электрика', 'Стены', 'Кровля', 'Отделка']
const PRIORITY_OPTIONS = [
  { value: 'high',   label: 'Высокий' },
  { value: 'normal', label: 'Обычный' },
  { value: 'low',    label: 'Низкий'  },
]

export default function TaskModal({ task, onClose }) {
  const { addTask, updateTask, projects, fetchProjects, fetchWorkers } = useStore()
  const isEdit = !!task
  const [workers, setWorkers] = useState([])

  const [form, setForm] = useState({
    text:      task?.text      || '',
    worker_id: task?.worker_id || '',
    stage:     task?.stage     || 'Электрика',
    priority:  task?.priority  || 'normal',
    deadline:  task?.deadline  || '',
  })

  useEffect(() => {
    const load = async () => {
      let projs = projects
      if (projs.length === 0) {
        await fetchProjects()
        projs = useStore.getState().projects
      }
      if (projs[0]) {
        const w = await fetchWorkers(projs[0].id)
        setWorkers(w)
      }
    }
    load()
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const save = async () => {
    if (!form.text.trim()) return
    const projectId = useStore.getState().projects[0]?.id
    if (isEdit) {
      await updateTask(task.id, form)
    } else {
      await addTask({
        ...form,
        project_id: projectId,
        worker_id: form.worker_id || null,
        status: 'new'
      })
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
          <FormGroup label="Исполнитель">
            <select className="form-input" value={form.worker_id} onChange={set('worker_id')}>
              <option value="">Не назначен</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </FormGroup>
          <FormGroup label="Этап">
            <select className="form-input" value={form.stage} onChange={set('stage')}>
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
          </FormGroup>
        </div>

        <div className="form-grid-2">
          <FormGroup label="Приоритет">
            <select className="form-input" value={form.priority} onChange={set('priority')}>
              {PRIORITY_OPTIONS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </FormGroup>
          <FormGroup label="Дедлайн">
            <input
              className="form-input" type="date"
              value={form.deadline} onChange={set('deadline')}
            />
          </FormGroup>
        </div>

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
