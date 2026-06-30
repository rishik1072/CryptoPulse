import { create } from 'zustand'

export type LivePrice = {
  symbol: string
  price: number
  change: number
  lastUpdate: number
}

interface PriceState {
  prices: Record<string, LivePrice>
  connectionStatus: 'connected' | 'connecting' | 'disconnected'
  updatePrice: (update: Omit<LivePrice, 'lastUpdate'>) => void
  setConnectionStatus: (status: PriceState['connectionStatus']) => void
}

export const usePriceStore = create<PriceState>((set) => ({
  prices: {},
  connectionStatus: 'disconnected',

  updatePrice: (update) =>
    set((state) => {
      const existing = state.prices[update.symbol]
      
      // Prevent unnecessary updates if price hasn't changed
      if (existing && existing.price === update.price) {
        return state
      }

      return {
        prices: {
          ...state.prices,
          [update.symbol]: {
            ...update,
            lastUpdate: Date.now(),
          },
        },
      }
    }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),
}))