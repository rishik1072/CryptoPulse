import { GlassCard } from '@/components/ui/GlassCard'
import { PriceChange } from '@/components/ui/PriceChange'
import { Skeleton } from '@/components/ui/Skeleton'
import type { CoinMarketData } from '@/services/coingecko'

interface TopMoversProps {
  data?: CoinMarketData[]
  isLoading: boolean
}

export function TopMovers({ data, isLoading }: TopMoversProps) {
  const gainers = data?.filter(c => c.price_change_percentage_24h > 0)
    .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
    .slice(0, 4) || []

  const losers = data?.filter(c => c.price_change_percentage_24h < 0)
    .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
    .slice(0, 4) || []

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
      <GlassCard className="card-sheen h-full">
        <div className="mb-5 flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div className="text-base font-semibold tracking-tight">Top Gainers</div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))
          ) : (
            gainers.map((coin) => (
              <div key={coin.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 transition-colors hover:bg-white/10">
                <div className="flex items-center gap-3">
                  <img src={coin.image} className="h-7 w-7 rounded-full" alt="" />
                  <div>
                    <div className="font-medium text-white">{coin.name}</div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{coin.symbol}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-white">${coin.current_price.toLocaleString()}</div>
                  <PriceChange value={coin.price_change_percentage_24h} />
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      <GlassCard className="card-sheen h-full">
        <div className="mb-5 flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <div className="text-base font-semibold tracking-tight">Top Losers</div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))
          ) : (
            losers.map((coin) => (
              <div key={coin.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 transition-colors hover:bg-white/10">
                <div className="flex items-center gap-3">
                  <img src={coin.image} className="h-7 w-7 rounded-full" alt="" />
                  <div>
                    <div className="font-medium text-white">{coin.name}</div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{coin.symbol}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-white">${coin.current_price.toLocaleString()}</div>
                  <PriceChange value={coin.price_change_percentage_24h} />
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </div>
  )
}