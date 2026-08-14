import { useState, useEffect, useRef } from 'react'
import { CATEGORY_COLORS } from '../store'
import ColorField from './ColorField'

/** Create (category = null) and edit share one dialog — same fields either way. */
export default function CategoryDialog({ category, defaultColor, onSave, onCancel }) {
  const [label, setLabel] = useState(category?.label || '')
  const [color, setColor] = useState(category?.color || defaultColor || CATEGORY_COLORS[0])
  const nameRef = useRef(null)

  useEffect(() => {
    nameRef.current?.focus()
    nameRef.current?.select()
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  const canSave = label.trim().length > 0
  const submit = () => { if (canSave) onSave({ label: label.trim(), color }) }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal modal--form" role="dialog" aria-modal="true" aria-labelledby="cat-dialog-title">
        <h2 className="confirm__title" id="cat-dialog-title">
          {category ? 'Edit category' : 'New category'}
        </h2>

        <div className="form-row">
          <label className="field__label" htmlFor="cat-name">Name</label>
          <input
            id="cat-name"
            ref={nameRef}
            className="input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            placeholder="e.g. Thesis reading"
            maxLength={40}
          />
        </div>

        <div className="form-row">
          <span className="field__label">Colour</span>
          <ColorField value={color} presets={CATEGORY_COLORS} onChange={setColor} />
        </div>

        <div className="confirm__actions">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn--primary" onClick={submit} disabled={!canSave}>
            {category ? 'Save changes' : 'Create category'}
          </button>
        </div>
      </div>
    </div>
  )
}
