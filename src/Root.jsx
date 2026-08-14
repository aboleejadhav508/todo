import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { cloudWasEmpty } from './lib/cloudStorage'
import { useStore, STORE_KEY } from './store'
import App from './App'
import AuthScreen from './components/AuthScreen'
import { Loader2 } from 'lucide-react'

/**
 * If this browser has tasks from before sign-in, carry them up to the new
 * account rather than dropping the user into an empty app. Only ever runs when
 * the account's cloud row is empty, so it can't clobber existing data.
 */
const importLocalData = () => {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    const local = parsed?.state
    if (!local || !Array.isArray(local.tasks) || local.tasks.length === 0) return
    useStore.setState(local)
  } catch { /* nothing importable — carry on with defaults */ }
}

export default function Root() {
  const [session, setSession] = useState(undefined) // undefined = still checking
  const [hydratedFor, setHydratedFor] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data } = supabase.auth.onAuthStateChange((_e, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id

  // Load this account's row before showing the app, so no other user's data
  // can flash on screen first.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      await useStore.persist.rehydrate()
      if (cancelled) return
      if (cloudWasEmpty) importLocalData()
      setHydratedFor(userId)
    })()
    return () => { cancelled = true }
  }, [userId])

  const appName = useStore((s) => s.appName)

  if (session === undefined) return <Splash />
  if (!session) return <AuthScreen appName={appName} />
  if (hydratedFor !== userId) return <Splash />

  return <App />
}

function Splash() {
  return (
    <div className="splash">
      <Loader2 size={22} className="spin" />
    </div>
  )
}
