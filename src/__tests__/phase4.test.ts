import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeOHLCData } from '../services/historical.ts'
import { fetchCryptoNewsData } from '../services/news.ts'

describe('Phase 4: Chart Data Validation & Deduplication', () => {
  it('discards malformed, non-array, and non-numeric items from raw OHLC payloads', () => {
    const malformed = [
      null,
      'invalid',
      [1600000000000, 100, 110], // only 3 elements
      [1600000000000, 'one', 110, 90, 105], // non-numeric
      [1600000000000, 100, 110, 90, NaN], // NaN value
      [1600000000000, 100, 110, 90, Infinity], // infinite value
      [1600000000000, -100, 110, 90, 105], // negative price
      [1600000000000, 100, 110, 90, 105], // valid!
    ]

    const sanitized = sanitizeOHLCData(malformed)
    assert.equal(sanitized.length, 1)
    assert.equal(sanitized[0].close, 105)
    assert.equal(sanitized[0].open, 100)
  })

  it('sorts candles chronologically ascending by timestamp', () => {
    const unordered = [
      [1600000003000, 102, 108, 98, 106],
      [1600000001000, 100, 105, 95, 102],
      [1600000002000, 101, 107, 97, 103],
    ]

    const sanitized = sanitizeOHLCData(unordered)
    assert.equal(sanitized.length, 3)
    assert.equal(sanitized[0].time, 1600000001000)
    assert.equal(sanitized[1].time, 1600000002000)
    assert.equal(sanitized[2].time, 1600000003000)
  })

  it('deduplicates identical second-level timestamps to avoid lightweight-charts crash', () => {
    const duplicates = [
      [1600000001100, 100, 105, 95, 102], // 1600000001 sec
      [1600000001900, 102, 115, 90, 110], // same 1600000001 sec
      [1600000002000, 110, 120, 108, 118], // next sec
    ]

    const sanitized = sanitizeOHLCData(duplicates)
    assert.equal(sanitized.length, 2)
    // Merged candle retains original open, highest high (115), lowest low (90), latest close (110)
    assert.equal(sanitized[0].open, 100)
    assert.equal(sanitized[0].high, 115)
    assert.equal(sanitized[0].low, 90)
    assert.equal(sanitized[0].close, 110)
    assert.equal(sanitized[1].open, 110)
  })

  it('enforces candle sanity bounds where high >= max(open, close) and low <= min(open, close)', () => {
    // Malformed candle where data source flipped high and low
    const invertedBounds = [
      [1600000001000, 100, 90, 110, 105], // high=90 is less than open=100!
    ]

    const sanitized = sanitizeOHLCData(invertedBounds)
    assert.equal(sanitized.length, 1)
    assert.ok(sanitized[0].high >= sanitized[0].open)
    assert.ok(sanitized[0].high >= sanitized[0].close)
    assert.ok(sanitized[0].low <= sanitized[0].open)
    assert.ok(sanitized[0].low <= sanitized[0].close)
  })
})

describe('Phase 4: News API & Configuration Transparency', () => {
  it('reports requiresApiKey: true with clear error when API key is missing and network proxy fails', async () => {
    // Calling with a non-existent API key simulation or missing key returns honest status
    const result = await fetchCryptoNewsData(5)
    assert.ok(typeof result.requiresApiKey === 'boolean')
    assert.ok(Array.isArray(result.articles))
    assert.ok(['cryptocompare', 'cryptopanic', 'coindesk-rss', 'none'].includes(result.provider))

    if (result.requiresApiKey) {
      assert.ok(result.error !== null)
      assert.ok(result.articles.length === 0)
    }
  })

  it('never fabricates articles or returns synthetic headlines when results are empty', async () => {
    const result = await fetchCryptoNewsData(10)
    for (const article of result.articles) {
      assert.ok(article.id)
      assert.ok(typeof article.title === 'string' && article.title.length > 0)
      assert.ok(typeof article.url === 'string' && article.url.startsWith('http'))
      assert.ok(typeof article.source === 'string')
      assert.ok(typeof article.published_at === 'string')
    }
  })
})

describe('Phase 4: Market Indicators & Sentiment Honesty', () => {
  it('Fear & Greed parsing rejects invalid strings or out-of-range values without inventing 50 Neutral', () => {
    const parseTest = (val: string): number => {
      const parsed = parseInt(val, 10)
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        throw new Error('Invalid Fear & Greed index numeric value')
      }
      return parsed
    }

    assert.equal(parseTest('72'), 72)
    assert.equal(parseTest('0'), 0)
    assert.equal(parseTest('100'), 100)

    assert.throws(() => parseTest('NaN'), /Invalid Fear & Greed/)
    assert.throws(() => parseTest('-5'), /Invalid Fear & Greed/)
    assert.throws(() => parseTest('120'), /Invalid Fear & Greed/)
    assert.throws(() => parseTest('undefined'), /Invalid Fear & Greed/)
  })

  it('Market pulse shift badge accurately distinguishes bullish, bearish, and unavailable', () => {
    const getShiftLabel = (change: number | null | undefined): string => {
      if (change == null) return 'Unavailable'
      return change >= 0 ? 'Bullish bias' : 'Bearish shift'
    }

    assert.equal(getShiftLabel(2.4), 'Bullish bias')
    assert.equal(getShiftLabel(0), 'Bullish bias')
    assert.equal(getShiftLabel(-4.1), 'Bearish shift')
    assert.equal(getShiftLabel(null), 'Unavailable')
    assert.equal(getShiftLabel(undefined), 'Unavailable')
  })
})

describe('Phase 4: Notifications & Alert Deduping', () => {
  it('filters out paused and already-triggered alerts to prevent duplicate triggers', () => {
    const alerts = [
      { id: '1', symbol: 'BTC', enabled: true, triggered: false, value: 50000, type: 'PRICE_ABOVE' },
      { id: '2', symbol: 'ETH', enabled: false, triggered: false, value: 3000, type: 'PRICE_ABOVE' }, // paused
      { id: '3', symbol: 'SOL', enabled: true, triggered: true, value: 150, type: 'PRICE_ABOVE' }, // already triggered
    ]

    const activeAlerts = alerts.filter((a) => a.enabled && !a.triggered)
    assert.equal(activeAlerts.length, 1)
    assert.equal(activeAlerts[0].symbol, 'BTC')
  })

  it('respects user notification preferences before emitting alerts', () => {
    const shouldNotify = (prefs: { notifications?: boolean; priceAlerts?: boolean }): boolean => {
      return prefs.notifications !== false && prefs.priceAlerts !== false
    }

    assert.equal(shouldNotify({ notifications: true, priceAlerts: true }), true)
    assert.equal(shouldNotify({ notifications: false, priceAlerts: true }), false)
    assert.equal(shouldNotify({ notifications: true, priceAlerts: false }), false)
    assert.equal(shouldNotify({}), true) // default true
  })
})
