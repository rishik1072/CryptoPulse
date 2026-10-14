import { useUIStore } from '../store/useUIStore.ts'
import { useAuthStore } from '../store/useAuthStore.ts'

export type Theme = 'dark' | 'light'

/**
 * Resolves the currently stored theme from localStorage or defaults to 'dark'.
 */
export function getSavedTheme(): Theme {
  try {
    const authRaw = localStorage.getItem('cryptopulse-auth-v4')
    if (authRaw) {
      const parsed = JSON.parse(authRaw)
      if (parsed?.state?.preferences?.theme === 'light') return 'light'
      if (parsed?.state?.preferences?.theme === 'dark') return 'dark'
    }

    const uiRaw = localStorage.getItem('cryptopulse-ui')
    if (uiRaw) {
      const parsed = JSON.parse(uiRaw)
      if (parsed?.state?.theme === 'light') return 'light'
      if (parsed?.state?.theme === 'dark') return 'dark'
    }
  } catch {
    // Fall back to dark default on storage access failure
  }
  return 'dark'
}

let transitionTimeout: number | null = null

/**
 * Applies the specified theme to document.documentElement, updates color-scheme,
 * and coordinates a smooth restrained 200ms transition.
 */
export function applyThemeToDOM(theme: Theme, animate = false): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement

  if (animate) {
    root.classList.add('theme-transition')
    if (transitionTimeout !== null) {
      window.clearTimeout(transitionTimeout)
    }
    transitionTimeout = window.setTimeout(() => {
      root.classList.remove('theme-transition')
      transitionTimeout = null
    }, 250)
  }

  root.dataset.theme = theme
  root.classList.toggle('dark', theme === 'dark')
  root.classList.toggle('light', theme === 'light')
  root.style.colorScheme = theme
}

/**
 * Centralized theme switch that updates DOM and synchronizes UI and Auth stores.
 */
export function switchTheme(nextTheme: Theme, animate = true): void {
  applyThemeToDOM(nextTheme, animate)

  // Update UI store
  useUIStore.getState().setTheme(nextTheme)

  // Update Auth store preferences (which also pushes to Supabase if authenticated)
  useAuthStore.getState().updatePreferences({ theme: nextTheme })
}
