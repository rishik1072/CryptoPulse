
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  BarChart3,
  Sparkles
} from 'lucide-react'
import { 
  useGlobalData, 
  useMarketData, 
  useTrendingCoins, 
  useFearGreed 
} from '@/services/coingecko'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { GlassCard } from '@/components/ui/GlassCard'
import { MarketDominanceChart } from '@/components/charts/MarketDominanceChart'
import { TopMovers } from '@/components/dashboard/TopMovers'
import { TrendingSection } from '@/components/dashboard/TrendingSection'
import { WatchlistPreview } from '@/components/dashboard/WatchlistPreview'
import { NewsSection } from '@/components/dashboard/NewsSection'
import { FearGreedWidget } from '@/components/dashboard/FearGreedWidget'
import { Skeleton } from '@/components/ui/Skeleton'
import { LivePriceTracker } from '@/components/dashboard/LivePriceTracker'
import { RealTimePriceChart } from '@/components/charts/RealTimePriceChart'



export default function Dashboard() {
  const { data: globalData, isLoading: globalLoading } = useGlobalData()
  const { data: marketData, isLoading: marketLoading } = useMarketData(8)
  const { data: trendingData } = useTrendingCoins()
  const { data: fearGreed } = useFearGreed()

  const global = globalData?.data

  return (
    <div className="space-y-6 sm:space-y-8">
      <GlassCard className="relative overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.2),_transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(8,15,33,0.96))] p-6 sm:p-8 lg:p-10">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.4fr] lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/80">
              <Sparkles className="h-3.5 w-3.5" />
              Live market • {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>

            <h1 className="text-balance text-4xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              Good morning.<br />Markets are <span className="text-primary">alive</span>.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Your portfolio is up <span className="font-semibold text-emerald-400">3.8%</span> today with live momentum across the market.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300 backdrop-blur">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Momentum snapshot</div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <div className="text-3xl font-semibold tracking-[-0.03em] text-white">+$5.8k</div>
                <div className="mt-1 text-sm text-emerald-400">+4.82% today</div>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300">
                Bullish bias
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-4 right-4 text-right text-[10px] font-mono uppercase tracking-[0.3em] text-white/30">
          CRYPTOPULSE • 2026
        </div>
      </GlassCard>

      {/* Live Real-time Prices */}
      <LivePriceTracker />

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <div className="text-lg font-semibold tracking-tight">Live Charts</div>
            <div className="text-sm text-slate-400">Realtime momentum at a glance</div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
            Real-time • Binance
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { symbol: 'BTC', label: 'BTC/USDT', color: '#f59e0b' },
            { symbol: 'ETH', label: 'ETH/USDT', color: '#6366f1' },
            { symbol: 'SOL', label: 'SOL/USDT', color: '#22c55e' },
            { symbol: 'XRP', label: 'XRP/USDT', color: '#0ea5e9' },
            { symbol: 'DOGE', label: 'DOGE/USDT', color: '#eab308' },
            { symbol: 'BNB', label: 'BNB/USDT', color: '#8b5cf6' },
          ].map((chart) => (
            <GlassCard key={chart.symbol} className="card-sheen" padding="md">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{chart.label}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-400">1m</span>
              </div>
              <RealTimePriceChart symbol={chart.symbol} color={chart.color} height={160} />
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Portfolio Summary + Fear & Greed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <GlassCard className="card-sheen lg:col-span-1">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.24em] text-slate-400">Portfolio Value</div>
              <div className="mt-2 text-4xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
                <AnimatedCounter value={124890} prefix="$" />
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-right text-sm text-emerald-300">
              <div className="flex items-center justify-end gap-1 font-medium">
                <TrendingUp className="h-4 w-4" /> +4.82%
              </div>
              <div className="mt-1 text-xs text-emerald-200/80">+$5,821 today</div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-slate-400">24h P&amp;L</div>
              <div className="mt-2 font-semibold text-emerald-400">+$5,821</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-slate-400">All Time</div>
              <div className="mt-2 font-semibold text-white">+$38,420</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-slate-400">Assets</div>
              <div className="mt-2 font-semibold text-white">14</div>
            </div>
          </div>
        </GlassCard>

        {/* Fear & Greed */}
        <FearGreedWidget data={fearGreed} isLoading={!fearGreed} />
      </div>

      {/* Global Market Stats */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <div className="text-lg font-semibold tracking-tight">Global Market</div>
            <div className="text-sm text-slate-400">Cross-market signals and totals</div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Live</div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { 
              label: "Total Market Cap", 
              value: global?.total_market_cap.usd || 0, 
              prefix: "$", 
              suffix: "T", 
              icon: DollarSign 
            },
            { 
              label: "24h Volume", 
              value: (global?.total_volume.usd || 0) / 1e9, 
              prefix: "$", 
              suffix: "B", 
              icon: BarChart3 
            },
            { 
              label: "Active Cryptos", 
              value: global?.active_cryptocurrencies || 0, 
              icon: Users 
            },
            { 
              label: "Market Change", 
              value: global?.market_cap_change_percentage_24h_usd || 0, 
              suffix: "%", 
              icon: TrendingUp 
            },
          ].map((stat, index) => (
            <div key={index}>
              <GlassCard className="h-full">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-muted tracking-widest">{stat.label}</div>
                    <div className="mt-3 text-3xl font-semibold tracking-[-1.6px] tabular-nums">
                      {globalLoading ? (
                        <Skeleton className="h-8 w-28" />
                      ) : (
                        <AnimatedCounter 
                          value={stat.value} 
                          prefix={stat.prefix} 
                          suffix={stat.suffix} 
                        />
                      )}
                    </div>
                  </div>
                  <stat.icon className="h-5 w-5 text-muted mt-1" />
                </div>
              </GlassCard>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row: Dominance + Top Movers */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <GlassCard className="card-sheen xl:col-span-1">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold tracking-tight">Market Dominance</div>
              <div className="text-sm text-slate-400">BTC and ETH share of the market</div>
            </div>
          </div>
          <MarketDominanceChart 
            btc={global?.market_cap_percentage.btc || 52} 
            eth={global?.market_cap_percentage.eth || 18} 
          />
        </GlassCard>

        {/* Top Gainers & Losers */}
        <div className="xl:col-span-1">
          <TopMovers 
            data={marketData} 
            isLoading={marketLoading} 
          />
        </div>
      </div>

      {/* Trending + Watchlist Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TrendingSection data={trendingData} />
        <WatchlistPreview />
      </div>

      {/* News Section */}
      <NewsSection />
    </div>
  )
}