import { create } from 'zustand'
import {
  fetchUserHoldings,
  insertHoldingDb,
  updateHoldingDb,
  deleteHoldingDb,
} from '../services/portfolioService.ts'
import { getSession } from '../lib/supabase.ts'

export interface Holding {
  id: string
  coinId: string
  symbol: string
  name: string
  image: string
  quantity: number
  avgBuyPrice: number
  purchaseDate: string
  notes?: string
}

interface PortfolioState {
  holdings: Holding[]
  isLoading: boolean
  error: string | null
  userId: string | null
  initializeUser: (userId: string) => Promise<void>
  retrySync: () => Promise<void>
  addHolding: (holding: Omit<Holding, 'id'>) => Promise<boolean>
  updateHolding: (id: string, updates: Partial<Holding>) => Promise<boolean>
  removeHolding: (id: string) => Promise<boolean>
  clearPortfolio: () => void
}

function isValidQuantity(qty: unknown): qty is number {
  return typeof qty === 'number' && Number.isFinite(qty) && qty > 0
}

function isValidPrice(price: unknown): price is number {
  return typeof price === 'number' && Number.isFinite(price) && price >= 0
}

function getCacheKey(userId: string): string {
  return `cryptopulse-portfolio-${userId}`
}

function loadFromUserCache(userId: string): Holding[] {
  try {
    const raw = localStorage.getItem(getCacheKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToUserCache(userId: string, holdings: Holding[]): void {
  try {
    localStorage.setItem(getCacheKey(userId), JSON.stringify(holdings))
  } catch {
    // Ignore storage quota errors
  }
}

export const usePortfolioStore = create<PortfolioState>()((set, get) => ({
  holdings: [],
  isLoading: false,
  error: null,
  userId: null,

  initializeUser: async (userId: string) => {
    // Scoped hydration prevents cross-user dataset leakage
    const cached = loadFromUserCache(userId)
    if (userId.startsWith('demo-')) {
      set({ userId, holdings: cached, isLoading: false, error: null })
      return
    }
    set({ userId, holdings: cached, isLoading: true, error: null })

    try {
      const dbHoldings = await fetchUserHoldings(userId)
      set({ holdings: dbHoldings, isLoading: false, error: null })
      saveToUserCache(userId, dbHoldings)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to synchronize portfolio with database.'
      set({ isLoading: false, error: message })
    }
  },

  retrySync: async () => {
    let targetUserId = get().userId
    if (!targetUserId) {
      try {
        const { data } = await getSession()
        targetUserId = data?.session?.user?.id || null
      } catch {
        // Ignore auth session retrieval failure
      }
    }
    if (targetUserId) {
      await get().initializeUser(targetUserId)
    }
  },

  addHolding: async (holding) => {
    if (!isValidQuantity(holding.quantity)) {
      console.warn('[PortfolioStore] Rejected holding with invalid quantity:', holding.quantity)
      set({ error: 'Quantity must be a positive finite number.' })
      return false
    }

    if (!isValidPrice(holding.avgBuyPrice)) {
      console.warn('[PortfolioStore] Rejected holding with invalid avgBuyPrice:', holding.avgBuyPrice)
      set({ error: 'Price must be a valid non-negative number.' })
      return false
    }

    if (!holding.symbol || typeof holding.symbol !== 'string') {
      console.warn('[PortfolioStore] Rejected holding with invalid symbol:', holding.symbol)
      set({ error: 'Valid cryptocurrency symbol is required.' })
      return false
    }

    const { userId } = get()
    if (!userId) {
      set({ error: 'User must be authenticated to add holdings.' })
      return false
    }

    set({ isLoading: true, error: null })

    try {
      const persisted = await insertHoldingDb(userId, {
        ...holding,
        symbol: holding.symbol.trim().toUpperCase(),
        name: holding.name?.trim() || holding.symbol.trim().toUpperCase(),
      })

      const nextHoldings = [...get().holdings, persisted]
      set({ holdings: nextHoldings, isLoading: false, error: null })
      saveToUserCache(userId, nextHoldings)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error while saving holding.'
      set({ isLoading: false, error: message })
      return false
    }
  },

  updateHolding: async (id, updates) => {
    if (updates.quantity !== undefined && !isValidQuantity(updates.quantity)) {
      console.warn('[PortfolioStore] Rejected update with invalid quantity:', updates.quantity)
      set({ error: 'Updated quantity must be positive and finite.' })
      return false
    }

    if (updates.avgBuyPrice !== undefined && !isValidPrice(updates.avgBuyPrice)) {
      console.warn('[PortfolioStore] Rejected update with invalid avgBuyPrice:', updates.avgBuyPrice)
      set({ error: 'Updated price must be non-negative.' })
      return false
    }

    const { userId, holdings } = get()
    if (!userId) {
      set({ error: 'User must be authenticated to update holdings.' })
      return false
    }

    set({ isLoading: true, error: null })

    try {
      await updateHoldingDb(userId, id, updates)
      const nextHoldings = holdings.map((h) => {
        if (h.id !== id) return h
        return {
          ...h,
          ...updates,
          symbol: updates.symbol ? updates.symbol.trim().toUpperCase() : h.symbol,
        }
      })
      set({ holdings: nextHoldings, isLoading: false, error: null })
      saveToUserCache(userId, nextHoldings)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error while updating holding.'
      set({ isLoading: false, error: message })
      return false
    }
  },

  removeHolding: async (id) => {
    const { userId, holdings } = get()
    if (!userId) {
      set({ error: 'User must be authenticated to remove holdings.' })
      return false
    }

    set({ isLoading: true, error: null })

    try {
      await deleteHoldingDb(userId, id)
      const nextHoldings = holdings.filter((h) => h.id !== id)
      set({ holdings: nextHoldings, isLoading: false, error: null })
      saveToUserCache(userId, nextHoldings)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error while deleting holding.'
      set({ isLoading: false, error: message })
      return false
    }
  },

  clearPortfolio: () => {
    set({ holdings: [], userId: null, error: null, isLoading: false })
  },
}))