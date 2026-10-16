import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useMarketData, useCoinsMarketData, type CoinMarketData } from '@/services/coingecko'
import { resolveAssetPrice } from '@/services/priceResolver'
import { Sparkline } from '@/components/charts/Sparkline'
import { Search, Star, Trash2, GripVertical, Radio, X } from 'lucide-react'
import { Reorder } from 'framer-motion'
import { EmptyState } from '@/components/ui/EmptyState'

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
    <div className="mx-auto max-w-[1720px] space-y-4">
      {/* 1. Page Header with aligned search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
              Watchlist
            </h1>
            <span className="text-[11px] font-medium font-mono text-muted bg-surface border border-border px-2 py-0.5 rounded-full">
              {items.length} Assets
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>Custom tracking lists with priority pinning and real-time updates.</span>
            <span className="text-border">&bull;</span>
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <Radio className={`h-3 w-3 ${connectionStatus === 'connected' ? 'text-positive animate-pulse' : 'text-muted'}`} />
              {connectionStatus === 'connected' ? 'Binance live feed' : connectionStatus === 'reconnecting' ? 'Reconnecting' : 'Polling feed'}
            </span>
          </div>
        </div>

        {/* Search input aligned with header */}
        <div className="relative w-full sm:w-72 md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search watchlist..."
            aria-label="Search watchlist"
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-surface-elevated border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-0.5 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-xl border border-border bg-surface p-2">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {[
            { label: 'All', value: 'all' },
            { label: 'Pinned', value: 'pinned' },
            { label: 'Gainers', value: 'positive' },
            { label: 'Losers', value: 'negative' },
          ].map((f) => {
            const isActive = filter === f.value
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as 'all' | 'pinned' | 'positive' | 'negative')}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1E232E] text-[#FFB300] font-semibold border border-[#FFB300]/40 shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#F0F4F8] hover:bg-[#1E232E] border border-transparent'
                }`}
              >
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#FFB300] shrink-0" />}
                <span>{f.label}</span>
              </button>
            )
          })}
        </div>

        <div className="text-[11px] font-mono text-[#94A3B8] px-1">
          Showing <span className="text-[#F0F4F8] font-semibold">{watchlistWithData.length}</span> of {items.length} assets
        </div>
      </div>

      {/* 3. Watchlist Card & List */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
        {watchlistWithData.length === 0 ? (
          <EmptyState
            icon={<Star className="h-8 w-8 text-[#94A3B8]" />}
            title={items.length === 0 ? 'Your watchlist is empty' : 'No assets match your search'}
            description={
              items.length === 0
                ? 'Add coins from the Markets explorer to track live quotes and price movements.'
                : 'Try adjusting your search query or reset category filters.'
            }
            action={
              items.length === 0 ? (
                <Link
                  to="/markets"
                  className="rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition-colors cursor-pointer inline-block shadow-sm"
                >
                  Explore Markets
                </Link>
              ) : (
                <button
                  onClick={() => {
                    setSearch('')
                    setFilter('all')
                  }}
                  className="text-xs text-[#FFB300] hover:text-[#FFA000] font-medium underline cursor-pointer"
                >
                  Reset filters
                </button>
              )
            }
          />
        ) : (
          <div>
            {/* Table Header Bar */}
            <div className="hidden sm:flex items-center justify-between border-b border-[#262D38] bg-[#0B0E14] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
              <div className="flex items-center gap-4 pl-6">
                <span>Asset</span>
              </div>
              <div className="flex items-center gap-8 text-right pr-2">
                <span className="w-24 text-right">Price</span>
                <span className="w-16 text-right">24H</span>
                <span className="w-24 text-center">7D Trend</span>
                <span className="w-16 text-center">Actions</span>
              </div>
            </div>

            <Reorder.Group 
              axis="y" 
              values={watchlistWithData} 
              onReorder={handleReorder}
              className="divide-y divide-[#262D38]/50"
            >
              {watchlistWithData.map((item) => {
                const hasPrice = item.price !== null
                const isPositive = (item.change ?? 0) >= 0

                return (
                  <Reorder.Item
                    key={item.id}
                    value={item}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 transition-colors hover:bg-[#1E232E] gap-3 border-b border-[#262D38]/40 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 cursor-grab text-[#94A3B8] active:cursor-grabbing shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                      
                      <Link to={`/asset/${item.coinId}`} className="flex items-center gap-2.5 group-hover:text-[#FFB300] transition-colors">
                        <img
                          src={item.image}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover shrink-0 bg-[#1E232E]"
                          onError={(e) => {
                            (e.target as HTMLElement).style.visibility = 'hidden'
                          }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F0F4F8] group-hover:text-[#FFB300] transition-colors">
                            <span>{item.name}</span>
                            {item.pinned && <Star className="h-3 w-3 fill-[#FFB300] text-[#FFB300] shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-mono tracking-wider text-[#94A3B8]">{item.symbol}</span>
                            {item.source === 'binance-live' && (
                              <span className="inline-flex items-center gap-1 rounded bg-[#00E676]/10 px-1.5 py-0.2 text-[9px] font-semibold text-[#00E676] border border-[#00E676]/30">
                                <span className="h-1 w-1 rounded-full bg-[#00E676] animate-pulse" />
                                Live
                              </span>
                            )}
                            {item.source === 'coingecko' && (
                              <span className="rounded bg-sky-500/10 px-1.5 py-0.2 text-[9px] font-medium text-sky-400 border border-sky-500/20">
                                Sync
                              </span>
                            )}
                            {item.source === 'binance-stale' && (
                              <span className="rounded bg-[#FFB300]/10 px-1.5 py-0.2 text-[9px] font-medium text-[#FFB300] border border-[#FFB300]/30">
                                Stale
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 text-right font-mono tabular-nums pl-7 sm:pl-0">
                      <div className="w-24 text-right">
                        <div className="text-right text-[10px] text-[#94A3B8] sm:hidden">Price</div>
                        <div className="text-xs font-semibold text-[#F0F4F8]">
                          {hasPrice ? (
                            `$${item.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-[#94A3B8] font-normal">—</span>
                          )}
                        </div>
                      </div>

                      <div className="w-16 text-right">
                        <div className="text-right text-[10px] text-[#94A3B8] sm:hidden">24H</div>
                        {item.change !== null ? (
                          <div className={`text-xs font-semibold ${isPositive ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                            {isPositive ? '+' : ''}{item.change.toFixed(2)}%
                          </div>
                        ) : (
                          <div className="text-[#94A3B8] font-normal">—</div>
                        )}
                      </div>

                      <div className="w-24 hidden md:block">
                        <Sparkline symbol={item.symbol} isPositive={isPositive} />
                      </div>

                      <div className="w-16 flex items-center justify-end gap-1">
                        <button 
                          onClick={() => togglePin(item.coinId)}
                          aria-label={item.pinned ? `Unpin ${item.name}` : `Pin ${item.name} to top`}
                          className="rounded p-1.5 text-[#94A3B8] hover:text-[#FFB300] hover:bg-[#1E232E] transition-colors cursor-pointer"
                          title={item.pinned ? 'Unpin' : 'Pin to top'}
                        >
                          <Star className={`h-3.5 w-3.5 ${item.pinned ? 'fill-[#FFB300] text-[#FFB300]' : ''}`} />
                        </button>
                        <button 
                          onClick={() => removeFromWatchlist(item.coinId)}
                          aria-label={`Remove ${item.name} from watchlist`}
                          className="rounded p-1.5 text-[#94A3B8] hover:text-[#FF5252] hover:bg-[#FF5252]/10 transition-colors cursor-pointer"
                          title="Remove from watchlist"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </Reorder.Item>
                )
              })}
            </Reorder.Group>
          </div>
        )}
      </div>
    </div>
  )
}