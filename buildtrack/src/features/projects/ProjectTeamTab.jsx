import { useEffect, useState } from 'react'
import { X } from '@phosphor-icons/react'
import { Badge, EmptyState, IconButton } from '../../components/UI'
import ConfirmModal from '../../components/ConfirmModal'
import { useT } from '../../i18n/useLanguage'
import { useStore } from '../../store/useStore'

// ─── PROJECT TEAM TAB ────────────────────────────────────────────────────────
export default function ProjectTeamTab({ proj, canDelete = false, tasks = [] }) {
  const { t } = useT()
  const { team, fetchTeam, removeWorkerFromProject } = useStore()
  const [removing, setRemoving] = useState(null) // member being confirmed for removal
  useEffect(() => { fetchTeam(proj.id) }, [proj.id])

  const openTaskCount = (workerId) =>
    tasks.filter(tk => tk.worker_id === workerId && tk.status !== 'approved').length

  const confirmRemove = async () => {
    await removeWorkerFromProject(proj.id, removing.id)
    setRemoving(null)
  }

  return (
    <div style={{ paddingBottom:24 }}>
      <div className="card" style={{ padding:0 }}>
        {team.length === 0 && <EmptyState>{t('detail.noTeam')}</EmptyState>}
        {team.map(m => (
          <div className="member-row" key={m.id}>
            <div className="member-avatar">{m.name?.charAt(0)?.toUpperCase()}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500 }}>{m.name}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{m.role}</div>
            </div>
            <Badge variant="green">{t('detail.active')}</Badge>
            {canDelete && (
              <IconButton danger title={t('team.removeFromProject')} onClick={() => setRemoving(m)}>
                <X size={13} weight="bold" />
              </IconButton>
            )}
          </div>
        ))}
      </div>

      {removing && (
        <ConfirmModal
          title={`${t('team.removeFromProject')}?`}
          sub={t('team.removeProjectSub', { name: removing.name })}
          note={
            openTaskCount(removing.id) > 0
              ? t('team.removeProjectWarn', { count: openTaskCount(removing.id) })
              : null
          }
          confirmLabel={t('team.removeFromProject')}
          onConfirm={confirmRemove}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
  )
}
