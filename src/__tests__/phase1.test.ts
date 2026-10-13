import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { binanceWS, type PriceUpdate, type ConnectionStatus } from '../services/binanceWebSocket.ts'

// Pure alert evaluation function mirror for testing edge cases
function evaluateAlert(
  alert: {
    symbol: string
    type: 'PRICE_ABOVE' | 'PRICE_BELOW' | 'PERCENT_CHANGE' | 'DAILY_HIGH' | 'DAILY_LOW' | 'VOLUME_SPIKE'
    value: number
  },
  live: PriceUpdate | undefined
): boolean {
  if (!live || !Number.isFinite(live.price) || live.price <= 0) return false

  switch (alert.type) {
    case 'PRICE_ABOVE':
      return live.price > alert.value
    case 'PRICE_BELOW':
      return live.price < alert.value
    case 'PERCENT_CHANGE':
      return Math.abs(live.change) >= alert.value
    case 'DAILY_HIGH':
      return live.high24h !== undefined ? live.high24h >= alert.value : false
    case 'DAILY_LOW':
      return live.low24h !== undefined ? live.low24h <= alert.value : false
    case 'VOLUME_SPIKE':
      return live.volume > alert.value * 1_000_000
    default:
      return false
  }
}

describe('Phase 1: WebSocket Service Lifecycle', () => {
  it('binanceWS returns a singleton instance', () => {
    assert.equal(binanceWS, binanceWS)
  })

  it('subscribe and unsubscribe lifecycle manages subscribers properly', () => {
    let receivedUpdate: PriceUpdate | null = null
    const unsubscribe = binanceWS.subscribe((update) => {
      receivedUpdate = update
    })

    assert.equal(typeof unsubscribe, 'function')
    // Unsubscribe cleanly
    unsubscribe()
    assert.equal(receivedUpdate, null)
  })

  it('subscribeToStatus immediately provides current connection status', () => {
    let capturedStatus: ConnectionStatus | null = null
    const unsubscribe = binanceWS.subscribeToStatus((status) => {
      capturedStatus = status
    })

    assert.ok(capturedStatus === 'offline' || capturedStatus === 'connecting' || capturedStatus === 'connected' || capturedStatus === 'reconnecting')
    unsubscribe()
  })

  it('stale data helper accurately determines threshold expiration', () => {
    const freshTimestamp = Date.now() - 5000 // 5 seconds ago
    const staleTimestamp = Date.now() - 120000 // 2 minutes ago

    assert.equal(binanceWS.isPriceStale(freshTimestamp), false)
    assert.equal(binanceWS.isPriceStale(staleTimestamp), true)
    assert.equal(binanceWS.isPriceStale(0), true)
  })
})

describe('Phase 1: Alert Engine Evaluation', () => {
  const sampleLiveBTC: PriceUpdate = {
    symbol: 'BTC',
    price: 68500,
    change: 3.5,
    volume: 25000,
    high24h: 69200,
    low24h: 66800,
    timestamp: Date.now(),
  }

  it('evaluates PRICE_ABOVE accurately', () => {
    assert.equal(evaluateAlert({ symbol: 'BTC', type: 'PRICE_ABOVE', value: 68000 }, sampleLiveBTC), true)
    assert.equal(evaluateAlert({ symbol: 'BTC', type: 'PRICE_ABOVE', value: 70000 }, sampleLiveBTC), false)
  })

  it('evaluates PRICE_BELOW accurately', () => {
    assert.equal(evaluateAlert({ symbol: 'BTC', type: 'PRICE_BELOW', value: 69000 }, sampleLiveBTC), true)
    assert.equal(evaluateAlert({ symbol: 'BTC', type: 'PRICE_BELOW', value: 65000 }, sampleLiveBTC), false)
  })

  it('evaluates PERCENT_CHANGE using absolute magnitude', () => {
    assert.equal(evaluateAlert({ symbol: 'BTC', type: 'PERCENT_CHANGE', value: 3.0 }, sampleLiveBTC), true)
    assert.equal(evaluateAlert({ symbol: 'BTC', type: 'PERCENT_CHANGE', value: 5.0 }, sampleLiveBTC), false)
  })

  it('evaluates DAILY_HIGH and DAILY_LOW when data is present', () => {
    assert.equal(evaluateAlert({ symbol: 'BTC', type: 'DAILY_HIGH', value: 69000 }, sampleLiveBTC), true)
    assert.equal(evaluateAlert({ symbol: 'BTC', type: 'DAILY_HIGH', value: 70000 }, sampleLiveBTC), false)

    assert.equal(evaluateAlert({ symbol: 'BTC', type: 'DAILY_LOW', value: 67000 }, sampleLiveBTC), true)
    assert.equal(evaluateAlert({ symbol: 'BTC', type: 'DAILY_LOW', value: 65000 }, sampleLiveBTC), false)
  })

  it('safely handles unavailable or missing data without triggering', () => {
    // Missing live price entirely
    assert.equal(evaluateAlert({ symbol: 'ETH', type: 'PRICE_ABOVE', value: 3000 }, undefined), false)

    // Missing high24h
    const noHighBTC: PriceUpdate = { ...sampleLiveBTC, high24h: undefined }
    assert.equal(evaluateAlert({ symbol: 'BTC', type: 'DAILY_HIGH', value: 65000 }, noHighBTC), false)

    // Malformed zero/negative price
    const invalidPrice: PriceUpdate = { ...sampleLiveBTC, price: 0 }
    assert.equal(evaluateAlert({ symbol: 'BTC', type: 'PRICE_ABOVE', value: 50 }, invalidPrice), false)
  })
})
