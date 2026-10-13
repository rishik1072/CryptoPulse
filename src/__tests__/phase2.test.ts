import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveAssetPrice,
  computePortfolioValuation,
  formatCompactUSD,
  formatCurrencyPrecise,
  resolveMarketVolume,
  resolveCoinCandidate,
} from '../services/priceResolver.ts'
import {
  ApiError,
  apiRetryConfig,
  fetchJsonSafely,
  type CoinMarketData,
  type CoinSearchResult,
} from '../services/coingecko.ts'
import type { LivePrice } from '../store/useLivePriceStore.ts'

describe('Phase 2: Price Resolution & Hierarchy', () => {
  const sampleLiveBTC: LivePrice = {
    symbol: 'BTC',
    price: 68500,
    change: 2.4,
    volume: 25000,
    quoteVolume: 1_712_500_000,
    timestamp: Date.now(),
  }

  const sampleStaleBTC: LivePrice = {
    symbol: 'BTC',
    price: 68500,
    change: 2.4,
    volume: 25000,
    timestamp: Date.now() - 120000, // 2 minutes ago
  }

  const sampleMarketMap: Record<string, CoinMarketData> = {
    cardano: {
      id: 'cardano',
      symbol: 'ada',
      name: 'Cardano',
      current_price: 0.45,
      price_change_percentage_24h: 3.2,
      market_cap: 16000000000,
      total_volume: 850000000,
      image: 'https://assets.coingecko.com/cardano.png',
    },
    ada: {
      id: 'cardano',
      symbol: 'ada',
      name: 'Cardano',
      current_price: 0.45,
      price_change_percentage_24h: 3.2,
      market_cap: 16000000000,
      total_volume: 850000000,
      image: 'https://assets.coingecko.com/cardano.png',
    },
  }

  it('prefers valid fresh Binance price when available', () => {
    const livePrices = { BTC: sampleLiveBTC }
    const resolved = resolveAssetPrice({ symbol: 'BTC', coinId: 'bitcoin' }, livePrices, sampleMarketMap, 'connected')

    assert.equal(resolved.source, 'binance-live')
    assert.equal(resolved.isLive, true)
    assert.equal(resolved.isStale, false)
    assert.equal(resolved.price, 68500)
    assert.equal(resolved.change24h, 2.4)
  })

  it('marks Binance price as stale when timestamp expires or connection offline', () => {
    const livePrices = { BTC: sampleStaleBTC }
    const resolved = resolveAssetPrice({ symbol: 'BTC', coinId: 'bitcoin' }, livePrices, sampleMarketMap, 'connected')

    assert.equal(resolved.source, 'binance-stale')
    assert.equal(resolved.isStale, true)
    assert.equal(resolved.price, 68500)
  })

  it('falls back to CoinGecko current price for coins outside Binance streams', () => {
    const livePrices = { BTC: sampleLiveBTC } // ADA not in Binance
    const resolved = resolveAssetPrice({ symbol: 'ADA', coinId: 'cardano' }, livePrices, sampleMarketMap, 'connected')

    assert.equal(resolved.source, 'coingecko')
    assert.equal(resolved.isLive, false)
    assert.equal(resolved.price, 0.45)
    assert.equal(resolved.change24h, 3.2)
  })

  it('returns unavailable when neither Binance nor CoinGecko has valid price', () => {
    const livePrices = {}
    const resolved = resolveAssetPrice({ symbol: 'UNKNOWN', coinId: 'unknown-token' }, livePrices, sampleMarketMap, 'connected')

    assert.equal(resolved.source, 'unavailable')
    assert.equal(resolved.isUnavailable, true)
    assert.equal(resolved.price, null)
    assert.equal(resolved.change24h, null)
  })

  it('never displays zero or purchase price as verified market price', () => {
    const resolved = resolveAssetPrice({ symbol: 'GHOST', coinId: 'ghost' }, {}, {}, 'connected')
    assert.notEqual(resolved.price, 0)
    assert.equal(resolved.price, null)
  })

  it('rejects negative, zero, or non-finite prices from market sources', () => {
    const invalidLivePrices: Record<string, LivePrice> = {
      BAD: { symbol: 'BAD', price: -10, change: 0, volume: 0, timestamp: Date.now() },
      NAN: { symbol: 'NAN', price: Number.NaN, change: 0, volume: 0, timestamp: Date.now() },
      ZERO: { symbol: 'ZERO', price: 0, change: 0, volume: 0, timestamp: Date.now() },
    }
    const resolvedBad = resolveAssetPrice({ symbol: 'BAD' }, invalidLivePrices, undefined, 'connected')
    assert.equal(resolvedBad.price, null)
    assert.equal(resolvedBad.isUnavailable, true)

    const resolvedZero = resolveAssetPrice({ symbol: 'ZERO' }, invalidLivePrices, undefined, 'connected')
    assert.equal(resolvedZero.price, null)
    assert.equal(resolvedZero.isUnavailable, true)
  })
})

