import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  BriefcaseBusiness,
  ChevronRight,
  Compass,
  ExternalLink,
  Flame,
  Newspaper,
  Plus,
  Star,
  Wallet,
} from 'lucide-react'
import { useGlobalData, useMarketData, useTrendingCoins, useCoinsMarketData, type CoinMarketData } from '@/services/coingecko'
import { useCryptoNews } from '@/services/news'
import { useFearGreedIndex } from '@/services/fearGreed'
import { usePortfolioStore } from '@/store/usePortfolioStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { useAuthStore } from '@/store/useAuthStore'
import { computePortfolioValuation, resolveAssetPrice } from '@/services/priceResolver'
import { Skeleton } from '@/components/ui/Skeleton'
import { PriceChange } from '@/components/ui/PriceChange'
import { LivePriceTracker } from '@/components/dashboard/LivePriceTracker'
import { Sparkline } from '@/components/charts/Sparkline'
import { AddAssetModal } from '@/components/portfolio/AddAssetModal'
import { SpotlightCard } from '@/components/reactbits/SpotlightCard'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatCompact(value: number, prefix = '', suffix = '') {
  if (value >= 1e12) return `${prefix}${(value / 1e12).toFixed(2)}T${suffix}`
  if (value >= 1e9) return `${prefix}${(value / 1e9).toFixed(2)}B${suffix}`
  if (value >= 1e6) return `${prefix}${(value / 1e6).toFixed(2)}M${suffix}`
  if (value >= 1e3) return `${prefix}${(value / 1e3).toFixed(2)}K${suffix}`
  return `${prefix}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`
}

