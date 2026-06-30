import { useLivePriceStore } from '@/store/useLivePriceStore'

export function AnimatedMarquee() {
  const { prices } = useLivePriceStore()
  const symbols = Object.keys(prices)

  if (symbols.length === 0) return null

  return (
    <div className="relative w-full overflow-hidden py-1 border-b border-white/10">
      <div className="flex animate-marquee whitespace-nowrap text-xs text-muted">
        {[...symbols, ...symbols].map((symbol, index) => {
          const data = prices[symbol]
          if (!data) return null
          
          return (
            <div key={`${symbol}-${index}`} className="mx-8 flex items-center gap-2">
              <span className="font-medium text-white/70">{symbol}</span>
              <span>${data.price.toFixed(2)}</span>
              <span className={data.change >= 0 ? 'text-success' : 'text-danger'}>
                {data.change.toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}