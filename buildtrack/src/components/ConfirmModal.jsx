import { Button } from './UI'

export default function ConfirmModal({ title, subtitle, onConfirm, onClose, confirmLabel = 'Удалить' }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal confirm-modal">
        <div className="confirm-icon">⚠</div>
        <div className="confirm-title">{title}</div>
        {subtitle && <div className="confirm-sub">"{subtitle}"</div>}
        <div className="confirm-actions">
          <Button size="sm" onClick={onClose}>Отмена</Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
