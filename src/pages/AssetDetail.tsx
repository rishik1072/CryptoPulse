import { useParams, Link } from 'react-router-dom'
import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowRightLeft,
  BarChart3,
  BrainCircuit,
  Clock3,
  ExternalLink,
  Landmark,
  Newspaper,
  RotateCcw,
  Share2,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { ProfessionalOHLCChart } from '@/components/charts/ProfessionalOHLCChart'
import { GlassCard } from '@/components/ui/GlassCard'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { SpotlightCard } from '@/components/reactbits/SpotlightCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { useQuery } from '@tanstack/react-query'
import { useCryptoNews } from '@/services/news'
import { TradeSimulatorModal } from '@/components/portfolio/TradeSimulatorModal'
import {
  ApiError,
  apiRetryConfig,
  fetchJsonSafely,
  useCoinDetail,
  useMarketData,
  type CoinDetail,
  type CoinMarketData,
} from '@/services/coingecko'
import { resolveAssetId, resolveAssetPrice, resolveMarketVolume } from '@/services/priceResolver'
import { sanitizeHtml } from '@/lib/sanitizer'

interface CoinStatusUpdate {
  description: string
  category: string
  created_at: string
}

interface MarketChartData {
  prices: Array<[number, number]>
}

interface CoinTicker {
  market: { name: string }
  converted_volume: { usd: number }
  trust_score: string
}

const formatValue = (value: number, prefix = '', suffix = '') => {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${prefix}${(value / 1_000_000_000).toFixed(2)}B${suffix}`
  if (abs >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(2)}M${suffix}`
  if (abs >= 1_000) return `${prefix}${(value / 1_000).toFixed(2)}K${suffix}`
  return `${prefix}${value.toFixed(0)}${suffix}`
}

