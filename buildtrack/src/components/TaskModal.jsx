import { useState, useEffect, useRef } from 'react'
import { useStore, currencySymbol } from '../store/useStore'
import { useT } from '../i18n/useLanguage'
import { Button, FormGroup } from './UI'
import { supabase } from '../lib/supabase'
import DatePicker from './DatePicker'

// No default stages — each project defines its own

const UNIT_OPTIONS = [
  { value: '',      label: '— без единицы' },
  { value: 'шт',    label: 'шт — штука' },
  { value: 'пог.м', label: 'пог.м — погонный метр' },
  { value: 'кв.м',  label: 'кв.м — квадратный метр' },
  { value: 'куб.м', label: 'куб.м — кубический метр' },
  { value: 'м',     label: 'м — метр' },
  { value: 'кг',    label: 'кг — килограмм' },
  { value: 'т',     label: 'т — тонна' },
  { value: 'л',     label: 'л — литр' },
  { value: 'ч',     label: 'ч — час' },
  { value: 'компл', label: 'компл — комплект' },
]

// ── Image compression (canvas) ───────────────────────────────────────────────
async function compressImage(file, maxPx = 1400, quality = 0.82) {
  // Only compress images, pass videos through unchanged
  if (!file.type.startsWith('image/')) return file
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const { naturalWidth: w, naturalHeight: h } = img
      // If already small enough, skip compression
      if (w <= maxPx && h <= maxPx) { resolve(file); return }
      const scale  = maxPx / Math.max(w, h)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        blob => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file) }
    img.src = objectUrl
  })
}

