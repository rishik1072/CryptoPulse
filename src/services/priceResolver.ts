import { binanceWS, type ConnectionStatus } from './binanceWebSocket.ts'
import type { LivePrice } from '../store/useLivePriceStore.ts'
import type { CoinMarketData, CoinSearchResult } from './coingecko.ts'

export function formatCompactUSD(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return '—'
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

export function formatCurrencyPrecise(
  value: unknown,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value)
}

export type ResolvedPriceSource = 'binance-live' | 'binance-stale' | 'coingecko' | 'unavailable'

export interface ResolvedAssetPrice {
  price: number | null
  change24h: number | null
  source: ResolvedPriceSource
  isLive: boolean
  isStale: boolean
  isUnavailable: boolean
}

/**
 * Resolves current market price hierarchically:
 * 1. Binance live stream (preferred if valid & fresh)
 * 2. Binance stale stream (if Binance has record but heartbeat/timestamp is old)
 * 3. CoinGecko market data (if available and valid)
 * 4. Unavailable (returns null — never fabricates zero or purchase price)
 */
export function resolveAssetPrice(
  asset: { symbol: string; coinId?: string },
  livePrices: Record<string, LivePrice>,
  marketDataMap: Record<string, CoinMarketData> | undefined,
  connectionStatus: ConnectionStatus
): ResolvedAssetPrice {
  const symUpper = asset.symbol?.toUpperCase() || ''
  const symLower = asset.symbol?.toLowerCase() || ''
  const coinIdLower = asset.coinId?.toLowerCase() || ''

  // 1. Prefer Binance WebSocket price when available and valid
  const live = livePrices[symUpper] || livePrices[symLower]
  if (live && Number.isFinite(live.price) && live.price > 0) {
    const isStale = binanceWS.isPriceStale(live.timestamp) || connectionStatus === 'offline'
    return {
      price: live.price,
      change24h: Number.isFinite(live.change) ? live.change : null,
      source: isStale ? 'binance-stale' : 'binance-live',
      isLive: !isStale,
      isStale,
      isUnavailable: false,
    }
  }

  // 2. Fall back to CoinGecko current price (by coinId or symbol)
  if (marketDataMap) {
    const cgCoin = (coinIdLower ? marketDataMap[coinIdLower] : undefined) ||
                   marketDataMap[symLower] ||
                   marketDataMap[symUpper]

    if (cgCoin && Number.isFinite(cgCoin.current_price) && cgCoin.current_price > 0) {
      return {
        price: cgCoin.current_price,
        change24h: Number.isFinite(cgCoin.price_change_percentage_24h) ? cgCoin.price_change_percentage_24h : null,
        source: 'coingecko',
        isLive: false,
        isStale: false,
        isUnavailable: false,
      }
    }
  }

  // 3. Price unavailable: Never display 0 or purchase price as verified market price
  return {
    price: null,
    change24h: null,
    source: 'unavailable',
    isLive: false,
    isStale: false,
    isUnavailable: true,
  }
}

export interface PortfolioHoldingValuation {
  id: string
  coinId: string
  symbol: string
  name: string
  image: string
  quantity: number
  avgBuyPrice: number
  purchaseDate: string
  notes?: string
  currentPrice: number | null
  currentValue: number | null
  costBasis: number
  profit: number | null
  roi: number | null
  change24h: number | null
  source: ResolvedPriceSource
  isPriced: boolean
}

export interface PortfolioSummaryMetrics {
  totalValue: number
  totalCostForValued: number
  totalProfit: number
  totalRoi: number
  valuedCount: number
  totalCount: number
  missingCount: number
  isIncomplete: boolean
}

export function computePortfolioValuation(
  holdings: Array<{
    id: string
    coinId: string
    symbol: string
    name: string
    image: string
    quantity: number
    avgBuyPrice: number
    purchaseDate: string
    notes?: string
  }>,
  livePrices: Record<string, LivePrice>,
  marketDataMap: Record<string, CoinMarketData> | undefined,
  connectionStatus: ConnectionStatus
): { valuations: PortfolioHoldingValuation[]; metrics: PortfolioSummaryMetrics } {
  const valuations: PortfolioHoldingValuation[] = holdings.map((h) => {
    const resolved = resolveAssetPrice(h, livePrices, marketDataMap, connectionStatus)
    const costBasis = h.quantity * h.avgBuyPrice
    const currentPrice = resolved.price
    const isPriced = currentPrice !== null && Number.isFinite(currentPrice) && currentPrice > 0
    const currentValue = isPriced ? h.quantity * currentPrice : null
    const profit = currentValue !== null ? currentValue - costBasis : null
    const roi = profit !== null && costBasis > 0 ? (profit / costBasis) * 100 : null

    return {
      ...h,
      currentPrice,
      currentValue,
      costBasis,
      profit,
      roi,
      change24h: resolved.change24h,
      source: resolved.source,
      isPriced,
    }
  })

  const pricedItems = valuations.filter(
    (v): v is PortfolioHoldingValuation & { currentValue: number; profit: number; roi: number } =>
      v.isPriced && v.currentValue !== null && v.profit !== null && v.roi !== null
  )

  const totalValue = pricedItems.reduce((acc, item) => acc + item.currentValue, 0)
  const totalCostForValued = pricedItems.reduce((acc, item) => acc + item.costBasis, 0)
  const totalProfit = pricedItems.reduce((acc, item) => acc + item.profit, 0)
  const totalRoi = totalCostForValued > 0 ? (totalProfit / totalCostForValued) * 100 : 0
  const valuedCount = pricedItems.length
  const totalCount = valuations.length
  const missingCount = totalCount - valuedCount
  const isIncomplete = missingCount > 0 && totalCount > 0

  return {
    valuations,
    metrics: {
      totalValue,
      totalCostForValued,
      totalProfit,
      totalRoi,
      valuedCount,
      totalCount,
      missingCount,
      isIncomplete,
    },
  }
}

