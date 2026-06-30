import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
    <GlassCard className="col-span-full card-sheen">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-lg font-semibold tracking-tight">Live Market</div>
          <div className="text-sm text-slate-400">Binance WebSocket • Real-time</div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {connectionStatus === 'connected' && (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-emerald-300">
              <Wifi className="h-3.5 w-3.5" /> Live
            </div>
          )}
          {connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-amber-300 animate-pulse">
              Reconnecting...
            </div>
          ) : null}
          {connectionStatus === 'offline' && (
            <div className="flex items-center gap-1.5 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-rose-300">
              <WifiOff className="h-3.5 w-3.5" /> Offline
            </div>
          )}

          {connectionStatus === 'connected' && (
            <div className="flex flex-wrap items-center gap-3 text-slate-400">
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <Clock className="h-3 w-3" /> {latency}ms
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Last update: {formatTime(lastUpdate)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {TRACKED.map((symbol) => {
          const priceData = prices[symbol]
          const isUp = (priceData?.change || 0) >= 0

          return (
            <motion.div
              key={symbol}
              whileHover={{ y: -2, scale: 1.01 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07]"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-lg tracking-tighter">{symbol}</div>
                  <div className="text-[10px] text-muted">USDT</div>
                </div>
                
                <AnimatePresence mode="wait">
                  {priceData ? (
                    <div className="flex flex-col items-end">
                      <motion.div
                        key={priceData.timestamp}
                        initial={{ opacity: 0.4, y: -3 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`font-mono tabular-nums text-xl tracking-[-1px] transition-colors duration-300 ${
                          isUp ? 'text-success' : 'text-danger'
                        }`}
                      >
                        ${priceData.price.toLocaleString(undefined, { 
                          minimumFractionDigits: symbol === 'DOGE' ? 4 : 2 
                        })}
                      </motion.div>
                      <Sparkline symbol={symbol} color={isUp ? '#22c55e' : '#ef4444'} />
                    </div>
                  ) : (
                    <div className="h-7 w-24 animate-pulse bg-white/10 rounded" />
                  )}
                </AnimatePresence>
              </div>

              {priceData && (
                <div className={`mt-3 text-sm font-medium tabular-nums flex items-center gap-1 ${isUp ? 'text-success' : 'text-danger'}`}>
                  {isUp ? '+' : ''}{priceData.change.toFixed(2)}%
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </GlassCard>
  )
}