export default function TaskModal({ task, onClose, defaultProjectId }) {
  const { t } = useT()
  const { addTask, updateTask, fetchTasks, projects, fetchProjects, fetchWorkers, profile } = useStore()
  const isEdit = !!task
  const [workers,   setWorkers]   = useState([])
  const [uploading, setUploading] = useState(false)
  const [mediaUrls, setMediaUrls] = useState(
    task?.photo_url ? task.photo_url.split(',').filter(Boolean) : []
  )
  const fileRef = useRef()

  const [form, setForm] = useState({
    text:        task?.text        || '',
    description: task?.description || '',
    project_id:  task?.project_id  || defaultProjectId || projects[0]?.id || '',
    worker_id:   task?.worker_id   || '',
    stage:       task?.stage       || '',
    deadline:    task?.deadline    || '',
    quantity:    task?.quantity    || '',
    unit:        task?.unit        || '',
    cost:        task?.cost        || '',
    currency:    task?.currency    || useStore.getState().profile?.currency || 'USD',
  })

  useEffect(() => {
    const load = async () => {
      let projs = projects
      if (projs.length === 0) {
        await fetchProjects()
        projs = useStore.getState().projects
      }
      if (!form.project_id && projs[0]) {
        setForm(f => ({ ...f, project_id: projs[0].id }))
      }
      const projectId = form.project_id || projs[0]?.id
      if (projectId) {
        const w = await fetchWorkers(projectId)
        setWorkers(w)
      }
    }
    load()
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const set = (field) => async (e) => {
    const val = e.target.value
    setForm(f => ({ ...f, [field]: val }))
    if (field === 'project_id' && val) {
      const w = await fetchWorkers(val)
      setWorkers(w)
      const proj = useStore.getState().projects.find(p => p.id === val)
      const firstStage = Array.isArray(proj?.stages) && proj.stages.length > 0 ? proj.stages[0] : ''
      setForm(f => ({ ...f, project_id: val, worker_id: '', stage: firstStage }))
    }
  }

  const uploadMedia = async (files) => {
    if (!files?.length) return
    setUploading(true)
    const newUrls = []
    for (const rawFile of Array.from(files)) {
      // Compress images before upload
      const file = await compressImage(rawFile)
      const ext  = file.name.split('.').pop()
      const path = `${profile?.id || 'anon'}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('task-photos').upload(path, file, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('task-photos').getPublicUrl(path)
        newUrls.push(data.publicUrl)
      }
    }
    setMediaUrls(prev => [...prev, ...newUrls])
    setUploading(false)
  }

  const removeMedia = (url) => setMediaUrls(prev => prev.filter(u => u !== url))

  const [saveError, setSaveError] = useState(null)
  const [saving,    setSaving]    = useState(false)

  const save = async () => {
    if (!form.text.trim()) return
    setSaving(true)
    setSaveError(null)
    const payload = {
      ...form,
      worker_id: form.worker_id || null,
      deadline:  form.deadline  || null,
      photo_url: mediaUrls.join(',') || null,
      quantity:  form.quantity ? parseFloat(form.quantity) : null,
      unit:      form.unit || null,
      cost:      form.cost ? parseFloat(form.cost) : null,
      currency:  form.currency || '$',
    }
    let error
    if (isEdit) {
      ;({ error } = await updateTask(task.id, payload))
    } else {
      ;({ error } = await addTask({ ...payload, status: 'new' }))
    }
    setSaving(false)
    if (error) {
      setSaveError(error.message || 'Ошибка сохранения')
      return
    }
    // Refresh tasks to get full data with joins (worker name etc.)
    if (form.project_id) await fetchTasks(form.project_id)
    onClose()
  }

  const isVideo = (url) => /\.(mp4|mov|webm|avi|mkv)$/i.test(url)

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxHeight:'90dvh', display:'flex', flexDirection:'column' }}>
        <div className="modal-title">{isEdit ? t('tasks.editTitle') : t('tasks.newTitle')}</div>

        <div style={{ overflowY:'auto', flex:1, paddingRight:2 }}>

          <FormGroup label={`${t('tasks.projectLabel')} *`}>
            <select className="form-input" value={form.project_id} onChange={set('project_id')}>
              <option value="">—</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormGroup>

          <FormGroup label={`${t('tasks.titleLabel')} *`}>
            <input
              className="form-input"
              placeholder={t('tasks.titlePlaceholder')}
              value={form.text}
              onChange={set('text')}
              autoFocus
            />
          </FormGroup>

          <FormGroup label={t('tasks.detailsLabel')}>
            <textarea
              className="form-input"
              rows={4}
              placeholder={t('tasks.detailsPlaceholder')}
              value={form.description}
              onChange={set('description')}
              style={{ resize:'vertical', minHeight:80 }}
            />
          </FormGroup>

          {/* ── Quantity + Unit ── */}
          <div className="form-grid-2">
            <FormGroup label="Объём / кол-во">
              <input
                className="form-input"
                type="number"
                min="0"
                step="any"
                placeholder="Например: 25"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              />
            </FormGroup>
            <FormGroup label="Единица измерения">
              <select className="form-input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </FormGroup>
          </div>

          <div className="form-grid-2">
            <FormGroup label={t('tasks.assigneeLabel')}>
              <select className="form-input" value={form.worker_id} onChange={set('worker_id')}>
                <option value="">{t('tasks.unassigned')}</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </FormGroup>
            <FormGroup label={t('tasks.stageLabel')}>
              {(() => {
                const proj = projects.find(p => p.id === form.project_id)
                const stageList = Array.isArray(proj?.stages) ? proj.stages : []
                return (
                  <select className="form-input" value={form.stage} onChange={set('stage')}>
                    {stageList.length === 0
                      ? <option value="">{t('tasks.noStagesHint')}</option>
                      : <>
                          <option value="">{t('tasks.noStage')}</option>
                          {stageList.map(s => <option key={s} value={s}>{s}</option>)}
                        </>
                    }
                  </select>
                )
              })()}
            </FormGroup>
          </div>

          <FormGroup label="Сумма работы">
            <div style={{ display:'flex', gap:6 }}>
              <input
                className="form-input"
                type="number"
                min="0"
                step="any"
                placeholder="Например: 15000"
                value={form.cost}
                onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                style={{ flex:1, minWidth:0 }}
              />
              <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                {['$','€'].map(cur => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, currency: cur }))}
                    style={{
                      width:42, height:38, borderRadius:8, border:'1.5px solid',
                      borderColor: form.currency === cur ? '#C96B3A' : '#EAE3D8',
                      background:  form.currency === cur ? '#FAECE4' : 'var(--surface,#fff)',
                      color:       form.currency === cur ? '#C96B3A' : '#7A6E66',
                      fontWeight:700, fontSize:16, cursor:'pointer',
                      transition:'all .15s',
                    }}
                  >{cur}</button>
                ))}
              </div>
            </div>
          </FormGroup>

          <FormGroup label={t('tasks.deadlineLabel')}>
            <DatePicker value={form.deadline} onChange={v => setForm(f => ({ ...f, deadline: v }))} />
          </FormGroup>

          {/* ── Media attachments ── */}
          <FormGroup label={t('tasks.mediaLabel')}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              style={{ display:'none' }}
              onChange={e => uploadMedia(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                width:'100%', padding:'10px', borderRadius:10,
                border:'1.5px dashed #D9D0C7', background:'#FDFBF8',
                cursor:'pointer', fontSize:13, color:'#7A6E66',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}
            >
              {uploading ? `⏳ ${t('common.uploading')}` : t('tasks.attachBtn')}
            </button>

            {mediaUrls.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:10 }}>
                {mediaUrls.map((url, i) => (
                  <div key={i} style={{ position:'relative' }}>
                    {isVideo(url) ? (
                      <video
                        src={url}
                        style={{ width:80, height:80, objectFit:'cover', borderRadius:8, border:'1px solid #EAE3D8', background:'#000' }}
                        controls={false}
                        muted
                      />
                    ) : (
                      <img
                        src={url}
                        alt=""
                        style={{ width:80, height:80, objectFit:'cover', borderRadius:8, border:'1px solid #EAE3D8' }}
                      />
                    )}
                    <button
                      onClick={() => removeMedia(url)}
                      style={{
                        position:'absolute', top:-6, right:-6,
                        width:20, height:20, borderRadius:'50%',
                        background:'#A32D2D', color:'#fff',
                        border:'none', fontSize:11, cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        lineHeight:1,
                      }}
                    >✕</button>
                    {isVideo(url) && (
                      <div style={{
                        position:'absolute', inset:0, display:'flex',
                        alignItems:'center', justifyContent:'center',
                        background:'rgba(0,0,0,0.3)', borderRadius:8, pointerEvents:'none',
                      }}>
                        <span style={{ fontSize:22 }}>▶</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </FormGroup>

        </div>

        {saveError && (
          <div style={{ margin:'8px 0 0', padding:'8px 12px', background:'#FEE2E2', color:'#991B1B', borderRadius:8, fontSize:12 }}>
            ⚠️ {saveError}
          </div>
        )}
        <div className="modal-actions" style={{ paddingTop:12, borderTop:'1px solid #EAE3D8', marginTop:4 }}>
          <Button size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" onClick={save} disabled={saving}>
            {saving ? '...' : isEdit ? t('common.save') : t('tasks.addBtn')}
          </Button>
        </div>
      </div>
    </div>
  )
}
