import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { deadlineState } from '../utils'
import ConfirmDialog from './ConfirmDialog'
import { Trash2, ChevronDown, Check, Plus, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const STATUS = [
  { id: 'todo', label: 'Not started' },
  { id: 'inprogress', label: 'In progress' },
  { id: 'done', label: 'Done' },
]

/** "Friday, 14 Aug 26" */
const formatDate = (iso) => format(parseISO(iso), 'EEEE, d MMM yy')

/**
 * A native date input can't render a custom format, so the visible chip is a
 * button and the real input sits behind it, opened via showPicker().
 */
function DateChip({ label, value, state, onChange }) {
  const inputRef = useRef(null)

  const openPicker = () => {
    const el = inputRef.current
    if (!el) return
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker()
        return
      } catch { /* blocked outside a user gesture — fall through */ }
    }
    el.focus()
  }

  return (
    <div className="date-chip-wrap">
      <button
        type="button"
        className={`date-chip${value ? '' : ' is-empty'}`}
        data-state={state || undefined}
        onClick={openPicker}
        title={`${label}: ${value ? formatDate(value) : 'not set'}`}
      >
        <span className="date-chip__label">{label}</span>
        <span className="date-chip__value">{value ? formatDate(value) : 'Not set'}</span>
      </button>

      {value && (
        <button
          type="button"
          className="date-chip__clear"
          onClick={() => onChange(null)}
          aria-label={`Clear ${label}`}
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}

      <input
        ref={inputRef}
        type="date"
        className="date-chip__input"
        aria-label={label}
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </div>
  )
}

export default function TaskCard({ task }) {
  const { categories, updateTask, deleteTask } = useStore()
  const [catOpen, setCatOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const catRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const taskCats = categories.filter((c) => task.categoryIds?.includes(c.id))
  const isDone = task.status === 'done'
  const dueState = deadlineState(task)

  const toggleCat = (id) => {
    const current = task.categoryIds || []
    updateTask(task.id, {
      categoryIds: current.includes(id) ? current.filter((c) => c !== id) : [...current, id]
    })
  }

  return (
    <div className={`task-card${isDone ? ' is-done' : ''}`}>
      <div className="task-card__head">
        <div
          className="task-card__title"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => updateTask(task.id, { title: e.currentTarget.textContent.trim() })}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
        >
          {task.title}
        </div>

        <div className="task-card__when">
          <DateChip
            label="Plan"
            value={task.plannedDate}
            onChange={(v) => updateTask(task.id, { plannedDate: v })}
          />
          <DateChip
            label="Due"
            value={task.deadline}
            state={dueState}
            onChange={(v) => updateTask(task.id, { deadline: v })}
          />
        </div>

        <button
          className="task-card__del"
          onClick={() => setConfirmOpen(true)}
          aria-label="Delete task"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Tags */}
      <div className="task-card__tags" ref={catRef}>
        {taskCats.map((cat) => (
          <span key={cat.id} className="tag" style={{ '--tag-color': cat.color }}>
            {cat.label}
          </span>
        ))}

        <div className="dropdown">
          <button className="tag-add" onClick={() => setCatOpen((v) => !v)}>
            <Plus size={11} strokeWidth={2.5} /> Tag
            <ChevronDown size={11} />
          </button>
          {catOpen && (
            <div className="dropdown__menu">
              {categories.length === 0 && (
                <div className="dropdown__empty">No categories yet</div>
              )}
              {categories.map((cat) => {
                const selected = task.categoryIds?.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    className={`dropdown__item${selected ? ' is-selected' : ''}`}
                    onClick={() => toggleCat(cat.id)}
                  >
                    <span className="dot" style={{ background: cat.color }} />
                    {cat.label}
                    {selected && <span className="dropdown__check"><Check size={14} strokeWidth={3} /></span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <textarea
        className="input textarea task-card__notes"
        value={task.notes || ''}
        onChange={(e) => updateTask(task.id, { notes: e.target.value })}
        placeholder="Add notes..."
      />

      {/* Status */}
      <div className="status-row">
        {STATUS.map((s) => (
          <button
            key={s.id}
            data-status={s.id}
            className={`status-btn${task.status === s.id ? ' is-active' : ''}`}
            onClick={() => updateTask(task.id, { status: s.id })}
          >
            {s.label}
          </button>
        ))}
      </div>

      {confirmOpen && (
        <ConfirmDialog
          title="Delete this task?"
          message={
            task.title
              ? `“${task.title}” will be removed permanently. This can't be undone.`
              : "This task will be removed permanently. This can't be undone."
          }
          confirmLabel="Delete task"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => { setConfirmOpen(false); deleteTask(task.id) }}
        />
      )}
    </div>
  )
}
