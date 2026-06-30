import { GlassCard } from '@/components/ui/GlassCard'
import { Star } from 'lucide-react'

export function WatchlistPreview() {
  const watchlist = [
    { symbol: 'BTC', price: 102450, change: 2.4 },
    { symbol: 'ETH', price: 3184, change: -1.1 },
    { symbol: 'SOL', price: 172.6, change: 5.8 },
  ]

  return (
    <GlassCard className="card-sheen h-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold tracking-tight">Watchlist</div>
          <div className="text-sm text-slate-400">Priority assets to monitor</div>
        </div>
        <div className="cursor-pointer text-xs font-medium uppercase tracking-[0.24em] text-primary">View all →</div>
      </div>

      <div className="space-y-3">
        {watchlist.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 transition-colors hover:bg-white/10">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-500/15 p-2">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <div className="font-medium text-white">{item.symbol}</div>
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Tracked</div>
              </div>
            </div>
            <div className="text-right font-mono text-sm text-white">
              ${item.price.toLocaleString()}
              <span className={item.change > 0 ? 'ml-3 text-emerald-400' : 'ml-3 text-rose-400'}>
                {item.change > 0 ? '+' : ''}{item.change}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}