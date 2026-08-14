import { useEffect, useRef } from 'react'

/**
 * Blocking confirmation for destructive actions. Cancel takes focus rather
 * than Confirm, so a stray Enter can't delete anything.
 */
export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  const cancelRef = useRef(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="modal modal--confirm" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 className="confirm__title" id="confirm-title">{title}</h2>
        <p className="confirm__message">{message}</p>
        <div className="confirm__actions">
          <button ref={cancelRef} className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn--danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
