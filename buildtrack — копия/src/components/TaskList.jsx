import { useState } from 'react'
import { useStore, PRIORITY_BADGE, PRIORITY_LABEL } from '../store/useStore'
import { Badge, Checkbox, IconButton, EmptyState } from './UI'
import TaskModal from './TaskModal'
import ConfirmModal from './ConfirmModal'

export default function TaskList({ tasks, canEdit = true }) {
  const { toggleTask, deleteTask } = useStore()
  const [editTask, setEditTask] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  return (
    <>
      <div className="card" style={{ padding: 0 }}>
        {tasks.length === 0 && <EmptyState>Задач нет</EmptyState>}
        {tasks.map(t => (
          <div className="task-row" key={t.id}>
            <Checkbox checked={t.done} onChange={() => toggleTask(t.id)} />
            <div className="task-body">
              <div className={`task-text ${t.done ? 'done' : ''}`}>{t.text}</div>
              <div className="task-meta">
                <Badge variant="gray">{t.stage}</Badge>
                <Badge variant={PRIORITY_BADGE[t.priority].replace('badge-', '')}>{PRIORITY_LABEL[t.priority]}</Badge>
                <span style={{ fontSize: 11, color: '#aaa' }}>{t.who}</span>
              </div>
            </div>
            <div className="task-actions">
              {canEdit && (
                <IconButton onClick={() => setEditTask(t)} title="Редактировать">✎</IconButton>
              )}
              <IconButton danger onClick={() => setDeleteId(t.id)} title="Удалить">✕</IconButton>
            </div>
          </div>
        ))}
      </div>

      {editTask && <TaskModal task={editTask} onClose={() => setEditTask(null)} />}

      {deleteId && (
        <ConfirmModal
          title="Удалить задачу?"
          subtitle={tasks.find(t => t.id === deleteId)?.text}
          onConfirm={() => { deleteTask(deleteId); setDeleteId(null) }}
          onClose={() => setDeleteId(null)}
        />
      )}
    </>
  )
}
