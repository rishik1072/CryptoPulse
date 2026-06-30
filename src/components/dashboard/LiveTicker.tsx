import { useLivePriceStore } from '@/store/useLivePriceStore'


const TICKER_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB']

export function LiveTicker() {
  const { prices } = useLivePriceStore()

  return (
    <div className="w-full overflow-hidden border-b border-white/10 bg-[#0a0f24]/80 backdrop-blur-xl">
      <div className="flex items-center gap-8 py-2 text-sm overflow-x-auto whitespace-nowrap px-6">
        {TICKER_SYMBOLS.map((symbol) => {
          const data = prices[symbol]
          if (!data) return null

          const isUp = data.change >= 0

          return (
            <div key={symbol} className="flex items-center gap-2 font-mono">
              <span className="font-medium text-white/90">{symbol}</span>
              <span className="text-white/80">
                ${data.price.toLocaleString()}
              </span>
              <span className={isUp ? 'text-success' : 'text-danger'}>
                {isUp ? '+' : ''}{data.change.toFixed(2)}%
              </span>
            </div>
          )
        })}

        <div className="ml-auto text-[10px] text-muted pr-2 flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> 
          LIVE FROM BINANCE
        </div>
      </div>
    </div>
  )
}