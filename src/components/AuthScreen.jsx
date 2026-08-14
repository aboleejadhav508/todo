import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ListTodo, Loader2 } from 'lucide-react'

const MODES = {
  signin: { title: 'Welcome back', action: 'Sign in', alt: 'signup' },
  signup: { title: 'Create your account', action: 'Create account', alt: 'signin' },
  reset: { title: 'Reset your password', action: 'Send reset link', alt: 'signin' },
}

export default function AuthScreen({ appName }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)

    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setNotice('Check your inbox for a reset link.')
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        // With email confirmation on, there's no session until they click through.
        if (!data.session) setNotice('Check your inbox to confirm your address, then sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Success needs no handling — the auth listener in App swaps the screen.
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const { title, action } = MODES[mode]
  const switchTo = (next) => { setMode(next); setError(''); setNotice('') }

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={submit}>
        <div className="auth__brand">
          <span className="sidebar__mark"><ListTodo size={15} strokeWidth={2.4} /></span>
          <span className="sidebar__name">{appName}</span>
        </div>

        <h1 className="auth__title">{title}</h1>
        <p className="auth__sub">Your tasks are private to your account.</p>

        <div className="form-row">
          <label className="field__label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        {mode !== 'reset' && (
          <div className="form-row">
            <label className="field__label" htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
            />
          </div>
        )}

        {error && <p className="auth__error">{error}</p>}
        {notice && <p className="auth__notice">{notice}</p>}

        <button className="btn btn--primary auth__submit" type="submit" disabled={busy}>
          {busy ? <Loader2 size={15} className="spin" /> : action}
        </button>

        <div className="auth__links">
          {mode === 'signin' && (
            <>
              <button type="button" className="link-btn" onClick={() => switchTo('signup')}>
                Create an account
              </button>
              <button type="button" className="link-btn" onClick={() => switchTo('reset')}>
                Forgot password?
              </button>
            </>
          )}
          {mode !== 'signin' && (
            <button type="button" className="link-btn" onClick={() => switchTo('signin')}>
              Back to sign in
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
