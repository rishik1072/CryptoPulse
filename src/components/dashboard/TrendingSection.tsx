import { GlassCard } from '@/components/ui/GlassCard'
import { PriceChange } from '@/components/ui/PriceChange'
import { Skeleton } from '@/components/ui/Skeleton'

interface TrendingCoinItem {
  item: {
    small: string
    name: string
    symbol: string
    data: {
      price_change_percentage_24h: {
        usd: number
      }
    }
  }
}

interface TrendingSectionProps {
  data?: { coins: TrendingCoinItem[] }
}

export function TrendingSection({ data }: TrendingSectionProps) {
  const trending = data?.coins?.slice(0, 5) || []

  return (
    <GlassCard className="card-sheen h-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold tracking-tight">Trending on CoinGecko</div>
          <div className="text-sm text-slate-400">Momentum across the market</div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-400">24h</div>
      </div>

      <div className="space-y-3">
        {trending.length === 0 ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))
        ) : (
          trending.map((item: TrendingCoinItem, index: number) => (
            <div key={index} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 transition-all hover:bg-white/10 group">
              <div className="flex items-center gap-3">
                <img src={item.item.small} alt="" className="h-6 w-6 rounded-full" />
                <div>
                  <div className="font-medium tracking-tight text-white transition-colors group-hover:text-primary">{item.item.name}</div>
                  <div className="font-mono text-xs uppercase tracking-[0.24em] text-slate-400">{item.item.symbol}</div>
                </div>
              </div>
              <PriceChange value={item.item.data.price_change_percentage_24h.usd} />
            </div>
          ))
        )}
      </div>
    </GlassCard>
  )
}