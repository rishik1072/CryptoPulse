import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useUIStore } from './useUIStore.ts'
import { usePortfolioStore } from './usePortfolioStore.ts'
import { useWatchlistStore } from './useWatchlistStore.ts'
import { useAlertStore } from './useAlertStore.ts'
import {
  getSession,
  signOut as supabaseSignOut,
  updateProfile as supabaseUpdateProfile,
  updateUserProfile,
  getUserProfile,
  getUserPreferences,
  updateUserPreferences,
  uploadAvatar,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle as supabaseSignInWithGoogle,
  resetPassword as supabaseResetPassword,
  updatePassword as supabaseUpdatePassword,
  deleteAccount as supabaseDeleteAccount,
  formatAuthError,
} from '../lib/supabase.ts'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export interface UserPreferences {
  currency: string
  theme: 'dark' | 'light'
  language: string
  timezone: string
  notifications: boolean
  browserNotifications: boolean
  emailNotifications: boolean
  priceAlerts: boolean
  privacyMode: boolean
}

export interface AuthUser {
  id: string
  name: string
  email: string
  phone?: string
  avatarUrl?: string
  createdAt: string
  provider: 'local' | 'google'
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isHydrated: boolean
  isLoading: boolean
  error: string | null
  success: string | null
  rememberMe: boolean
  preferences: UserPreferences
  sessions: Array<{
    id: string
    device: string
    location: string
    lastSeen: string
    current: boolean
  }>
  activityLogs: Array<{ id: string; action: string; timestamp: string }>
  hasTwoFactor: boolean
  connectedGoogle: boolean
  
