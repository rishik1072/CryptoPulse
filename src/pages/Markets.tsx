import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useInfiniteMarketData, useTrendingCoins } from '@/services/coingecko'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { formatCompactUSD } from '@/services/priceResolver'
import { GlassCard } from '@/components/ui/GlassCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { Search, Star, ArrowUpDown, Sparkles, Filter, ChevronRight } from 'lucide-react'

type SortKey = 'market_cap' | 'current_price' | 'price_change_percentage_24h' | 'total_volume'

const FILTERS = ['All', 'Top Gainers', 'Top Losers', 'Trending', 'DeFi', 'Layer 1', 'Meme', 'AI']
const CATEGORY_TABS = ['All', 'DeFi', 'Layer 1', 'AI', 'Meme']
const ROW_HEIGHT = 84

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000000000 ? 0 : value >= 1000000 ? 1 : 2,
  }).format(value)
}

export default function Markets() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteMarketData(50)
  const { data: trendingData } = useTrendingCoins()
  const { prices: livePrices } = useLivePriceStore()
  const { items: watchlistItems, addToWatchlist, removeFromWatchlist } = useWatchlistStore()

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortKey] = useState<SortKey>('market_cap')
  const [sortDir] = useState<'desc' | 'asc'>('desc')
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(560)
  const listRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Derive favorites from the real watchlist store
  const favoriteIds = useMemo(() => new Set(watchlistItems.map(w => w.coinId)), [watchlistItems])

  const coins = useMemo(() => {
    return (data?.pages.flatMap((page) => page) ?? []).map((coin) => {
      const live = livePrices[coin.symbol.toUpperCase()]
      return {
        ...coin,
        current_price: live?.price ?? coin.current_price,
        price_change_percentage_24h: live?.change ?? coin.price_change_percentage_24h,
        // Preserve CoinGecko aggregate 24h USD volume; do NOT overwrite with single-exchange base volume
        total_volume: typeof coin.total_volume === 'number' && Number.isFinite(coin.total_volume) ? coin.total_volume : 0,
      }
    })
  }, [data, livePrices])

  const filteredCoins = useMemo(() => {
    let result = [...coins]

    if (search) {
      const term = search.toLowerCase()
      result = result.filter((coin) => coin.name.toLowerCase().includes(term) || coin.symbol.toLowerCase().includes(term))
    }

    if (activeFilter === 'Top Gainers') {
      result = result.filter((coin) => coin.price_change_percentage_24h > 5)
    }
    if (activeFilter === 'Top Losers') {
      result = result.filter((coin) => coin.price_change_percentage_24h < -5)
    }
    if (activeFilter === 'Trending') {
      const ids = new Set((trendingData?.coins ?? []).map((item) => item.item.id))
      result = result.filter((coin) => ids.has(coin.id))
    }
    if (activeCategory !== 'All') {
      const category = activeCategory.toLowerCase()
      result = result.filter((coin) => {
        const name = `${coin.name} ${coin.symbol}`.toLowerCase()
        if (category === 'defi') return name.includes('defi') || name.includes('aave') || name.includes('maker') || name.includes('curve')
        if (category === 'layer 1') return name.includes('layer') || name.includes('ethereum') || name.includes('solana') || name.includes('avalanche') || name.includes('near')
        if (category === 'ai') return name.includes('ai') || name.includes('fetch') || name.includes('render') || name.includes('ocean') || name.includes('singularity')
        if (category === 'meme') return name.includes('meme') || name.includes('doge') || name.includes('shib') || name.includes('pepe') || name.includes('floki')
        return true
      })
    }

    result.sort((a, b) => {
      let valueA = 0
      let valueB = 0

      if (sortKey === 'market_cap') {
        valueA = a.market_cap
        valueB = b.market_cap
      } else if (sortKey === 'current_price') {
        valueA = a.current_price
        valueB = b.current_price
      } else if (sortKey === 'price_change_percentage_24h') {
        valueA = a.price_change_percentage_24h
        valueB = b.price_change_percentage_24h
      } else {
        valueA = a.total_volume
        valueB = b.total_volume
      }

      return sortDir === 'desc' ? valueB - valueA : valueA - valueB
    })

    return result
  }, [activeCategory, activeFilter, coins, search, sortDir, sortKey, trendingData])

  const topGainers = useMemo(() => [...coins].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0, 3), [coins])
  const topLosers = useMemo(() => [...coins].sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, 3), [coins])
  const marketCap = useMemo(() => coins.reduce((sum, coin) => sum + coin.market_cap, 0), [coins])
  const volume = useMemo(() => coins.reduce((sum, coin) => sum + coin.total_volume, 0), [coins])

  const visibleCoins = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 4)
    const end = Math.min(filteredCoins.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + 4)
    return filteredCoins.slice(start, end)
  }, [filteredCoins, scrollTop, viewportHeight])

  useEffect(() => {
    const node = listRef.current
    if (!node) return

    const onScroll = () => setScrollTop(node.scrollTop)
    node.addEventListener('scroll', onScroll)
    return () => node.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const updateHeight = () => setViewportHeight(window.innerWidth < 768 ? 420 : 560)
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { root: listRef.current, threshold: 0.2 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const toggleFavorite = (coin: { id: string; symbol: string; name: string; image: string }) => {
    if (favoriteIds.has(coin.id)) {
      removeFromWatchlist(coin.id)
    } else {
      addToWatchlist({ coinId: coin.id, symbol: coin.symbol.toUpperCase(), name: coin.name, image: coin.image })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl">Markets</h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">Browse live crypto opportunities with premium market intelligence.</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search coins or symbols..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <GlassCard className="card-sheen lg:col-span-1">
          <div className="text-sm text-slate-500">Total market cap</div>
          <div className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-900">{isLoading ? <Skeleton className="h-8 w-28" /> : formatCurrency(marketCap)}</div>
        </GlassCard>
        <GlassCard className="card-sheen lg:col-span-1">
          <div className="text-sm text-slate-500">24h volume</div>
          <div className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-900">{isLoading ? <Skeleton className="h-8 w-28" /> : formatCurrency(volume)}</div>
        </GlassCard>
        <GlassCard className="card-sheen lg:col-span-1">
          <div className="text-sm text-slate-500">Top gainers</div>
          <div className="mt-3 space-y-2">
            {topGainers.map((coin) => (
              <div key={coin.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800">{coin.symbol.toUpperCase()}</span>
                <span className="text-emerald-600">+{coin.price_change_percentage_24h.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </GlassCard>
        <GlassCard className="card-sheen lg:col-span-1">
          <div className="text-sm text-slate-500">Top losers</div>
          <div className="mt-3 space-y-2">
            {topLosers.map((coin) => (
              <div key={coin.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800">{coin.symbol.toUpperCase()}</span>
                <span className="text-rose-500">{coin.price_change_percentage_24h.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="sticky top-16 z-20 rounded-[24px] border border-slate-200/80 bg-white/85 p-3 shadow-sm backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
          <Filter className="h-4 w-4" /> Filters
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition-all ${activeFilter === filter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORY_TABS.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full px-3 py-2 text-sm transition-all ${activeCategory === category ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <GlassCard className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-4 sm:px-6">
            <div>
              <div className="text-lg font-semibold tracking-tight text-slate-900">Trending now</div>
              <div className="text-sm text-slate-500">Momentum from the latest market surfacing</div>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.25em] text-slate-500">Live</div>
          </div>

          <div className="grid gap-3 p-4 sm:p-6 md:grid-cols-2">
            {(trendingData?.coins ?? []).slice(0, 4).map((coin) => (
              <div key={coin.item.id} className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={coin.item.small} alt={coin.item.name} className="h-9 w-9 rounded-full" />
                    <div>
                      <div className="font-medium text-slate-900">{coin.item.name}</div>
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{coin.item.symbol}</div>
                    </div>
                  </div>
                  <div className={`rounded-full px-2.5 py-1 text-xs font-medium ${coin.item.data.price_change_percentage_24h.usd >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {coin.item.data.price_change_percentage_24h.usd >= 0 ? '+' : ''}{coin.item.data.price_change_percentage_24h.usd.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="card-sheen">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
            <Sparkles className="h-5 w-5 text-violet-600" /> Market pulse
          </div>
          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/80 px-3 py-3">
              <span>Fast loading</span>
              <span className="font-medium text-slate-900">React Query</span>
            </div>
            <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/80 px-3 py-3">
              <span>Infinite loading</span>
              <span className="font-medium text-slate-900">On demand</span>
            </div>
            <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/80 px-3 py-3">
              <span>Virtualized rows</span>
              <span className="font-medium text-slate-900">Smooth scroll</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-slate-200/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="text-lg font-semibold tracking-tight text-slate-900">Market explorer</div>
            <div className="text-sm text-slate-500">Animated rows with live pricing and real market data</div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <ArrowUpDown className="h-4 w-4" />
            Sorted by {sortKey.replace('_', ' ')} • {sortDir}
          </div>
        </div>

        {isLoading && coins.length === 0 ? (
          <div className="space-y-2 p-4 sm:p-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div ref={listRef} className="max-h-[560px] overflow-auto">
            <div style={{ height: `${filteredCoins.length * ROW_HEIGHT}px`, position: 'relative' }}>
              {visibleCoins.map((coin, index) => {
                const isFavorite = favoriteIds.has(coin.id)
                const change = coin.price_change_percentage_24h
                const actualIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 4) + index
                const isPositive = change >= 0
                const rowTop = actualIndex * ROW_HEIGHT

                return (
                  <motion.div
                    key={coin.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ top: `${rowTop}px`, position: 'absolute', left: 0, right: 0 }}
                    className="border-b border-slate-100 px-4 py-3 sm:px-6"
                  >
                    <div className="flex items-center justify-between gap-3 rounded-[20px] bg-white/70 px-3 py-3 hover:bg-slate-50">
                      <Link to={`/asset/${coin.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                          {coin.image ? <img src={coin.image} alt={coin.name} className="h-10 w-10 rounded-2xl" /> : <span className="text-xs font-semibold text-slate-600">{coin.symbol.toUpperCase().slice(0,3)}</span>}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">{coin.name}</div>
                          <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{coin.symbol}</div>
                        </div>
                      </Link>

                      <div className="hidden min-w-[90px] text-right md:block">
                        <div className="font-mono text-sm text-slate-900">{formatCurrency(coin.current_price)}</div>
                        <div className={`text-xs ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>{isPositive ? '+' : ''}{change.toFixed(1)}%</div>
                      </div>

                      <div className="hidden min-w-[110px] text-right lg:block">
                        <div className="font-mono text-sm text-slate-700">{formatCompactUSD(coin.market_cap)}</div>
                        <div className="text-xs text-slate-500">Market cap</div>
                      </div>

                      <div className="hidden min-w-[110px] text-right xl:block">
                        <div className="font-mono text-sm text-slate-700">{formatCompactUSD(coin.total_volume)}</div>
                        <div className="text-xs text-slate-500">24h Vol (USD)</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleFavorite(coin)} className="rounded-2xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-amber-500">
                          <Star className={`h-4 w-4 ${isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                        </button>
                        <Link to={`/asset/${coin.id}`} className="rounded-2xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-violet-600">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <div ref={sentinelRef} className="px-4 py-4 text-center text-sm text-slate-500">
              {hasNextPage ? (isFetchingNextPage ? 'Loading more coins…' : 'Scroll to load more') : 'All visible market data loaded'}
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}