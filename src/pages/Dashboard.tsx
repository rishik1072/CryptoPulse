import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  BellRing,
  BriefcaseBusiness,
  ChevronRight,
  Compass,
  Eye,
  Newspaper,
  Plus,
  Star,
  TrendingDown,
  TrendingUp,
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
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { GlassCard } from '@/components/ui/GlassCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { PriceChange } from '@/components/ui/PriceChange'
import { LivePriceTracker } from '@/components/dashboard/LivePriceTracker'
function SectionReveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function Dashboard() {
  const { holdings } = usePortfolioStore()
  const { prices: livePrices, connectionStatus } = useLivePriceStore()
  const { user } = useAuthStore()
  const { items: watchlistItems } = useWatchlistStore()
  const { data: globalData, isLoading: globalLoading } = useGlobalData()
  const { data: marketData = [] } = useMarketData(50)
  const { data: trendingData } = useTrendingCoins()
  const { data: fearGreedData } = useFearGreedIndex()
  const { data: news = [] } = useCryptoNews(5)

  const firstName = user?.name?.split(' ')[0] ?? 'Investor'

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
    return watchlistItems
      .slice(0, 4)
      .map((item) => {
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
    const gainers = [...marketData].filter((coin) => coin.price_change_percentage_24h > 0).sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0, 4)
    const losers = [...marketData].filter((coin) => coin.price_change_percentage_24h < 0).sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, 4)
    return { gainers, losers }
  }, [marketData])

  // Get recent assets from localStorage outside of useMemo to avoid side effects
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

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  return (
    <div className="space-y-6 sm:space-y-8">
      <SectionReveal>
        <GlassCard className="relative overflow-hidden border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(109,40,217,0.12),_transparent_38%),linear-gradient(135deg,_#ffffff_0%,_#f8fafc_100%)] p-6 sm:p-8 lg:p-10">
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1.25fr_0.7fr] lg:items-end">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-violet-700">
                Live market &bull; {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <h1 className="text-balance text-4xl font-semibold leading-[0.95] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
                {greeting}, {firstName}.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Track momentum, review movers, and act on opportunities from one calm workspace.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5 text-sm text-slate-600 shadow-sm backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Market pulse</div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <div className="text-3xl font-semibold tracking-[-0.03em] text-slate-900">{globalLoading ? <Skeleton className="h-8 w-24" /> : <AnimatedCounter value={global?.market_cap_change_percentage_24h_usd ?? 0} suffix="%" decimals={2} />}</div>
                  <div className="mt-1 text-sm text-emerald-600">{globalLoading ? 'Updating…' : '24h market shift'}</div>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  {globalLoading ? 'Live' : 'Bullish bias'}
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </SectionReveal>

      {/* Real-time Binance WebSocket Ticker Bar */}
      <SectionReveal delay={0.04}>
        <LivePriceTracker />
      </SectionReveal>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionReveal delay={0.07}>
          <GlassCard className="card-sheen">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-slate-500">Portfolio Summary</div>
                  {portfolioMetrics.isIncomplete && (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      Partial
                    </span>
                  )}
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900">
                  {globalLoading ? (
                    <Skeleton className="h-8 w-28" />
                  ) : portfolioMetrics.valuedCount > 0 ? (
                    formatCurrency(portfolioMetrics.totalValue)
                  ) : holdings.length === 0 ? (
                    '$0.00'
                  ) : (
                    <span className="text-slate-400 text-2xl font-normal">—</span>
                  )}
                </div>
              </div>
              <div className="rounded-2xl bg-violet-50 p-2 text-violet-700">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <Activity className="h-4 w-4" />
              {portfolioRows.length
                ? `${portfolioMetrics.valuedCount} of ${portfolioRows.length} positions priced`
                : 'No positions yet'}
            </div>
          </GlassCard>
        </SectionReveal>

        <SectionReveal delay={0.1}>
          <GlassCard className="card-sheen">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-slate-500">Today&apos;s Profit / Loss</div>
                  {portfolioMetrics.isIncomplete && (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      Priced Only
                    </span>
                  )}
                </div>
                <div className={`mt-2 text-3xl font-semibold tracking-[-0.03em] ${portfolioMetrics.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {globalLoading ? (
                    <Skeleton className="h-8 w-28" />
                  ) : portfolioMetrics.valuedCount > 0 ? (
                    `${portfolioMetrics.totalProfit >= 0 ? '+' : ''}${formatCurrency(portfolioMetrics.totalProfit)}`
                  ) : holdings.length === 0 ? (
                    '$0.00'
                  ) : (
                    <span className="text-slate-400 text-2xl font-normal">—</span>
                  )}
                </div>
              </div>
              <div className={`rounded-2xl p-2 ${portfolioMetrics.totalProfit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                {portfolioMetrics.totalProfit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-500">
              {portfolioMetrics.valuedCount > 0
                ? `${portfolioMetrics.totalRoi >= 0 ? '+' : ''}${portfolioMetrics.totalRoi.toFixed(1)}% ROI across priced holdings`
                : 'Awaiting verified market prices'}
            </div>
          </GlassCard>
        </SectionReveal>

        <SectionReveal delay={0.13}>
          <GlassCard className="card-sheen">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-500">Net Worth</div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900">
                  {globalLoading ? <Skeleton className="h-8 w-28" /> : formatCurrency(portfolioMetrics.totalValue)}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-500">
              Updated from live market data and your portfolio balances.
            </div>
          </GlassCard>
        </SectionReveal>
      </div>

      <SectionReveal delay={0.16}>
        <GlassCard className="card-sheen">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-lg font-semibold tracking-tight text-slate-900">Market Overview</div>
              <div className="text-sm text-slate-500">High-level conditions across the crypto market</div>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
              Live • CoinGecko
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total Market Cap', value: (global?.total_market_cap?.usd ?? 0) / 1e12, prefix: '$', suffix: 'T', decimals: 2, color: 'text-slate-900' },
              { label: '24h Volume', value: (global?.total_volume?.usd ?? 0) / 1e9, prefix: '$', suffix: 'B', decimals: 2, color: 'text-slate-900' },
              { label: 'Active Coins', value: global?.active_cryptocurrencies ?? 0, decimals: 0, color: 'text-slate-900' },
              { label: 'BTC Dominance', value: global?.market_cap_percentage?.btc ?? 0, suffix: '%', decimals: 1, color: 'text-violet-700' },
            ].map((item) => (
              <div key={item.label} className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="text-sm text-slate-500">{item.label}</div>
                <div className={`mt-3 text-2xl font-semibold tracking-[-0.03em] ${item.color}`}>
                  {globalLoading ? <Skeleton className="h-8 w-24" /> : <><AnimatedCounter value={item.value} prefix={item.prefix} suffix={item.suffix} decimals={item.decimals} /></>}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </SectionReveal>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionReveal delay={0.18}>
          <GlassCard className="card-sheen">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold tracking-tight text-slate-900">Watchlist</div>
                <div className="text-sm text-slate-500">Your active ideas and movers</div>
              </div>
              <Link to="/watchlist" className="inline-flex items-center gap-1 text-sm font-medium text-violet-700">
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {watchlistRows.length ? watchlistRows.map((item) => (
                <div key={item.coinId} className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/80 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white p-2 shadow-sm">
                      <Star className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{item.name}</div>
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.symbol}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-medium text-slate-900">
                      {item.price !== null ? formatCurrency(item.price) : <span className="text-slate-400 font-normal">—</span>}
                    </div>
                    <div className="text-sm">
                      {item.change !== null ? (
                        <span className={item.change >= 0 ? 'text-emerald-600' : 'text-rose-500'}>
                          {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-slate-500">
                  Add assets from the markets page to build your watchlist.
                </div>
              )}
            </div>
          </GlassCard>
        </SectionReveal>

        <SectionReveal delay={0.21}>
          <GlassCard className="card-sheen">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold tracking-tight text-slate-900">Top Movers</div>
                <div className="text-sm text-slate-500">Momentum leaders and laggards</div>
              </div>
              <Link to="/markets" className="inline-flex items-center gap-1 text-sm font-medium text-violet-700">
                Explore <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[20px] border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <TrendingUp className="h-4 w-4" /> Top gainers
                </div>
                <div className="space-y-3">
                  {topMovers.gainers.length ? topMovers.gainers.map((coin) => (
                    <div key={coin.id} className="flex items-center justify-between rounded-[16px] bg-white/90 px-3 py-2">
                      <div>
                        <div className="font-medium text-slate-900">{coin.name}</div>
                        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{coin.symbol}</div>
                      </div>
                      <PriceChange value={coin.price_change_percentage_24h} />
                    </div>
                  )) : <Skeleton className="h-16 w-full" />}
                </div>
              </div>

              <div className="rounded-[20px] border border-rose-100 bg-rose-50/70 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-rose-600">
                  <TrendingDown className="h-4 w-4" /> Top losers
                </div>
                <div className="space-y-3">
                  {topMovers.losers.length ? topMovers.losers.map((coin) => (
                    <div key={coin.id} className="flex items-center justify-between rounded-[16px] bg-white/90 px-3 py-2">
                      <div>
                        <div className="font-medium text-slate-900">{coin.name}</div>
                        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{coin.symbol}</div>
                      </div>
                      <PriceChange value={coin.price_change_percentage_24h} />
                    </div>
                  )) : <Skeleton className="h-16 w-full" />}
                </div>
              </div>
            </div>
          </GlassCard>
        </SectionReveal>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionReveal delay={0.24}>
          <GlassCard className="card-sheen">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold tracking-tight text-slate-900">Trending Coins</div>
                <div className="text-sm text-slate-500">What people are watching right now</div>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                CoinGecko
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {trendingData?.coins?.slice(0, 4).map((coin) => (
                <div key={coin.item.id} className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/80 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <img src={coin.item.small} alt={coin.item.name} className="h-9 w-9 rounded-full" />
                    <div>
                      <div className="font-medium text-slate-900">{coin.item.name}</div>
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{coin.item.symbol}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-medium text-slate-900">{formatCurrency(coin.item.data.price)}</div>
                    <div className={`text-sm ${coin.item.data.price_change_percentage_24h.usd >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {coin.item.data.price_change_percentage_24h.usd >= 0 ? '+' : ''}{coin.item.data.price_change_percentage_24h.usd.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </SectionReveal>

        <SectionReveal delay={0.27}>
          <GlassCard className="card-sheen">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold tracking-tight text-slate-900">Fear & Greed</div>
                <div className="text-sm text-slate-500">Current sentiment in the market</div>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                Alternative.me
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50/80 p-6 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-violet-200 bg-white text-4xl font-semibold text-slate-900">
                {fearGreedData?.value ?? 50}
              </div>
              <div className="mt-4 text-xl font-semibold text-slate-900">{fearGreedData?.value_classification ?? 'Neutral'}</div>
              <div className="mt-2 text-sm text-slate-500">Sentiment is being measured from the latest live index snapshot.</div>
            </div>
          </GlassCard>
        </SectionReveal>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionReveal delay={0.3}>
          <GlassCard className="card-sheen">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold tracking-tight text-slate-900">Crypto News</div>
                <div className="text-sm text-slate-500">Fresh stories from the market</div>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                RSS
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {news.length ? news.map((item) => (
                <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-3 rounded-[18px] border border-slate-200 bg-slate-50/80 p-3 transition-all hover:border-violet-200 hover:bg-white">
                  <div>
                    <div className="font-medium text-slate-900">{item.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.source}</div>
                  </div>
                  <div className="rounded-2xl bg-white p-2 text-slate-500">
                    <Newspaper className="h-4 w-4" />
                  </div>
                </a>
              )) : <Skeleton className="h-24 w-full" />}
            </div>
          </GlassCard>
        </SectionReveal>

        <SectionReveal delay={0.33}>
          <GlassCard className="card-sheen">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold tracking-tight text-slate-900">Recently Viewed Assets</div>
                <div className="text-sm text-slate-500">A quick return path to your last looks</div>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                History
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {recentAssets.length ? recentAssets.map((coin) => (
                <Link key={coin.id} to={`/asset/${coin.id}`} className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/80 px-3 py-3 transition-all hover:border-violet-200 hover:bg-white">
                  <div className="flex items-center gap-3">
                    <img src={coin.image} alt={coin.name} className="h-9 w-9 rounded-full" />
                    <div>
                      <div className="font-medium text-slate-900">{coin.name}</div>
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{coin.symbol}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Eye className="h-4 w-4" />
                    Open
                  </div>
                </Link>
              )) : <Skeleton className="h-24 w-full" />}
            </div>
          </GlassCard>
        </SectionReveal>
      </div>

      <SectionReveal delay={0.36}>
        <GlassCard className="card-sheen">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold tracking-tight text-slate-900">Quick Actions</div>
              <div className="text-sm text-slate-500">Jump to the actions that matter most</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/markets" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:border-violet-200 hover:text-violet-700">
                <Compass className="h-4 w-4" /> Explore Markets
              </Link>
              <Link to="/portfolio" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:border-violet-200 hover:text-violet-700">
                <BriefcaseBusiness className="h-4 w-4" /> Manage Portfolio
              </Link>
              <Link to="/alerts" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:border-violet-200 hover:text-violet-700">
                <BellRing className="h-4 w-4" /> Create Alert
              </Link>
              <Link to="/watchlist" className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-800">
                <Plus className="h-4 w-4" /> Add Watchlist
              </Link>
            </div>
          </div>
        </GlassCard>
      </SectionReveal>
    </div>
  )
}