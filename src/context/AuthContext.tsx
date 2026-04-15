import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (patch: Partial<UserProfile>) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  updateProfile: () => {},
})

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .abortSignal(controller.signal)
      .single()
    if (error) return null
    return data as UserProfile
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Hard cap: if onAuthStateChange never fires (e.g. network issue),
    // release the loading screen after 10 seconds so the user isn't stuck.
    const hardTimeout = setTimeout(() => setLoading(false), 10000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        try {
          setSession(s)
          setUser(s?.user ?? null)

          // USER_UPDATED reflects auth-layer changes (password/email) only —
          // skip re-fetching to avoid overwriting optimistic profile updates.
          if (event === 'USER_UPDATED') return

          if (s?.user) {
            const p = await fetchProfile(s.user.id)
            setProfile(p)
          } else {
            setProfile(null)
          }
        } finally {
          // Always clear loading, even if fetchProfile threw or was aborted.
          setLoading(false)
          clearTimeout(hardTimeout)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      clearTimeout(hardTimeout)
    }
  }, [])

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.id)
      setProfile(p)
    }
  }

  const updateProfile = (patch: Partial<UserProfile>) => {
    setProfile(prev => prev ? { ...prev, ...patch } : prev)
  }

  const signOut = async () => {
    try {
      // Attempt a global sign-out (invalidates all sessions server-side).
      // Give it 10 seconds; if it times out on a slow network we still
      // proceed with local cleanup so the user is never left stuck.
      await Promise.race([
        supabase.auth.signOut({ scope: 'global' }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10000)
        ),
      ])
    } catch {
      // Timeout or network error — local cleanup still runs below.
    } finally {
      // Clear all local storage so no stale session or lock data remains.
      localStorage.clear()
      sessionStorage.clear()
      setUser(null)
      setProfile(null)
      setSession(null)
      // Hard redirect — forces a full page reload which guarantees all
      // in-memory state is wiped. Never use router.navigate for sign-out.
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
