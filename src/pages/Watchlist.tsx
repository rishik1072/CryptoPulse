import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useMarketData, useCoinsMarketData, type CoinMarketData } from '@/services/coingecko'
import { resolveAssetPrice } from '@/services/priceResolver'
import { GlassCard } from '@/components/ui/GlassCard'
import { Sparkline } from '@/components/charts/Sparkline'
import { Search, Star, Trash2, GripVertical, Radio } from 'lucide-react'
import { Reorder } from 'framer-motion'

export default function Watchlist() {
  const { items, removeFromWatchlist, togglePin, reorderWatchlist } = useWatchlistStore()
  const { prices: livePrices, connectionStatus } = useLivePriceStore()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'pinned' | 'positive' | 'negative'>('all')
  const [sort] = useState<'price' | 'change' | 'volume'>('change')

  const watchlistCoinIds = useMemo(() => items.map((i) => i.coinId).filter(Boolean), [items])
  const { data: topMarkets = [] } = useMarketData(50)
  const { data: specificMarkets = [] } = useCoinsMarketData(watchlistCoinIds, topMarkets)

  const marketDataMap = useMemo(() => {
    const map: Record<string, CoinMarketData> = {}
    for (const coin of topMarkets) {
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
  }, [topMarkets, specificMarkets])

  // Merge price data hierarchically (Binance -> CoinGecko -> Unavailable)
  const watchlistWithData = useMemo(() => {
    return items
      .map((item) => {
        const resolved = resolveAssetPrice(item, livePrices, marketDataMap, connectionStatus)
        const cgCoin = marketDataMap[item.coinId?.toLowerCase() || ''] || marketDataMap[item.symbol?.toLowerCase() || '']
        const volumeUSD = cgCoin?.total_volume ?? livePrices[item.symbol.toUpperCase()]?.quoteVolume ?? 0

        return {
          ...item,
          price: resolved.price,
          change: resolved.change24h,
          volume: volumeUSD,
          source: resolved.source,
          isUnavailable: resolved.isUnavailable,
        }
      })
      .filter((item) => {
        const matchesSearch = 
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.symbol.toLowerCase().includes(search.toLowerCase())

        if (filter === 'pinned') return matchesSearch && item.pinned
        if (filter === 'positive') return matchesSearch && item.change !== null && item.change >= 0
        if (filter === 'negative') return matchesSearch && item.change !== null && item.change < 0
        return matchesSearch
      })
      .sort((a, b) => {
        if (sort === 'price') return (b.price ?? -1) - (a.price ?? -1)
        if (sort === 'change') return (b.change ?? -999) - (a.change ?? -999)
        return b.volume - a.volume
      })
  }, [items, livePrices, marketDataMap, connectionStatus, search, filter, sort])

  // Reorder handler
  const handleReorder = (newOrder: typeof items) => {
    const currentOrder = items.map(item => item.coinId)

    newOrder.forEach((item, index) => {
      const currentIndex = currentOrder.indexOf(item.coinId)
      if (currentIndex !== -1 && currentIndex !== index) {
        reorderWatchlist(currentIndex, index)
      }
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl dark:text-white">Watchlist</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 sm:text-base">
            <Radio className={`h-4 w-4 ${connectionStatus === 'connected' ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            <span>Feed: {connectionStatus === 'connected' ? 'Live Binance' : connectionStatus === 'reconnecting' ? 'Reconnecting' : 'Offline / Polling'} • {items.length} assets</span>
          </div>
        </div>

        <div className="flex w-full max-w-sm gap-3">
          <div className="relative w-full">
            <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search watchlist..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { label: 'All', value: 'all' },
          { label: 'Pinned', value: 'pinned' },
          { label: 'Gainers', value: 'positive' },
          { label: 'Losers', value: 'negative' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as 'all' | 'pinned' | 'positive' | 'negative')}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${filter === f.value ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950' : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <GlassCard padding="sm" className="overflow-hidden">
        {watchlistWithData.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-2xl font-medium text-slate-300">Your watchlist is empty</div>
            <p className="mt-2 text-sm text-slate-400">Add coins from the Markets page to start tracking</p>
          </div>
        ) : (
          <Reorder.Group 
            axis="y" 
            values={watchlistWithData} 
            onReorder={handleReorder}
            className="divide-y divide-slate-100 dark:divide-slate-800"
          >
            {watchlistWithData.map((item) => {
              const hasPrice = item.price !== null
              const isPositive = (item.change ?? 0) >= 0

              return (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  className="group flex items-center justify-between px-8 py-5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50"
                >
                  <div className="flex items-center gap-4">
                    <GripVertical className="h-4 w-4 cursor-grab text-slate-400 active:cursor-grabbing" />
                    
                    <Link to={`/asset/${item.coinId}`} className="flex items-center gap-4">
                      <img src={item.image} alt="" className="h-8 w-8 rounded-full" />
                      
                      <div>
                        <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                          {item.name}
                          {item.pinned && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.symbol}</span>
                          {item.source === 'binance-live' && (
                            <span className="rounded bg-emerald-500/10 px-1 py-0.2 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                              Live
                            </span>
                          )}
                          {item.source === 'coingecko' && (
                            <span className="rounded bg-blue-500/10 px-1 py-0.2 text-[9px] font-medium text-blue-600 dark:text-blue-400">
                              CoinGecko
                            </span>
                          )}
                          {item.source === 'binance-stale' && (
                            <span className="rounded bg-amber-500/10 px-1 py-0.2 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                              Stale
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>

                  <div className="flex items-center gap-10 text-right font-mono tabular-nums">
                    <div>
                      <div className="text-left text-xs text-slate-500">Price</div>
                      <div className="text-lg text-slate-900 dark:text-white font-medium">
                        {hasPrice ? (
                          `$${item.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-left text-xs text-slate-500">24H</div>
                      {item.change !== null ? (
                        <div className={isPositive ? 'text-emerald-600' : 'text-rose-500'}>
                          {isPositive ? '+' : ''}{item.change.toFixed(2)}%
                        </div>
                      ) : (
                        <div className="text-slate-400 font-normal">—</div>
                      )}
                    </div>

                    <div className="w-24">
                      <Sparkline symbol={item.symbol} color={isPositive ? '#22c55e' : '#ef4444'} />
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => togglePin(item.coinId)}
                        className="rounded-xl p-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Star className={`h-4 w-4 ${item.pinned ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                      </button>
                      <button 
                        onClick={() => removeFromWatchlist(item.coinId)}
                        className="rounded-xl p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Reorder.Item>
              )
            })}
          </Reorder.Group>
        )}
      </GlassCard>
    </div>
  )
}