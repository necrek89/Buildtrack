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
        {[{l:'Rebar',bg:'#FAECE4',c:'#A04B22'},{l:'Pouring',bg:'#E8F2EB',c:'#3D7A52'},{l:'Done',bg:'#FBF3DC',c:'#9A6E10'}].map(p=>(
          <div className="photo-cell" key={p.l} style={{ background:p.bg, color:p.c }}>{p.l}</div>
        ))}
      </div>
      <SectionTitle>Electrical — in progress</SectionTitle>
      <div className="photo-grid">
        <div className="photo-cell" style={{ background:'var(--accent-light,#FAECE4)', color:'#A04B22' }}>Marking</div>
        <div className="photo-cell" style={{ color:'#B8AFA6' }}>pending</div>
        <div className="photo-cell" style={{ color:'#B8AFA6' }}>pending</div>
      </div>
    </div>
  )
}
