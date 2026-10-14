import { GlassCard } from '@/components/ui/GlassCard'
import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'

export function WatchlistPreview() {
  const { items } = useWatchlistStore()
  const { prices } = useLivePriceStore()
  const displayItems = items.slice(0, 4)

  return (
    <GlassCard className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold tracking-tight text-slate-100 font-heading">Watchlist</div>
          <div className="text-xs text-slate-400">Priority monitored assets</div>
        </div>
        <Link to="/watchlist" className="text-xs font-medium text-[#FFB300] hover:text-[#FFA000] transition-colors">
          View all →
        </Link>
      </div>

      <div className="space-y-2">
        {displayItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#94A3B8]">
            No assets added to watchlist yet.
          </div>
        ) : (
          displayItems.map((item) => {
            const quote = prices[item.symbol.toUpperCase()] || prices[item.symbol]
            const price = quote?.price
            const change = quote?.change ?? 0

            return (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#1E232E] px-3 py-2.5 transition-colors hover:border-[#FFB300]/40 hover:bg-[#1E232E]/80">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-md bg-[#FFB300]/15 p-1.5 border border-[#FFB300]/25">
                    <Star className="h-3.5 w-3.5 fill-[#FFB300] text-[#FFB300]" />
                  </div>
                  <div>
                    <div className="font-medium text-xs text-[#F0F4F8]">{item.name || item.symbol}</div>
                    <div className="text-[10px] uppercase font-mono tracking-wider text-[#94A3B8]">{item.symbol}</div>
                  </div>
                </div>
                <div className="text-right font-mono text-xs text-[#F0F4F8] tabular-nums">
                  {price != null ? `$${price.toLocaleString()}` : '—'}
                  {price != null && (
                    <span className={change >= 0 ? 'ml-2 text-[#00E676]' : 'ml-2 text-[#FF5252]'}>
                      {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </GlassCard>
  )
}