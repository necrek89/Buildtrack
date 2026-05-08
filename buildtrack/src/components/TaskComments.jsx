import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { useT } from '../i18n/useLanguage'

function formatTime(dateStr, lang) {
  if (!dateStr) return ''
  const d   = new Date(dateStr)
  const now = Date.now()
  const diff = (now - d) / 1000
  if (diff < 60)     return lang === 'ru' ? 'только что' : 'just now'
  if (diff < 3600)   return lang === 'ru' ? `${Math.floor(diff / 60)} мин` : `${Math.floor(diff / 60)}m`
  if (diff < 86400)  return lang === 'ru' ? `${Math.floor(diff / 3600)} ч`  : `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return lang === 'ru' ? `${Math.floor(diff / 86400)} д` : `${Math.floor(diff / 86400)}d`
  return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(d)
}

export default function TaskComments({ taskId }) {
  const { t, lang } = useT()
  const { profile, addComment } = useStore()
  const [comments, setComments] = useState([])
  const [text,     setText]     = useState('')
  const [sending,  setSending]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const bottomRef = useRef(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    setComments(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [taskId])

  useEffect(() => {
    if (comments.length) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  const send = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const { data, error } = await addComment(taskId, text.trim())
    if (!error && data) {
      setComments(prev => [...prev, data])
      setText('')
    }
    setSending(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{ marginTop: 14 }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 8, paddingTop: 12,
        borderTop: '1px solid #EAE3D8',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#B8AFA6' }}>
          💬 {t('comments.title')}
        </span>
        {comments.length > 0 && (
          <span style={{ fontSize: 10, background: '#F2EDE4', color: '#7A6E66', borderRadius: 8, padding: '1px 7px', fontWeight: 700 }}>
            {comments.length}
          </span>
        )}
      </div>

      {/* ── Comment list ── */}
      {loading ? (
        <div style={{ fontSize: 11, color: '#B8AFA6', marginBottom: 8 }}>…</div>
      ) : comments.length === 0 ? (
        <div style={{ fontSize: 12, color: '#B8AFA6', marginBottom: 8 }}>{t('comments.empty')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {comments.map(c => (
            <div key={c.id} style={{
              background: c.author_id === profile?.id ? '#FAECE4' : 'var(--surface-2, #F5F1EB)',
              border: `1px solid ${c.author_id === profile?.id ? '#E8C9B4' : '#EAE3D8'}`,
              borderRadius: 9, padding: '7px 10px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: c.author_id === profile?.id ? '#C96B3A' : '#2E2420' }}>
                  {c.author_name}
                </span>
                <span style={{ fontSize: 10, color: '#B8AFA6' }}>{formatTime(c.created_at, lang)}</span>
              </div>
              <div style={{ fontSize: 12, color: '#2E2420', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{c.text}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Input ── */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('comments.placeholder')}
          rows={1}
          style={{
            flex: 1, resize: 'none', borderRadius: 9, border: '1.5px solid #EAE3D8',
            padding: '7px 10px', fontSize: 12, fontFamily: 'inherit',
            background: 'var(--surface, #fff)', color: 'var(--text-1, #2E2420)',
            outline: 'none', lineHeight: 1.4,
            minHeight: 34, maxHeight: 80,
          }}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px` }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          style={{
            background: text.trim() ? '#C96B3A' : '#EAE3D8',
            color: text.trim() ? '#fff' : '#B8AFA6',
            border: 'none', borderRadius: 9, padding: '7px 13px',
            fontSize: 12, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default',
            flexShrink: 0, transition: 'background .15s, color .15s',
          }}
        >
          {sending ? '…' : t('comments.send')}
        </button>
      </div>
    </div>
  )
}
