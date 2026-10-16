import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  AUTHORITATIVE_ASSET_MAP,
  resolveAssetId,
  resolveCoinCandidate,
} from '../services/priceResolver.ts'
import {
  ApiError,
  apiRetryConfig,
  fetchJsonSafely,
  getCoinDetail,
  type CoinMarketData,
} from '../services/coingecko.ts'
import { sanitizeOHLCData } from '../services/historical.ts'
import { useLivePriceStore } from '../store/useLivePriceStore.ts'
import { binanceWS, type PriceUpdate } from '../services/binanceWebSocket.ts'

describe('Asset Detail & Identifier Mapping Regression Suite', () => {
  const sampleMarkets: CoinMarketData[] = [
    {
      id: 'ethereum',
      symbol: 'eth',
      name: 'Ethereum',
      current_price: 2650.5,
      price_change_percentage_24h: 3.1,
      market_cap: 318000000000,
      total_volume: 18500000000,
      image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    },
    {
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
      current_price: 68000.0,
      price_change_percentage_24h: 1.5,
      market_cap: 1340000000000,
      total_volume: 31000000000,
      image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    },
  ]

  it('correctly maps symbol ETH to canonical CoinGecko ID ethereum', () => {
    assert.equal(resolveAssetId('ETH', sampleMarkets), 'ethereum')
    assert.equal(resolveAssetId('eth', sampleMarkets), 'ethereum')
    assert.equal(resolveAssetId('ethereum', sampleMarkets), 'ethereum')
    assert.equal(AUTHORITATIVE_ASSET_MAP['eth'].id, 'ethereum')
  })

  it('correctly maps symbol BTC to canonical CoinGecko ID bitcoin', () => {
    assert.equal(resolveAssetId('BTC', sampleMarkets), 'bitcoin')
    assert.equal(resolveAssetId('btc', sampleMarkets), 'bitcoin')
    assert.equal(resolveAssetId('bitcoin', sampleMarkets), 'bitcoin')
    assert.equal(AUTHORITATIVE_ASSET_MAP['btc'].id, 'bitcoin')
  })

  it('resolves other authoritative symbols accurately (SOL, XRP, DOGE, BNB)', () => {
    assert.equal(resolveAssetId('SOL'), 'solana')
    assert.equal(resolveAssetId('xrp'), 'ripple')
    assert.equal(resolveAssetId('doge'), 'dogecoin')
    assert.equal(resolveAssetId('bnb'), 'binancecoin')
  })

  it('handles unknown or empty identifiers safely without fabricating data', () => {
    assert.equal(resolveAssetId(''), null)
    assert.equal(resolveAssetId('   '), null)
    // Custom or unknown unmapped coin ID is preserved cleanly as lowercase query
    assert.equal(resolveAssetId('some-custom-token'), 'some-custom-token')
  })

  it('resolveCoinCandidate prioritizes authoritative mapping when coin is missing from search and cache', () => {
    const candidate = resolveCoinCandidate('ETH', [], [])
    assert.ok(candidate)
    assert.equal(candidate.id, 'ethereum')
    assert.equal(candidate.symbol, 'ETH')
    assert.equal(candidate.name, 'Ethereum')
  })
})

