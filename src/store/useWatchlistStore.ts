import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  addToWatchlist: (coin: Omit<WatchlistItem, 'id' | 'pinned' | 'addedAt'>) => void
  removeFromWatchlist: (coinId: string) => void
  togglePin: (coinId: string) => void
  reorderWatchlist: (fromIndex: number, toIndex: number) => void
  clearWatchlist: () => void
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      items: [],

      addToWatchlist: (coin) => {
        set((state) => {
          const exists = state.items.some(item => item.coinId === coin.coinId)
          if (exists) return state

          const newItem: WatchlistItem = {
            ...coin,
            id: Date.now().toString(36),
            pinned: false,
            addedAt: new Date().toISOString(),
          }
          return { items: [...state.items, newItem] }
        })
      },

      removeFromWatchlist: (coinId) => {
        set((state) => ({
          items: state.items.filter(item => item.coinId !== coinId),
        }))
      },

      togglePin: (coinId) => {
        set((state) => ({
          items: state.items.map(item =>
            item.coinId === coinId ? { ...item, pinned: !item.pinned } : item
          ),
        }))
      },

      reorderWatchlist: (fromIndex, toIndex) => {
        set((state) => {
          const newItems = [...state.items]
          const [moved] = newItems.splice(fromIndex, 1)
          newItems.splice(toIndex, 0, moved)
          return { items: newItems }
        })
      },

      clearWatchlist: () => set({ items: [] }),
    }),
    {
      name: 'cryptopulse-watchlist',
      version: 1,
    }
  )
)