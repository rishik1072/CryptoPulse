import { useEffect, useRef } from 'react'

export type LivePrice = {
  symbol: string
  price: number
  change: number
}

type PriceUpdate = {
  s: string
  c: string
  P: string
}

const BINANCE_WS = 'wss://stream.binance.com:443/ws'
const SYMBOLS = ['btcusdt', 'ethusdt', 'solusdt', 'xrpusdt', 'dogeusdt']

export function useBinanceLivePrices(onUpdate: (update: LivePrice) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true

    const connect = () => {
      if (wsRef.current) wsRef.current.close()

      const streams = SYMBOLS.map((s) => `${s}@ticker`).join('/')
      const ws = new WebSocket(`${BINANCE_WS}/${streams}`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('%c[Binance WS] Connected', 'color:#22c55e')
      }

      ws.onmessage = (event) => {
        try {
          const data: PriceUpdate = JSON.parse(event.data)
          const price = parseFloat(data.c)
          const change = parseFloat(data.P)

          if (!isNaN(price)) {
            onUpdate({
              symbol: data.s.replace('USDT', ''),
              price,
              change,
            })
          }
        } catch (e) {
          console.error('WS parse error', e)
        }
      }

      ws.onclose = () => {
        if (!isMounted.current) return
        console.log('%c[Binance WS] Disconnected. Reconnecting...', 'color:#f59e0b')
        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
        reconnectTimeout.current = setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      isMounted.current = false
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [onUpdate])

  // Expose connection status (non-reactive)
  const getStatus = () => {
    const ws = wsRef.current
    if (!ws) return 'disconnected'
    return ws.readyState === 1 ? 'connected' : 'connecting'
  }

  return { getStatus }
}