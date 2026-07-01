import { useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRightLeft,
  BarChart3,
  BrainCircuit,
  Clock3,
  ExternalLink,
  Landmark,
  Newspaper,
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
import { Skeleton } from '@/components/ui/Skeleton'
import { useQuery } from '@tanstack/react-query'
import { useCryptoNews } from '@/services/news'
import { TradeSimulatorModal } from '@/components/portfolio/TradeSimulatorModal'

interface CoinDetail {
  id: string
  name: string
  symbol: string
  image: { large: string }
  market_data: {
    current_price: { usd: number }
    market_cap: { usd: number }
    total_volume: { usd: number }
    circulating_supply: number
    max_supply: number | null
    ath: { usd: number }
    atl: { usd: number }
    price_change_percentage_24h: number
    market_cap_rank?: number | null
  }
  description: { en: string }
  links: {
    homepage: string[]
    blockchain_site: string[]
    repos_url: { github: string[] }
    twitter_screen_name: string
    subreddit_url: string
  }
  categories: string[]
}

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
  const { coinId } = useParams<{ coinId: string }>()
  const { prices: livePrices } = useLivePriceStore()
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

  const { data: coin, isLoading, error } = useQuery<CoinDetail>({
    queryKey: ['coin-detail', coinId],
    queryFn: () =>
      fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`).then((res) => res.json()),
    enabled: !!coinId,
    staleTime: 1000 * 60 * 5,
  })

  const { data: marketChart } = useQuery<MarketChartData>({
    queryKey: ['coin-market-chart', coinId],
    queryFn: () =>
      fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=30&interval=daily`).then((res) => res.json()),
    enabled: !!coinId,
    staleTime: 1000 * 60 * 10,
  })

  const { data: statusUpdates } = useQuery<{ status_updates?: CoinStatusUpdate[] }>({
    queryKey: ['coin-status-updates', coinId],
    queryFn: () =>
      fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/status_updates?per_page=5`).then((res) => res.json()),
    enabled: !!coinId,
    staleTime: 1000 * 60 * 10,
  })

  const { data: tickerData } = useQuery<{ tickers?: CoinTicker[] }>({
    queryKey: ['coin-tickers', coinId],
    queryFn: () =>
      fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/tickers?limit=5`).then((res) => res.json()),
    enabled: !!coinId,
    staleTime: 1000 * 60 * 5,
  })

  const { data: news } = useCryptoNews(4)

  const livePrice = livePrices[coin?.symbol?.toUpperCase() || '']
  const currentPrice = livePrice?.price ?? coin?.market_data?.current_price?.usd ?? 0
  const change24h = livePrice?.change ?? coin?.market_data?.price_change_percentage_24h ?? 0
  const marketCap = coin?.market_data?.market_cap?.usd ?? 0
  const volume = coin?.market_data?.total_volume?.usd ?? livePrice?.volume ?? 0
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

    return { change30d, peak, trough }
  }, [marketChart])

  const sentiment = useMemo(() => {
    const score = change24h * 1.2 + (historical?.change30d ?? 0) * 0.25 + (volume && marketCap ? Math.min((volume / marketCap) * 40, 12) : 0)

    if (score > 8) {
      return { label: 'Bullish', detail: 'Momentum is accelerating with strong live flow.', tone: 'text-emerald-400' }
    }

    if (score < -8) {
      return { label: 'Risk-off', detail: 'Selling pressure is outweighing buying demand.', tone: 'text-rose-400' }
    }

    return { label: 'Balanced', detail: 'The market is trading with mixed conviction.', tone: 'text-amber-400' }
  }, [change24h, historical, marketCap, volume])

  const topTicker = useMemo(() => {
    const tickers = tickerData?.tickers ?? []
    if (!tickers.length) return null
    return tickers.reduce((best, item) => {
      return item.converted_volume.usd > best.converted_volume.usd ? item : best
    }, tickers[0])
  }, [tickerData])

  const isPositive = change24h >= 0

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Skeleton className="h-20 w-20 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        <Skeleton className="h-[420px] w-full rounded-3xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}
        </div>
      </div>
    )
  }

  if (error || !coin) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <GlassCard className="max-w-md text-center">
          <h2 className="text-2xl font-semibold">Unable to load asset</h2>
          <p className="mt-2 text-sm text-slate-400">Please try again later.</p>
        </GlassCard>
      </div>
    )
  }

  const stats = [
    { label: 'Volume', value: volume, prefix: '$' },
    { label: 'Market Cap', value: marketCap, prefix: '$' },
    { label: 'Rank', value: rank || 1, prefix: '#' },
    { label: 'Supply', value: supply, suffix: ` ${coin.symbol.toUpperCase()}` },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-8 sm:space-y-10">
      <GlassCard className="overflow-hidden border border-white/10 bg-[linear-gradient(120deg,rgba(15,23,42,0.94),rgba(7,11,29,0.96))] p-0 shadow-premium">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <img src={coin.image.large} alt={coin.name} className="h-16 w-16 rounded-2xl border border-white/10" />
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{coin.name}</h1>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.24em] text-slate-400">
                      {coin.symbol.toUpperCase()}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                      ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: currentPrice > 1 ? 2 : 6 })}
                    </div>
                    <div className={`flex items-center gap-1 text-lg font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                      {change24h.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
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
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 transition-all hover:bg-white/10"
                >
                  <Star className={`h-4 w-4 ${watchlistItems.some(w => w.coinId === coinId) ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
                  {watchlistItems.some(w => w.coinId === coinId) ? 'Watching' : 'Watchlist'}
                </button>
                <button className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 transition-all hover:bg-white/10">
                  <Share2 className="h-4 w-4" /> Share
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat, index) => (
                <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{stat.label}</div>
                  <div className="mt-2 text-xl font-semibold tracking-tight text-white">
                    {stat.prefix}
                    <AnimatedCounter value={Math.floor(stat.value)} />
                    {stat.suffix}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Zap className="h-4 w-4 text-amber-400" /> Quick actions
            </div>
            <div className="mt-4 space-y-3">
              <button
                onClick={() => {
                  setTradeMode('buy')
                  setIsTradeOpen(true)
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-left text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
              >
                <span>Quick Buy</span>
                <ArrowRightLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setTradeMode('sell')
                  setIsTradeOpen(true)
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-left text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
              >
                <span>Quick Sell</span>
                <ArrowRightLeft className="h-4 w-4 rotate-180" />
              </button>
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 text-slate-200">
                <BrainCircuit className="h-4 w-4 text-cyan-400" /> Daily signal
              </div>
              <p className="mt-2 leading-6">{sentiment.detail}</p>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-4 py-5 sm:px-8">
          <div>
            <div className="text-lg font-semibold tracking-tight">Professional Trading Chart</div>
            <div className="text-sm text-slate-400">Real-time price feed • Coingecko and Binance data</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Momentum', 'Liquidity', 'Trend'].map((indicator) => (
              <div key={indicator} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
                {indicator}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <ProfessionalOHLCChart coinId={coinId || ''} symbol={coin.symbol.toUpperCase()} />
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-3">
        <GlassCard className="card-sheen">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Newspaper className="h-5 w-5 text-cyan-400" /> News
          </div>
          <div className="space-y-3">
            {news?.map((item) => (
              <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10">
                <div className="text-sm font-medium text-white">{item.title}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-400">{item.source}</div>
              </a>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="card-sheen">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Activity className="h-5 w-5 text-emerald-400" /> Events
          </div>
          <div className="space-y-3">
            {(statusUpdates?.status_updates ?? []).slice(0, 4).map((event, index) => (
              <div key={`${event.category}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-medium text-white">{event.description}</div>
                <div className="mt-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
                  <span>{event.category}</span>
                  <span>{new Date(event.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="card-sheen">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Landmark className="h-5 w-5 text-violet-400" /> Whale activity
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Largest exchange flow</div>
              <div className="mt-2 text-xl font-semibold text-white">
                {topTicker ? topTicker.market.name : 'Flow data syncing'}
              </div>
              <div className="mt-2 text-sm text-slate-300">
                {topTicker ? formatValue(topTicker.converted_volume.usd, '$') : formatValue(volume, '$')}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Live volume intensity</div>
              <div className="mt-2 text-xl font-semibold text-white">{formatValue(volume, '$')}</div>
              <div className="mt-2 text-sm text-slate-300">Relative to market cap {marketCap ? `${((volume / marketCap) * 100).toFixed(1)}%` : '—'}</div>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GlassCard className="card-sheen">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
            <BarChart3 className="h-5 w-5 text-amber-400" /> Historical performance
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: '30D change', value: historical?.change30d ?? 0, suffix: '%' },
              { label: 'ATH', value: ath, prefix: '$' },
              { label: 'ATL', value: atl, prefix: '$' },
              { label: 'Current vs ATH', value: ath ? ((currentPrice / ath) * 100 - 100) : 0, suffix: '%' },
            ].map((item, index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.label}</div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {item.prefix}
                  <AnimatedCounter value={Number(item.value.toFixed(2))} />
                  {item.suffix}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="card-sheen">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Sparkles className="h-5 w-5 text-fuchsia-400" /> Sentiment
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className={`text-2xl font-semibold ${sentiment.tone}`}>{sentiment.label}</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{sentiment.detail}</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
              <Clock3 className="h-4 w-4" /> Updated from live market data
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="card-sheen">
        <div className="mb-4 text-lg font-semibold tracking-tight">About {coin.name}</div>
        <div
          className="prose prose-invert max-w-none text-[15px] leading-7 text-slate-300"
          dangerouslySetInnerHTML={{ __html: coin.description.en ? `${coin.description.en.slice(0, 900)}${coin.description.en.length > 900 ? '…' : ''}` : 'No description available.' }}
        />
        <div className="mt-8 flex flex-wrap gap-3">
          {coin.links.homepage[0] && (
            <a href={coin.links.homepage[0]} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10">
              Website <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {coin.links.repos_url.github[0] && (
            <a href={coin.links.repos_url.github[0]} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10">
              GitHub
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
        price={currentPrice}
        initialMode={tradeMode}
      />
    </div>
  )
}