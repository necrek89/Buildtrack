import { useState, useRef } from 'react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useT } from '../../i18n/useLanguage'
import TaskCard from './TaskCard'
import QuickAddRow from './InlineAdd'

// ─── SORTABLE STAGE ITEM ─────────────────────────────────────────────────────
export function SortableStageItem({ stage, stageIndex, projStages, items, isOpen, toggleStage, openId, setOpenId,
  canEdit, canDelete, setEditTask, setDeleteId, approveTask, rejectTask, color, isDragging, onRename, onDeleteStage, onQuickAdd,
  quickAddOpen, onQuickAddOpen, onQuickAddClose }) {
  const { t } = useT()
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: stage })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  const total    = items.length
  const done     = items.filter(tk => tk.status === 'approved').length
  const pct      = total ? Math.round((done / total) * 100) : 0
  const hasAlert = items.some(tk => tk.status === 'rejected')
  const hasPend  = items.some(tk => tk.status === 'pending')
  const num      = stageIndex >= 0 ? stageIndex + 1 : null
  const isDone   = pct === 100 && total > 0

  const [editing,  setEditing]  = useState(false)
  const [nameVal,  setNameVal]  = useState(stage)
  const nameRef = useRef()

  const startEdit = (e) => {
    if (!canEdit) return
    e.stopPropagation()
    // For the "no stage" group, start with empty input so user types a fresh name
    setNameVal(stage === '—' ? '' : stage)
    setEditing(true)
    setTimeout(() => { nameRef.current?.focus() }, 0)
  }
  const commitEdit = () => {
    setEditing(false)
    const v = nameVal.trim()
    if (v && v !== stage) onRename?.(stage, v)
    else setNameVal(stage)
  }
  const cancelEdit = () => { setEditing(false); setNameVal(stage) }

  return (
    <div ref={setNodeRef} style={{ ...style, borderRadius:14, overflow:'hidden', border:'1.5px solid var(--border,#EAE3D8)', background:'var(--surface,#fff)' }}>
      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'12px 14px',
        background: isOpen ? 'var(--surface-2,#FDFBF8)' : 'var(--surface,#fff)',
        borderBottom: isOpen ? '1px solid var(--border,#EAE3D8)' : 'none',
      }}>
        {/* Drag handle */}
        {canEdit && (
          <div {...attributes} {...listeners} style={{
            cursor:'grab', color:'#C8C0B8', fontSize:16, flexShrink:0,
            padding:'2px 4px', touchAction:'none', lineHeight:1,
          }}>⠿</div>
        )}

        {/* Number badge */}
        <div onClick={() => toggleStage(stage)} style={{
          width:24, height:24, borderRadius:'50%', flexShrink:0, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:11, fontWeight:700,
          background: isDone ? '#E8F2EB' : 'var(--bg-accent,#F2EDE4)',
          color: isDone ? '#3D7A52' : color,
          border: `2px solid ${isDone ? '#A8D4B4' : color}`,
        }}>
          {isDone ? '✓' : (num ?? '·')}
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
            {editing ? (
              <input
                ref={nameRef}
                value={nameVal}
                placeholder="Название этапа"
                onChange={e => setNameVal(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit() }}
                onClick={e => e.stopPropagation()}
                style={{
                  flex:1, fontSize:13, fontWeight:700, color:'var(--text-1,#2E2420)',
                  border:'none', borderBottom:'2px solid #C96B3A', outline:'none',
                  background:'transparent', padding:'0 2px', minWidth:0,
                }}
              />
            ) : (
              <span
                onDoubleClick={startEdit}
                onClick={() => toggleStage(stage)}
                title={canEdit ? t('tasks.stageRename') : undefined}
                style={{
                  fontSize:13, fontWeight:700, letterSpacing:'.02em', cursor:'pointer', flex:1, minWidth:0,
                  color: stage === '—' ? '#B8AFA6' : 'var(--text-1,#2E2420)',
                  fontStyle: stage === '—' ? 'italic' : 'normal',
                }}
              >{stage === '—' ? 'Без этапа' : stage}</span>
            )}
            {!editing && hasAlert && <span style={{ fontSize:11, color:'#A32D2D', fontWeight:600 }}>⚡</span>}
            {!editing && hasPend  && <span style={{ fontSize:11, color:'#9A6E10', fontWeight:600 }}>🕐</span>}
            <span style={{ marginLeft:'auto', fontSize:11, color:'#B8AFA6', fontWeight:500, flexShrink:0 }}>{done}/{total}</span>
            {/* ✏️ rename button — visible on hover, always present for "—" stage */}
            {canEdit && !editing && (
              <button
                onClick={startEdit}
                title="Переименовать этап"
                style={{
                  background:'none', border:'none', cursor:'pointer', padding:'2px 5px',
                  fontSize:12, color: stage === '—' ? '#C96B3A' : '#C8C0B8', lineHeight:1, flexShrink:0,
                  borderRadius:4,
                }}
                onMouseEnter={e => e.currentTarget.style.color='#C96B3A'}
                onMouseLeave={e => e.currentTarget.style.color = stage === '—' ? '#C96B3A' : '#C8C0B8'}
              >✏️</button>
            )}
          </div>
          <div onClick={() => toggleStage(stage)} style={{ height:5, borderRadius:3, background:'var(--border,#EAE3D8)', overflow:'hidden', cursor:'pointer' }}>
            <div style={{ height:'100%', borderRadius:3, width:`${pct}%`, background: isDone ? '#5A9467' : color, transition:'width .4s ease' }} />
          </div>
        </div>
        <span onClick={() => toggleStage(stage)} style={{ fontSize:11, color:'#B8AFA6', flexShrink:0, marginLeft:4, cursor:'pointer' }}>{isOpen ? '▲' : '▼'}</span>
        {canEdit && onDeleteStage && (
          <button
            onClick={e => { e.stopPropagation(); onDeleteStage(stage) }}
            title={t('tasks.stageDelete')}
            style={{
              background:'none', border:'none', cursor:'pointer', padding:'2px 4px',
              fontSize:13, color:'#C8C0B8', lineHeight:1, flexShrink:0,
              borderRadius:4,
            }}
            onMouseEnter={e => e.currentTarget.style.color='#A32D2D'}
            onMouseLeave={e => e.currentTarget.style.color='#C8C0B8'}
          >✕</button>
        )}
      </div>

      {isOpen && (
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {items.length === 0 && (
            <div style={{ padding:'12px 14px', fontSize:12, color:'#B8AFA6', textAlign:'center' }}>{t('tasks.noTasksStage')}</div>
          )}
          {items.map((tk, ti) => (
            <div key={tk.id} style={{ borderTop: ti > 0 ? '1px solid var(--border,#F2EDE6)' : 'none' }}>
              <TaskCard t={tk} openId={openId} setOpenId={setOpenId}
                onEdit={canEdit    ? setEditTask  : null}
                onDelete={canDelete ? setDeleteId : null}
                onApprove={canEdit && tk.status === 'pending' ? approveTask : null}
                onReject={canEdit  && tk.status === 'pending' ? (id) => rejectTask(id, 'Needs revision') : null}
                onMarkDone={canEdit && tk.status !== 'approved' ? approveTask : null}
              />
            </div>
          ))}
          {canEdit && onQuickAdd && (
            <QuickAddRow
              stage={stage}
              onAdd={onQuickAdd}
              isOpen={!!quickAddOpen}
              onOpen={onQuickAddOpen}
              onClose={onQuickAddClose}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── SORTABLE STAGE LIST ─────────────────────────────────────────────────────
export function SortableStageList({ stageGroups, projStages, openStages, toggleStage, openId, setOpenId,
  canEdit, canDelete, setEditTask, setDeleteId, approveTask, rejectTask, STAGE_COLORS, onReorder, onRename, onDeleteStage, onQuickAdd }) {
  const [activeId,      setActiveId]      = useState(null)
  const [quickAddStage, setQuickAddStage] = useState(null) // only one stage open at a time
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const sortableIds = stageGroups.map(g => g.stage)

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over || active.id === over.id) return
    // Work with the current displayed order
    const currentOrder = stageGroups.map(g => g.stage)
    const oldIdx = currentOrder.indexOf(active.id)
    const newIdx = currentOrder.indexOf(over.id)
    if (oldIdx === -1 || newIdx === -1) return
    onReorder(arrayMove(currentOrder, oldIdx, newIdx))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragEnd={handleDragEnd}>
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {stageGroups.map(({ stage, stageIndex, items }, gi) => (
            <SortableStageItem
              key={stage}
              stage={stage}
              stageIndex={stageIndex}
              projStages={projStages}
              items={items}
              isOpen={!!openStages[stage]}
              toggleStage={toggleStage}
              openId={openId}
              setOpenId={setOpenId}
              canEdit={canEdit}
              canDelete={canDelete}
              setEditTask={setEditTask}
              setDeleteId={setDeleteId}
              approveTask={approveTask}
              rejectTask={rejectTask}
              color={STAGE_COLORS[gi % STAGE_COLORS.length]}
              isDragging={activeId === stage}
              onRename={onRename}
              onDeleteStage={onDeleteStage}
              onQuickAdd={onQuickAdd}
              quickAddOpen={quickAddStage === stage}
              onQuickAddOpen={() => setQuickAddStage(stage)}
              onQuickAddClose={() => setQuickAddStage(null)}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeId && (() => {
          const g = stageGroups.find(x => x.stage === activeId)
          if (!g) return null
          return (
            <div style={{
              borderRadius:14, border:'2px solid #C96B3A',
              background:'#FAECE4', padding:'12px 14px',
              boxShadow:'0 8px 24px rgba(201,107,58,0.25)',
              fontSize:13, fontWeight:700, color:'#C96B3A',
            }}>
              ⠿ {activeId}
            </div>
          )
        })()}
      </DragOverlay>
    </DndContext>
  )
}
