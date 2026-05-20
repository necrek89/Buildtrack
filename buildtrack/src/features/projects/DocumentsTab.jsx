import { useState, useEffect, useRef } from 'react'
import { EmptyState } from '../../components/UI'
import { useT } from '../../i18n/useLanguage'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

const FILE_ICONS = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
  ppt: '📊', pptx: '📊', dwg: '📐', dxf: '📐',
  zip: '🗜', rar: '🗜', '7z': '🗜',
  jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', webp: '🖼',
  mp4: '🎬', mov: '🎬', avi: '🎬',
}
const OFFICE_EXTS = ['doc','docx','xls','xlsx','ppt','pptx']

function getViewUrl(url, ext) {
  if (ext === 'pdf') return url
  if (OFFICE_EXTS.includes(ext))
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`
  return null
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ─── DOCUMENTS TAB ───────────────────────────────────────────────────────────
export default function DocumentsTab({ proj }) {
  const { t } = useT()
  const { documents, fetchDocuments, addDocument, deleteDocument, profile } = useStore()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  useEffect(() => { fetchDocuments(proj.id) }, [proj.id])

  const projDocs = documents.filter(d => d.project_id === proj.id)

  const upload = async (files) => {
    if (!files?.length) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const ext  = file.name.split('.').pop().toLowerCase()
      const path = `docs/${proj.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('task-photos').upload(path, file, { upsert: true })
      if (!upErr) {
        const { data } = supabase.storage.from('task-photos').getPublicUrl(path)
        await addDocument({
          project_id:  proj.id,
          name:        file.name,
          url:         data.publicUrl,
          size:        file.size,
          type:        ext,
          uploaded_by: profile?.id,
        })
      }
    }
    setUploading(false)
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Upload button */}
      <div style={{ marginBottom: 12 }}>
        <input ref={fileRef} type="file" multiple style={{ display:'none' }}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.dwg,.dxf,.zip,.rar,.jpg,.jpeg,.png"
          onChange={e => upload(e.target.files)} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            display:'flex', alignItems:'center', gap:8, padding:'9px 16px',
            borderRadius:10, border:'1.5px dashed #D9D0C7', background:'#FDFBF8',
            cursor: uploading ? 'default' : 'pointer', fontSize:13, color:'#7A6E66',
            width:'100%', justifyContent:'center',
          }}
        >
          {uploading ? `⏳ ${t('detail.docsUploading')}` : `📎 ${t('detail.docsUpload')}`}
        </button>
      </div>

      {/* Document list */}
      {projDocs.length === 0 ? (
        <EmptyState>{t('detail.docsEmpty')}</EmptyState>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {projDocs.map(doc => {
            const ext    = (doc.type || doc.name?.split('.').pop() || '').toLowerCase()
            const icon   = FILE_ICONS[ext] || '📎'
            const viewUrl = getViewUrl(doc.url, ext)
            return (
              <div key={doc.id} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'12px 14px', borderRadius:12,
                border:'1.5px solid var(--border,#EAE3D8)',
                background:'var(--surface,#fff)',
              }}>
                {/* Icon */}
                <div style={{
                  width:40, height:40, borderRadius:10, flexShrink:0,
                  background:'#F2EDE6', display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:20,
                }}>{icon}</div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1,#2E2420)',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {doc.name}
                  </div>
                  <div style={{ fontSize:11, color:'#B8AFA6', marginTop:2, display:'flex', gap:8 }}>
                    {doc.size && <span>{formatBytes(doc.size)}</span>}
                    {doc.type && <span style={{ textTransform:'uppercase' }}>{doc.type}</span>}
                    {doc.created_at && (
                      <span>{new Date(doc.created_at).toLocaleDateString('ru-RU', { day:'numeric', month:'short', year:'2-digit' })}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  {viewUrl && (
                    <a href={viewUrl} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{
                        padding:'5px 10px', borderRadius:8, fontSize:12, fontWeight:600,
                        background:'#C96B3A', color:'#fff',
                        textDecoration:'none', whiteSpace:'nowrap',
                      }}>
                      {t('detail.docsOpen')}
                    </a>
                  )}
                  <a href={doc.url} target="_blank" rel="noreferrer" download={doc.name}
                    onClick={e => e.stopPropagation()}
                    style={{
                      padding:'5px 10px', borderRadius:8, fontSize:12, fontWeight:600,
                      background:'#F2EDE6', color:'#7A6E66',
                      textDecoration:'none', whiteSpace:'nowrap',
                    }}>
                    ↓
                  </a>
                  <button
                    onClick={e => { e.stopPropagation(); if (window.confirm(t('detail.docsDeleteConfirm'))) deleteDocument(doc.id) }}
                    style={{
                      width:30, height:30, borderRadius:8, border:'none',
                      background:'#FEE2E2', color:'#991B1B', fontSize:14,
                      cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                    }}>✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
