import { create } from 'zustand'
import { binanceWS, type ConnectionStatus } from '@/services/binanceWebSocket'

export type LivePrice = {
  symbol: string
  price: number
  change: number
  volume: number
  baseVolume?: number
  quoteVolume?: number
  timestamp: number
  high24h?: number
  low24h?: number
}

export type PriceStatus = 'live' | 'stale' | 'unavailable'

interface LivePriceState {
  prices: Record<string, LivePrice>
  priceHistory: Record<string, number[]>
  connectionStatus: ConnectionStatus
  lastUpdate: number | null
  latency: number

  subscribeToLivePrices: () => () => void
  getPriceStatus: (symbol: string) => PriceStatus
}

export const useLivePriceStore = create<LivePriceState>((set, get) => ({
  prices: {},
  priceHistory: {},
  connectionStatus: 'offline',
  lastUpdate: null,
  latency: 0,

  subscribeToLivePrices: () => {
    const unsubscribePriceUpdates = binanceWS.subscribe((update) => {
      // Reject malformed or non-finite updates
      if (!update.symbol || !Number.isFinite(update.price) || update.price <= 0) {
        return
      }

      set((state) => {
        const upper = update.symbol.toUpperCase()
        const lower = update.symbol.toLowerCase()
        const prevHistory = state.priceHistory[upper] || []
        const isDuplicateLast = prevHistory.length > 0 && prevHistory[prevHistory.length - 1] === update.price
        const nextHistory = isDuplicateLast ? prevHistory : [...prevHistory, update.price].slice(-25)

        return {
          prices: {
            ...state.prices,
            [upper]: update,
            [lower]: update,
          },
          priceHistory: {
            ...state.priceHistory,
            [upper]: nextHistory,
            [lower]: nextHistory,
          },
          lastUpdate: update.timestamp,
          connectionStatus: binanceWS.getStatus(),
          latency: binanceWS.getLatency(),
        }
      })
    })

    const unsubscribeStatusUpdates = binanceWS.subscribeToStatus((status) => {
      set({ connectionStatus: status })
    })

    // Initial status sync
    set({ connectionStatus: binanceWS.getStatus() })

    return () => {
      unsubscribePriceUpdates()
      unsubscribeStatusUpdates()
    }
  },

  getPriceStatus: (symbol: string): PriceStatus => {
    const upper = symbol.toUpperCase()
    const item = get().prices[upper]
    if (!item || !Number.isFinite(item.price) || item.price <= 0) {
      return 'unavailable'
    }

    if (binanceWS.isPriceStale(item.timestamp)) {
      return 'stale'
    }

    return 'live'
  },
}))