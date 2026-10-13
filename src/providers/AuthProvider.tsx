import { useEffect, useState, type ReactNode } from 'react'
import { supabase, onAuthStateChange, getSession, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { usePortfolioStore } from '@/store/usePortfolioStore'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { useAlertStore } from '@/store/useAlertStore'
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
    initializeUserData,
  } = useAuthStore()

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      // If Supabase credentials are not configured yet, immediately resolve unauthenticated state
      if (!isSupabaseConfigured()) {
        if (mounted) {
          setUser(null)
          setSession(null)
          setAuthUser(null)
          setAuthenticated(false)
          setLoading(false)
          setInitialized(true)
        }
        return
      }

      try {
        // Enforce a 5-second timeout on getSession to prevent indefinite hanging on network/lock stalls
        const sessionCheckPromise = getSession()
        const timeoutPromise = new Promise<{ data: { session: null }; error: Error }>((resolve) => {
          setTimeout(() => {
            resolve({ data: { session: null }, error: new Error('Session resolution timeout (5s)') })
          }, 5000)
        })

        const { data: { session: initialSession }, error } = await Promise.race([
          sessionCheckPromise,
          timeoutPromise,
        ])

        if (error) {
          console.warn('Initial session check note:', error.message || error)
        }
        
        if (mounted) {
          if (initialSession?.user) {
            setUser(initialSession.user)
            setSession(initialSession)
            setAuthUser(initialSession.user)
            setAuthenticated(true)

            // User-scoped data hydration from database
            usePortfolioStore.getState().initializeUser(initialSession.user.id)
            useWatchlistStore.getState().initializeUser(initialSession.user.id)
            useAlertStore.getState().initializeUser(initialSession.user.id)
            initializeUserData(initialSession.user.id)
          } else {
            setUser(null)
            setSession(null)
            setAuthUser(null)
            setAuthenticated(false)
            usePortfolioStore.getState().clearPortfolio()
            useWatchlistStore.getState().clearWatchlist()
            useAlertStore.getState().clearAlerts()
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
          usePortfolioStore.getState().clearPortfolio()
          useWatchlistStore.getState().clearWatchlist()
          useAlertStore.getState().clearAlerts()
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    initializeAuth()

    // Single consistent auth state listener across the application
    const { data: { subscription } } = onAuthStateChange(async (event, newSession) => {
      if (!mounted) return

      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        if (newSession?.user) {
          setUser(newSession.user)
          setSession(newSession)
          setAuthUser(newSession.user)
          setAuthenticated(true)

          // User-scoped data hydration from database
          usePortfolioStore.getState().initializeUser(newSession.user.id)
          useWatchlistStore.getState().initializeUser(newSession.user.id)
          useAlertStore.getState().initializeUser(newSession.user.id)
          initializeUserData(newSession.user.id)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
        clearAuth()
        usePortfolioStore.getState().clearPortfolio()
        useWatchlistStore.getState().clearWatchlist()
        useAlertStore.getState().clearAlerts()
      }
      
      setLoading(false)
      setInitialized(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setAuthUser, setAuthenticated, clearAuth, initializeUserData])

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
      usePortfolioStore.getState().clearPortfolio()
      useWatchlistStore.getState().clearWatchlist()
      useAlertStore.getState().clearAlerts()
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
        usePortfolioStore.getState().initializeUser(newSession.user.id)
        useWatchlistStore.getState().initializeUser(newSession.user.id)
        useAlertStore.getState().initializeUser(newSession.user.id)
        initializeUserData(newSession.user.id)
      } else {
        setUser(null)
        setSession(null)
        clearAuth()
        usePortfolioStore.getState().clearPortfolio()
        useWatchlistStore.getState().clearWatchlist()
        useAlertStore.getState().clearAlerts()
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
