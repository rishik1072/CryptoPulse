import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useUIStore } from './useUIStore'

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

interface StoredUserRecord {
  email: string
  password?: string // Google sign-in might not have a local password
  user: AuthUser
  activityLogs: Array<{ id: string; action: string; timestamp: string }>
}

interface AuthState {
  user: AuthUser | null
  users: Record<string, StoredUserRecord>
  isAuthenticated: boolean
  isHydrated: boolean
  isLoading: boolean
  error: string | null
  success: string | null
  rememberMe: boolean
  pendingResetEmail: string | null
  pendingResetToken: string | null
  hasTwoFactor: boolean
  connectedGoogle: boolean
  sessions: Array<{
    id: string
    device: string
    location: string
    lastSeen: string
    current: boolean
  }>
  preferences: UserPreferences
  accessToken: string | null
  refreshToken: string | null
  accessTokenExpiresAt: number | null // Timestamp in ms
  activityLogs: Array<{ id: string; action: string; timestamp: string }>
  
  signIn: (email: string, password: string, options?: { rememberMe?: boolean }) => Promise<boolean>
  signUp: (name: string, email: string, password: string) => Promise<boolean>
  signOut: () => void
  forgotPassword: (email: string) => Promise<boolean>
  resetPassword: (email: string, token: string, password: string) => Promise<boolean>
  updateProfile: (updates: Partial<AuthUser>) => void
  changePassword: (currentPassword: string, newPassword: string) => boolean
  toggleTwoFactor: (value?: boolean) => void
  setConnectedGoogle: (value: boolean) => void
  clearMessages: () => void
  deleteAccount: () => void
  refreshSession: () => Promise<boolean>
  clearSessions: () => void
  updatePreferences: (prefs: Partial<UserPreferences>) => void
  resetPreferences: () => void
  signInWithGoogle: (name: string, email: string, avatarUrl: string) => Promise<boolean>
  signUpWithGoogle: (name: string, email: string, avatarUrl: string) => Promise<boolean>
  addActivityLog: (action: string) => void
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      users: {},
      isAuthenticated: false,
      isHydrated: false,
      isLoading: false,
      error: null,
      success: null,
      rememberMe: true,
      pendingResetEmail: null,
      pendingResetToken: null,
      hasTwoFactor: false,
      connectedGoogle: false,
      sessions: [
        {
          id: 'session-1',
          device: 'Current Chrome browser (Windows)',
          location: 'Bengaluru, India',
          lastSeen: new Date().toLocaleString(),
          current: true,
        },
      ],
      preferences: defaultPreferences,
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      activityLogs: [],

      signIn: async (email, password, options) => {
        const normalizedEmail = email.trim().toLowerCase()
        const record = get().users[normalizedEmail]

        set({ isLoading: true, error: null, success: null })

        // Add 600ms delay to simulate real server network lag & loading spinner verification
        await new Promise((resolve) => setTimeout(resolve, 600))

        if (!record || record.password !== password) {
          set({ isLoading: false, error: 'We could not find a matching account with that email and password.', success: null })
          return false
        }

        const user = { ...record.user, email: normalizedEmail }
        const rToken = 'refresh_' + createUserId()
        const aToken = 'access_' + createUserId()
        const expiresAt = Date.now() + 15 * 60 * 1000 // 15 mins

        // Set token persistence based on rememberMe checkbox
        if (options?.rememberMe ?? true) {
          localStorage.setItem('cryptopulse_refresh_token', rToken)
        } else {
          sessionStorage.setItem('cryptopulse_refresh_token', rToken)
        }

        // Add login session log
        const currentDevice = navigator.userAgent.includes('Windows') ? 'Windows Device' : 'Mobile Device'
        const loginSession = {
          id: 'session_' + createUserId(),
          device: `Chrome browser (${currentDevice})`,
          location: 'Your current location',
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
          accessToken: aToken,
          refreshToken: rToken,
          accessTokenExpiresAt: expiresAt,
          sessions: nextSessions,
          activityLogs: record.activityLogs || [],
          isLoading: false,
          success: 'Welcome back to CryptoPulse.',
        })

