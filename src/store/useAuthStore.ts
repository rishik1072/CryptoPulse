import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserPreferences {
  currency: string
  theme: 'dark' | 'light'
  language: string
  timezone: string
  notifications: boolean
}

interface AuthState {
  preferences: UserPreferences
  updatePreferences: (prefs: Partial<UserPreferences>) => void
  resetPreferences: () => void
}

const defaultPreferences: UserPreferences = {
  currency: 'USD',
  theme: 'dark',
  language: 'en',
  timezone: 'UTC',
  notifications: true,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      preferences: defaultPreferences,
      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),
      resetPreferences: () => set({ preferences: defaultPreferences }),
    }),
    {
      name: 'cryptopulse-preferences',
    }
  )
)