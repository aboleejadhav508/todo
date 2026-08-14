import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Both values are safe to ship in the bundle — the anon key is a public
 * identifier, not a secret. What actually protects the data is the row level
 * security policy in supabase/schema.sql.
 */
export const isConfigured = Boolean(url && anonKey)

export const supabase = isConfigured ? createClient(url, anonKey) : null
