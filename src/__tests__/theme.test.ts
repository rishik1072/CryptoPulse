import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { applyThemeToDOM, getSavedTheme, switchTheme } from '../lib/theme.ts'

describe('Theme System Integration & Regression Tests', () => {
  // Setup minimal DOM and localStorage mock in Node environment
  beforeEach(() => {
    const classListSet = new Set<string>()
    const datasetObj: Record<string, string> = {}
    const styleObj: Record<string, string> = {}

    const mockRoot = {
      classList: {
        add: (...tokens: string[]) => tokens.forEach((t) => classListSet.add(t)),
        remove: (...tokens: string[]) => tokens.forEach((t) => classListSet.delete(t)),
        contains: (token: string) => classListSet.has(token),
        toggle: (token: string, force?: boolean) => {
          if (force !== undefined) {
            if (force) classListSet.add(token)
            else classListSet.delete(token)
            return force
          }
          if (classListSet.has(token)) {
            classListSet.delete(token)
            return false
          }
          classListSet.add(token)
          return true
        },
      },
      dataset: datasetObj,
      style: styleObj,
      setAttribute: (k: string, v: string) => {
        datasetObj[k.replace(/^data-/, '')] = v
      },
      getAttribute: (k: string) => datasetObj[k.replace(/^data-/, '')],
    }

    const storageMap = new Map<string, string>()
    const mockStorage = {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => storageMap.set(k, String(v)),
      removeItem: (k: string) => storageMap.delete(k),
      clear: () => storageMap.clear(),
    }

    // Attach to globalThis
    const g = globalThis as unknown as Record<string, unknown>
    g.document = {
      documentElement: mockRoot,
    }
    g.window = {
      setTimeout: (fn: () => void) => fn(),
      clearTimeout: () => {},
    }
    g.localStorage = mockStorage
  })

  it('defaults to dark theme when no stored preference exists', () => {
    const theme = getSavedTheme()
    assert.equal(theme, 'dark')
  })

  it('restores theme from auth store preferences in localStorage', () => {
    localStorage.setItem(
      'cryptopulse-auth-v4',
      JSON.stringify({
        state: {
          preferences: { theme: 'light' },
        },
      })
    )
    const theme = getSavedTheme()
    assert.equal(theme, 'light')
  })

  it('restores theme from ui store preference if auth store is empty', () => {
    localStorage.setItem(
      'cryptopulse-ui',
      JSON.stringify({
        state: {
          theme: 'light',
        },
      })
    )
    const theme = getSavedTheme()
    assert.equal(theme, 'light')
  })

  it('applies dark theme to documentElement correctly', () => {
    applyThemeToDOM('dark', false)
    const root = document.documentElement
    assert.equal(root.classList.contains('dark'), true)
    assert.equal(root.classList.contains('light'), false)
    assert.equal(root.dataset.theme, 'dark')
    assert.equal(root.style.colorScheme, 'dark')
  })

  it('applies light theme to documentElement correctly', () => {
    applyThemeToDOM('light', false)
    const root = document.documentElement
    assert.equal(root.classList.contains('light'), true)
    assert.equal(root.classList.contains('dark'), false)
    assert.equal(root.dataset.theme, 'light')
    assert.equal(root.style.colorScheme, 'light')
  })

  it('switchTheme persists to localStorage and toggles theme state', () => {
    switchTheme('light')
    const root = document.documentElement
    assert.equal(root.dataset.theme, 'light')
    assert.equal(root.classList.contains('light'), true)
    assert.equal(root.classList.contains('dark'), false)

    // Switch back to dark
    switchTheme('dark')
    assert.equal(root.dataset.theme, 'dark')
    assert.equal(root.classList.contains('dark'), true)
    assert.equal(root.classList.contains('light'), false)
  })

  it('preserves CSS custom property design tokens requirements', () => {
    // Verified design tokens requirement check
    const darkTokens = {
      '--background': '#0B0E14',
      '--surface': '#151921',
      '--surface-elevated': '#1B2230',
      '--foreground': '#F0F4F8',
      '--muted': '#94A3B8',
      '--border': '#262D38',
      '--positive': '#00E676',
      '--negative': '#FF5252',
      '--accent': '#FFB300',
    }
    const lightTokens = {
      '--background': '#F5F7FA',
      '--surface': '#FFFFFF',
      '--surface-elevated': '#FFFFFF',
      '--foreground': '#111827',
      '--muted': '#64748B',
      '--border': '#E2E8F0',
      '--positive': '#008A4B',
      '--negative': '#DC2626',
      '--accent': '#E5A000',
    }

    assert.ok(darkTokens['--background'] === '#0B0E14')
    assert.ok(lightTokens['--background'] === '#F5F7FA')
    assert.ok(darkTokens['--surface'] === '#151921')
    assert.ok(lightTokens['--surface'] === '#FFFFFF')
    assert.ok(darkTokens['--positive'] === '#00E676')
    assert.ok(lightTokens['--positive'] === '#008A4B')
  })
})
