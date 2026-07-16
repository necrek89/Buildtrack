import { Warning } from '@phosphor-icons/react'
import { Button, Modal } from './UI'
import { useT } from '../i18n/useLanguage'

export default function ConfirmModal({ title, subtitle, sub, onConfirm, onClose, onCancel, confirmLabel }) {
  const { t } = useT()
  const dismiss = onClose || onCancel || (() => {})
  const text = subtitle || sub
  return (
    <Modal onClose={dismiss} className="confirm-modal">
      <div className="confirm-icon"><Warning size={20} weight="bold" /></div>
      <div className="confirm-title">{title}</div>
      {text && <div className="confirm-sub">"{text}"</div>}
      <div className="confirm-actions">
        <Button size="sm" onClick={dismiss}>{t('common.cancel')}</Button>
        <Button variant="danger" size="sm" onClick={onConfirm}>{confirmLabel || t('common.delete')}</Button>
      </div>
    </Modal>
  )
}
