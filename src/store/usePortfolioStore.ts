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
  addHolding: (holding: Omit<Holding, 'id'>) => boolean
  updateHolding: (id: string, updates: Partial<Holding>) => boolean
  removeHolding: (id: string) => void
  clearPortfolio: () => void
}

function isValidQuantity(qty: unknown): qty is number {
  return typeof qty === 'number' && Number.isFinite(qty) && qty > 0
}

function isValidPrice(price: unknown): price is number {
  return typeof price === 'number' && Number.isFinite(price) && price >= 0
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      holdings: [],

      addHolding: (holding) => {
        // Reject invalid quantities and prices to safeguard portfolio integrity
        if (!isValidQuantity(holding.quantity)) {
          console.warn('[PortfolioStore] Rejected holding with invalid quantity:', holding.quantity)
          return false
        }

        if (!isValidPrice(holding.avgBuyPrice)) {
          console.warn('[PortfolioStore] Rejected holding with invalid avgBuyPrice:', holding.avgBuyPrice)
          return false
        }

        if (!holding.symbol || typeof holding.symbol !== 'string') {
          console.warn('[PortfolioStore] Rejected holding with invalid symbol:', holding.symbol)
          return false
        }

        const newHolding: Holding = {
          ...holding,
          symbol: holding.symbol.trim().toUpperCase(),
          name: holding.name?.trim() || holding.symbol.trim().toUpperCase(),
          quantity: holding.quantity,
          avgBuyPrice: holding.avgBuyPrice,
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        }

        set((state) => ({
          holdings: [...state.holdings, newHolding],
        }))
        return true
      },

      updateHolding: (id, updates) => {
        if (updates.quantity !== undefined && !isValidQuantity(updates.quantity)) {
          console.warn('[PortfolioStore] Rejected update with invalid quantity:', updates.quantity)
          return false
        }

        if (updates.avgBuyPrice !== undefined && !isValidPrice(updates.avgBuyPrice)) {
          console.warn('[PortfolioStore] Rejected update with invalid avgBuyPrice:', updates.avgBuyPrice)
          return false
        }

        set((state) => ({
          holdings: state.holdings.map((h) => {
            if (h.id !== id) return h
            return {
              ...h,
              ...updates,
              symbol: updates.symbol ? updates.symbol.trim().toUpperCase() : h.symbol,
            }
          }),
        }))
        return true
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