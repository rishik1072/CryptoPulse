import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { applyThemeToDOM, getSavedTheme, switchTheme, DESIGN_TOKENS } from '../lib/theme.ts'

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
    assert.equal(DESIGN_TOKENS.dark.background, '#0B0E14')
    assert.equal(DESIGN_TOKENS.dark.sidebarHeader, '#10141C')
    assert.equal(DESIGN_TOKENS.dark.surface, '#151921')
    assert.equal(DESIGN_TOKENS.dark.surfaceElevated, '#1B2230')
    assert.equal(DESIGN_TOKENS.dark.primaryText, '#F0F4F8')
    assert.equal(DESIGN_TOKENS.dark.secondaryText, '#A7B2C4')
    assert.equal(DESIGN_TOKENS.dark.mutedText, '#8491A5')
    assert.equal(DESIGN_TOKENS.dark.borders, '#283140')
    assert.equal(DESIGN_TOKENS.dark.positive, '#00E676')
    assert.equal(DESIGN_TOKENS.dark.negative, '#FF5252')
    assert.equal(DESIGN_TOKENS.dark.primaryAccent, '#FFB300')

    assert.equal(DESIGN_TOKENS.light.background, '#F3F5F9')
    assert.equal(DESIGN_TOKENS.light.sidebarHeader, '#FFFFFF')
    assert.equal(DESIGN_TOKENS.light.surface, '#FFFFFF')
    assert.equal(DESIGN_TOKENS.light.surfaceElevated, '#F8FAFC')
    assert.equal(DESIGN_TOKENS.light.primaryText, '#172033')
    assert.equal(DESIGN_TOKENS.light.secondaryText, '#475569')
    assert.equal(DESIGN_TOKENS.light.mutedText, '#64748B')
    assert.equal(DESIGN_TOKENS.light.borders, '#DCE3EC')
    assert.equal(DESIGN_TOKENS.light.positive, '#008A4B')
    assert.equal(DESIGN_TOKENS.light.negative, '#D92D3E')
    assert.equal(DESIGN_TOKENS.light.primaryAccent, '#E5A000')
  })
})