        get().addActivityLog('Logged in successfully')
        return true
      },

      signUp: async (name, email, password) => {
        const normalizedEmail = email.trim().toLowerCase()
        const safeName = name.trim() || 'CryptoPulse Investor'

        set({ isLoading: true, error: null, success: null })

        await new Promise((resolve) => setTimeout(resolve, 600))

        if (!normalizedEmail || !password) {
          set({ isLoading: false, error: 'Enter a valid email and password to continue.', success: null })
          return false
        }

        if (get().users[normalizedEmail]) {
          set({ isLoading: false, error: 'An account with that email already exists.', success: null })
          return false
        }

        const newUser: AuthUser = {
          id: createUserId(),
          name: safeName,
          email: normalizedEmail,
          createdAt: new Date().toISOString(),
          provider: 'local',
          avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(normalizedEmail)}`,
        }

        const initialLogs = [{ id: createUserId(), action: 'Account created', timestamp: new Date().toISOString() }]

        const rToken = 'refresh_' + createUserId()
        const aToken = 'access_' + createUserId()
        const expiresAt = Date.now() + 15 * 60 * 1000

        localStorage.setItem('cryptopulse_refresh_token', rToken)

        set((state) => ({
          users: {
            ...state.users,
            [normalizedEmail]: {
              email: normalizedEmail,
              password,
              user: newUser,
              activityLogs: initialLogs,
            },
          },
          user: newUser,
          isAuthenticated: true,
          accessToken: aToken,
          refreshToken: rToken,
          accessTokenExpiresAt: expiresAt,
          activityLogs: initialLogs,
          isLoading: false,
          success: 'Your CryptoPulse account is ready.',
        }))

        return true
      },

      signInWithGoogle: async (name, email, avatarUrl) => {
        const normalizedEmail = email.trim().toLowerCase()
        set({ isLoading: true, error: null, success: null })

        await new Promise((resolve) => setTimeout(resolve, 800))

        let record = get().users[normalizedEmail]
        let user: AuthUser

        if (!record) {
          // Auto sign up if user does not exist
          user = {
            id: createUserId(),
            name,
            email: normalizedEmail,
            avatarUrl,
            createdAt: new Date().toISOString(),
            provider: 'google',
          }
          record = {
            email: normalizedEmail,
            user,
            activityLogs: [{ id: createUserId(), action: 'Registered via Google Sign In', timestamp: new Date().toISOString() }],
          }
        } else {
          user = { ...record.user, name, avatarUrl, provider: 'google' }
          record = {
            ...record,
            user,
            activityLogs: [...(record.activityLogs || []), { id: createUserId(), action: 'Logged in via Google Sign In', timestamp: new Date().toISOString() }],
          }
        }

        const rToken = 'refresh_' + createUserId()
        const aToken = 'access_' + createUserId()
        const expiresAt = Date.now() + 15 * 60 * 1000

        localStorage.setItem('cryptopulse_refresh_token', rToken)

        set((state) => ({
          users: {
            ...state.users,
            [normalizedEmail]: record,
          },
          user,
          isAuthenticated: true,
          accessToken: aToken,
          refreshToken: rToken,
          accessTokenExpiresAt: expiresAt,
          connectedGoogle: true,
          activityLogs: record.activityLogs,
          isLoading: false,
          success: 'Connected and authenticated with Google successfully.',
        }))

        return true
      },

      signUpWithGoogle: async (name, email, avatarUrl) => {
        return get().signInWithGoogle(name, email, avatarUrl)
      },

      signOut: () => {
        localStorage.removeItem('cryptopulse_refresh_token')
        sessionStorage.removeItem('cryptopulse_refresh_token')
        set({
          user: null,
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          accessTokenExpiresAt: null,
          activityLogs: [],
          error: null,
          success: 'You have been signed out.',
        })
      },

      forgotPassword: async (email) => {
        const normalizedEmail = email.trim().toLowerCase()
        const record = get().users[normalizedEmail]

        set({ isLoading: true, error: null, success: null })

        await new Promise((resolve) => setTimeout(resolve, 500))

        if (!record) {
          set({ isLoading: false, error: 'No account was found with that email address.', success: null })
          return false
        }

        const token = Math.floor(100000 + Math.random() * 900000).toString() // Premium 6 digit code
        set({
          pendingResetEmail: normalizedEmail,
          pendingResetToken: token,
          isLoading: false,
          success: `Password reset token prepared. Your mock token is ${token}. Enter it below to proceed.`,
        })

        return true
      },

      resetPassword: async (email, token, password) => {
        const normalizedEmail = email.trim().toLowerCase()
        const record = get().users[normalizedEmail]

        if (!record || get().pendingResetToken !== token || get().pendingResetEmail !== normalizedEmail) {
          set({ error: 'The reset token is invalid or has expired.', success: null })
          return false
        }

        const updatedLogs = [
          ...(record.activityLogs || []),
          { id: createUserId(), action: 'Password reset completed', timestamp: new Date().toISOString() },
        ]

        set((state) => ({
          users: {
            ...state.users,
            [normalizedEmail]: {
              ...state.users[normalizedEmail],
              password,
              activityLogs: updatedLogs,
            },
          },
          pendingResetEmail: null,
          pendingResetToken: null,
          success: 'Password updated successfully. You can sign in with your new password.',
          error: null,
        }))

        return true
      },

      updateProfile: (updates) => {
        set((state) => {
          if (!state.user) return state
          const updatedUser = { ...state.user, ...updates }
          const record = state.users[state.user.email]
          
          const updatedLogs = [
            ...(record?.activityLogs || []),
            { id: createUserId(), action: 'Profile details updated', timestamp: new Date().toISOString() },
          ]

          return {
            user: updatedUser,
            activityLogs: updatedLogs,
            users: {
              ...state.users,
              [state.user.email]: {
                ...record,
                user: updatedUser,
                activityLogs: updatedLogs,
              },
            },
          }
        })
      },

      changePassword: (currentPassword, newPassword) => {
        const currentUser = get().user
        if (!currentUser) return false

        const record = get().users[currentUser.email]
        if (!record || record.password !== currentPassword) {
          set({ error: 'Your current password is incorrect.', success: null })
          return false
        }

        const updatedLogs = [
          ...(record.activityLogs || []),
          { id: createUserId(), action: 'Password changed securely', timestamp: new Date().toISOString() },
        ]

        set((state) => ({
          users: {
            ...state.users,
            [currentUser.email]: {
              ...state.users[currentUser.email],
              password: newPassword,
              activityLogs: updatedLogs,
            },
          },
          activityLogs: updatedLogs,
          success: 'Password updated successfully.',
          error: null,
        }))

        return true
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

      deleteAccount: () => {
        const currentUser = get().user
        if (!currentUser) return
        
        localStorage.removeItem('cryptopulse_refresh_token')
        sessionStorage.removeItem('cryptopulse_refresh_token')

        set((state) => {
          const nextUsers = { ...state.users }
          delete nextUsers[currentUser.email]
          return {
            users: nextUsers,
            user: null,
            isAuthenticated: false,
            accessToken: null,
            refreshToken: null,
            accessTokenExpiresAt: null,
            activityLogs: [],
            success: 'Your account and all associated data have been permanently removed.',
            error: null,
          }
        })
      },

      refreshSession: async () => {
        const token = localStorage.getItem('cryptopulse_refresh_token') || sessionStorage.getItem('cryptopulse_refresh_token')
        
        if (!token) {
          return false
        }

        set({ isLoading: true })
        // Simulate minor network lookup
        await new Promise((resolve) => setTimeout(resolve, 400))

        const activeUser = get().user
        if (activeUser) {
          const expiresAt = Date.now() + 15 * 60 * 1000
          set({
            accessToken: 'access_' + createUserId(),
            accessTokenExpiresAt: expiresAt,
            isAuthenticated: true,
            isLoading: false,
          })
          return true
        }

        // Try to recover session from user database records if user is empty
        const allUsers = Object.values(get().users)
        if (allUsers.length > 0) {
          const matched = allUsers[0].user // Grab the first active record
          const expiresAt = Date.now() + 15 * 60 * 1000
          set({
            user: matched,
            activityLogs: allUsers[0].activityLogs || [],
            accessToken: 'access_' + createUserId(),
            accessTokenExpiresAt: expiresAt,
            isAuthenticated: true,
            isLoading: false,
          })
          return true
        }

        set({ isLoading: false })
        return false
      },

      clearSessions: () => {
        const currentSession = get().sessions.find((s) => s.current) || {
          id: 'session-1',
          device: 'Current device',
          location: 'Your current location',
          lastSeen: new Date().toLocaleString(),
          current: true,
        }
        set({ sessions: [{ ...currentSession, current: true }] })
        get().addActivityLog('Cleared all other active device sessions')
      },

      updatePreferences: (prefs) =>
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
        }),

      resetPreferences: () => {
        set({ preferences: defaultPreferences })
        useUIStore.getState().setTheme('dark')
      },

      addActivityLog: (action) => {
        const currentUser = get().user
        if (!currentUser) return

        const record = get().users[currentUser.email]
        if (!record) return

        const newLog = {
          id: createUserId(),
          action,
          timestamp: new Date().toISOString(),
        }

        const updatedLogs = [newLog, ...(record.activityLogs || [])].slice(0, 50) // limit to 50 logs

        set((state) => ({
          activityLogs: updatedLogs,
          users: {
            ...state.users,
            [currentUser.email]: {
              ...record,
              activityLogs: updatedLogs,
            },
          },
        }))
      },
    }),
    {
      name: 'cryptopulse-auth-v3', // increment version to clear out any old incompatible persist data structures
      version: 3,
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<AuthState>
        return {
          ...currentState,
          ...state,
          user: state.user ?? null,
          users: state.users ?? {},
          preferences: state.preferences ?? defaultPreferences,
          isHydrated: true,
          isAuthenticated: Boolean(state.user),
        }
      },
      onRehydrateStorage: () => (state) => {
        // Called whether or not persisted data exists — always mark hydration complete
        if (state) {
          state.isHydrated = true
          state.isAuthenticated = Boolean(state.user)
        } else {
          // No persisted state (first-time visitor or cleared storage)
          useAuthStore.setState({ isHydrated: true })
        }
      },
    }
  )
)