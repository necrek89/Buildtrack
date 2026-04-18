import { useState, useEffect } from 'react'
import { useStore, WORKERS, STAGES, PRIORITY_OPTIONS } from '../store/useStore'
import { Button, FormGroup } from './UI'

export default function TaskModal({ task, onClose }) {
  const { addTask, updateTask } = useStore()
  const isEdit = !!task

  const [form, setForm] = useState({
    text: task?.text || '',
    who: task?.who || 'Мигель',
    stage: task?.stage || 'Электрика',
    priority: task?.priority || 'normal',
  })

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const save = () => {
    if (!form.text.trim()) return
    if (isEdit) updateTask(task.id, form)
    else addTask(form)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{isEdit ? 'Редактировать задачу' : 'Новая задача'}</div>

        <FormGroup label="Описание *">
          <textarea
            className="form-input"
            rows={2}
            placeholder="Что нужно сделать..."
            value={form.text}
            onChange={set('text')}
            autoFocus
          />
        </FormGroup>

        <div className="form-grid-2">
          <FormGroup label="Исполнитель">
            <select className="form-input" value={form.who} onChange={set('who')}>
              {WORKERS.map(w => <option key={w}>{w}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Этап">
            <select className="form-input" value={form.stage} onChange={set('stage')}>
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
          </FormGroup>
        </div>

        <FormGroup label="Приоритет">
          <select className="form-input" value={form.priority} onChange={set('priority')}>
            {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
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
