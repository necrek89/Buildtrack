import { useState } from 'react'
import { X, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { EmptyState } from '../../components/UI'
import { useStore } from '../../store/useStore'

// ─── MEDIA LIGHTBOX (local copy for PhotosTab) ────────────────────────────────
function MediaLightbox({ urls, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex)
  const isVideo = (u) => /\.(mp4|mov|webm|avi|mkv)$/i.test(u)
  const url = urls[idx]

  // inline effect via useEffect
  // Note: MediaLightbox already uses useState from react. We need useEffect here too.
  // Since we import useState at the top we need to import useEffect too.
  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}
    >
      <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:36, height:36, color:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={18} weight="bold" /></button>
      {urls.length > 1 && (
        <div style={{ position:'absolute', top:20, left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,0.6)', fontSize:13 }}>{idx + 1} / {urls.length}</div>
      )}
      <div onClick={e => e.stopPropagation()} style={{ maxWidth:'94vw', maxHeight:'80dvh', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {isVideo(url) ? (
          <video key={url} src={url} controls autoPlay style={{ maxWidth:'94vw', maxHeight:'80dvh', borderRadius:10 }} />
        ) : (
          <img key={url} src={url} alt="" style={{ maxWidth:'94vw', maxHeight:'80dvh', borderRadius:10, objectFit:'contain' }} />
        )}
      </div>
      {urls.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setIdx(i => Math.max(i - 1, 0)) }} disabled={idx === 0}
            style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:40, height:40, color:'#fff', fontSize:20, cursor:'pointer', opacity: idx === 0 ? 0.3 : 1, display:'flex', alignItems:'center', justifyContent:'center' }}><CaretLeft size={20} weight="bold" /></button>
          <button onClick={e => { e.stopPropagation(); setIdx(i => Math.min(i + 1, urls.length - 1)) }} disabled={idx === urls.length - 1}
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:40, height:40, color:'#fff', fontSize:20, cursor:'pointer', opacity: idx === urls.length - 1 ? 0.3 : 1, display:'flex', alignItems:'center', justifyContent:'center' }}><CaretRight size={20} weight="bold" /></button>
        </>
      )}
      {urls.length > 1 && (
        <div style={{ position:'absolute', bottom:24, display:'flex', gap:6 }}>
          {urls.map((_, i) => (
            <div key={i} onClick={e => { e.stopPropagation(); setIdx(i) }} style={{ width:7, height:7, borderRadius:'50%', background: i === idx ? '#fff' : 'rgba(255,255,255,0.35)', cursor:'pointer' }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── PHOTOS TAB ──────────────────────────────────────────────────────────────
export default function PhotosTab({ proj }) {
  const { tasks } = useStore()
  const [lightbox, setLightbox] = useState(null)

  const pTasks = tasks.filter(t => t.project_id === proj.id)
  const allUrls = pTasks.flatMap(t => t.photo_url ? t.photo_url.split(',').filter(Boolean) : [])
  const isVideo = (u) => /\.(mp4|mov|webm|avi|mkv)$/i.test(u)

  if (allUrls.length === 0) return (
    <div style={{ paddingBottom:24 }}>
      <EmptyState>No photos or videos yet</EmptyState>
    </div>
  )

  return (
    <div style={{ paddingBottom:24 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6 }}>
        {allUrls.map((url, i) => (
          <div key={i} onClick={() => setLightbox(i)} style={{ aspectRatio:'1', borderRadius:8, overflow:'hidden', cursor:'pointer', background:'#111', border:'1px solid #EAE3D8' }}>
            {isVideo(url)
              ? <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:24 }}>▶</div>
              : <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
            }
          </div>
        ))}
      </div>
      {lightbox !== null && <MediaLightbox urls={allUrls} startIndex={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}
