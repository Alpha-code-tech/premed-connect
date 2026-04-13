import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// ── Stale lock guard ─────────────────────────────────────────────────────────
//
// Supabase JS v2 acquires an internal storage lock before every auth operation
// (getSession, signIn, token refresh, etc.). If a previous page load died
// mid-operation (tab closed, network drop, hard refresh), the lock can remain
// in localStorage indefinitely. Every subsequent auth call then queues behind
// it and hangs — causing infinite loading spinners and stuck mutations.
//
// getSession() resolves in <50 ms when the lock is free (it only reads
// localStorage). Any hang beyond that means the lock is stale.
// signOut({ scope: 'local' }) clears localStorage synchronously with no
// network call, releasing the lock immediately.
//
// This IIFE runs once per page load, before AuthProvider mounts, so the lock
// is always clean before the app tries to do anything.
// ─────────────────────────────────────────────────────────────────────────────
;(async () => {
  const timedOut = await Promise.race([
    supabase.auth.getSession().then(() => false, () => false),
    new Promise<true>(resolve => setTimeout(() => resolve(true), 2000)),
  ])

  if (timedOut) {
    console.warn('[Supabase] Stale auth lock detected on startup — clearing local session')
    await supabase.auth.signOut({ scope: 'local' })
    // Flag for AuthContext to know the session was force-cleared
    sessionStorage.setItem('supabase_lock_cleared', '1')
  }
})()
