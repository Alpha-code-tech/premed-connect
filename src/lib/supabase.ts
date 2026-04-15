import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Bypass the internal storage lock entirely. The default lock can deadlock
    // when a previous tab died mid-refresh, causing every subsequent auth call
    // to queue behind it and hang indefinitely. Removing the lock eliminates
    // the deadlock; concurrent auth operations are rare in a single-user SPA
    // and Supabase handles them gracefully without serialisation.
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
})