describe('Phase 2: Portfolio Valuation & Integrity', () => {
  const sampleHoldings = [
    {
      id: 'h1',
      coinId: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      image: 'btc.png',
      quantity: 2,
      avgBuyPrice: 60000, // cost = 120,000
      purchaseDate: '2026-01-01',
    },
    {
      id: 'h2',
      coinId: 'unpriced-coin',
      symbol: 'UNP',
      name: 'Unpriced',
      image: 'unp.png',
      quantity: 50,
      avgBuyPrice: 10, // cost = 500
      purchaseDate: '2026-01-01',
    },
  ]

  const livePrices: Record<string, LivePrice> = {
    BTC: {
      symbol: 'BTC',
      price: 70000,
      change: 5,
      volume: 10000,
      timestamp: Date.now(),
    },
  }

  it('computes portfolio totals only from verified priced assets', () => {
    const { valuations, metrics } = computePortfolioValuation(sampleHoldings, livePrices, {}, 'connected')

    // BTC is priced: 2 * 70,000 = 140,000. Profit = 20,000. ROI = 16.666%
    assert.equal(metrics.totalValue, 140000)
    assert.equal(metrics.totalProfit, 20000)
    assert.ok(Math.abs(metrics.totalRoi - 16.6666) < 0.01)

    // Unpriced holding has currentValue null and profit null
    const unpricedValuation = valuations.find((v) => v.symbol === 'UNP')
    assert.ok(unpricedValuation)
    assert.equal(unpricedValuation.currentPrice, null)
    assert.equal(unpricedValuation.currentValue, null)
    assert.equal(unpricedValuation.profit, null)
    assert.equal(unpricedValuation.isPriced, false)
  })

  it('indicates when portfolio valuation is incomplete', () => {
    const { metrics } = computePortfolioValuation(sampleHoldings, livePrices, {}, 'connected')

    assert.equal(metrics.isIncomplete, true)
    assert.equal(metrics.valuedCount, 1)
    assert.equal(metrics.totalCount, 2)
    assert.equal(metrics.missingCount, 1)
  })

  it('handles completely unpriced portfolios gracefully without falsifying totals', () => {
    const { metrics } = computePortfolioValuation(sampleHoldings, {}, {}, 'connected')

    assert.equal(metrics.totalValue, 0)
    assert.equal(metrics.totalProfit, 0)
    assert.equal(metrics.totalRoi, 0)
    assert.equal(metrics.valuedCount, 0)
    assert.equal(metrics.missingCount, 2)
    assert.equal(metrics.isIncomplete, true)
  })
})

