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
      <GlassCard className="h-full">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#00E676] animate-pulse" />
          <div className="text-sm font-semibold tracking-tight text-[#F0F4F8] font-heading">Top Gainers</div>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#1E232E] px-3 py-2.5">
                <Skeleton className="h-3.5 w-24 bg-[#262D38]" />
                <Skeleton className="h-3.5 w-16 bg-[#262D38]" />
              </div>
            ))
          ) : (
            gainers.map((coin) => (
              <div key={coin.id} className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#1E232E] px-3 py-2.5 transition-colors hover:border-[#00E676]/30 hover:bg-[#1E232E]/80">
                <div className="flex items-center gap-2.5">
                  <img src={coin.image} className="h-6 w-6 rounded-md bg-[#0B0E14]" alt="" />
                  <div>
                    <div className="font-medium text-xs text-[#F0F4F8]">{coin.name}</div>
                    <div className="text-[10px] uppercase font-mono tracking-wider text-[#94A3B8]">{coin.symbol}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs text-[#F0F4F8] tabular-nums">${coin.current_price.toLocaleString()}</div>
                  <PriceChange value={coin.price_change_percentage_24h} />
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      <GlassCard className="h-full">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#FF5252]" />
          <div className="text-sm font-semibold tracking-tight text-[#F0F4F8] font-heading">Top Losers</div>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#1E232E] px-3 py-2.5">
                <Skeleton className="h-3.5 w-24 bg-[#262D38]" />
                <Skeleton className="h-3.5 w-16 bg-[#262D38]" />
              </div>
            ))
          ) : (
            losers.map((coin) => (
              <div key={coin.id} className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#1E232E] px-3 py-2.5 transition-colors hover:border-[#FF5252]/30 hover:bg-[#1E232E]/80">
                <div className="flex items-center gap-2.5">
                  <img src={coin.image} className="h-6 w-6 rounded-md bg-[#0B0E14]" alt="" />
                  <div>
                    <div className="font-medium text-xs text-[#F0F4F8]">{coin.name}</div>
                    <div className="text-[10px] uppercase font-mono tracking-wider text-[#94A3B8]">{coin.symbol}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs text-[#F0F4F8] tabular-nums">${coin.current_price.toLocaleString()}</div>
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