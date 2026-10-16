import { useUIStore } from '../store/useUIStore.ts'
import { useAuthStore } from '../store/useAuthStore.ts'

export type Theme = 'dark' | 'light'

/**
 * Single centralized design-token system defining exact tokens for Dark and Light themes.
 */
export const DESIGN_TOKENS = {
  dark: {
    background: '#0B0E14',
    sidebarHeader: '#10141C',
    surface: '#151921',
    surfaceElevated: '#1B2230',
    primaryText: '#F0F4F8',
    secondaryText: '#A7B2C4',
    mutedText: '#8491A5',
    borders: '#283140',
    positive: '#00E676',
    negative: '#FF5252',
    primaryAccent: '#FFB300',
    primaryAccentHover: '#FFA000',
    accentContrast: '#0B0E14',
    chartGrid: 'rgba(40, 49, 64, 0.5)',
    chartCrosshair: '#3B4554',
  },
  light: {
    background: '#F3F5F9',
    sidebarHeader: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceElevated: '#F8FAFC',
    primaryText: '#172033',
    secondaryText: '#475569',
    mutedText: '#64748B',
    borders: '#DCE3EC',
    positive: '#008A4B',
    negative: '#D92D3E',
    primaryAccent: '#E5A000',
    primaryAccentHover: '#CC8F00',
    accentContrast: '#172033',
    chartGrid: 'rgba(220, 227, 236, 0.85)',
    chartCrosshair: '#CBD5E1',
  },
} as const

export type DesignThemeTokens = typeof DESIGN_TOKENS.dark

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
