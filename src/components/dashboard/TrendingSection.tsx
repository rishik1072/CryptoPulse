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
    <GlassCard className="h-full">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-base font-semibold tracking-tight text-[#F0F4F8] font-heading">Trending Assets</div>
          <div className="text-xs text-[#94A3B8]">Search volume and social momentum</div>
        </div>
        <div className="rounded-md border border-[#262D38] bg-[#1E232E] px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-[#94A3B8]">24H</div>
      </div>

      <div className="space-y-2">
        {trending.length === 0 ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#1E232E] px-3 py-2.5">
              <Skeleton className="h-4 w-2/3 bg-[#262D38]" />
              <Skeleton className="h-3.5 w-16 bg-[#262D38]" />
            </div>
          ))
        ) : (
          trending.map((item: TrendingCoinItem, index: number) => (
            <div key={index} className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#1E232E] px-3 py-2.5 transition-colors hover:border-[#FFB300]/40 hover:bg-[#1E232E]/80 group">
              <div className="flex items-center gap-2.5">
                <img src={item.item.small} alt="" className="h-6 w-6 rounded-md bg-[#0B0E14]" />
                <div>
                  <div className="font-medium text-xs tracking-tight text-[#F0F4F8] group-hover:text-[#FFB300] transition-colors">{item.item.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]">{item.item.symbol}</div>
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