  // Actions
  signIn: (email: string, password: string, options?: { rememberMe?: boolean }) => Promise<boolean>
  signUp: (name: string, email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  forgotPassword: (email: string) => Promise<boolean>
  resetPassword: (password: string) => Promise<boolean>
  updateProfile: (updates: Partial<AuthUser>) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>
  toggleTwoFactor: (value?: boolean) => void
  setConnectedGoogle: (value: boolean) => void
  clearMessages: () => void
  deleteAccount: () => Promise<void>
  refreshSession: () => Promise<boolean>
  clearSessions: () => void
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void> | void
  resetPreferences: () => void
  addActivityLog: (action: string) => void
  uploadAvatar: (file: File) => Promise<string | null>
  signInWithGoogle: () => Promise<boolean>
  signInDemo: () => void
  initializeUserData: (userId: string) => Promise<void>
  
  // Internal sync methods for AuthProvider
  setUser: (user: SupabaseUser | null) => void
  setAuthenticated: (value: boolean) => void
  setLoading: (value: boolean) => void
  setHydrated: (value: boolean) => void
  clearAuth: () => void
}

const defaultPreferences: UserPreferences = {
  currency: 'USD',
  theme: 'dark',
  language: 'en',
  timezone: 'UTC',
  notifications: true,
  browserNotifications: true,
  emailNotifications: true,
  priceAlerts: true,
  privacyMode: false,
}

const createUserId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

export const mapSupabaseUser = (supabaseUser: SupabaseUser): AuthUser => {
  const provider = supabaseUser.app_metadata?.provider
  return {
    id: supabaseUser.id,
    name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
    email: supabaseUser.email || '',
    phone: supabaseUser.phone || supabaseUser.user_metadata?.phone,
    avatarUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
    createdAt: supabaseUser.created_at,
    provider: provider === 'google' ? 'google' : 'local',
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isHydrated: false,
      isLoading: false,
      error: null,
      success: null,
      rememberMe: true,
      preferences: defaultPreferences,
      sessions: [],
      activityLogs: [],
      hasTwoFactor: false,
      connectedGoogle: false,

      initializeUserData: async (userId: string) => {
        try {
          const [profileRes, prefRes] = await Promise.all([
            getUserProfile(userId),
            getUserPreferences(userId),
          ])

          if (profileRes.data) {
            const dbProf = profileRes.data
            const currentUser = get().user
            if (currentUser && currentUser.id === userId) {
              set({
                user: {
                  ...currentUser,
                  name: dbProf.full_name || currentUser.name,
                  avatarUrl: dbProf.avatar_url || currentUser.avatarUrl,
                  phone: dbProf.phone || currentUser.phone,
                },
              })
            }
          }

          if (prefRes.data) {
            const dbPref = prefRes.data
            set((state) => ({
              preferences: {
                ...state.preferences,
                currency: dbPref.currency || state.preferences.currency,
                theme: (dbPref.theme === 'light' ? 'light' : 'dark') as 'dark' | 'light',
                emailNotifications: dbPref.email_notifications ?? state.preferences.emailNotifications,
                browserNotifications: dbPref.push_notifications ?? state.preferences.browserNotifications,
                priceAlerts: dbPref.price_alerts ?? state.preferences.priceAlerts,
              },
            }))
          }
        } catch (err) {
          console.warn('[AuthStore] Failed to load user profile or preferences from database:', err)
        }
      },

      signIn: async (email, password, options) => {
        set({ isLoading: true, error: null, success: null })

        try {
          const { data, error: signInError } = await signInWithEmail(email.trim().toLowerCase(), password)

          if (signInError) {
            set({ 
              isLoading: false, 
              error: formatAuthError(signInError),
              success: null 
            })
            return false
          }

          if (data.user) {
            const user = mapSupabaseUser(data.user)

            const loginSession = {
              id: 'session_' + createUserId(),
              device: `Browser (${navigator.userAgent.includes('Windows') ? 'Windows' : 'Desktop/Mobile'})`,
              location: 'Current session',
              lastSeen: new Date().toLocaleString(),
              current: true,
            }

            const nextSessions = [
              loginSession,
              ...get().sessions.map((s) => ({ ...s, current: false })),
            ]

            set({
              user,
              isAuthenticated: true,
              rememberMe: options?.rememberMe ?? true,
              sessions: nextSessions,
              isLoading: false,
              success: 'Welcome back to CryptoPulse.',
            })

            get().addActivityLog('Logged in successfully')
            return true
          }

          set({ isLoading: false, error: 'Authentication failed. Please check your credentials.' })
          return false
        } catch (err) {
          set({ isLoading: false, error: formatAuthError(err) })
          return false
        }
      },

      signUp: async (name, email, password) => {
        const normalizedEmail = email.trim().toLowerCase()
        const safeName = name.trim() || 'Investor'

        set({ isLoading: true, error: null, success: null })

        try {
          const { data, error } = await signUpWithEmail(normalizedEmail, password, safeName)

          if (error) {
            set({ 
              isLoading: false, 
              error: formatAuthError(error),
              success: null 
            })
            return false
          }

          if (data.user) {
            const initialLogs = [{ id: createUserId(), action: 'Account created', timestamp: new Date().toISOString() }]

            // If Supabase email confirmation is enabled, session might be null initially
            const hasSession = Boolean(data.session)
            const user = hasSession ? mapSupabaseUser(data.user) : null

            set({
              user,
              isAuthenticated: hasSession,
              activityLogs: initialLogs,
              isLoading: false,
              success: hasSession
                ? 'Your CryptoPulse account is ready.'
                : 'Registration successful! Please check your email to verify your account.',
            })

            return true
          }

          set({ isLoading: false, error: 'Account creation failed. Please try again.' })
          return false
        } catch (err) {
          set({ isLoading: false, error: formatAuthError(err) })
          return false
        }
      },

      signOut: async () => {
        set({ isLoading: true })
        
        try {
          await supabaseSignOut()
        } catch (e) {
          console.warn('Supabase signout failed, clearing local state:', e)
        }
        
        // Scope state cleanup: wipe user holdings, watchlist, and alerts
        usePortfolioStore.getState().clearPortfolio()
        useWatchlistStore.getState().clearWatchlist()
        useAlertStore.getState().clearAlerts()

        set({
          user: null,
          isAuthenticated: false,
          activityLogs: [],
          isLoading: false,
          success: 'You have been signed out.',
        })
      },

      forgotPassword: async (email) => {
        const normalizedEmail = email.trim().toLowerCase()

        set({ isLoading: true, error: null, success: null })

        try {
          const { error } = await supabaseResetPassword(normalizedEmail)

          if (error) {
            set({ 
              isLoading: false, 
              error: formatAuthError(error),
              success: null 
            })
            return false
          }

          set({
            isLoading: false,
            success: 'Password reset email sent. Please check your inbox.',
          })

          return true
        } catch (err) {
          set({ isLoading: false, error: formatAuthError(err) })
          return false
        }
      },

      resetPassword: async (password) => {
        set({ isLoading: true, error: null, success: null })

        try {
          const { error } = await supabaseUpdatePassword(password)

          if (error) {
            set({ 
              isLoading: false, 
              error: formatAuthError(error),
              success: null 
            })
            return false
          }

          set({
            isLoading: false,
            success: 'Password updated successfully. You can sign in with your new password.',
          })

          return true
        } catch (err) {
          set({ isLoading: false, error: formatAuthError(err) })
          return false
        }
      },

      updateProfile: async (updates) => {
        const currentUser = get().user
        if (!currentUser) return

        set({ isLoading: true, error: null })

        try {
          const supabaseUpdates: { full_name?: string; avatar_url?: string; phone?: string } = {}
          
          if (updates.name) supabaseUpdates.full_name = updates.name
          if (updates.avatarUrl) supabaseUpdates.avatar_url = updates.avatarUrl
          if (updates.phone) supabaseUpdates.phone = updates.phone

          const { error } = await supabaseUpdateProfile(supabaseUpdates)

          if (error) {
            set({ isLoading: false, error: formatAuthError(error) })
            return
          }

          // Confirmed database persistence for profiles table
          const { error: dbError } = await updateUserProfile(currentUser.id, {
            full_name: updates.name ?? currentUser.name,
            avatar_url: updates.avatarUrl ?? currentUser.avatarUrl,
            phone: updates.phone ?? currentUser.phone,
          })

          if (dbError) {
            set({ isLoading: false, error: formatAuthError(dbError) })
            return
          }

          const updatedUser = { ...currentUser, ...updates }
          const updatedLogs = [
            { id: createUserId(), action: 'Profile details updated', timestamp: new Date().toISOString() },
            ...get().activityLogs,
          ].slice(0, 50)

          set({
            user: updatedUser,
            activityLogs: updatedLogs,
            isLoading: false,
            success: 'Profile updated successfully.',
          })
        } catch (err) {
          set({ isLoading: false, error: formatAuthError(err) })
        }
      },

      changePassword: async (_currentPassword, newPassword) => {
        set({ isLoading: true, error: null })

        try {
          const { error } = await supabaseUpdatePassword(newPassword)

          if (error) {
            set({ isLoading: false, error: formatAuthError(error) })
            return false
          }

          const updatedLogs = [
            { id: createUserId(), action: 'Password changed securely', timestamp: new Date().toISOString() },
            ...get().activityLogs,
          ].slice(0, 50)

          set({
            activityLogs: updatedLogs,
            isLoading: false,
            success: 'Password updated successfully.',
          })

          return true
        } catch (err) {
          set({ isLoading: false, error: formatAuthError(err) })
          return false
        }
      },

      toggleTwoFactor: (value) => {
        const nextVal = value ?? !get().hasTwoFactor
        set({ hasTwoFactor: nextVal })
        get().addActivityLog(`2FA security status ${nextVal ? 'enabled' : 'disabled'}`)
      },

      setConnectedGoogle: (value) => {
        set({ connectedGoogle: value })
        get().addActivityLog(`${value ? 'Linked' : 'Unlinked'} Google authentication account`)
      },

      clearMessages: () => set({ error: null, success: null }),

      deleteAccount: async () => {
        const currentUser = get().user
        if (!currentUser) return

        set({ isLoading: true, error: null })

        try {
          const { error } = await supabaseDeleteAccount()

          if (error) {
            set({ isLoading: false, error: error.message || 'Failed to delete account.' })
            return
          }

          usePortfolioStore.getState().clearPortfolio()
          useWatchlistStore.getState().clearWatchlist()
          useAlertStore.getState().clearAlerts()

          try {
            localStorage.removeItem(`cryptopulse-portfolio-${currentUser.id}`)
            localStorage.removeItem(`cryptopulse-watchlist-${currentUser.id}`)
            localStorage.removeItem(`cryptopulse-alerts-${currentUser.id}`)
          } catch {
            // Ignore
          }

          set({
            user: null,
            isAuthenticated: false,
            activityLogs: [],
            isLoading: false,
            success: 'Your account and all associated data have been permanently removed.',
          })
        } catch (err) {
          set({ isLoading: false, error: formatAuthError(err) })
        }
      },

      refreshSession: async () => {
        try {
          const { data: { session } } = await getSession()
          
          if (session?.user) {
            const user = mapSupabaseUser(session.user)
            set({
              user,
              isAuthenticated: true,
            })
            return true
          }
          
          set({
            user: null,
            isAuthenticated: false,
          })
          return false
        } catch {
          set({
            user: null,
            isAuthenticated: false,
          })
          return false
        }
      },

      clearSessions: () => {
        const currentSession = get().sessions.find((s) => s.current) || {
          id: 'session-1',
          device: 'Current device',
          location: 'Current session',
          lastSeen: new Date().toLocaleString(),
          current: true,
        }
        set({ sessions: [{ ...currentSession, current: true }] })
        get().addActivityLog('Cleared all other active device sessions')
      },

      updatePreferences: (prefs) => {
        set((state) => {
          const nextPreferences = { ...state.preferences, ...prefs }

          if (prefs.theme) {
            useUIStore.getState().setTheme(prefs.theme)
            const root = document.documentElement
            root.dataset.theme = prefs.theme
            root.classList.toggle('dark', prefs.theme === 'dark')
            root.style.colorScheme = prefs.theme
          }

          return {
            preferences: nextPreferences,
          }
        })

        const currentUser = get().user
        if (currentUser) {
          updateUserPreferences(currentUser.id, {
            email_notifications: prefs.emailNotifications,
            push_notifications: prefs.browserNotifications,
            price_alerts: prefs.priceAlerts,
            theme: prefs.theme,
            currency: prefs.currency,
          }).catch((err) => {
            console.warn('[AuthStore] Failed to update preferences in database:', err)
          })
        }
      },

      resetPreferences: () => {
        set({ preferences: defaultPreferences })
        useUIStore.getState().setTheme('dark')
      },

      addActivityLog: (action) => {
        const newLog = {
          id: createUserId(),
          action,
          timestamp: new Date().toISOString(),
        }

        const updatedLogs = [newLog, ...get().activityLogs].slice(0, 50)

        set({
          activityLogs: updatedLogs,
        })
      },

      signInWithGoogle: async () => {
        set({ isLoading: true, error: null, success: null })

        try {
          const { error } = await supabaseSignInWithGoogle()
          if (error) {
            set({ isLoading: false, error: formatAuthError(error) })
            return false
          }
          return true
        } catch (err) {
          set({ isLoading: false, error: formatAuthError(err) })
          return false
        }
      },

      uploadAvatar: async (file: File) => {
        const currentUser = get().user
        if (!currentUser) return null

        set({ isLoading: true, error: null })

        try {
          const { data, error } = await uploadAvatar(file, currentUser.id)

          if (error) {
            set({ isLoading: false, error: formatAuthError(error) })
            return null
          }

          if (data?.publicUrl) {
            await get().updateProfile({ avatarUrl: data.publicUrl })
            return data.publicUrl
          }

          set({ isLoading: false, error: 'Storage returned empty avatar URL.' })
          return null
        } catch (err) {
          set({ isLoading: false, error: formatAuthError(err) })
          return null
        }
      },

      signInDemo: () => {
        const demoId = 'demo-user-1'
        const demoUser: AuthUser = {
          id: demoId,
          name: 'Alexander Vance',
          email: 'alex.vance@cryptopulse.io',
          createdAt: '2024-01-15T08:00:00.000Z',
          provider: 'local',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        }
        const demoSession = {
          id: 'session_demo_current',
          device: 'Chrome on macOS (Current Terminal)',
          location: 'New York, US',
          lastSeen: 'Active now',
          current: true,
        }

        // Seed sample portfolio if not already present
        try {
          const portKey = `cryptopulse-portfolio-${demoId}`
          if (!localStorage.getItem(portKey)) {
            const sampleHoldings = [
              {
                id: 'demo-h1',
                coinId: 'bitcoin',
                symbol: 'btc',
                name: 'Bitcoin',
                image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
                quantity: 1.45,
                avgBuyPrice: 62450,
                purchaseDate: '2024-03-12',
              },
              {
                id: 'demo-h2',
                coinId: 'ethereum',
                symbol: 'eth',
                name: 'Ethereum',
                image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
                quantity: 8.5,
                avgBuyPrice: 2840,
                purchaseDate: '2024-04-05',
              },
              {
                id: 'demo-h3',
                coinId: 'solana',
                symbol: 'sol',
                name: 'Solana',
                image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
                quantity: 45.0,
                avgBuyPrice: 132.5,
                purchaseDate: '2024-05-18',
              },
              {
                id: 'demo-h4',
                coinId: 'chainlink',
                symbol: 'link',
                name: 'Chainlink',
                image: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
                quantity: 250,
                avgBuyPrice: 14.8,
                purchaseDate: '2024-06-01',
              },
            ]
            localStorage.setItem(portKey, JSON.stringify(sampleHoldings))
          }
          const watchKey = `cryptopulse-watchlist-${demoId}`
          const rawWatch = localStorage.getItem(watchKey)
          if (!rawWatch || rawWatch.includes('"bitcoin","ethereum"')) {
            const sampleWatchlist = [
              {
                id: 'demo-w1',
                coinId: 'bitcoin',
                symbol: 'BTC',
                name: 'Bitcoin',
                image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
                pinned: true,
                addedAt: '2024-01-10T10:00:00Z',
              },
              {
                id: 'demo-w2',
                coinId: 'ethereum',
                symbol: 'ETH',
                name: 'Ethereum',
                image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
                pinned: true,
                addedAt: '2024-01-11T10:00:00Z',
              },
              {
                id: 'demo-w3',
                coinId: 'solana',
                symbol: 'SOL',
                name: 'Solana',
                image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
                pinned: false,
                addedAt: '2024-02-15T10:00:00Z',
              },
              {
                id: 'demo-w4',
                coinId: 'ripple',
                symbol: 'XRP',
                name: 'XRP',
                image: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
                pinned: false,
                addedAt: '2024-02-20T10:00:00Z',
              },
              {
                id: 'demo-w5',
                coinId: 'chainlink',
                symbol: 'LINK',
                name: 'Chainlink',
                image: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
                pinned: false,
                addedAt: '2024-03-05T10:00:00Z',
              },
            ]
            localStorage.setItem(watchKey, JSON.stringify(sampleWatchlist))
          }
          const alertKey = `cryptopulse-alerts-${demoId}`
          if (!localStorage.getItem(alertKey)) {
            const sampleAlerts = [
              {
                id: 'demo-a1',
                symbol: 'BTC',
                type: 'PRICE_ABOVE',
                value: 85000,
                enabled: true,
                triggered: false,
                createdAt: new Date().toISOString(),
              },
              {
                id: 'demo-a2',
                symbol: 'ETH',
                type: 'PRICE_BELOW',
                value: 2350,
                enabled: true,
                triggered: false,
                createdAt: new Date().toISOString(),
              },
              {
                id: 'demo-a3',
                symbol: 'SOL',
                type: 'PERCENT_CHANGE',
                value: 5,
                enabled: true,
                triggered: true,
                createdAt: new Date().toISOString(),
              },
            ]
            localStorage.setItem(alertKey, JSON.stringify(sampleAlerts))
          }
        } catch {}

        set({
          user: demoUser,
          isAuthenticated: true,
          sessions: [
            demoSession,
            {
              id: 'session_demo_2',
              device: 'CryptoPulse Mobile iOS',
              location: 'New York, US',
              lastSeen: '2 hours ago',
              current: false,
            },
          ],
          activityLogs: [
            { id: 'log-1', action: 'Logged into Institutional Terminal', timestamp: new Date().toISOString() },
            { id: 'log-2', action: 'Executed buy order: 0.25 BTC', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
            { id: 'log-3', action: 'Added Solana to Priority Watchlist', timestamp: new Date(Date.now() - 3600000 * 24).toISOString() },
          ],
          isLoading: false,
          error: null,
          success: 'Welcome back, Alexander Vance.',
        })

        usePortfolioStore.getState().initializeUser(demoId)
        useWatchlistStore.getState().initializeUser(demoId)
        useAlertStore.getState().initializeUser(demoId)
      },

      // Internal sync methods for AuthProvider
      setUser: (supabaseUser: SupabaseUser | null) => {
        if (!supabaseUser) {
          set({ user: null, isAuthenticated: false })
          return
        }
        const user = mapSupabaseUser(supabaseUser)
        set({ user, isAuthenticated: true })
      },

      setAuthenticated: (value: boolean) => {
        set({ isAuthenticated: value })
      },

      setLoading: (value: boolean) => {
        set({ isLoading: value })
      },

      setHydrated: (value: boolean) => {
        set({ isHydrated: value })
      },

      clearAuth: () => {
        usePortfolioStore.getState().clearPortfolio()
        useWatchlistStore.getState().clearWatchlist()
        useAlertStore.getState().clearAlerts()
        set({
          user: null,
          isAuthenticated: false,
          activityLogs: [],
        })
      },
    }),
    {
      name: 'cryptopulse-auth-v4',
      version: 4,
      // Do not store authentication tokens in Zustand persistence.
      // Supabase manages session persistence and tokens.
      partialize: (state) => ({
        preferences: state.preferences,
        rememberMe: state.rememberMe,
      }),
    }
  )
)

// Safely synchronize hydration state after store instance creation
if (useAuthStore.persist?.hasHydrated?.()) {
  useAuthStore.setState({ isHydrated: true })
} else if (useAuthStore.persist?.onFinishHydration) {
  useAuthStore.persist.onFinishHydration(() => {
    useAuthStore.setState({ isHydrated: true })
  })
} else {
  // If persistence is unavailable (e.g. Node/SSR test environments), mark hydrated immediately
  useAuthStore.setState({ isHydrated: true })
}