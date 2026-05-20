import { useEffect } from 'react'
import { Badge, EmptyState } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'
import { useStore } from '../../store/useStore'

// ─── PROJECT TEAM TAB ────────────────────────────────────────────────────────
export default function ProjectTeamTab({ proj }) {
  const { t } = useT()
  const { team, fetchTeam } = useStore()
  useEffect(() => { fetchTeam(proj.id) }, [proj.id])
  return (
    <div style={{ paddingBottom:24 }}>
      <div className="card" style={{ padding:0 }}>
        {team.length === 0 && <EmptyState>{t('detail.noTeam')}</EmptyState>}
        {team.map(m => (
          <div className="member-row" key={m.id}>
            <div className="member-avatar">{m.name?.charAt(0)?.toUpperCase()}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500 }}>{m.name}</div>
              <div style={{ fontSize:11, color:'#B8AFA6' }}>{m.role}</div>
            </div>
            <Badge variant="green">{t('detail.active')}</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
