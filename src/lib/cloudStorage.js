import { supabase } from './supabase'

/**
 * A zustand `persist` storage adapter backed by Supabase, with a localStorage
 * mirror so the app keeps working with no network.
 *
 * Reads  : cloud when reachable (and refresh the mirror), else the mirror.
 * Writes : mirror synchronously — always succeeds — then push to the cloud,
 *          debounced. A failed push is retried when the connection returns.
 *
 * Writes are debounced because the store updates on every keystroke (task
 * notes are a controlled textarea); without this, typing a sentence would fire
 * a request per character.
 */
const DEBOUNCE_MS = 700

let timer = null
let pendingValue = null
let inFlight = Promise.resolve()
let unsynced = false

/** Cached so setItem, which must be synchronous, can namespace the mirror. */
let uid = null

/** True when the signed-in user had no saved row yet — drives local-data import. */
export let cloudWasEmpty = false

/** Per-user key: a shared device must never show one account another's cache. */
const cacheKey = (id) => `todo-cache:${id}`

// getSession() reads the persisted session from local storage; getUser() would
// call the network to validate the token, which fails offline and would strand
// a signed-in user on the sign-in screen with no access to their cached data.
const currentUserId = async () => {
  const { data } = await supabase.auth.getSession()
  uid = data?.session?.user?.id ?? null
  return uid
}

const write = async (value) => {
  const userId = uid || (await currentUserId())
  if (!userId || value == null) return
  const { error } = await supabase
    .from('user_data')
    .upsert({ user_id: userId, data: JSON.parse(value) }, { onConflict: 'user_id' })
  if (error) {
    // Keep the mirror authoritative and try again when we're back online.
    unsynced = true
    console.warn('[cloud] save deferred:', error.message)
  } else {
    unsynced = false
  }
}

/** Push any queued write immediately — call before sign-out or unload. */
export const flushPendingWrites = async () => {
  if (timer) { clearTimeout(timer); timer = null }
  if (pendingValue != null) {
    const value = pendingValue
    pendingValue = null
    inFlight = inFlight.then(() => write(value))
  }
  await inFlight
}

/** Whether local edits are still waiting to reach the server. */
export const hasUnsyncedChanges = () => unsynced || pendingValue != null

// Reconnecting is the moment to drain anything written while offline.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (uid && (unsynced || pendingValue != null)) {
      const cached = pendingValue ?? localStorage.getItem(cacheKey(uid))
      pendingValue = null
      if (cached) inFlight = inFlight.then(() => write(cached))
    }
  })
}

export const cloudStorage = {
  getItem: async () => {
    const userId = await currentUserId()
    if (!userId) return null
    const key = cacheKey(userId)
    const mirrored = localStorage.getItem(key)

    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('data')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error

      const blob = data?.data
      const empty = !blob || Object.keys(blob).length === 0

      if (!empty) {
        const serialised = JSON.stringify(blob)
        localStorage.setItem(key, serialised)
        cloudWasEmpty = false
        return serialised
      }

      // Server has nothing. A mirror here means edits made offline that never
      // landed — prefer them over handing back an empty app.
      if (mirrored) {
        cloudWasEmpty = false
        unsynced = true
        return mirrored
      }

      cloudWasEmpty = true
      return null
    } catch (err) {
      // Offline or unreachable: last known good copy.
      console.warn('[cloud] offline, using local copy:', err.message)
      cloudWasEmpty = false
      if (mirrored) unsynced = true
      return mirrored
    }
  },

  setItem: (_name, value) => {
    // Synchronous and offline-proof. Do this first, always.
    if (uid) {
      try { localStorage.setItem(cacheKey(uid), value) } catch { /* quota */ }
    }

    pendingValue = value
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      const queued = pendingValue
      pendingValue = null
      inFlight = inFlight.then(() => write(queued))
    }, DEBOUNCE_MS)
  },

  removeItem: async () => {
    const userId = uid || (await currentUserId())
    if (!userId) return
    localStorage.removeItem(cacheKey(userId))
    await supabase.from('user_data').delete().eq('user_id', userId)
  },
}
