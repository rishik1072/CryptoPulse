import { useState, useMemo } from 'react'
import { useMarketData } from '@/services/coingecko'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { Sparkline } from '@/components/charts/Sparkline'
import { Skeleton } from '@/components/ui/Skeleton'
import { Search, Star, ArrowUpDown } from 'lucide-react'

type SortKey = 'market_cap' | 'current_price' | 'price_change_percentage_24h' | 'total_volume'

const FILTERS = [
  'All', 'Top Gainers', 'Top Losers', 'Trending', 'DeFi', 'Layer 1', 'Meme', 'AI'
]

export default function Markets() {
  const { data: coins = [], isLoading } = useMarketData(100)
  const { prices: livePrices } = useLivePriceStore()

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [sortKey, setSortKey] = useState<SortKey>('market_cap')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [favorites, setFavorites] = useState<string[]>([])

  // Merge live prices
  const enhancedCoins = useMemo(() => {
    return coins.map(coin => {
      const live = livePrices[coin.symbol.toUpperCase()]
      return {
        ...coin,
        current_price: live?.price ?? coin.current_price,
        price_change_percentage_24h: live?.change ?? coin.price_change_percentage_24h,
        total_volume: live?.volume ?? coin.total_volume,
      }
    })
  }, [coins, livePrices])

  // Filtering + Search
  const filteredCoins = useMemo(() => {
    let result = [...enhancedCoins]

    // Search
    if (search) {
      const term = search.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.symbol.toLowerCase().includes(term)
      )
    }

    // Filters
    if (activeFilter === 'Top Gainers') {
      result = result.filter(c => c.price_change_percentage_24h > 5)
    }
    if (activeFilter === 'Top Losers') {
      result = result.filter(c => c.price_change_percentage_24h < -5)
    }
    if (activeFilter === 'DeFi') {
      result = result.filter(c => c.categories?.some((cat: string) => cat.toLowerCase().includes('defi')))
    }
    if (activeFilter === 'Layer 1') {
      result = result.filter(c => c.categories?.some((cat: string) => cat.toLowerCase().includes('layer')))
    }
    if (activeFilter === 'Meme') {
      result = result.filter(c => c.categories?.some((cat: string) => cat.toLowerCase().includes('meme')))
    }
    if (activeFilter === 'AI') {
      result = result.filter(c => c.categories?.some((cat: string) => cat.toLowerCase().includes('ai')))
    }

    // Sorting
    result.sort((a, b) => {
      let valA: number
      let valB: number

      if (sortKey === 'market_cap') {
        valA = a.market_cap
        valB = b.market_cap
      } else if (sortKey === 'current_price') {
        valA = a.current_price
        valB = b.current_price
      } else if (sortKey === 'price_change_percentage_24h') {
        valA = a.price_change_percentage_24h
        valB = b.price_change_percentage_24h
      } else {
        valA = a.total_volume
        valB = b.total_volume
      }

      return sortDir === 'desc' ? valB - valA : valA - valB
    })

    return result
  }, [enhancedCoins, search, activeFilter, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const toggleFavorite = (id: string) => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Markets</h1>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">Explore 100+ cryptocurrencies • Live from Binance</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coins..."
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-400 focus:border-primary/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
              activeFilter === filter 
                ? 'bg-white text-slate-950' 
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <GlassCard padding="sm" className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-muted text-left">
                  <th className="px-6 py-4 font-normal w-10">#</th>
                  <th className="px-4 py-4 font-normal">Coin</th>
                  <th 
                    className="px-4 py-4 font-normal cursor-pointer hover:text-white flex items-center gap-1"
                    onClick={() => toggleSort('current_price')}
                  >
                    Price <ArrowUpDown className="h-3 w-3" />
                  </th>
                  <th 
                    className="px-4 py-4 font-normal cursor-pointer hover:text-white"
                    onClick={() => toggleSort('price_change_percentage_24h')}
                  >
                    24h
                  </th>
                  <th 
                    className="px-4 py-4 font-normal cursor-pointer hover:text-white"
                    onClick={() => toggleSort('market_cap')}
                  >
                    Market Cap
                  </th>
                  <th 
                    className="px-4 py-4 font-normal cursor-pointer hover:text-white"
                    onClick={() => toggleSort('total_volume')}
                  >
                    Volume
                  </th>
                  <th className="px-4 py-4 font-normal">Sparkline</th>
                  <th className="px-4 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredCoins.slice(0, 50).map((coin, index) => {
                  const isFavorite = favorites.includes(coin.id)
                  const change = coin.price_change_percentage_24h

                  return (
                    <tr 
                      key={coin.id} 
                      className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-6 py-4 text-muted">{index + 1}</td>
                      
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <img src={coin.image} alt="" className="h-7 w-7 rounded-full" />
                          <div>
                            <div className="font-medium">{coin.name}</div>
                            <div className="text-xs text-muted uppercase">{coin.symbol}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 font-mono tabular-nums text-white">
                        ${coin.current_price.toLocaleString()}
                      </td>

                      <td className={`px-4 py-4 font-medium tabular-nums ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                      </td>

                      <td className="px-4 py-4 text-muted font-mono">
                        ${(coin.market_cap / 1e9).toFixed(1)}B
                      </td>

                      <td className="px-4 py-4 text-muted font-mono">
                        ${(coin.total_volume / 1e9).toFixed(1)}B
                      </td>

                      <td className="px-4 py-4">
                        <Sparkline symbol={coin.symbol.toUpperCase()} />
                      </td>

                      <td className="px-4 py-4">
                        <button 
                          onClick={() => toggleFavorite(coin.id)}
                          className="text-muted hover:text-white transition-colors"
                        >
                          <Star className={`h-4 w-4 ${isFavorite ? 'fill-warning text-warning' : ''}`} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredCoins.length === 0 && !isLoading && (
          <div className="py-16 text-center text-slate-400">
            No coins found matching your search.
          </div>
        )}
      </GlassCard>

      <div className="pt-2 text-center text-xs text-slate-400">
        Showing {Math.min(50, filteredCoins.length)} of {filteredCoins.length} results • Data from CoinGecko + Binance
      </div>
    </div>
  )
}