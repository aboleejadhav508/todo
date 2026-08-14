import { supabase } from './supabase'

/**
 * A zustand `persist` storage adapter backed by Supabase, so the store itself
 * needs no changes — every action stays synchronous and localStorage-shaped.
 *
 * Writes are debounced because the store updates on every keystroke (task notes
 * are a controlled textarea); without this, typing a sentence would fire a
 * request per character.
 */
const DEBOUNCE_MS = 700

let timer = null
let pendingValue = null
let inFlight = Promise.resolve()

/** True when the signed-in user had no saved row yet — drives local-data import. */
export let cloudWasEmpty = false

const currentUserId = async () => {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

const write = async (value) => {
  const userId = await currentUserId()
  if (!userId || value == null) return
  const { error } = await supabase
    .from('user_data')
    .upsert({ user_id: userId, data: JSON.parse(value) }, { onConflict: 'user_id' })
  if (error) console.error('[cloud] save failed:', error.message)
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

export const cloudStorage = {
  getItem: async () => {
    const userId = await currentUserId()
    if (!userId) return null

    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('[cloud] load failed:', error.message)
      return null
    }

    const blob = data?.data
    cloudWasEmpty = !blob || Object.keys(blob).length === 0
    return cloudWasEmpty ? null : JSON.stringify(blob)
  },

  setItem: (_name, value) => {
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
    const userId = await currentUserId()
    if (!userId) return
    await supabase.from('user_data').delete().eq('user_id', userId)
  },
}
