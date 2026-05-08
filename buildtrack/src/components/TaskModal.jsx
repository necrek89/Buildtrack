import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { Button, FormGroup } from './UI'
import { supabase } from '../lib/supabase'
import DatePicker from './DatePicker'

const STAGES = ['Foundation', 'Electrical', 'Walls', 'Roofing', 'Finishing']
const PRIORITY_OPTIONS = [
  { value: 'high',   label: 'High'   },
  { value: 'normal', label: 'Normal' },
  { value: 'low',    label: 'Low'    },
]

export default function TaskModal({ task, onClose, defaultProjectId }) {
  const { addTask, updateTask, projects, fetchProjects, fetchWorkers, profile } = useStore()
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
    stage:       task?.stage       || 'Electrical',
    priority:    task?.priority    || 'normal',
    deadline:    task?.deadline    || '',
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
      setForm(f => ({ ...f, project_id: val, worker_id: '' }))
    }
  }

  const uploadMedia = async (files) => {
    if (!files?.length) return
    setUploading(true)
    const newUrls = []
    for (const file of Array.from(files)) {
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

  const save = async () => {
    if (!form.text.trim()) return
    const payload = {
      ...form,
      worker_id: form.worker_id || null,
      photo_url: mediaUrls.join(',') || null,
    }
    if (isEdit) {
      await updateTask(task.id, payload)
    } else {
      await addTask({ ...payload, status: 'new' })
    }
    onClose()
  }

  const isVideo = (url) => /\.(mp4|mov|webm|avi|mkv)$/i.test(url)

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxHeight:'90dvh', display:'flex', flexDirection:'column' }}>
        <div className="modal-title">{isEdit ? 'Edit Task' : 'New Task'}</div>

        <div style={{ overflowY:'auto', flex:1, paddingRight:2 }}>

          <FormGroup label="Project *">
            <select className="form-input" value={form.project_id} onChange={set('project_id')}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormGroup>

          <FormGroup label="Task title *">
            <input
              className="form-input"
              placeholder="e.g. Clean 3 rooms on 2nd floor"
              value={form.text}
              onChange={set('text')}
              autoFocus
            />
          </FormGroup>

          <FormGroup label="Details">
            <textarea
              className="form-input"
              rows={4}
              placeholder="Detailed description — what exactly needs to be done, notes, requirements..."
              value={form.description}
              onChange={set('description')}
              style={{ resize:'vertical', minHeight:80 }}
            />
          </FormGroup>

          <div className="form-grid-2">
            <FormGroup label="Assignee">
              <select className="form-input" value={form.worker_id} onChange={set('worker_id')}>
                <option value="">Unassigned</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Stage">
              <select className="form-input" value={form.stage} onChange={set('stage')}>
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormGroup>
          </div>

          <div className="form-grid-2">
            <FormGroup label="Priority">
              <select className="form-input" value={form.priority} onChange={set('priority')}>
                {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Deadline">
              <DatePicker value={form.deadline} onChange={v => setForm(f => ({ ...f, deadline: v }))} />
            </FormGroup>
          </div>

          {/* ── Media attachments ── */}
          <FormGroup label="Photos / Videos">
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
              {uploading ? '⏳ Uploading...' : '📎 Attach photo or video'}
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

        <div className="modal-actions" style={{ paddingTop:12, borderTop:'1px solid #EAE3D8', marginTop:4 }}>
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save}>
            {isEdit ? 'Save' : 'Add Task'}
          </Button>
        </div>
      </div>
    </div>
  )
}
