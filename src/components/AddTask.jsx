import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { Plus, ChevronDown, Check } from 'lucide-react'

export default function AddTask({ defaultCategoryId }) {
  const { categories, addTask } = useStore()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [selectedCats, setSelectedCats] = useState(defaultCategoryId ? [defaultCategoryId] : [])
  const [deadline, setDeadline] = useState('')
  const [plannedDate, setPlannedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [catOpen, setCatOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setCatOpen(false) } }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleCat = (id) => setSelectedCats((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id])

  // Reset on open rather than in an effect on close — stale values while the
  // form is hidden don't matter, and this avoids a cascading render.
  const openForm = () => {
    setTitle('')
    setSelectedCats(defaultCategoryId ? [defaultCategoryId] : [])
    setDeadline('')
    setPlannedDate('')
    setNotes('')
    setCatOpen(false)
    setOpen(true)
  }

  const handleSubmit = () => {
    if (!title.trim()) return
    addTask({ title: title.trim(), categoryIds: selectedCats, deadline: deadline || null, plannedDate: plannedDate || null, notes })
    setOpen(false)
  }

  const catLabel = selectedCats.length === 0
    ? 'Categories'
    : selectedCats.length === 1
      ? categories.find((c) => c.id === selectedCats[0])?.label || '1 category'
      : `${selectedCats.length} categories`

  return (
    <div ref={ref}>
      {!open ? (
        <button className="addtask-trigger" onClick={openForm}>
          <Plus size={17} /> Add a task
        </button>
      ) : (
        <div className="addtask-card">
          <input
            autoFocus
            className="input input--title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="What needs to be done?"
          />

          <div className="addtask-card__row">
            <div className="field">
              <label className="field__label">Categories</label>
              <div className="dropdown">
                <button
                  className={`dropdown__trigger${catOpen ? ' is-open' : ''}`}
                  onClick={() => setCatOpen((v) => !v)}
                >
                  <span className="nav-item__text">{catLabel}</span>
                  <ChevronDown size={14} />
                </button>
                {catOpen && (
                  <div className="dropdown__menu">
                    {categories.length === 0 && (
                      <div className="dropdown__empty">No categories yet</div>
                    )}
                    {categories.map((cat) => {
                      const selected = selectedCats.includes(cat.id)
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

            <div className="field">
              <label className="field__label">Deadline</label>
              <input
                type="date"
                className="input input--date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field__label">Plan to do</label>
              <input
                type="date"
                className="input input--date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
              />
            </div>
          </div>

          <textarea
            className="input textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
          />

          <div className="addtask-card__actions">
            <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn--primary" onClick={handleSubmit} disabled={!title.trim()}>
              Add task
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
