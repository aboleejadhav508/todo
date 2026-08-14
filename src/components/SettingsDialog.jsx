import { useState, useEffect, useRef } from 'react'
import { useStore, DEFAULT_APP_NAME, DEFAULT_ACCENT } from '../store'
import { supabase } from '../lib/supabase'
import { flushPendingWrites } from '../lib/cloudStorage'
import { useAuthUser } from '../lib/useAuthUser'
import ColorField from './ColorField'
import { RotateCcw, LogOut } from 'lucide-react'

const ACCENT_PRESETS = [
  '#e9631a', // orange
  '#5b5bd6', // indigo
  '#0d9668', // emerald
  '#e5484d', // red
  '#8b5cf6', // violet
  '#0891b2', // cyan
  '#db2777', // pink
  '#64748b', // slate
]

export default function SettingsDialog({ onClose }) {
  const { appName, setAppName, accent, setAccent, resetData } = useStore()
  const [name, setName] = useState(appName)
  const [signingOut, setSigningOut] = useState(false)
  const user = useAuthUser()
  const nameRef = useRef(null)

  const signOut = async () => {
    setSigningOut(true)
    // Push any debounced edit before tearing down the session, or the last few
    // seconds of typing would be lost.
    await flushPendingWrites()
    await supabase.auth.signOut()
    resetData()
  }

  useEffect(() => {
    nameRef.current?.focus()
    nameRef.current?.select()
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Name commits on close/blur; accent applies live so you can see it land.
  const commitName = () => setAppName(name)

  const close = () => { commitName(); onClose() }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
      <div className="modal modal--form" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <h2 className="confirm__title" id="settings-title">Appearance</h2>

        <div className="form-row">
          <label className="field__label" htmlFor="app-name">App name</label>
          <input
            id="app-name"
            ref={nameRef}
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); close() } }}
            placeholder={DEFAULT_APP_NAME}
            maxLength={24}
          />
        </div>

        <div className="form-row">
          <div className="form-row__head">
            <span className="field__label">Accent colour</span>
            {accent.toLowerCase() !== DEFAULT_ACCENT && (
              <button className="link-btn" onClick={() => setAccent(DEFAULT_ACCENT)}>
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>
          <ColorField value={accent} presets={ACCENT_PRESETS} onChange={setAccent} />
          <p className="form-row__hint">
            Every shade — hovers, focus rings, tints — is derived from this one colour, in both themes.
          </p>
        </div>

        {user && (
          <div className="form-row account">
            <span className="field__label">Account</span>
            <div className="account__row">
              <span className="account__email" title={user.email}>{user.email}</span>
              <button className="btn" onClick={signOut} disabled={signingOut}>
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </div>
        )}

        <div className="confirm__actions">
          <button className="btn btn--primary" onClick={close}>Done</button>
        </div>
      </div>
    </div>
  )
}
