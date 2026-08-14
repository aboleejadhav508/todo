import { useState, useEffect } from 'react'
import { supabase } from './supabase'

/** The signed-in user, or null. Returns null when Supabase isn't configured. */
export function useAuthUser() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return user
}
