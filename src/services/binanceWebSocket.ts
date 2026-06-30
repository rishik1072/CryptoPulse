type PriceUpdate = {
  symbol: string
  price: number
  change: number
  volume: number
  timestamp: number
}

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline'

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

  private readonly SYMBOLS = ['btcusdt', 'ethusdt', 'solusdt', 'xrpusdt', 'dogeusdt', 'bnbusdt']
  private readonly BASE_URL = 'wss://stream.binance.com:443/stream?streams='
  private readonly MAX_RECONNECT_ATTEMPTS = 10

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

    return () => {
      this.statusSubscribers.delete(callback)
    }
  }

  private connect() {
    if (this.ws) this.ws.close()

    this.setStatus('connecting')

    const streams = this.SYMBOLS.map(s => `${s}@ticker`).join('/')
    const ws = new WebSocket(`${this.BASE_URL}${streams}`)

    this.ws = ws

    ws.onopen = () => {
      this.reconnectAttempts = 0
      this.setStatus('connected')
      this.startHeartbeat()
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        const data = payload.data ?? payload

        const update: PriceUpdate = {
          symbol: data.s?.replace('USDT', '') ?? '',
          price: parseFloat(data.c ?? 0),
          change: parseFloat(data.P ?? 0),
          volume: parseFloat(data.v ?? 0),
          timestamp: Date.now(),
        }

        if (this.lastPing) {
          this.latency = Date.now() - this.lastPing
        }

        this.notifySubscribers(update)
      } catch (err) {
        console.error('[BinanceWS] Parse error', err)
      }
    }

    ws.onclose = () => {
      this.stopHeartbeat()
      this.setStatus('reconnecting')
      this.scheduleReconnect()
    }

    ws.onerror = () => {
      ws.close()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.setStatus('offline')
      return
    }

    const delay = Math.min(1000 * Math.pow(1.8, this.reconnectAttempts), 30000)
    this.reconnectAttempts++

    this.reconnectTimeout = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.lastPing = Date.now()
      // Binance doesn't require ping, but we use it for latency measurement
    }, 15000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private notifySubscribers(update: PriceUpdate) {
    this.subscribers.forEach((callback) => callback(update))
  }

  private notifyStatusSubscribers(status: ConnectionStatus) {
    this.statusSubscribers.forEach((callback) => callback(status))
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status
    this.notifyStatusSubscribers(status)
  }

  getStatus(): ConnectionStatus {
    return this.status
  }

  getLatency(): number {
    return this.latency
  }

  private disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout)
    this.stopHeartbeat()

    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }

    this.subscribers.clear()
    this.setStatus('offline')
  }

  destroy() {
    this.disconnect()
    BinanceWebSocketService.instance = null
  }
}

export const binanceWS = BinanceWebSocketService.getInstance()