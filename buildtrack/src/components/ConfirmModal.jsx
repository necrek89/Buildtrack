import { Warning } from '@phosphor-icons/react'
import { Button } from './UI'

export default function ConfirmModal({ title, subtitle, sub, onConfirm, onClose, onCancel, confirmLabel = 'Удалить' }) {
  const dismiss = onClose || onCancel || (() => {})
  const text = subtitle || sub
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && dismiss()}>
      <div className="modal confirm-modal">
        <div className="confirm-icon"><Warning size={20} weight="bold" /></div>
        <div className="confirm-title">{title}</div>
        {text && <div className="confirm-sub">"{text}"</div>}
        <div className="confirm-actions">
          <Button size="sm" onClick={dismiss}>Отмена</Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