export interface ResolvedMarketVolume {
  volume: number
  unit: 'USD' | 'BASE'
  formatted: string
  source: 'coingecko' | 'binance-quote' | 'binance-base' | 'unavailable'
}

/**
 * Resolves 24h market volume keeping USD units consistent.
 * CoinGecko aggregate 24h USD volume is strictly preferred.
 * Single-exchange Binance quoteVolume (USDT) is accepted as fallback USD volume.
 * Binance base-asset volume is NEVER silently substituted for USD volume;
 * if explicitly allowed, it is flagged with unit 'BASE' and formatted accordingly.
 */
export function resolveMarketVolume(
  cgTotalVolume?: number | null,
  binanceQuoteVolume?: number | null,
  binanceBaseVolume?: number | null,
  allowBaseAssetFallback = false
): ResolvedMarketVolume {
  // 1. CoinGecko aggregate 24h USD volume
  if (typeof cgTotalVolume === 'number' && Number.isFinite(cgTotalVolume) && cgTotalVolume >= 0) {
    return {
      volume: cgTotalVolume,
      unit: 'USD',
      formatted: formatCompactUSD(cgTotalVolume),
      source: 'coingecko',
    }
  }

  // 2. Binance USD/USDT quote volume fallback
  if (typeof binanceQuoteVolume === 'number' && Number.isFinite(binanceQuoteVolume) && binanceQuoteVolume >= 0) {
    return {
      volume: binanceQuoteVolume,
      unit: 'USD',
      formatted: formatCompactUSD(binanceQuoteVolume),
      source: 'binance-quote',
    }
  }

  // 3. Binance base-asset volume — only if explicitly requested and labeled
  if (allowBaseAssetFallback && typeof binanceBaseVolume === 'number' && Number.isFinite(binanceBaseVolume) && binanceBaseVolume >= 0) {
    return {
      volume: binanceBaseVolume,
      unit: 'BASE',
      formatted: binanceBaseVolume.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      source: 'binance-base',
    }
  }

  return {
    volume: 0,
    unit: 'USD',
    formatted: '—',
    source: 'unavailable',
  }
}

export interface ResolvedAssetCandidate {
  id: string
  name: string
  symbol: string
  image: string
  currentPrice?: number
}

/**
 * Resolves verified cryptocurrency from user input, ranking candidates accurately:
 * 1. Exact ID or ticker match in cached market data
 * 2. Filter exact symbol matches in search results and rank by market_cap_rank
 * 3. Never fabricates hardcoded URLs or incorrect token IDs
 */
export function resolveCoinCandidate(
  query: string,
  cachedMarkets: CoinMarketData[] = [],
  searchResults: CoinSearchResult[] = []
): ResolvedAssetCandidate | null {
  const trimmed = query.trim()
  if (!trimmed) return null
  const symUpper = trimmed.toUpperCase()
  const lower = trimmed.toLowerCase()

  // 1. Check local cached markets (exact ID or exact symbol)
  const localMatch = cachedMarkets.find(
    (c) => c.symbol.toUpperCase() === symUpper || c.id.toLowerCase() === lower
  )

  if (localMatch) {
    return {
      id: localMatch.id,
      name: localMatch.name,
      symbol: localMatch.symbol.toUpperCase(),
      image: localMatch.image || '',
      currentPrice: localMatch.current_price,
    }
  }

  // 2. Search results: filter for exact symbol matches and prioritize by market_cap_rank
  if (searchResults.length > 0) {
    const exactSymbolMatches = searchResults
      .filter((c) => c.symbol.toUpperCase() === symUpper)
      .sort((a, b) => (a.market_cap_rank ?? 999999) - (b.market_cap_rank ?? 999999))

    const bestMatch =
      exactSymbolMatches[0] ||
      searchResults.find((c) => c.id.toLowerCase() === lower) ||
      searchResults[0]

    if (bestMatch && bestMatch.id) {
      return {
        id: bestMatch.id,
        name: bestMatch.name,
        symbol: bestMatch.symbol.toUpperCase(),
        image: bestMatch.large || bestMatch.thumb || '',
      }
    }
  }

  return null
}

