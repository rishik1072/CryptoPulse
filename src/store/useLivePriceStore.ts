import { create } from 'zustand'
import { binanceWS, type ConnectionStatus, type PriceUpdate } from '../services/binanceWebSocket.ts'

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

let subscriberCount = 0
let cleanups: (() => void) | null = null
const pendingUpdates = new Map<string, PriceUpdate>()
let rafId: number | null = null
let timeoutId: ReturnType<typeof setTimeout> | null = null

function flushPendingUpdates(set: (fn: (state: LivePriceState) => Partial<LivePriceState>) => void) {
  rafId = null
  timeoutId = null

  if (pendingUpdates.size === 0) return

  const updates = Array.from(pendingUpdates.values())
  pendingUpdates.clear()

  set((state) => {
    let hasChanges = false
    const nextPrices = { ...state.prices }
    const nextHistory = { ...state.priceHistory }
    let latestTimestamp = state.lastUpdate

    for (const update of updates) {
      const upper = update.symbol.toUpperCase()
      const lower = update.symbol.toLowerCase()

      nextPrices[upper] = update
      nextPrices[lower] = update
      hasChanges = true

      const prevHistory = nextHistory[upper] || []
      const isDuplicateLast = prevHistory.length > 0 && prevHistory[prevHistory.length - 1] === update.price
      const updatedHistory = isDuplicateLast ? prevHistory : [...prevHistory, update.price].slice(-25)

      nextHistory[upper] = updatedHistory
      nextHistory[lower] = updatedHistory

      if (!latestTimestamp || update.timestamp > latestTimestamp) {
        latestTimestamp = update.timestamp
      }
    }

    if (!hasChanges) return {}

    return {
      prices: nextPrices,
      priceHistory: nextHistory,
      lastUpdate: latestTimestamp,
      connectionStatus: binanceWS.getStatus(),
      latency: binanceWS.getLatency(),
    }
  })
}

function queuePriceUpdate(
  update: PriceUpdate,
  set: (fn: (state: LivePriceState) => Partial<LivePriceState>) => void
) {
  pendingUpdates.set(update.symbol.toUpperCase(), update)

  if (rafId !== null || timeoutId !== null) return

  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    rafId = window.requestAnimationFrame(() => flushPendingUpdates(set))
  } else {
    timeoutId = setTimeout(() => flushPendingUpdates(set), 16)
  }
}

export const useLivePriceStore = create<LivePriceState>((set, get) => ({
  prices: {},
  priceHistory: {},
  connectionStatus: 'offline',
  lastUpdate: null,
  latency: 0,

  subscribeToLivePrices: () => {
    subscriberCount++

    if (subscriberCount === 1) {
      const unsubscribePriceUpdates = binanceWS.subscribe((update) => {
        // Reject malformed or non-finite updates
        if (!update.symbol || !Number.isFinite(update.price) || update.price <= 0) {
          return
        }

        queuePriceUpdate(update, set)
      })

      const unsubscribeStatusUpdates = binanceWS.subscribeToStatus((status) => {
        set({ connectionStatus: status })
      })

      // Initial status sync
      set({ connectionStatus: binanceWS.getStatus() })

      cleanups = () => {
        unsubscribePriceUpdates()
        unsubscribeStatusUpdates()
        if (rafId !== null && typeof window !== 'undefined') {
          window.cancelAnimationFrame(rafId)
          rafId = null
        }
        if (timeoutId !== null) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        pendingUpdates.clear()
      }
    }

    return () => {
      subscriberCount--
      if (subscriberCount <= 0) {
        subscriberCount = 0
        if (cleanups) {
          cleanups()
          cleanups = null
        }
      }
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