export default function AssetDetail() {
  const { coinId: rawCoinId } = useParams<{ coinId: string }>()
  const { data: topMarkets = [] } = useMarketData(50)

  // Resolve canonical asset identifier (e.g., 'eth' -> 'ethereum', 'btc' -> 'bitcoin')
  const coinId = useMemo(() => resolveAssetId(rawCoinId || '', topMarkets), [rawCoinId, topMarkets])

  const { items: watchlistItems, addToWatchlist, removeFromWatchlist } = useWatchlistStore()
  const [isTradeOpen, setIsTradeOpen] = useState(false)
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy')

  useEffect(() => {
    if (!coinId) return

    try {
      const key = 'cryptopulse-recent-assets'
      const raw = window.localStorage.getItem(key)
      const existing = raw ? (JSON.parse(raw) as string[]) : []
      const next = [coinId, ...existing.filter((id) => id !== coinId)].slice(0, 6)
      window.localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // Ignore local storage failures
    }
  }, [coinId])

  // Seed initial data from top markets cache if available for instant perceived loading
  const initialCoinData = useMemo(() => {
    if (!coinId) return undefined
    const cachedCoin = topMarkets.find((c) => c.id.toLowerCase() === coinId.toLowerCase())
    if (!cachedCoin) return undefined
    return {
      id: cachedCoin.id,
      name: cachedCoin.name,
      symbol: cachedCoin.symbol,
      image: { large: cachedCoin.image, small: cachedCoin.image, thumb: cachedCoin.image },
      market_data: {
        current_price: { usd: cachedCoin.current_price },
        market_cap: { usd: cachedCoin.market_cap },
        total_volume: { usd: cachedCoin.total_volume },
        circulating_supply: 0,
        max_supply: null,
        ath: { usd: 0 },
        atl: { usd: 0 },
        price_change_percentage_24h: cachedCoin.price_change_percentage_24h ?? 0,
        market_cap_rank: null,
      },
      description: { en: '' },
      links: {
        homepage: [],
        blockchain_site: [],
        repos_url: { github: [] },
        twitter_screen_name: '',
        subreddit_url: '',
      },
      categories: cachedCoin.categories ?? [],
    } as CoinDetail
  }, [coinId, topMarkets])

  // Fetch coin details with automatic fallback to market data on provider failure
  const {
    data: coin,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useCoinDetail(coinId || undefined, initialCoinData)

  // Non-critical ancillary queries protected against failure cascades
  const { data: marketChart } = useQuery<MarketChartData>({
    queryKey: ['coin-market-chart', coinId],
    queryFn: async ({ signal }) => {
      try {
        return await fetchJsonSafely<MarketChartData>(
          `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId!)}/market_chart?vs_currency=usd&days=30&interval=daily`,
          `market chart for ${coinId}`,
          { signal, timeoutMs: 8000 }
        )
      } catch {
        return { prices: [] }
      }
    },
    enabled: Boolean(coinId),
    staleTime: 1000 * 60 * 10,
    ...apiRetryConfig,
  })

  const { data: statusUpdates } = useQuery<{ status_updates?: CoinStatusUpdate[] }>({
    queryKey: ['coin-status-updates', coinId],
    queryFn: async ({ signal }) => {
      try {
        return await fetchJsonSafely<{ status_updates?: CoinStatusUpdate[] }>(
          `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId!)}/status_updates?per_page=5`,
          `status updates for ${coinId}`,
          { signal, timeoutMs: 5000 }
        )
      } catch {
        return { status_updates: [] }
      }
    },
    enabled: Boolean(coinId),
    staleTime: 1000 * 60 * 10,
    ...apiRetryConfig,
  })

  const { data: tickerData } = useQuery<{ tickers?: CoinTicker[] }>({
    queryKey: ['coin-tickers', coinId],
    queryFn: async ({ signal }) => {
      try {
        return await fetchJsonSafely<{ tickers?: CoinTicker[] }>(
          `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId!)}/tickers?limit=5`,
          `tickers for ${coinId}`,
          { signal, timeoutMs: 5000 }
        )
      } catch {
        return { tickers: [] }
      }
    },
    enabled: Boolean(coinId),
    staleTime: 1000 * 60 * 5,
    ...apiRetryConfig,
  })

  const { data: news } = useCryptoNews(4)

  // Subscribe strictly to this coin's live price to avoid re-renders when other coins tick
  const coinSymbolUpper = coin?.symbol?.toUpperCase() || ''
  const livePrice = useLivePriceStore(
    useCallback((s) => (coinSymbolUpper ? s.prices[coinSymbolUpper] : undefined), [coinSymbolUpper])
  )
  const connectionStatus = useLivePriceStore((s) => s.connectionStatus)

  const resolved = useMemo(() => {
    if (!coin) {
      return {
        price: null,
        change24h: null,
        source: 'unavailable' as const,
        isLive: false,
        isStale: false,
        isUnavailable: true,
      }
    }
    const singleLivePrices = livePrice ? { [coinSymbolUpper]: livePrice } : {}
    const cgMap: Record<string, CoinMarketData> | undefined = coin.market_data?.current_price?.usd
      ? {
          [coin.id.toLowerCase()]: {
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            current_price: coin.market_data.current_price.usd,
            price_change_percentage_24h: coin.market_data.price_change_percentage_24h ?? 0,
            market_cap: coin.market_data.market_cap?.usd ?? 0,
            total_volume: coin.market_data.total_volume?.usd ?? 0,
            image: coin.image?.large ?? '',
          },
        }
      : undefined

    return resolveAssetPrice(
      { symbol: coin.symbol, coinId: coin.id },
      singleLivePrices,
      cgMap,
      connectionStatus
    )
  }, [coin, livePrice, coinSymbolUpper, connectionStatus])

  const currentPrice = resolved.price
  const change24h = resolved.change24h ?? 0
  const marketCap = coin?.market_data?.market_cap?.usd ?? 0

  const marketVolume = useMemo(() => {
    return resolveMarketVolume(
      coin?.market_data?.total_volume?.usd,
      livePrice?.quoteVolume,
      livePrice?.baseVolume
    )
  }, [coin, livePrice])

  const volume = marketVolume.volume
  const supply = coin?.market_data?.circulating_supply ?? 0
  const rank = coin?.market_data?.market_cap_rank ?? 0
  const ath = coin?.market_data?.ath?.usd ?? 0
  const atl = coin?.market_data?.atl?.usd ?? 0

  const historical = useMemo(() => {
    const points = marketChart?.prices ?? []
    if (!points.length) return null

    const first = points[0][1]
    const latest = points[points.length - 1][1]
    const change30d = first ? ((latest / first - 1) * 100) : 0
    const peak = points.reduce((highest, [, price]) => Math.max(highest, price), 0)
    const trough = points.reduce((lowest, [, price]) => Math.min(lowest, price), Number.POSITIVE_INFINITY)

    return {
      change30d,
      peak: Number.isFinite(peak) ? peak : 0,
      trough: Number.isFinite(trough) ? trough : 0,
    }
  }, [marketChart])

  const sentiment = useMemo(() => {
    const score = change24h * 1.2 + (historical?.change30d ?? 0) * 0.25 + (volume && marketCap ? Math.min((volume / marketCap) * 40, 12) : 0)

    if (score > 8) {
      return { label: 'Bullish', detail: 'Momentum is accelerating with strong live flow.', tone: 'text-[#00E676]' }
    }

    if (score < -8) {
      return { label: 'Risk-off', detail: 'Selling pressure is outweighing buying demand.', tone: 'text-[#FF5252]' }
    }

    return { label: 'Balanced', detail: 'The market is trading with mixed conviction.', tone: 'text-[#FFB300]' }
  }, [change24h, historical, marketCap, volume])

  const topTicker = useMemo(() => {
    const tickers = tickerData?.tickers ?? []
    if (!tickers.length) return null
    return tickers.reduce((best, item) => {
      return item.converted_volume.usd > best.converted_volume.usd ? item : best
    }, tickers[0])
  }, [tickerData])

  const isPositive = change24h >= 0

  // 1. Invalid or missing asset identifier state
  if (!rawCoinId || !coinId) {
    return (
      <div className="flex h-[60vh] items-center justify-center p-4">
        <GlassCard className="max-w-md text-center p-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold text-[#F0F4F8]">Invalid Asset Identifier</h2>
          <p className="mt-2 text-sm text-[#94A3B8] leading-relaxed">
            The asset identifier &quot;{rawCoinId || 'unknown'}&quot; could not be resolved to a known cryptocurrency.
          </p>
          <div className="mt-6">
            <Link
              to="/markets"
              className="inline-block rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-5 py-2 text-sm font-semibold text-slate-950 transition-colors shadow-sm"
            >
              Browse Markets
            </Link>
          </div>
        </GlassCard>
      </div>
    )
  }

  // 2. Initial Loading skeleton state (only when no cached data exists)
  if (isLoading && !coin) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Skeleton className="h-16 w-16 rounded-xl" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <Skeleton className="h-[420px] w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    )
  }

  // 3. Error state with Retry action (only when data is completely unavailable)
  if ((isError || !coin || !coin.symbol) && !coin) {
    const isRateLimited = error instanceof ApiError && error.isRateLimited
    const isNotFound = error instanceof ApiError && error.status === 404
    const isNetworkErr = error instanceof ApiError && error.message.includes('Network failure')

    return (
      <div className="flex h-[60vh] items-center justify-center p-4">
        <GlassCard className="max-w-md text-center p-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold text-[#F0F4F8]">
            {isNotFound
              ? 'Asset Not Found'
              : isRateLimited
              ? 'Rate Limit Exceeded'
              : isNetworkErr
              ? 'Network Connection Issue'
              : 'Unable to Load Asset'}
          </h2>
          <p className="mt-2 text-sm text-[#94A3B8] leading-relaxed">
            {isNotFound
              ? `Cryptocurrency "${coinId}" could not be found on CoinGecko.`
              : isRateLimited
              ? 'CoinGecko request quota reached (HTTP 429). The live price feed remains active, but historical metrics need a short cooldown.'
              : isNetworkErr
              ? 'Failed to connect to the market data provider. Please check your internet connection and try again.'
              : error?.message || 'The requested asset data could not be retrieved. Please try again later.'}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {!isNotFound && (
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-5 py-2 text-sm font-semibold text-slate-950 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Retrying...' : 'Retry'}
              </button>
            )}
            <Link
              to="/markets"
              className="inline-flex items-center rounded-lg border border-[#262D38] bg-[#1E232E] hover:bg-[#262D38] px-5 py-2 text-sm font-semibold text-[#F0F4F8] transition-colors"
            >
              Back to Markets
            </Link>
          </div>
        </GlassCard>
      </div>
    )
  }

  const stats = [
    { label: 'Volume (24H)', value: marketVolume.volume, prefix: marketVolume.unit === 'USD' ? '$' : '', decimals: 0 },
    { label: 'Market Cap', value: marketCap, prefix: '$', decimals: 0 },
    { label: 'Market Rank', value: rank || 1, prefix: '#', decimals: 0 },
    { label: 'Circulating Supply', value: supply, suffix: ` ${coin.symbol.toUpperCase()}`, decimals: 0 },
  ]

  return (
    <div className="mx-auto max-w-[1720px] space-y-4">
      {isError && (
        <div className="rounded-xl border border-[#FFB300]/30 bg-[#FFB300]/10 p-3.5 text-xs text-[#FFB300] flex flex-wrap items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#FFB300]" />
            <span>
              Displaying cached asset details. Latest background sync failed ({error?.message || 'Provider offline or rate limited'}).
            </span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1 font-semibold underline hover:text-[#FFA000] cursor-pointer"
          >
            <RotateCcw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing...' : 'Retry Refresh'}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="flex flex-col justify-between gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <img src={coin.image.large} alt={coin.name} className="h-14 w-14 rounded-xl border border-border bg-surface-elevated" />
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{coin.name}</h1>
                    <div className="rounded-md border border-border bg-surface-elevated px-2 py-0.5 text-xs font-mono font-medium uppercase text-muted">
                      {coin.symbol.toUpperCase()}
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-3">
                    <div className="text-2xl font-bold tracking-tight text-[#F0F4F8] sm:text-3xl font-mono tabular-nums">
                      {currentPrice !== null ? (
                        `$${currentPrice.toLocaleString(undefined, {
                          minimumFractionDigits: currentPrice >= 1 ? 2 : 4,
                          maximumFractionDigits: currentPrice >= 1 ? 2 : 6,
                        })}`
                      ) : (
                        <span className="text-[#94A3B8] font-normal">—</span>
                      )}
                    </div>
                    {resolved.source === 'binance-live' && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#00E676]/10 border border-[#00E676]/30 px-2 py-0.5 text-xs font-medium text-[#00E676] font-mono">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#00E676] animate-pulse" />
                        Live
                      </span>
                    )}
                    {resolved.source === 'binance-stale' && (
                      <span className="inline-flex items-center rounded-lg bg-[#FFB300]/10 border border-[#FFB300]/30 px-2 py-0.5 text-xs font-medium text-[#FFB300] font-mono">
                        Stale
                      </span>
                    )}
                    {resolved.source === 'coingecko' && (
                      <span className="inline-flex items-center rounded-lg bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-xs font-medium text-sky-400 font-mono">
                        CoinGecko
                      </span>
                    )}
                    {resolved.source === 'unavailable' && (
                      <span className="inline-flex items-center rounded-lg bg-muted/10 border border-border px-2 py-0.5 text-xs font-medium text-muted">
                        Unavailable
                      </span>
                    )}
                    {resolved.change24h !== null ? (
                      <div className={`flex items-center gap-1 text-sm font-semibold font-mono tabular-nums ${isPositive ? 'text-positive' : 'text-negative'}`}>
                        {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {change24h.toFixed(2)}%
                      </div>
                    ) : (
                      <div className="text-xs text-muted font-normal">—</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const isWatched = watchlistItems.some(w => w.coinId === coinId)
                    if (isWatched) {
                      removeFromWatchlist(coinId!)
                    } else if (coin) {
                      addToWatchlist({
                        coinId: coin.id,
                        symbol: coin.symbol.toUpperCase(),
                        name: coin.name,
                        image: coin.image.large,
                      })
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface cursor-pointer"
                >
                  <Star className={`h-3.5 w-3.5 ${watchlistItems.some(w => w.coinId === coinId) ? 'fill-accent text-accent' : 'text-muted'}`} />
                  {watchlistItems.some(w => w.coinId === coinId) ? 'Watching' : 'Watchlist'}
                </button>
                <button className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface cursor-pointer">
                  <Share2 className="h-3.5 w-3.5 text-muted" /> Share
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat, index) => (
                <SpotlightCard key={index} className="p-3.5">
                  <div className="text-[11px] uppercase tracking-wider font-medium text-muted">{stat.label}</div>
                  <div className="mt-1.5 text-lg font-bold tracking-tight text-foreground font-mono tabular-nums">
                    <AnimatedCounter
                      value={stat.value}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                      decimals={stat.decimals}
                    />
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4.5 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                <Zap className="h-3.5 w-3.5 text-accent" /> Fast Execution
              </div>
              <div className="mt-3.5 space-y-2.5">
                <button
                  onClick={() => {
                    setTradeMode('buy')
                    setIsTradeOpen(true)
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-positive/30 bg-positive/10 px-3.5 py-2.5 text-left text-xs font-semibold text-positive transition hover:bg-positive/20 cursor-pointer"
                >
                  <span>Quick Buy {coin.symbol.toUpperCase()}</span>
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    setTradeMode('sell')
                    setIsTradeOpen(true)
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-negative/30 bg-negative/10 px-3.5 py-2.5 text-left text-xs font-semibold text-negative transition hover:bg-negative/20 cursor-pointer"
                >
                  <span>Quick Sell {coin.symbol.toUpperCase()}</span>
                  <ArrowRightLeft className="h-3.5 w-3.5 rotate-180" />
                </button>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-border bg-surface-elevated p-3 text-xs text-foreground">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <BrainCircuit className="h-3.5 w-3.5 text-accent" /> Momentum Assessment
              </div>
              <p className="mt-1.5 text-muted leading-relaxed text-[11px]">{sentiment.detail}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <div className="text-base font-semibold tracking-tight text-foreground">Interactive Technical Chart</div>
            <div className="text-xs text-muted">Real-time candlesticks with volume analysis</div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['Momentum', 'Liquidity', 'Trend'].map((indicator) => (
              <div key={indicator} className="rounded-md border border-border bg-surface-elevated px-2.5 py-1 text-xs font-medium text-muted">
                {indicator}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <ProfessionalOHLCChart coinId={coinId || ''} symbol={coin.symbol.toUpperCase()} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <GlassCard>
          <div className="mb-4 flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
            <Newspaper className="h-4 w-4 text-accent" /> Recent News
          </div>
          <div className="space-y-2.5">
            {news?.map((item) => (
              <a key={item.id} href={item.url} target="_blank" rel="noreferrer noopener" className="block rounded-lg border border-border bg-surface-elevated p-3 transition hover:bg-surface group">
                <div className="text-xs font-medium text-foreground group-hover:text-accent transition-colors line-clamp-2">{item.title}</div>
                <div className="mt-2 text-[10px] uppercase font-mono tracking-wider text-muted">{item.source}</div>
              </a>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-4 flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
            <Activity className="h-4 w-4 text-positive" /> Ecosystem Updates
          </div>
          <div className="space-y-2.5">
            {(statusUpdates?.status_updates ?? []).slice(0, 4).map((event, index) => (
              <div key={`${event.category}-${index}`} className="rounded-lg border border-border bg-surface-elevated p-3">
                <div className="text-xs font-medium text-foreground line-clamp-2">{event.description}</div>
                <div className="mt-2 flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-muted">
                  <span>{event.category}</span>
                  <span>{new Date(event.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-4 flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
            <Landmark className="h-4 w-4 text-accent" /> Exchange Liquidity
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-surface-elevated p-3.5">
              <div className="text-[10px] uppercase font-mono tracking-wider text-muted">Primary Exchange Venue</div>
              <div className="mt-1.5 text-lg font-bold text-foreground">
                {topTicker ? topTicker.market.name : 'Data syncing...'}
              </div>
              <div className="mt-1 text-xs text-muted font-mono tabular-nums">
                {topTicker ? formatValue(topTicker.converted_volume.usd, '$') : formatValue(volume, '$')}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface-elevated p-3.5">
              <div className="text-[10px] uppercase font-mono tracking-wider text-muted">24H Volume / Market Cap</div>
              <div className="mt-1.5 text-lg font-bold text-foreground font-mono tabular-nums">{formatValue(volume, '$')}</div>
              <div className="mt-1 text-xs text-muted font-mono tabular-nums">Turnover ratio: {marketCap ? `${((volume / marketCap) * 100).toFixed(2)}%` : '—'}</div>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GlassCard>
          <div className="mb-4 flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
            <BarChart3 className="h-4 w-4 text-accent" /> Historical Extremes
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: '30D Trailing Return', value: historical?.change30d != null ? historical.change30d : null, suffix: '%', decimals: 2 },
              { label: 'All-Time High (ATH)', value: ath > 0 ? ath : null, prefix: '$', decimals: ath < 1 ? 4 : 2 },
              { label: 'All-Time Low (ATL)', value: atl > 0 ? atl : null, prefix: '$', decimals: atl < 1 ? 4 : 2 },
              { label: 'Drawdown from ATH', value: ath > 0 && currentPrice != null ? ((currentPrice / ath) * 100 - 100) : null, suffix: '%', decimals: 2 },
            ].map((item, index) => (
              <div key={index} className="rounded-lg border border-border bg-surface-elevated p-3.5">
                <div className="text-[10px] uppercase font-mono tracking-wider text-muted">{item.label}</div>
                <div className="mt-1.5 text-base font-bold text-foreground font-mono tabular-nums">
                  {item.value !== null ? (
                    <AnimatedCounter
                      value={item.value}
                      prefix={item.prefix}
                      suffix={item.suffix}
                      decimals={item.decimals}
                    />
                  ) : (
                    <span className="text-muted font-normal">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-4 flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
            <Sparkles className="h-4 w-4 text-accent" /> Market Conviction
          </div>
          <div className="rounded-lg border border-border bg-surface-elevated p-4">
            <div className={`text-xl font-bold ${sentiment.tone}`}>{sentiment.label}</div>
            <p className="mt-2 text-xs leading-relaxed text-foreground">{sentiment.detail}</p>
            <div className="mt-4 flex items-center gap-1.5 text-[11px] text-muted font-mono">
              <Clock3 className="h-3.5 w-3.5" /> Synthesized from live book flow & volume
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="mb-3 text-base font-semibold tracking-tight text-foreground">Asset Profile: {coin.name}</div>
        <div
          className="prose max-w-none text-xs sm:text-sm leading-relaxed text-muted"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(
              coin.description.en
                ? `${coin.description.en.slice(0, 900)}${coin.description.en.length > 900 ? '…' : ''}`
                : 'No description available.'
            ),
          }}
        />
        <div className="mt-6 flex flex-wrap gap-2.5">
          {coin.links.homepage[0] && (
            <a href={coin.links.homepage[0]} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface hover:text-accent">
              Official Website <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {coin.links.repos_url.github[0] && (
            <a href={coin.links.repos_url.github[0]} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface hover:text-accent">
              Source Repository
            </a>
          )}
        </div>
      </GlassCard>

      <TradeSimulatorModal
        isOpen={isTradeOpen}
        onClose={() => setIsTradeOpen(false)}
        coinId={coinId || ''}
        symbol={coin.symbol}
        name={coin.name}
        image={coin.image.large}
        price={currentPrice ?? 0}
        initialMode={tradeMode}
      />
    </div>
  )
}