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
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useGlobalData, useMarketData, useTrendingCoins } from '@/services/coingecko'
import { useCryptoNews } from '@/services/news'
import { useFearGreedIndex } from '@/services/fearGreed'
import { usePortfolioStore } from '@/store/usePortfolioStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { useAuthStore } from '@/store/useAuthStore'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { GlassCard } from '@/components/ui/GlassCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { PriceChange } from '@/components/ui/PriceChange'
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
    maximumFractionDigits: value >= 100000 ? 0 : 2,
  }).format(value)
}

export default function Dashboard() {
  const { holdings } = usePortfolioStore()
  const { prices: livePrices } = useLivePriceStore()
  const { items: watchlistItems } = useWatchlistStore()
  const { user } = useAuthStore()
  const { data: globalData, isLoading: globalLoading } = useGlobalData()
  const { data: marketData = [] } = useMarketData(8)
  const { data: trendingData } = useTrendingCoins()
  const { data: fearGreedData } = useFearGreedIndex()
  const { data: news = [] } = useCryptoNews(5)

  const firstName = user?.name?.split(' ')[0] ?? 'Investor'

  const global = globalData?.data

  const portfolioRows = useMemo(() => {
    return holdings.map((holding) => {
      const live = livePrices[holding.symbol]
      const currentPrice = live?.price ?? holding.avgBuyPrice
      const currentValue = holding.quantity * currentPrice
      const costBasis = holding.quantity * holding.avgBuyPrice
      const profit = currentValue - costBasis
      const roi = costBasis > 0 ? (profit / costBasis) * 100 : 0
      return { ...holding, currentPrice, currentValue, profit, roi, change24h: live?.change ?? 0 }
    })
  }, [holdings, livePrices])

  const portfolioMetrics = useMemo(() => {
    const totalValue = portfolioRows.reduce((sum, item) => sum + item.currentValue, 0)
    const totalCost = portfolioRows.reduce((sum, item) => sum + item.quantity * item.avgBuyPrice, 0)
    const totalProfit = totalValue - totalCost
    const totalRoi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0
    const bestPerformer = [...portfolioRows].sort((a, b) => b.roi - a.roi)[0]
    const worstPerformer = [...portfolioRows].sort((a, b) => a.roi - b.roi)[0]

    return { totalValue, totalProfit, totalRoi, bestPerformer, worstPerformer }
  }, [portfolioRows])

  const watchlistRows = useMemo(() => {
    return watchlistItems
      .slice(0, 4)
      .map((item) => {
        const live = livePrices[item.symbol]
        return {
          ...item,
          price: live?.price ?? 0,
          change: live?.change ?? 0,
        }
      })
  }, [watchlistItems, livePrices])

  const topMovers = useMemo(() => {
    const gainers = [...marketData].filter((coin) => coin.price_change_percentage_24h > 0).sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0, 4)
    const losers = [...marketData].filter((coin) => coin.price_change_percentage_24h < 0).sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, 4)
    return { gainers, losers }
  }, [marketData])

  const recentAssets = useMemo(() => {
    if (typeof window === 'undefined') return marketData.slice(0, 4)
    const raw = window.localStorage.getItem('cryptopulse-recent-assets')
    if (!raw) return marketData.slice(0, 4)

    try {
      const ids = JSON.parse(raw) as string[]
      const matched = marketData.filter((coin) => ids.includes(coin.id))
      return matched.length ? matched.slice(0, 4) : marketData.slice(0, 4)
    } catch {
      return marketData.slice(0, 4)
    }
  }, [marketData])

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

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
                {greeting()}, {firstName}.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Track momentum, review movers, and act on opportunities from one calm workspace.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5 text-sm text-slate-600 shadow-sm backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Market pulse</div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <div className="text-3xl font-semibold tracking-[-0.03em] text-slate-900">{globalLoading ? <Skeleton className="h-8 w-24" /> : <AnimatedCounter value={global?.market_cap_change_percentage_24h_usd ?? 0} suffix="%" />}</div>
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionReveal delay={0.07}>
          <GlassCard className="card-sheen">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-500">Portfolio Summary</div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900">
                  {globalLoading ? <Skeleton className="h-8 w-28" /> : formatCurrency(portfolioMetrics.totalValue)}
                </div>
              </div>
              <div className="rounded-2xl bg-violet-50 p-2 text-violet-700">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <Activity className="h-4 w-4" />
              {portfolioRows.length ? `${portfolioRows.length} active positions` : 'No positions yet'}
            </div>
          </GlassCard>
        </SectionReveal>

        <SectionReveal delay={0.1}>
          <GlassCard className="card-sheen">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-500">Today&apos;s Profit / Loss</div>
                <div className={`mt-2 text-3xl font-semibold tracking-[-0.03em] ${portfolioMetrics.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {globalLoading ? <Skeleton className="h-8 w-28" /> : `${portfolioMetrics.totalProfit >= 0 ? '+' : ''}${formatCurrency(Math.abs(portfolioMetrics.totalProfit))}`}
                </div>
              </div>
              <div className={`rounded-2xl p-2 ${portfolioMetrics.totalProfit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                {portfolioMetrics.totalProfit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-500">
              {portfolioMetrics.totalRoi >= 0 ? '+' : ''}{portfolioMetrics.totalRoi.toFixed(1)}% ROI across holdings
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
              { label: 'Total Market Cap', value: global?.total_market_cap.usd ?? 0, prefix: '$', suffix: 'T', color: 'text-slate-900' },
              { label: '24h Volume', value: (global?.total_volume.usd ?? 0) / 1e9, prefix: '$', suffix: 'B', color: 'text-slate-900' },
              { label: 'Active Coins', value: global?.active_cryptocurrencies ?? 0, color: 'text-slate-900' },
              { label: 'BTC Dominance', value: global?.market_cap_percentage?.btc ?? 0, suffix: '%', color: 'text-violet-700' },
            ].map((item) => (
              <div key={item.label} className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="text-sm text-slate-500">{item.label}</div>
                <div className={`mt-3 text-2xl font-semibold tracking-[-0.03em] ${item.color}`}>
                  {globalLoading ? <Skeleton className="h-8 w-24" /> : <><AnimatedCounter value={item.value} prefix={item.prefix} suffix={item.suffix} /></>}
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
                    <div className="font-mono text-sm font-medium text-slate-900">{formatCurrency(item.price)}</div>
                    <div className={`text-sm ${item.change >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%</div>
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