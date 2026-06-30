import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  addHolding: (holding: Omit<Holding, 'id'>) => void
  updateHolding: (id: string, updates: Partial<Holding>) => void
  removeHolding: (id: string) => void
  clearPortfolio: () => void
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      holdings: [],

      addHolding: (holding) => {
        const newHolding: Holding = {
          ...holding,
          id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        }
        set((state) => ({
          holdings: [...state.holdings, newHolding],
        }))
      },

      updateHolding: (id, updates) => {
        set((state) => ({
          holdings: state.holdings.map((h) =>
            h.id === id ? { ...h, ...updates } : h
          ),
        }))
      },

      removeHolding: (id) => {
        set((state) => ({
          holdings: state.holdings.filter((h) => h.id !== id),
        }))
      },

      clearPortfolio: () => set({ holdings: [] }),
    }),
    {
      name: 'cryptopulse-portfolio',
      version: 1,
    }
  )
)