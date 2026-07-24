import { SectionTitle } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'

// ─── CLIENT PHOTOS ────────────────────────────────────────────────────────────
export default function ClientPhotos() {
  const { t } = useT()
  return (
    <div>
      <div className="page-header"><h1 className="page-title">{t('client.photosTitle')}</h1></div>
      <SectionTitle>Foundation — completed</SectionTitle>
      <div className="photo-grid">
        {[{l:'Rebar',bg:'var(--accent-light)',c:'#A04B22'},{l:'Pouring',bg:'var(--success-bg)',c:'var(--success)'},{l:'Done',bg:'#FBF3DC',c:'#9A6E10'}].map(p=>(
          <div className="photo-cell" key={p.l} style={{ background:p.bg, color:p.c }}>{p.l}</div>
        ))}
      </div>
      <SectionTitle>Electrical — in progress</SectionTitle>
      <div className="photo-grid">
        <div className="photo-cell" style={{ background:'var(--accent-light,var(--accent-light))', color:'#A04B22' }}>Marking</div>
        <div className="photo-cell" style={{ color:'var(--text-muted)' }}>pending</div>
        <div className="photo-cell" style={{ color:'var(--text-muted)' }}>pending</div>
      </div>
    </div>
  )
}
