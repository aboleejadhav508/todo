import { useState, useEffect } from 'react'
import { supabase } from './supabase'

/** The signed-in user, or null. Returns null when Supabase isn't configured. */
export function useAuthUser() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!supabase) return
    // getSession() works offline; getUser() would require a network round trip.
    supabase.auth.getSession().then(({ data }) => setUser(data?.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return user
}
