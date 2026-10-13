export type PriceUpdate = {
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

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline'

type Subscriber = (update: PriceUpdate) => void
type StatusSubscriber = (status: ConnectionStatus) => void

class BinanceWebSocketService {
  private static instance: BinanceWebSocketService | null = null
  private ws: WebSocket | null = null
  private subscribers = new Set<Subscriber>()
  private statusSubscribers = new Set<StatusSubscriber>()
  private reconnectAttempts = 0
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private status: ConnectionStatus = 'offline'
  private lastPing = 0
  private latency = 0
  private lastMessageTime = 0

  private readonly SYMBOLS = ['btcusdt', 'ethusdt', 'solusdt', 'xrpusdt', 'dogeusdt', 'bnbusdt']
  private readonly BASE_URL = 'wss://stream.binance.com:443/stream?streams='
  private readonly MAX_RECONNECT_ATTEMPTS = 10
  private readonly STALE_DATA_THRESHOLD_MS = 60000 // 60 seconds

  private constructor() {}

  static getInstance(): BinanceWebSocketService {
    if (!BinanceWebSocketService.instance) {
      BinanceWebSocketService.instance = new BinanceWebSocketService()
    }
    return BinanceWebSocketService.instance
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback)

    if (this.subscribers.size === 1) {
      this.connect()
    }

    return () => {
      this.subscribers.delete(callback)
      if (this.subscribers.size === 0) {
        this.disconnect()
      }
    }
  }

  subscribeToStatus(callback: StatusSubscriber): () => void {
    this.statusSubscribers.add(callback)
    // Immediately notify new subscriber of current status
    callback(this.status)

    return () => {
      this.statusSubscribers.delete(callback)
    }
  }

  private connect() {
    // Clear any existing reconnect timer
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    // Prevent duplicate connections if already connected or connecting
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    // Clean up any existing inactive socket cleanly
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onerror = null
      this.ws.onclose = null
      try {
        this.ws.close()
      } catch {
        // Ignore close error on stale socket
      }
      this.ws = null
    }

    this.setStatus('connecting')

    try {
      const streams = this.SYMBOLS.map(s => `${s}@ticker`).join('/')
      const ws = new WebSocket(`${this.BASE_URL}${streams}`)
      this.ws = ws

      ws.onopen = () => {
        if (this.ws !== ws) return
        this.reconnectAttempts = 0
        this.lastMessageTime = Date.now()
        this.setStatus('connected')
        this.startHeartbeat()
      }

      ws.onmessage = (event) => {
        if (this.ws !== ws) return
        try {
          const payload = JSON.parse(event.data)
          const data = payload.data ?? payload

          const rawSymbol = data.s?.replace('USDT', '') ?? ''
          if (!rawSymbol) return

          const rawPrice = parseFloat(data.c ?? '')
          const rawChange = parseFloat(data.P ?? '')
          const rawBaseVolume = parseFloat(data.v ?? '')
          const rawQuoteVolume = parseFloat(data.q ?? '')
          const rawHigh = parseFloat(data.h ?? '')
          const rawLow = parseFloat(data.l ?? '')

          // Validate against malformed or non-finite values
          if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
            return
          }

          const baseVolume = Number.isFinite(rawBaseVolume) && rawBaseVolume >= 0 ? rawBaseVolume : 0
          const quoteVolume = Number.isFinite(rawQuoteVolume) && rawQuoteVolume >= 0 ? rawQuoteVolume : undefined

          const update: PriceUpdate = {
            symbol: rawSymbol,
            price: rawPrice,
            change: Number.isFinite(rawChange) ? rawChange : 0,
            volume: baseVolume,
            baseVolume,
            quoteVolume,
            high24h: Number.isFinite(rawHigh) && rawHigh > 0 ? rawHigh : undefined,
            low24h: Number.isFinite(rawLow) && rawLow > 0 ? rawLow : undefined,
            timestamp: Date.now(),
          }

          this.lastMessageTime = Date.now()

          if (this.lastPing) {
            this.latency = Math.max(0, Date.now() - this.lastPing)
          }

          this.notifySubscribers(update)
        } catch (err) {
          console.error('[BinanceWS] Malformed packet received', err)
        }
      }

      ws.onclose = () => {
        if (this.ws !== ws) return
        this.stopHeartbeat()
        this.ws = null

        // If there are still active subscribers, handle reconnection
        if (this.subscribers.size > 0) {
          if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
            this.setStatus('offline')
          } else {
            this.setStatus('reconnecting')
            this.scheduleReconnect()
          }
        } else {
          this.setStatus('offline')
        }
      }

      ws.onerror = () => {
        if (this.ws !== ws) return
        // Trigger close to initiate safe cleanup through onclose
        try {
          ws.close()
        } catch {
          // Ignore close errors
        }
      }
    } catch (err) {
      console.error('[BinanceWS] Connection initiation error', err)
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.subscribers.size === 0) {
      this.setStatus('offline')
      return
    }

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.setStatus('offline')
      return
    }

    // Exponential backoff capped at 30 seconds
    const delay = Math.min(1000 * Math.pow(1.8, this.reconnectAttempts), 30000)
    this.reconnectAttempts++

    this.reconnectTimeout = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      this.lastPing = Date.now()

      // Stale data detection: if connected but received nothing for 45 seconds, reconnect
      if (this.status === 'connected' && this.lastMessageTime > 0) {
        const timeSinceLastMessage = Date.now() - this.lastMessageTime
        if (timeSinceLastMessage > 45000) {
          console.warn('[BinanceWS] Stale socket detected (no messages for >45s). Reconnecting...')
          this.disconnectSocketOnly()
          this.scheduleReconnect()
        }
      }
    }, 15000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private notifySubscribers(update: PriceUpdate) {
    this.subscribers.forEach((callback) => {
      try {
        callback(update)
      } catch (err) {
        console.error('[BinanceWS] Subscriber callback error:', err)
      }
    })
  }

  private notifyStatusSubscribers(status: ConnectionStatus) {
    this.statusSubscribers.forEach((callback) => {
      try {
        callback(status)
      } catch (err) {
        console.error('[BinanceWS] Status subscriber callback error:', err)
      }
    })
  }

  private setStatus(status: ConnectionStatus) {
    if (this.status !== status) {
      this.status = status
      this.notifyStatusSubscribers(status)
    }
  }

  getStatus(): ConnectionStatus {
    return this.status
  }

  getLatency(): number {
    return this.latency
  }

  getLastMessageTime(): number {
    return this.lastMessageTime
  }

  isPriceStale(timestamp: number, maxAgeMs = this.STALE_DATA_THRESHOLD_MS): boolean {
    if (!timestamp || timestamp <= 0) return true
    return Date.now() - timestamp > maxAgeMs
  }

  reconnect() {
    this.reconnectAttempts = 0
    this.connect()
  }

  private disconnectSocketOnly() {
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onerror = null
      this.ws.onclose = null
      try {
        this.ws.close()
      } catch {
        // Ignore
      }
      this.ws = null
    }
  }

  private disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    this.stopHeartbeat()
    this.disconnectSocketOnly()
    this.reconnectAttempts = 0
    this.setStatus('offline')
  }

  destroy() {
    this.disconnect()
    this.subscribers.clear()
    this.statusSubscribers.clear()
    BinanceWebSocketService.instance = null
  }
}

export const binanceWS = BinanceWebSocketService.getInstance()