import { create } from 'zustand'
import {
  fetchUserWatchlist,
  insertWatchlistItemDb,
  removeWatchlistItemDb,
  togglePinWatchlistItemDb,
} from '../services/watchlistService.ts'

export interface WatchlistItem {
  id: string
  coinId: string
  symbol: string
  name: string
  image: string
  pinned: boolean
  addedAt: string
}

interface WatchlistState {
  items: WatchlistItem[]
  isLoading: boolean
  error: string | null
  userId: string | null
  initializeUser: (userId: string) => Promise<void>
  addToWatchlist: (coin: Omit<WatchlistItem, 'id' | 'pinned' | 'addedAt'>) => Promise<boolean>
  removeFromWatchlist: (coinId: string) => Promise<boolean>
  togglePin: (coinId: string) => Promise<boolean>
  reorderWatchlist: (fromIndex: number, toIndex: number) => void
  clearWatchlist: () => void
}

function getCacheKey(userId: string): string {
  return `cryptopulse-watchlist-${userId}`
}

function loadFromUserCache(userId: string): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(getCacheKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToUserCache(userId: string, items: WatchlistItem[]): void {
  try {
    localStorage.setItem(getCacheKey(userId), JSON.stringify(items))
  } catch {
    // Ignore storage quota errors
  }
}

export const useWatchlistStore = create<WatchlistState>()((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  userId: null,

  initializeUser: async (userId: string) => {
    const cached = loadFromUserCache(userId)
    set({ userId, items: cached, isLoading: true, error: null })

    try {
      const dbItems = await fetchUserWatchlist(userId)
      set({ items: dbItems, isLoading: false, error: null })
      saveToUserCache(userId, dbItems)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to synchronize watchlist with database.'
      set({ isLoading: false, error: message })
    }
  },

  addToWatchlist: async (coin) => {
    const { userId, items } = get()
    const exists = items.some((item) => item.coinId === coin.coinId)
    if (exists) return true

    if (!userId) {
      set({ error: 'User must be authenticated to add coins to watchlist.' })
      return false
    }

    set({ isLoading: true, error: null })

    try {
      const persisted = await insertWatchlistItemDb(userId, coin)
      const nextItems = [...items, persisted]
      set({ items: nextItems, isLoading: false, error: null })
      saveToUserCache(userId, nextItems)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error while adding to watchlist.'
      set({ isLoading: false, error: message })
      return false
    }
  },

  removeFromWatchlist: async (coinId) => {
    const { userId, items } = get()
    if (!userId) {
      set({ error: 'User must be authenticated to remove coins from watchlist.' })
      return false
    }

    set({ isLoading: true, error: null })

    try {
      await removeWatchlistItemDb(userId, coinId)
      const nextItems = items.filter((item) => item.coinId !== coinId)
      set({ items: nextItems, isLoading: false, error: null })
      saveToUserCache(userId, nextItems)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error while removing from watchlist.'
      set({ isLoading: false, error: message })
      return false
    }
  },

  togglePin: async (coinId) => {
    const { userId, items } = get()
    if (!userId) {
      set({ error: 'User must be authenticated to update watchlist.' })
      return false
    }

    const currentItem = items.find((i) => i.coinId === coinId)
    if (!currentItem) return false
    const nextPinned = !currentItem.pinned

    set({ isLoading: true, error: null })

    try {
      await togglePinWatchlistItemDb(userId, coinId, nextPinned)
      const nextItems = items.map((item) =>
        item.coinId === coinId ? { ...item, pinned: nextPinned } : item
      )
      set({ items: nextItems, isLoading: false, error: null })
      saveToUserCache(userId, nextItems)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error while updating pin status.'
      set({ isLoading: false, error: message })
      return false
    }
  },

  reorderWatchlist: (fromIndex, toIndex) => {
    const { userId, items } = get()
    const newItems = [...items]
    const [moved] = newItems.splice(fromIndex, 1)
    if (!moved) return
    newItems.splice(toIndex, 0, moved)
    set({ items: newItems })
    if (userId) {
      saveToUserCache(userId, newItems)
    }
  },

  clearWatchlist: () => {
    set({ items: [], userId: null, error: null, isLoading: false })
  },
}))