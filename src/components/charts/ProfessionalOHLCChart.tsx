import { useEffect, useRef, useState, memo } from 'react'
import { motion } from 'framer-motion'
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts'
import type { ISeriesApi, CandlestickData, Time } from 'lightweight-charts'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useOHLCData } from '@/services/historical'
import { ApiError } from '@/services/coingecko'
import { AlertCircle, Loader2 } from 'lucide-react'

interface ProfessionalOHLCChartProps {
  coinId: string
  symbol: string
  height?: number
}

const TIMEFRAMES: Record<string, number> = {
  '1H': 1,
  '4H': 1,
  '1D': 7,
  '1W': 30,
  '1M': 90,
  '3M': 180,
  '1Y': 365,
  'ALL': 1825,
}

export const ProfessionalOHLCChart = memo(({ 
  coinId, 
  symbol, 
  height = 420 
}: ProfessionalOHLCChartProps) => {
  const [timeframe, setTimeframe] = useState('1D')
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<ReturnType<typeof createChart> | null>(null)
  const candleSeries = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const lastCandleTime = useRef<number | null>(null)

  const { prices } = useLivePriceStore()
  const livePrice = prices[symbol]

  const days = TIMEFRAMES[timeframe] || 7
  const { data: ohlcData, isLoading, isError, error } = useOHLCData(coinId, days)

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current) return

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.08)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.08)' },
      },
      crosshair: { mode: 0 },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
    })

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    // Volume histogram removed — CoinGecko OHLC does not provide real volume data

    chartInstance.current = chart
    candleSeries.current = candle

    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current && chartInstance.current) {
        chartInstance.current.resize(chartRef.current.clientWidth, height)
      }
    })
    resizeObserver.observe(chartRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
    }
  }, [height])

  // Load historical OHLC data
  useEffect(() => {
    if (!ohlcData || !candleSeries.current) return

    const candleData: CandlestickData[] = ohlcData.map((d) => ({
      time: Math.floor(d.time / 1000) as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    candleSeries.current.setData(candleData)

    if (ohlcData.length > 0) {
      lastCandleTime.current = Math.floor(ohlcData[ohlcData.length - 1].time / 1000)
    }
  }, [ohlcData])

  // Live price update (update last candle only)
  useEffect(() => {
    if (!livePrice || !candleSeries.current || !lastCandleTime.current) return

    const updatedCandle: CandlestickData = {
      time: lastCandleTime.current as Time,
      open: lastCandleTime.current ? 0 : livePrice.price, // keep open fixed
      high: Math.max(livePrice.price, lastCandleTime.current ? 0 : livePrice.price),
      low: Math.min(livePrice.price, lastCandleTime.current ? 0 : livePrice.price),
      close: livePrice.price,
    }

    // Only update if we have a valid last candle
    if (ohlcData && ohlcData.length > 0) {
      const last = ohlcData[ohlcData.length - 1]
      updatedCandle.open = last.open
      updatedCandle.high = Math.max(last.high, livePrice.price)
      updatedCandle.low = Math.min(last.low, livePrice.price)
      updatedCandle.close = livePrice.price
    }

    candleSeries.current.update(updatedCandle)
  }, [livePrice, ohlcData])

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} className="relative">
      <div className="flex flex-wrap gap-1 mb-4 px-1 text-sm">
        {Object.keys(TIMEFRAMES).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-4 py-1 rounded-xl transition-all ${
              timeframe === tf ? 'bg-white text-black' : 'hover:bg-white/5 text-muted'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="relative w-full rounded-2xl overflow-hidden" style={{ height }}>
        <div ref={chartRef} className="h-full w-full" />

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-xs text-slate-300">
            <Loader2 className="h-7 w-7 animate-spin text-violet-400 mb-2" />
            <div className="text-sm font-medium">Loading candlestick data…</div>
          </div>
        )}

        {isError && (!ohlcData || ohlcData.length === 0) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-xs p-6 text-center text-slate-300">
            <AlertCircle className="h-8 w-8 text-amber-400 mb-2" />
            <div className="text-sm font-semibold text-white">Historical OHLC data temporarily unavailable</div>
            <div className="text-xs text-slate-400 max-w-sm mt-1">
              {error instanceof ApiError && error.isRateLimited
                ? 'CoinGecko API rate limit reached (HTTP 429). The chart will auto-recover once cooldown expires.'
                : error?.message || 'Failed to fetch historical candlestick prices.'}
            </div>
            <div className="text-[11px] text-emerald-400 mt-3 font-mono">
              Live Binance price updates continue to stream in real-time
            </div>
          </div>
        )}

        {isError && ohlcData && ohlcData.length > 0 && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300 backdrop-blur-md">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
            <span>Cached historical data (stale)</span>
          </div>
        )}

        {!isLoading && !isError && ohlcData && ohlcData.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 p-6 text-center text-slate-400">
            <div className="text-sm">No candlestick records available for {timeframe} timeframe</div>
          </div>
        )}
      </div>
    </motion.div>
  )
})