import { useEffect, useState, type ReactNode } from 'react'
import { supabase, onAuthStateChange, getSession } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { AuthContext } from '@/context/AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const { 
    setUser: setAuthUser, 
    setAuthenticated, 
    clearAuth,
  } = useAuthStore()

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await getSession()
        if (error) {
          console.warn('Initial session check error:', error)
        }
        
        if (mounted) {
          if (initialSession?.user) {
            setUser(initialSession.user)
            setSession(initialSession)
            setAuthUser(initialSession.user)
            setAuthenticated(true)
          } else {
            setUser(null)
            setSession(null)
            setAuthUser(null)
            setAuthenticated(false)
          }
          setLoading(false)
          setInitialized(true)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          setUser(null)
          setSession(null)
          setAuthUser(null)
          setAuthenticated(false)
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    initializeAuth()

    // Establish single consistent auth state listener across the application
    const { data: { subscription } } = onAuthStateChange(async (event, newSession) => {
      if (!mounted) return

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (newSession?.user) {
          setUser(newSession.user)
          setSession(newSession)
          setAuthUser(newSession.user)
          setAuthenticated(true)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
        clearAuth()
      }
      
      setLoading(false)
      setInitialized(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setAuthUser, setAuthenticated, clearAuth])

  const signOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setUser(null)
      setSession(null)
      clearAuth()
      setLoading(false)
    }
  }

  const refreshSession = async () => {
    try {
      const { data: { session: newSession } } = await getSession()
      if (newSession?.user) {
        setUser(newSession.user)
        setSession(newSession)
        setAuthUser(newSession.user)
        setAuthenticated(true)
      } else {
        setUser(null)
        setSession(null)
        clearAuth()
      }
    } catch (error) {
      console.error('Refresh session error:', error)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      initialized,
      signOut,
      refreshSession,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
