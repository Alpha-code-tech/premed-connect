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
  // Abort if profile fetch hangs for more than 8 seconds
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
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
    // Hard cap: never show loading screen for more than 6 seconds
    const hardTimeout = setTimeout(() => setLoading(false), 6000)

    // Rely solely on onAuthStateChange — it fires INITIAL_SESSION on mount,
    // which is equivalent to getSession() but without the race condition of
    // running two simultaneous fetchProfile calls.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        setSession(s)
        setUser(s?.user ?? null)

        // USER_UPDATED only reflects auth-layer changes (password/email),
        // not profile table changes — skip re-fetching to avoid overwriting
        // optimistic profile updates already applied by updateProfile()
        if (event === 'USER_UPDATED') {
          setLoading(false)
          clearTimeout(hardTimeout)
          return
        }

        if (s?.user) {
          const p = await fetchProfile(s.user.id)
          setProfile(p)
        } else {
          setProfile(null)
        }

        setLoading(false)
        clearTimeout(hardTimeout)
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
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
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
