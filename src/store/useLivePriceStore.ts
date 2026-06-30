import { create } from 'zustand'
import { binanceWS } from '@/services/binanceWebSocket'

export type LivePrice = {
  symbol: string
  price: number
  change: number
  volume: number
  timestamp: number
}

interface LivePriceState {
  prices: Record<string, LivePrice>
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'offline'
  lastUpdate: number | null
  latency: number

  subscribeToLivePrices: () => () => void
}

export const useLivePriceStore = create<LivePriceState>((set) => ({
  prices: {},
  connectionStatus: 'offline',
  lastUpdate: null,
  latency: 0,

  subscribeToLivePrices: () => {
    const unsubscribePriceUpdates = binanceWS.subscribe((update) => {
      set((state) => ({
        prices: {
          ...state.prices,
          [update.symbol]: update,
        },
        lastUpdate: update.timestamp,
        connectionStatus: binanceWS.getStatus(),
        latency: binanceWS.getLatency(),
      }))
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
}))