export default function Dashboard() {
  const { holdings } = usePortfolioStore()
  const { prices: livePrices, connectionStatus, lastUpdate, latency } = useLivePriceStore()
  const { user } = useAuthStore()
  const { items: watchlistItems } = useWatchlistStore()
  const { data: globalData, isLoading: globalLoading } = useGlobalData()
  const { data: marketData = [], isLoading: marketLoading } = useMarketData(50)
  const { data: trendingData, isLoading: trendingLoading } = useTrendingCoins()
  const { data: fearGreedData, isLoading: fearGreedLoading } = useFearGreedIndex()
  const { data: news = [], isLoading: newsLoading } = useCryptoNews(4)

  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false)

  // Only show personalized greeting when authenticated user has a non-empty name
  const validUserName = user?.name?.trim() ? user.name.trim().split(' ')[0] : null

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const global = globalData?.data

  const holdingCoinIds = useMemo(() => holdings.map((h) => h.coinId).filter(Boolean), [holdings])
  const { data: specificMarkets = [] } = useCoinsMarketData(holdingCoinIds, marketData)

  const marketDataMap = useMemo(() => {
    const map: Record<string, CoinMarketData> = {}
    for (const coin of marketData) {
      map[coin.id.toLowerCase()] = coin
      map[coin.symbol.toLowerCase()] = coin
      map[coin.symbol.toUpperCase()] = coin
    }
    for (const coin of specificMarkets) {
      map[coin.id.toLowerCase()] = coin
      map[coin.symbol.toLowerCase()] = coin
      map[coin.symbol.toUpperCase()] = coin
    }
    return map
  }, [marketData, specificMarkets])

  const { valuations: portfolioRows, metrics: portfolioMetrics } = useMemo(
    () => computePortfolioValuation(holdings, livePrices, marketDataMap, connectionStatus),
    [holdings, livePrices, marketDataMap, connectionStatus]
  )

  const watchlistRows = useMemo(() => {
    return watchlistItems.slice(0, 4).map((item) => {
      const resolved = resolveAssetPrice(item, livePrices, marketDataMap, connectionStatus)
      return {
        ...item,
        price: resolved.price,
        change: resolved.change24h,
        source: resolved.source,
        isUnavailable: resolved.isUnavailable,
      }
    })
  }, [watchlistItems, livePrices, marketDataMap, connectionStatus])

  const topMovers = useMemo(() => {
    const gainers = [...marketData]
      .filter((coin) => (coin.price_change_percentage_24h ?? 0) > 0)
      .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
      .slice(0, 4)
    const losers = [...marketData]
      .filter((coin) => (coin.price_change_percentage_24h ?? 0) < 0)
      .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
      .slice(0, 4)
    return { gainers, losers }
  }, [marketData])

  const getRecentAssetIds = () => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem('cryptopulse-recent-assets')
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      return []
    }
  }

  const recentAssets = useMemo(() => {
    const recentIds = getRecentAssetIds()
    if (recentIds.length === 0) return marketData.slice(0, 4)
    const matched = marketData.filter((coin) => recentIds.includes(coin.id))
    return matched.length ? matched.slice(0, 4) : marketData.slice(0, 4)
  }, [marketData])

  // Verifiable, factual market pulse derived purely from active market data
  const marketPulse = useMemo(() => {
    const shift24h = global?.market_cap_change_percentage_24h_usd
    const btcDom = global?.market_cap_percentage?.btc

    if (!marketData.length) {
      return {
        isPositive: false,
        breadthText: 'Connecting to market stream…',
        narrative: 'Awaiting upstream market data synchronization.',
      }
    }

    const advancing = marketData.filter((c) => (c.price_change_percentage_24h ?? 0) > 0).length
    const declining = marketData.filter((c) => (c.price_change_percentage_24h ?? 0) < 0).length
    const total = marketData.length
    const isPositive = (shift24h ?? 0) >= 0

    let narrative = ''
    if (shift24h != null) {
      const dir = shift24h >= 0 ? 'expanded' : 'contracted'
      narrative = `Total cryptocurrency market cap has ${dir} ${Math.abs(shift24h).toFixed(2)}% in the last 24h with ${advancing} of ${total} monitored assets advancing.`
      if (btcDom != null) {
        narrative += ` Bitcoin dominance is at ${btcDom.toFixed(1)}%.`
      }
    } else {
      narrative = `Market breadth shows ${advancing} of ${total} tracked assets advancing against ${declining} declining.`
    }

    return {
      isPositive,
      breadthText: `${advancing} advancing · ${declining} declining`,
      narrative,
    }
  }, [global, marketData])

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. HEADER & GREETING */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#262D38] pb-3.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">Market Overview</h1>
          {validUserName ? (
            <p className="mt-0.5 text-xs text-muted">
              {greeting}, {validUserName}. Real-time cryptocurrency market intelligence and execution monitoring.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted">
              Real-time cryptocurrency market intelligence and execution monitoring.
            </p>
          )}
        </div>

        {/* Compact market status and timestamp */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1">
            {connectionStatus === 'connected' ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-positive animate-pulse" />
                <span className="font-semibold text-positive">Binance Live</span>
                <span className="font-mono text-[11px] text-muted">({latency}ms)</span>
              </>
            ) : connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                <span className="font-medium text-accent">Reconnecting…</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-negative" />
                <span className="font-medium text-negative">Feed Offline</span>
              </>
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-muted font-mono text-[11px]">
            <span>Sync:</span>
            <span className="text-foreground">
              {lastUpdate
                ? new Date(lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : 'Connecting…'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. MARKET SUMMARY: Compact row of 4 primary market metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Metric 1: Total Market Cap */}
        <SpotlightCard className="p-3.5 sm:p-4 shadow-sm" title="Aggregate global cryptocurrency market capitalization across all tracked assets">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Total Market Cap</span>
            {global?.market_cap_change_percentage_24h_usd != null && (
              <span className={`inline-flex items-center font-mono font-medium text-[11px] ${global.market_cap_change_percentage_24h_usd >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                {global.market_cap_change_percentage_24h_usd >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-0.5" />
                )}
                {Math.abs(global.market_cap_change_percentage_24h_usd).toFixed(2)}%
              </span>
            )}
          </div>
          <div className="mt-1.5 text-lg sm:text-xl font-bold font-mono tracking-tight text-[#F0F4F8] tabular-nums">
            {globalLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : global?.total_market_cap?.usd ? (
              formatCompact(global.total_market_cap.usd, '$')
            ) : (
              <span className="text-[#94A3B8] font-normal">—</span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-[#94A3B8]">24h aggregate valuation</div>
        </SpotlightCard>

        {/* Metric 2: 24h Volume */}
        <SpotlightCard className="p-3.5 sm:p-4 shadow-sm" title="24-hour total cryptocurrency spot and derivative trading volume">
          <div className="text-xs text-[#94A3B8]">24H Volume</div>
          <div className="mt-1.5 text-lg sm:text-xl font-bold font-mono tracking-tight text-[#F0F4F8] tabular-nums">
            {globalLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : global?.total_volume?.usd ? (
              formatCompact(global.total_volume.usd, '$')
            ) : (
              <span className="text-[#94A3B8] font-normal">—</span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-[#94A3B8]">Global turnover volume</div>
        </SpotlightCard>

        {/* Metric 3: BTC Dominance */}
        <SpotlightCard className="p-3.5 sm:p-4 shadow-sm" title="Percentage of global crypto market capitalization held by Bitcoin">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>BTC Dominance</span>
            <span className="text-[10px] font-mono text-[#FFB300] uppercase tracking-wider">Share</span>
          </div>
          <div className="mt-1.5 text-lg sm:text-xl font-bold font-mono tracking-tight text-[#F0F4F8] tabular-nums">
            {globalLoading ? (
              <Skeleton className="h-6 w-16" />
            ) : global?.market_cap_percentage?.btc ? (
              `${global.market_cap_percentage.btc.toFixed(1)}%`
            ) : (
              <span className="text-[#94A3B8] font-normal">—</span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-[#94A3B8]">
            {global?.active_cryptocurrencies ? `${global.active_cryptocurrencies.toLocaleString()} active coins` : 'Market share'}
          </div>
        </SpotlightCard>

        {/* Metric 4: Fear & Greed Index */}
        <SpotlightCard className="p-3.5 sm:p-4 shadow-sm" title="Alternative.me Fear and Greed sentiment index">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Fear &amp; Greed</span>
            <span className="text-[10px] font-mono text-[#94A3B8] uppercase">Alternative.me</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-bold font-mono tracking-tight text-[#F0F4F8] tabular-nums">
              {fearGreedLoading ? (
                <Skeleton className="h-6 w-12" />
              ) : fearGreedData?.value != null ? (
                `${fearGreedData.value}`
              ) : (
                <span className="text-[#94A3B8] font-normal">—</span>
              )}
            </span>
            {fearGreedData?.value_classification && (
              <span className={`text-xs font-semibold ${
                fearGreedData.value_classification.toLowerCase().includes('greed')
                  ? 'text-[#00E676]'
                  : fearGreedData.value_classification.toLowerCase().includes('fear')
                    ? 'text-[#FF5252]'
                    : 'text-[#FFB300]'
              }`}>
                {fearGreedData.value_classification}
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-[#94A3B8]">Market sentiment indicator</div>
        </SpotlightCard>
      </div>

      {/* 5. MARKET PULSE: Compact analytical summary explaining movement using verifiable data */}
      <div className="rounded-xl border border-[#262D38] bg-[#151921] px-4 py-3 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`h-2 w-2 rounded-full shrink-0 ${marketPulse.isPositive ? 'bg-[#00E676]' : 'bg-[#FF5252]'}`} />
          <span className="font-bold text-[11px] uppercase font-mono tracking-wider text-[#F0F4F8] shrink-0">
            Market Pulse:
          </span>
          <p className="text-[#94A3B8] leading-normal truncate sm:text-clip">
            {marketPulse.narrative}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2 text-[11px] font-mono">
          <span className="rounded-md bg-[#1E232E] border border-[#262D38] px-2.5 py-1 text-[#F0F4F8]">
            {marketPulse.breadthText}
          </span>
        </div>
      </div>

      {/* 3. LIVE MARKET: Binance WebSocket streaming prices */}
      <LivePriceTracker />

      {/* 4. IMPORTANT MARKET MOVEMENTS: Top Gainers, Top Losers, and Trending Coins */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Top Gainers */}
        <div className="rounded-xl border border-[#262D38] bg-[#151921] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#00E676]" />
              <h2 className="text-sm font-bold text-[#F0F4F8]">Top Gainers (24H)</h2>
            </div>
            <Link to="/markets" className="text-[11px] font-medium text-[#FFB300] hover:text-[#FFA000] transition-colors">
              All markets →
            </Link>
          </div>
          <div className="space-y-2">
            {marketLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#1E232E]/60 px-3 py-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            ) : topMovers.gainers.length ? (
              topMovers.gainers.map((coin) => (
                <Link
                  key={coin.id}
                  to={`/asset/${coin.id}`}
                  className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#1E232E]/60 px-3 py-2 transition-colors hover:bg-[#1E232E] hover:border-[#FFB300]/30"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={coin.image} alt="" className="h-5 w-5 rounded-full" />
                    <span className="font-semibold text-xs text-[#F0F4F8] truncate">{coin.name}</span>
                    <span className="text-[10px] uppercase font-mono text-[#94A3B8]">{coin.symbol}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-semibold text-[#F0F4F8] tabular-nums">
                      ${coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: coin.current_price < 1 ? 4 : 2 })}
                    </div>
                    <PriceChange value={coin.price_change_percentage_24h} />
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-[#94A3B8]">No gainers recorded</div>
            )}
          </div>
        </div>

        {/* Top Losers */}
        <div className="rounded-xl border border-[#262D38] bg-[#151921] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#FF5252]" />
              <h2 className="text-sm font-bold text-[#F0F4F8]">Top Losers (24H)</h2>
            </div>
            <Link to="/markets" className="text-[11px] font-medium text-[#FFB300] hover:text-[#FFA000] transition-colors">
              All markets →
            </Link>
          </div>
          <div className="space-y-2">
            {marketLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#1E232E]/60 px-3 py-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            ) : topMovers.losers.length ? (
              topMovers.losers.map((coin) => (
                <Link
                  key={coin.id}
                  to={`/asset/${coin.id}`}
                  className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#1E232E]/60 px-3 py-2 transition-colors hover:bg-[#1E232E] hover:border-[#FFB300]/30"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={coin.image} alt="" className="h-5 w-5 rounded-full" />
                    <span className="font-semibold text-xs text-[#F0F4F8] truncate">{coin.name}</span>
                    <span className="text-[10px] uppercase font-mono text-[#94A3B8]">{coin.symbol}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-semibold text-[#F0F4F8] tabular-nums">
                      ${coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: coin.current_price < 1 ? 4 : 2 })}
                    </div>
                    <PriceChange value={coin.price_change_percentage_24h} />
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-[#94A3B8]">No losers recorded</div>
            )}
          </div>
        </div>

        {/* Trending on CoinGecko */}
        <div className="rounded-xl border border-[#262D38] bg-[#151921] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#FFB300]" />
              <h2 className="text-sm font-bold text-[#F0F4F8]">Trending Search Flow</h2>
            </div>
            <span className="text-[10px] font-mono text-[#94A3B8] uppercase">CoinGecko</span>
          </div>
          <div className="space-y-2">
            {trendingLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#1E232E]/60 px-3 py-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            ) : trendingData?.coins?.length ? (
              trendingData.coins.slice(0, 4).map((coin) => (
                <Link
                  key={coin.item.id}
                  to={`/asset/${coin.item.id}`}
                  className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#1E232E]/60 px-3 py-2 transition-colors hover:bg-[#1E232E] hover:border-[#FFB300]/30"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={coin.item.small} alt="" className="h-5 w-5 rounded-full" />
                    <span className="font-semibold text-xs text-[#F0F4F8] truncate">{coin.item.name}</span>
                    <span className="text-[10px] uppercase font-mono text-[#94A3B8]">{coin.item.symbol}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-semibold text-[#F0F4F8] tabular-nums">
                      {formatCurrency(coin.item.data.price)}
                    </div>
                    <div className={`text-[11px] font-mono tabular-nums ${coin.item.data.price_change_percentage_24h.usd >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                      {coin.item.data.price_change_percentage_24h.usd >= 0 ? '+' : ''}{coin.item.data.price_change_percentage_24h.usd.toFixed(1)}%
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-[#94A3B8]">No trending data available</div>
            )}
          </div>
        </div>
      </div>

      {/* 6. PORTFOLIO OVERVIEW WHEN AVAILABLE */}
      {holdings.length > 0 ? (
        <div className="rounded-xl border border-[#262D38] bg-[#151921] p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#262D38] pb-3">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-[#FFB300]" />
              <h2 className="text-sm font-bold text-[#F0F4F8]">Portfolio Overview</h2>
              {portfolioMetrics.isIncomplete && (
                <span className="rounded bg-[#FFB300]/10 border border-[#FFB300]/25 px-1.5 py-0.5 text-[10px] font-mono text-[#FFB300]">
                  Partial live pricing
                </span>
              )}
            </div>
            <Link to="/portfolio" className="inline-flex items-center gap-1 text-xs font-semibold text-[#FFB300] hover:text-[#FFA000] transition-colors">
              Open Portfolio Desk <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#262D38] bg-[#1E232E]/70 p-3">
              <div className="text-xs text-[#94A3B8]">Total Portfolio Value</div>
              <div className="mt-1 text-xl font-bold font-mono tracking-tight text-[#F0F4F8] tabular-nums">
                {formatCurrency(portfolioMetrics.totalValue)}
              </div>
              <div className="mt-1 text-[11px] text-[#94A3B8]">
                {portfolioMetrics.valuedCount} of {portfolioRows.length} positions evaluated
              </div>
            </div>

            <div className="rounded-lg border border-[#262D38] bg-[#1E232E]/70 p-3">
              <div className="text-xs text-[#94A3B8]">Total Unrealized P&amp;L</div>
              <div className={`mt-1 text-xl font-bold font-mono tracking-tight tabular-nums ${portfolioMetrics.totalProfit >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                {portfolioMetrics.totalProfit >= 0 ? '+' : ''}{formatCurrency(portfolioMetrics.totalProfit)}
              </div>
              <div className="mt-1 text-[11px] font-mono tabular-nums text-[#94A3B8]">
                {portfolioMetrics.totalRoi >= 0 ? '+' : ''}{portfolioMetrics.totalRoi.toFixed(2)}% net return
              </div>
            </div>

            <div className="rounded-lg border border-[#262D38] bg-[#1E232E]/70 p-3">
              <div className="text-xs text-[#94A3B8]">Active Allocations</div>
              <div className="mt-1 text-xl font-bold font-mono tracking-tight text-[#F0F4F8] tabular-nums">
                {holdings.length} {holdings.length === 1 ? 'Asset' : 'Assets'}
              </div>
              <div className="mt-1 text-[11px] text-[#94A3B8]">
                Tracked across verified live data feeds
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#262D38] bg-[#151921] p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#FFB300]/10 border border-[#FFB300]/25 p-2 text-[#FFB300] shrink-0">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#F0F4F8]">Portfolio Monitoring</div>
              <p className="text-[11px] text-[#94A3B8]">Add asset holdings to compute real-time valuations, P&amp;L, and ROI.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAddAssetOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-3.5 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Asset
            </button>
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-1 rounded-lg border border-[#262D38] bg-[#1E232E] px-3 py-1.5 text-xs font-medium text-[#F0F4F8] hover:bg-[#262D38] transition-colors"
            >
              Portfolio Desk
            </Link>
          </div>
        </div>
      )}

      {/* 7. WATCHLIST ACTIVITY & RELEVANT NEWS */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Watchlist Activity */}
        <div className="rounded-xl border border-[#262D38] bg-[#151921] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-[#262D38] pb-2.5">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-[#FFB300]" />
              <h2 className="text-sm font-bold text-[#F0F4F8]">Watchlist Priority</h2>
            </div>
            <Link to="/watchlist" className="inline-flex items-center gap-1 text-xs font-medium text-[#FFB300] hover:text-[#FFA000] transition-colors">
              Manage all ({watchlistItems.length}) <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {watchlistRows.length > 0 ? (
              watchlistRows.map((item) => (
                <div
                  key={item.coinId}
                  className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#1E232E]/60 px-3 py-2.5 transition-colors hover:bg-[#1E232E] hover:border-[#FFB300]/30"
                >
                  <Link to={`/asset/${item.coinId}`} className="flex items-center gap-2.5 min-w-0">
                    <img src={item.image} alt="" className="h-6 w-6 rounded-full" />
                    <div>
                      <div className="font-semibold text-xs text-[#F0F4F8] truncate">{item.name}</div>
                      <div className="text-[10px] uppercase font-mono text-[#94A3B8]">{item.symbol}</div>
                    </div>
                  </Link>

                  <div className="hidden sm:block w-20 shrink-0">
                    <Sparkline symbol={item.symbol} isPositive={(item.change ?? 0) >= 0} />
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-semibold text-[#F0F4F8] tabular-nums">
                      {item.price !== null ? formatCurrency(item.price) : <span className="text-[#94A3B8]">—</span>}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums">
                      {item.change !== null ? (
                        <span className={item.change >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}>
                          {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">—</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-[#262D38] bg-[#1E232E]/30 p-6 text-center text-xs text-[#94A3B8]">
                <Star className="mx-auto h-6 w-6 text-[#94A3B8] mb-1.5" />
                No priority watchlist assets configured. Star assets from Markets to track them here.
              </div>
            )}
          </div>
        </div>

        {/* Relevant News */}
        <div className="rounded-xl border border-[#262D38] bg-[#151921] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-[#262D38] pb-2.5">
            <div className="flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-[#FFB300]" />
              <h2 className="text-sm font-bold text-[#F0F4F8]">Market Intelligence News</h2>
            </div>
            <Link to="/news" className="text-xs font-medium text-[#FFB300] hover:text-[#FFA000] transition-colors">
              Full feed →
            </Link>
          </div>

          <div className="space-y-2">
            {newsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-[#262D38] bg-[#1E232E]/60 p-2.5">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            ) : news.length ? (
              news.slice(0, 4).map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-start justify-between gap-2.5 rounded-lg border border-[#262D38] bg-[#1E232E]/60 p-2.5 transition-colors hover:bg-[#1E232E] hover:border-[#FFB300]/30 group"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[#F0F4F8] group-hover:text-[#FFB300] transition-colors line-clamp-1">
                      {item.title}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-[#94A3B8] font-mono">
                      <span>{item.source}</span>
                      <span>•</span>
                      <span>{item.published_at ? new Date(item.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent'}</span>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-[#94A3B8] shrink-0 mt-0.5 group-hover:text-[#F0F4F8]" />
                </a>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-[#262D38] bg-[#1E232E]/30 p-6 text-center text-xs text-[#94A3B8]">
                News updates currently synchronizing.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RECENTLY VIEWED ASSETS BAR */}
      {recentAssets.length > 0 && (
        <div className="rounded-xl border border-[#262D38] bg-[#151921] px-4 py-2.5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#94A3B8] font-mono text-[11px] uppercase tracking-wider shrink-0">
            <span>Recent Looks:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {recentAssets.map((coin) => (
              <Link
                key={coin.id}
                to={`/asset/${coin.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#262D38] bg-[#1E232E] px-2.5 py-1 text-[#F0F4F8] hover:bg-[#262D38] transition-colors"
              >
                <img src={coin.image} alt="" className="h-4 w-4 rounded-full" />
                <span className="font-semibold text-xs text-[#F0F4F8]">{coin.symbol.toUpperCase()}</span>
                <span className="font-mono text-[11px] text-[#94A3B8]">
                  ${coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 8. QUICK ACTIONS STRIP */}
      <div className="rounded-xl border border-[#262D38] bg-[#151921] px-4 py-3 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-[#94A3B8]" />
          <span className="text-[#F0F4F8] font-medium">Quick Desk Shortcuts:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/markets"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#262D38] bg-[#1E232E] px-3 py-1.5 text-[#F0F4F8] hover:bg-[#262D38] transition-colors"
          >
            <Compass className="h-3.5 w-3.5 text-[#FFB300]" /> Explore Markets
          </Link>
          <Link
            to="/portfolio"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#262D38] bg-[#1E232E] px-3 py-1.5 text-[#F0F4F8] hover:bg-[#262D38] transition-colors"
          >
            <BriefcaseBusiness className="h-3.5 w-3.5 text-[#FFB300]" /> Portfolio
          </Link>
          <Link
            to="/alerts"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#262D38] bg-[#1E232E] px-3 py-1.5 text-[#F0F4F8] hover:bg-[#262D38] transition-colors"
          >
            <BellRing className="h-3.5 w-3.5 text-[#FFB300]" /> Create Price Alert
          </Link>
          <button
            onClick={() => setIsAddAssetOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-3.5 py-1.5 text-slate-950 font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add Holding
          </button>
        </div>
      </div>

      <AddAssetModal isOpen={isAddAssetOpen} onClose={() => setIsAddAssetOpen(false)} />
    </div>
  )
}