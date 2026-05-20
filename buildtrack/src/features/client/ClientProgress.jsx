import { useEffect } from 'react'
import { EmptyState } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'
import { useStore } from '../../store/useStore'

// ─── CLIENT PROGRESS ─────────────────────────────────────────────────────────
export default function ClientProgress() {
  const { t } = useT()
  const { fetchProjects } = useStore()
  useEffect(() => { fetchProjects() }, [])
  return (
    <div>
      <div className="page-header"><h1 className="page-title">{t('client.progressTitle')}</h1></div>
      <EmptyState>{t('client.progressSoon')}</EmptyState>
    </div>
  )
}
