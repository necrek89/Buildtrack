import { useEffect, useState } from 'react'
import { Plus, X } from '@phosphor-icons/react'
import { Badge, Button, EmptyState, IconButton } from '../../components/UI'
import ConfirmModal from '../../components/ConfirmModal'
import { useT } from '../../i18n/useLanguage'
import { useStore } from '../../store/useStore'

// ─── PROJECT TEAM TAB ────────────────────────────────────────────────────────
export default function ProjectTeamTab({ proj, canDelete = false, tasks = [] }) {
  const { t } = useT()
  const { team, roster, fetchTeam, fetchRoster, removeWorkerFromProject, addWorkerToProject, addWorkerToTeam } = useStore()
  const [removing, setRemoving] = useState(null) // member being confirmed for removal
  const [showAdd, setShowAdd]   = useState(false)
  const [email, setEmail]       = useState('')
  const [adding, setAdding]     = useState(false)
  const [addMsg, setAddMsg]     = useState('')

  useEffect(() => {
    fetchTeam(proj.id)
    if (canDelete) fetchRoster()
  }, [proj.id])

  const openTaskCount = (workerId) =>
    tasks.filter(tk => tk.worker_id === workerId && tk.status !== 'approved').length

  const confirmRemove = async () => {
    await removeWorkerFromProject(proj.id, removing.id)
    setRemoving(null)
  }

  const candidates = roster.filter(w => w.role === 'worker' && !team.some(m => m.id === w.id))

  const addExisting = async (workerId) => {
    await addWorkerToProject(workerId, proj.id)
    fetchTeam(proj.id)
    fetchRoster()
  }

  const addNew = async () => {
    if (!email.trim()) return
    setAdding(true); setAddMsg('')
    const { error, id, name } = await addWorkerToTeam(email.trim())
    if (error) { setAddMsg(error); setAdding(false); return }
    await addWorkerToProject(id, proj.id)
    setAddMsg(`${name} added!`)
    setEmail('')
    fetchTeam(proj.id)
    fetchRoster()
    setAdding(false)
  }

  return (
    <div style={{ paddingBottom:24 }}>
      {canDelete && (
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
          <Button variant="primary" size="sm" onClick={() => { setShowAdd(!showAdd); setAddMsg('') }}>
            {showAdd ? t('common.close') : t('team.addToProjectBtn')}
          </Button>
        </div>
      )}

      {canDelete && showAdd && (
        <div className="card card-body" style={{ marginBottom:12 }}>
          {candidates.length > 0 ? (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>
                {t('team.fromCrewLabel')}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {candidates.map(w => (
                  <div key={w.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, background:'var(--bg-subtle)' }}>
                    <div className="member-avatar" style={{ width:28, height:28, fontSize:11 }}>{w.name?.charAt(0)?.toUpperCase()}</div>
                    <div style={{ flex:1, fontSize:13, fontWeight:500 }}>{w.name}</div>
                    <IconButton title={t('team.addToProjectBtn')} onClick={() => addExisting(w.id)}>
                      <Plus size={13} weight="bold" />
                    </IconButton>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:14 }}>{t('team.noCandidates')}</div>
          )}

          <div style={{ borderTop: candidates.length > 0 ? '1px solid var(--border-medium)' : 'none', paddingTop: candidates.length > 0 ? 14 : 0 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>
              {t('team.orInviteNew')}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input className="form-input" placeholder={t('team.emailPlaceholder')}
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNew()} style={{ flex:1 }} />
              <Button variant="primary" size="sm" onClick={addNew} disabled={adding}>{adding ? '...' : t('common.add')}</Button>
            </div>
            {addMsg && (
              <div style={{ marginTop:8, fontSize:12, padding:'6px 10px', borderRadius:6, background: addMsg.includes('!') ? 'var(--success-bg)' : 'var(--danger-bg)', color: addMsg.includes('!') ? 'var(--success)' : 'var(--danger)' }}>
                {addMsg}
              </div>
            )}
          </div>
        </div>
      )}

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