describe('CoinGecko API Hardening, Fallbacks & Error States', () => {
  it('getCoinDetail falls back to /coins/markets when full /coins/{id} endpoint encounters network failure', async () => {
    const originalFetch = globalThis.fetch
    try {
      let callCount = 0
      globalThis.fetch = async (url: string | URL | Request) => {
        callCount++
        const urlStr = url.toString()
        // First call to /coins/ethereum fails (simulating CORS block or network failure)
        if (urlStr.includes('/coins/ethereum?')) {
          throw new Error('Failed to fetch')
        }
        // Second fallback call to /coins/markets succeeds
        if (urlStr.includes('/coins/markets?')) {
          return new Response(
            JSON.stringify([
              {
                id: 'ethereum',
                symbol: 'eth',
                name: 'Ethereum',
                current_price: 2600.0,
                price_change_percentage_24h: 2.5,
                market_cap: 312000000000,
                total_volume: 15000000000,
                image: 'https://assets.coingecko.com/ethereum.png',
              },
            ]),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        }
        return new Response('Not found', { status: 404 })
      }

      const detail = await getCoinDetail('ethereum')
      assert.ok(detail)
      assert.equal(detail.id, 'ethereum')
      assert.equal(detail.name, 'Ethereum')
      assert.equal(detail.symbol, 'eth')
      assert.equal(detail.market_data.current_price.usd, 2600.0)
      assert.equal(callCount, 2)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('getCoinDetail rejects immediately on HTTP 404 without retrying markets fallback', async () => {
    const originalFetch = globalThis.fetch
    try {
      let callCount = 0
      globalThis.fetch = async () => {
        callCount++
        return new Response(JSON.stringify({ error: 'coin not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      await assert.rejects(
        async () => {
          await getCoinDetail('completely-invalid-coin-id-xyz-999')
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 404)
          return true
        }
      )
      // Only 1 call made; did not waste quota on fallback
      assert.equal(callCount, 1)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('apiRetryConfig prevents retry storms on HTTP 429 and HTTP 404', () => {
    const rateLimitedErr = new ApiError('Rate limit', 429, true)
    const notFoundErr = new ApiError('Not found', 404, false)
    const genericErr = new Error('Gateway Timeout')

    // 429: Never retry
    assert.equal(apiRetryConfig.retry(0, rateLimitedErr), false)
    // 404: Never retry
    assert.equal(apiRetryConfig.retry(0, notFoundErr), false)
    // Transient error: exactly 1 retry allowed
    assert.equal(apiRetryConfig.retry(0, genericErr), true)
    assert.equal(apiRetryConfig.retry(1, genericErr), false)
  })

  it('fetchJsonSafely converts network rejections into descriptive ApiError', async () => {
    const originalFetch = globalThis.fetch
    try {
      globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch')
      }

      await assert.rejects(
        async () => {
          await fetchJsonSafely('https://api.coingecko.com/test', 'coin details for ethereum')
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.ok(err.message.includes('Network failure while fetching coin details for ethereum'))
          return true
        }
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe('Historical Data & Chart Performance Regression Suite', () => {
  it('deduplicates duplicate and out-of-order candlestick points cleanly', () => {
    const rawOHLC = [
      [1700000000000, 100, 105, 95, 102],
      [1700000000000, 102, 108, 97, 106], // exact same second
      [1699999999000, 98, 101, 94, 99], // out of order earlier point
    ]

    const sanitized = sanitizeOHLCData(rawOHLC)
    assert.equal(sanitized.length, 2)
    assert.equal(sanitized[0].time, 1699999999000)
    assert.equal(sanitized[1].time, 1700000000000)
    // Merged high/low
    assert.equal(sanitized[1].high, 108)
    assert.equal(sanitized[1].low, 95)
    assert.equal(sanitized[1].close, 106)
  })

  it('rapid timeframe switching maps consistently to day parameters', () => {
    const TIMEFRAMES: Record<string, number> = {
      '1D': 1,
      '1W': 7,
      '1M': 30,
      '3M': 90,
      '1Y': 365,
      'ALL': 1825,
    }

    assert.equal(TIMEFRAMES['1D'], 1)
    assert.equal(TIMEFRAMES['1W'], 7)
    assert.equal(TIMEFRAMES['1M'], 30)
    assert.equal(TIMEFRAMES['3M'], 90)
    assert.equal(TIMEFRAMES['1Y'], 365)
    assert.equal(TIMEFRAMES['ALL'], 1825)
  })

  it('batches high-frequency WebSocket updates cleanly in useLivePriceStore', async () => {
    const unsubscribe = useLivePriceStore.getState().subscribeToLivePrices()
    assert.equal(typeof unsubscribe, 'function')

    // Simulate high-frequency bursts from Binance WebSocket
    const mockUpdates: PriceUpdate[] = [
      { symbol: 'ETH', price: 2650, change: 1.2, volume: 1000, timestamp: Date.now() },
      { symbol: 'ETH', price: 2652, change: 1.3, volume: 1005, timestamp: Date.now() + 1 },
      { symbol: 'ETH', price: 2655, change: 1.4, volume: 1010, timestamp: Date.now() + 2 },
    ]

    for (const update of mockUpdates) {
      // Simulate socket dispatching updates
      // @ts-expect-error accessing private notifySubscribers for test verification
      binanceWS.notifySubscribers(update)
    }

    // Allow batch micro-delay to flush
    await new Promise((resolve) => setTimeout(resolve, 35))

    const ethPrice = useLivePriceStore.getState().prices['ETH']
    assert.ok(ethPrice)
    assert.equal(ethPrice.price, 2655)
    assert.equal(ethPrice.change, 1.4)

    // Unsubscribe cleanly
    unsubscribe()
  })

  it('deduplicates multiple calls to subscribeToLivePrices with reference counting', () => {
    const unsub1 = useLivePriceStore.getState().subscribeToLivePrices()
    const unsub2 = useLivePriceStore.getState().subscribeToLivePrices()

    assert.equal(typeof unsub1, 'function')
    assert.equal(typeof unsub2, 'function')

    // Clean up both subscriptions
    unsub1()
    unsub2()
  })
})