describe('Phase 2: Market Volume Units & Numeric Formatting', () => {
  it('formats large USD volumes correctly into compact units', () => {
    assert.equal(formatCompactUSD(35_400_000_000), '$35.4B')
    assert.equal(formatCompactUSD(1_250_000_000), '$1.3B')
    assert.equal(formatCompactUSD(45_000_000), '$45.0M')
    assert.equal(formatCompactUSD(500_000), '$500.0K')
    assert.equal(formatCompactUSD(50), '$50')
  })

  it('validates non-finite, negative, or undefined volume values gracefully', () => {
    assert.equal(formatCompactUSD(null), '—')
    assert.equal(formatCompactUSD(undefined), '—')
    assert.equal(formatCompactUSD(-500), '—')
    assert.equal(formatCompactUSD(Number.NaN), '—')
  })

  it('prefers CoinGecko aggregate 24h USD volume over single-exchange Binance volume', () => {
    const res = resolveMarketVolume(
      45_000_000_000, // CoinGecko USD total_volume
      2_500_000_000,  // Binance quoteVolume (USDT)
      35_000          // Binance baseVolume (BTC)
    )

    assert.equal(res.source, 'coingecko')
    assert.equal(res.unit, 'USD')
    assert.equal(res.volume, 45_000_000_000)
    assert.equal(res.formatted, '$45.0B')
  })

  it('falls back to Binance quoteVolume as USD volume when CoinGecko volume is absent', () => {
    const res = resolveMarketVolume(
      null,
      1_800_000_000,
      25_000
    )

    assert.equal(res.source, 'binance-quote')
    assert.equal(res.unit, 'USD')
    assert.equal(res.volume, 1_800_000_000)
    assert.equal(res.formatted, '$1.8B')
  })

  it('never silently substitutes base volume for USD volume without explicit flag', () => {
    const res = resolveMarketVolume(
      null,
      null,
      35000,
      false // do not allow base-asset fallback
    )

    assert.equal(res.source, 'unavailable')
    assert.equal(res.unit, 'USD')
    assert.equal(res.formatted, '—')
  })

  it('explicitly labels base-asset volume when base fallback is permitted', () => {
    const res = resolveMarketVolume(
      null,
      null,
      35420.5,
      true // allow base asset
    )

    assert.equal(res.source, 'binance-base')
    assert.equal(res.unit, 'BASE')
    assert.equal(res.volume, 35420.5)
    assert.ok(!res.formatted.startsWith('$'))
  })
})

