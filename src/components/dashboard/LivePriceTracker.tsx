import { useEffect } from 'react'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { Wifi, WifiOff, Clock } from 'lucide-react'
import { Sparkline } from '@/components/charts/Sparkline'

const TRACKED = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB']

export function LivePriceTracker() {
  const { prices, connectionStatus, lastUpdate, latency, subscribeToLivePrices } = useLivePriceStore()

  useEffect(() => {
    const unsubscribe = subscribeToLivePrices()
    return unsubscribe
  }, [subscribeToLivePrices])

  const formatTime = (ts: number | null) => {
    if (!ts) return '—'
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <GlassCard className="col-span-full">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-base font-semibold tracking-tight text-slate-100">Live Market Feed</div>
          <div className="text-xs text-slate-400">Binance WebSocket • Real-time stream</div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {connectionStatus === 'connected' && (
            <div className="flex items-center gap-1.5 rounded-lg border border-[#00E676]/30 bg-[#00E676]/10 px-2.5 py-1 text-[#00E676] font-semibold">
              <Wifi className="h-3 w-3" /> Live
            </div>
          )}
          {connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-[#FFB300]/30 bg-[#FFB300]/10 px-2.5 py-1 text-[#FFB300] animate-pulse font-medium">
              Reconnecting...
            </div>
          ) : null}
          {connectionStatus === 'offline' && (
            <div className="flex items-center gap-1.5 rounded-lg border border-[#FF5252]/30 bg-[#FF5252]/10 px-2.5 py-1 text-[#FF5252] font-medium">
              <WifiOff className="h-3 w-3" /> Offline
            </div>
          )}

          {connectionStatus === 'connected' && (
            <div className="flex flex-wrap items-center gap-2 text-[#94A3B8] text-xs">
              <div className="flex items-center gap-1 rounded-lg border border-[#262D38] bg-[#1E232E] px-2.5 py-1 font-mono tabular-nums">
                <Clock className="h-3 w-3" /> {latency}ms
              </div>
              <div className="rounded-lg border border-[#262D38] bg-[#1E232E] px-2.5 py-1 font-mono tabular-nums text-[#F0F4F8]">
                Update: {formatTime(lastUpdate)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {TRACKED.map((symbol) => {
          const priceData = prices[symbol]
          const isUp = (priceData?.change || 0) >= 0
          const status = useLivePriceStore.getState().getPriceStatus(symbol)

          return (
            <div
              key={symbol}
              className="rounded-lg border border-[#262D38] bg-[#1E232E]/70 p-3 transition-colors hover:bg-[#1E232E]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs tracking-tight text-[#F0F4F8]">{symbol}</span>
                  <span className="text-[10px] font-mono text-[#94A3B8] uppercase">USDT</span>
                </div>
                {status === 'live' && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00E676] animate-pulse" title="Live WebSocket tick" />
                )}
                {status === 'stale' && (
                  <span className="rounded bg-[#FFB300]/10 px-1 py-0.2 text-[9px] font-mono text-[#FFB300]">stale</span>
                )}
                {status === 'unavailable' && (
                  <span className="rounded bg-[#262D38] px-1 py-0.2 text-[9px] font-mono text-[#94A3B8]">—</span>
                )}
              </div>

              <div className="mt-2 flex items-baseline justify-between gap-1">
                {priceData ? (
                  <div className="font-mono tabular-nums text-sm sm:text-base font-bold text-[#F0F4F8] tracking-tight transition-colors duration-300">
                    ${priceData.price.toLocaleString(undefined, {
                      minimumFractionDigits: symbol === 'DOGE' ? 4 : 2,
                      maximumFractionDigits: symbol === 'DOGE' ? 4 : 2,
                    })}
                  </div>
                ) : (
                  <div className="h-5 w-20 animate-pulse bg-[#262D38] rounded" />
                )}

                <div className="shrink-0">
                  <Sparkline symbol={symbol} isPositive={isUp} />
                </div>
              </div>

              <div className="mt-1 flex items-center justify-between text-[11px] font-mono tabular-nums">
                {priceData ? (
                  <span className={`inline-flex items-center font-medium ${isUp ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                    {isUp ? '+' : ''}{priceData.change.toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-[#94A3B8]">—</span>
                )}
                <span className="text-[10px] text-[#94A3B8]">24h</span>
              </div>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}