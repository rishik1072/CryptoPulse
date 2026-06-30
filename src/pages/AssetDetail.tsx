import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { 
  Star, Share2, ExternalLink, TrendingUp, TrendingDown 
} from 'lucide-react'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { ProfessionalOHLCChart } from '@/components/charts/ProfessionalOHLCChart'
import { GlassCard } from '@/components/ui/GlassCard'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { Skeleton } from '@/components/ui/Skeleton'
import { useQuery } from '@tanstack/react-query'
import { useOHLCData } from '@/services/historical'

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

export default function AssetDetail() {
  const { coinId } = useParams<{ coinId: string }>()
  const { prices: livePrices } = useLivePriceStore()

  const [isFavorite, setIsFavorite] = useState(false)

  // Fetch detailed coin data
  const { data: coin, isLoading, error } = useQuery<CoinDetail>({
    queryKey: ['coin-detail', coinId],
    queryFn: () =>
      fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`)
        .then(res => res.json()),
    enabled: !!coinId,
    staleTime: 1000 * 60 * 5,
  })

  // Live price from WebSocket
  const livePrice = livePrices[coin?.symbol?.toUpperCase() || '']
  const currentPrice = livePrice?.price ?? coin?.market_data?.current_price?.usd ?? 0
  const change24h = livePrice?.change ?? coin?.market_data?.price_change_percentage_24h ?? 0

useOHLCData(coinId || '', 30); // fetched data not used currently

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}
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

  return (
    <div className="mx-auto max-w-7xl space-y-8 sm:space-y-10">
      <div className="flex flex-col gap-6 rounded-[32px] border border-white/10 bg-[linear-gradient(120deg,rgba(15,23,42,0.94),rgba(7,11,29,0.96))] p-6 shadow-premium sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <img src={coin.image.large} alt={coin.name} className="h-20 w-20 rounded-2xl border border-white/10" />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl">{coin.name}</h1>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono uppercase tracking-[0.24em] text-slate-400">
                {coin.symbol.toUpperCase()}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                ${currentPrice.toLocaleString()}
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
            onClick={() => setIsFavorite(!isFavorite)}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 transition-all hover:bg-white/10"
          >
            <Star className={`h-4 w-4 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
            Watchlist
          </button>
          <button className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 transition-all hover:bg-white/10">
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
      </div>

      {/* Professional OHLC Chart */}
      <GlassCard className="overflow-hidden p-0">
        <div className="border-b border-white/10 px-4 py-5 sm:px-8">
          <div className="text-lg font-semibold tracking-tight">Price History</div>
          <div className="text-sm text-slate-400">CoinGecko + Binance • Real-time</div>
        </div>

        <div className="p-4 sm:p-6">
          {coin ? (
            <ProfessionalOHLCChart 
              coinId={coinId || ''} 
              symbol={coin.symbol.toUpperCase()} 
            />
          ) : (
            <Skeleton className="h-[420px] w-full rounded-2xl" />
          )}
        </div>
      </GlassCard>

      {/* Market Statistics */}
      <div>
        <div className="mb-4 px-1 text-lg font-semibold tracking-tight">Market Statistics</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Market Cap', value: coin.market_data.market_cap.usd, prefix: '$' },
            { label: '24h Volume', value: coin.market_data.total_volume.usd, prefix: '$' },
            { label: 'Circulating Supply', value: coin.market_data.circulating_supply, suffix: ' ' + coin.symbol.toUpperCase() },
            { label: 'Market Rank', value: coin.market_data.market_cap_rank ?? 1, prefix: '#' },
          ].map((stat, i) => (
            <GlassCard key={i} padding="md" className="card-sheen">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{stat.label}</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {stat.prefix}
                <AnimatedCounter value={Math.floor(stat.value)} />
                {stat.suffix}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* About */}
      <GlassCard className="card-sheen">
        <div className="mb-4 text-lg font-semibold tracking-tight">About {coin.name}</div>
        <div className="prose prose-invert max-w-none text-[15px] leading-7 text-slate-300"
             dangerouslySetInnerHTML={{ __html: coin.description.en.slice(0, 680) + '...' }} />

        <div className="mt-8 flex flex-wrap gap-3">
          {coin.links.homepage[0] && (
            <a href={coin.links.homepage[0]} target="_blank" className="flex items-center gap-2 text-sm px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10">
              Website <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {coin.links.repos_url.github[0] && (
            <a href={coin.links.repos_url.github[0]} target="_blank" className="flex items-center gap-2 text-sm px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10">
              GitHub
            </a>
          )}
        </div>
      </GlassCard>
    </div>
  )
}