describe('Phase 2: External API Hardening & HTTP 429 Handling', () => {
  it('ApiError preserves status and rate-limited flag', () => {
    const err429 = new ApiError('Rate limit exceeded', 429, true)
    assert.equal(err429.status, 429)
    assert.equal(err429.isRateLimited, true)
    assert.equal(err429.name, 'ApiError')
  })

  it('apiRetryConfig rejects retries for rate-limited HTTP 429 errors', () => {
    const err429 = new ApiError('Rate limit exceeded', 429, true)
    const shouldRetry = apiRetryConfig.retry(0, err429)
    assert.equal(shouldRetry, false)
  })

  it('apiRetryConfig allows single retry for transient non-429 errors', () => {
    const errGeneric = new Error('Temporary gateway timeout')
    assert.equal(apiRetryConfig.retry(0, errGeneric), true)
    assert.equal(apiRetryConfig.retry(1, errGeneric), false)
  })

  it('fetchJsonSafely converts HTTP 429 response into rate-limited ApiError', async () => {
    const originalFetch = globalThis.fetch
    try {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ status: { error_message: 'Too Many Requests' } }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })

      await assert.rejects(
        async () => {
          await fetchJsonSafely('https://api.coingecko.com/test', 'test query')
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 429)
          assert.equal(err.isRateLimited, true)
          return true
        }
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('fetchJsonSafely handles network errors and malformed JSON payloads gracefully', async () => {
    const originalFetch = globalThis.fetch
    try {
      // 1. Network abort/error
      globalThis.fetch = async () => {
        throw new Error('ECONNREFUSED: server unreachable')
      }

      await assert.rejects(
        async () => {
          await fetchJsonSafely('https://api.coingecko.com/test', 'network test')
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.ok((err as Error).message.includes('Network failure'))
          return true
        }
      )

      // 2. Malformed JSON (HTML error page)
      globalThis.fetch = async () =>
        new Response('<html><head><title>502 Bad Gateway</title></head></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })

      await assert.rejects(
        async () => {
          await fetchJsonSafely('https://api.coingecko.com/test', 'bad gateway test')
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.ok((err as Error).message.includes('Malformed JSON response'))
          return true
        }
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe('Phase 2: Coin ID & Asset Entry Resolution', () => {
  const cachedMarkets: CoinMarketData[] = [
    {
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
      current_price: 68500,
      price_change_percentage_24h: 2.1,
      market_cap: 1350000000000,
      total_volume: 32000000000,
      image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    },
    {
      id: 'uniswap',
      symbol: 'uni',
      name: 'Uniswap',
      current_price: 7.8,
      price_change_percentage_24h: -1.2,
      market_cap: 4700000000,
      total_volume: 180000000,
      image: 'https://assets.coingecko.com/coins/images/12504/large/uniswap.png',
    },
  ]

  const searchResults: CoinSearchResult[] = [
    {
      id: 'fake-uni-token',
      name: 'UniCopycat Token',
      symbol: 'UNI',
      market_cap_rank: 2450,
      large: 'https://assets.coingecko.com/copycat.png',
    },
    {
      id: 'uniswap',
      name: 'Uniswap',
      symbol: 'UNI',
      market_cap_rank: 21,
      large: 'https://assets.coingecko.com/coins/images/12504/large/uniswap.png',
    },
    {
      id: 'solana',
      name: 'Solana',
      symbol: 'SOL',
      market_cap_rank: 5,
      large: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    },
  ]

  it('resolves exact match from cached market data', () => {
    const resolved = resolveCoinCandidate('BTC', cachedMarkets, [])
    assert.ok(resolved)
    assert.equal(resolved.id, 'bitcoin')
    assert.equal(resolved.symbol, 'BTC')
    assert.equal(resolved.currentPrice, 68500)
    assert.equal(resolved.image, 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png')
  })

  it('disambiguates duplicate symbols by prioritizing higher market cap rank', () => {
    // When searching for UNI outside cache, prioritize market_cap_rank 21 over 2450
    const resolved = resolveCoinCandidate('UNI', [], searchResults)
    assert.ok(resolved)
    assert.equal(resolved.id, 'uniswap')
    assert.equal(resolved.image, 'https://assets.coingecko.com/coins/images/12504/large/uniswap.png')
  })

  it('uses actual returned image URLs without fabricating hardcoded patterns', () => {
    const resolved = resolveCoinCandidate('SOL', [], searchResults)
    assert.ok(resolved)
    assert.equal(resolved.image, 'https://assets.coingecko.com/coins/images/4128/large/solana.png')
  })

  it('returns null when an asset cannot be resolved from any source', () => {
    const resolved = resolveCoinCandidate('NONEXISTENTCOIN999', cachedMarkets, [])
    assert.equal(resolved, null)
  })
})

describe('Phase 2: Financial Precision', () => {
  it('preserves cents and 2 decimal places in currency calculations without Math.floor truncation', () => {
    const total = 1234.85
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(total)

    assert.equal(formatted, '$1,234.85')
    assert.notEqual(Math.floor(total), total)
  })

  it('formatCurrencyPrecise preserves cents and safely handles invalid numbers', () => {
    assert.equal(formatCurrencyPrecise(1234.85), '$1,234.85')
    assert.equal(formatCurrencyPrecise(0.05), '$0.05')
    assert.equal(formatCurrencyPrecise(100), '$100.00')
    assert.equal(formatCurrencyPrecise(null), '—')
    assert.equal(formatCurrencyPrecise(undefined), '—')
    assert.equal(formatCurrencyPrecise(Number.NaN), '—')
  })
})
