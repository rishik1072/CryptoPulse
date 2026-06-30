import { useState } from 'react'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { Sparkline } from '@/components/charts/Sparkline'
import { Search, Star, Trash2, GripVertical } from 'lucide-react'
import { Reorder } from 'framer-motion'

export default function Watchlist() {
  const { items, removeFromWatchlist, togglePin, reorderWatchlist } = useWatchlistStore()
  const { prices: livePrices } = useLivePriceStore()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'pinned' | 'positive' | 'negative'>('all')
  const [sort] = useState<'price' | 'change' | 'volume'>('change')

  // Merge live data
  const watchlistWithData = items
    .map(item => {
      const live = livePrices[item.symbol]
      return {
        ...item,
        price: live?.price ?? 0,
        change: live?.change ?? 0,
        volume: live?.volume ?? 0,
      }
    })
    .filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.symbol.toLowerCase().includes(search.toLowerCase())

      if (filter === 'pinned') return matchesSearch && item.pinned
      if (filter === 'positive') return matchesSearch && item.change >= 0
      if (filter === 'negative') return matchesSearch && item.change < 0
      return matchesSearch
    })
    .sort((a, b) => {
      if (sort === 'price') return b.price - a.price
      if (sort === 'change') return b.change - a.change
      return b.volume - a.volume
    })

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
          <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Watchlist</h1>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">Live updates • {items.length} assets</p>
        </div>

        <div className="flex w-full max-w-sm gap-3">
          <div className="relative w-full">
            <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search watchlist..."
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-400"
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
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${filter === f.value ? 'bg-white text-slate-950' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
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
            className="divide-y divide-white/10"
          >
            {watchlistWithData.map((item) => {
              const isPositive = item.change >= 0
              return (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  className="flex items-center justify-between px-8 py-5 hover:bg-white/5 group transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <GripVertical className="h-4 w-4 text-muted cursor-grab active:cursor-grabbing" />
                    
                    <img src={item.image} alt="" className="h-8 w-8 rounded-full" />
                    
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {item.name}
                        {item.pinned && <Star className="h-3.5 w-3.5 text-warning fill-warning" />}
                      </div>
                      <div className="text-xs text-muted">{item.symbol}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-10 text-right font-mono tabular-nums">
                    <div>
                      <div className="text-xs text-muted text-left">Price</div>
                      <div className={`text-lg transition-colors ${isPositive ? 'text-success' : 'text-danger'}`}>
                        ${item.price.toLocaleString()}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted text-left">24H</div>
                      <div className={isPositive ? 'text-success' : 'text-danger'}>
                        {isPositive ? '+' : ''}{item.change.toFixed(2)}%
                      </div>
                    </div>

                    <div className="w-24">
                      <Sparkline symbol={item.symbol} color={isPositive ? '#22c55e' : '#ef4444'} />
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => togglePin(item.coinId)}
                        className="p-2 rounded-xl hover:bg-white/10 transition-all"
                      >
                        <Star className={`h-4 w-4 ${item.pinned ? 'fill-warning text-warning' : 'text-muted'}`} />
                      </button>
                      <button 
                        onClick={() => removeFromWatchlist(item.coinId)}
                        className="p-2 rounded-xl hover:bg-white/10 text-muted hover:text-danger transition-all"
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