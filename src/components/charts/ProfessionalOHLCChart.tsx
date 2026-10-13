import { useEffect, useRef, useState, memo } from 'react'
import { motion } from 'framer-motion'
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts'
import type { ISeriesApi, CandlestickData, Time } from 'lightweight-charts'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useUIStore } from '@/store/useUIStore'
import { useOHLCData } from '@/services/historical'
import { ApiError } from '@/services/coingecko'
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react'

interface ProfessionalOHLCChartProps {
  coinId: string
  symbol: string
  height?: number
}

const TIMEFRAMES: Record<string, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
  'ALL': 1825,
}

export const ProfessionalOHLCChart = memo(({ 
  coinId, 
  symbol, 
  height = 420 
}: ProfessionalOHLCChartProps) => {
  const [timeframe, setTimeframe] = useState('1W')
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<ReturnType<typeof createChart> | null>(null)
  const candleSeries = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const lastCandleTime = useRef<number | null>(null)

  const { theme } = useUIStore()
  const isDark = theme === 'dark'

  const { prices } = useLivePriceStore()
  const livePrice = prices[symbol.toUpperCase()] || prices[symbol]

  const days = TIMEFRAMES[timeframe] || 7
  const { data: ohlcData, isLoading, isError, error, refetch } = useOHLCData(coinId, days)

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current) return

    const bgColor = isDark ? '#0b1120' : '#ffffff'
    const textColor = isDark ? '#94a3b8' : '#475569'
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 23, 42, 0.05)'

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: bgColor },
        textColor,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
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

    chartInstance.current = chart
    candleSeries.current = candle

    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current && chartInstance.current) {
        chartInstance.current.resize(chartRef.current.clientWidth, height)
      }
    })
    resizeObserver.observe(chartRef.current)

    return () => {
      try {
        resizeObserver.disconnect()
        chart.remove()
        chartInstance.current = null
        candleSeries.current = null
      } catch {
        // Safe disposal
      }
    }
  }, [height, isDark])

  // Sync theme changes to existing chart instance dynamically
  useEffect(() => {
    if (!chartInstance.current) return

    const bgColor = isDark ? '#0b1120' : '#ffffff'
    const textColor = isDark ? '#94a3b8' : '#475569'
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 23, 42, 0.05)'

    chartInstance.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: bgColor },
        textColor,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
    })
  }, [isDark])

  // Load and sanitize historical OHLC data
  useEffect(() => {
    if (!ohlcData || !candleSeries.current) return

    // Ensure strictly unique and ascending timestamps
    const seenTimes = new Set<number>()
    const candleData: CandlestickData[] = []

    for (const d of ohlcData) {
      const sec = Math.floor(d.time / 1000)
      if (!seenTimes.has(sec)) {
        seenTimes.add(sec)
        candleData.push({
          time: sec as Time,
          open: d.open,
          high: Math.max(d.high, d.open, d.close),
          low: Math.min(d.low, d.open, d.close),
          close: d.close,
        })
      }
    }

    candleData.sort((a, b) => Number(a.time) - Number(b.time))

    try {
      candleSeries.current.setData(candleData)
      if (candleData.length > 0) {
        lastCandleTime.current = Number(candleData[candleData.length - 1].time)
      }
    } catch {
      // Prevent chart crash on unexpected series error
    }
  }, [ohlcData])

  // Live price update (update last candle bounds without fabricating)
  useEffect(() => {
    if (!livePrice || !candleSeries.current || !lastCandleTime.current || !ohlcData || ohlcData.length === 0) {
      return
    }

    const last = ohlcData[ohlcData.length - 1]
    const updatedCandle: CandlestickData = {
      time: lastCandleTime.current as Time,
      open: last.open,
      high: Math.max(last.high, livePrice.price),
      low: Math.min(last.low, livePrice.price),
      close: livePrice.price,
    }

    try {
      candleSeries.current.update(updatedCandle)
    } catch {
      // Safe update
    }
  }, [livePrice, ohlcData])

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} className="relative">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 px-1">
        <div className="flex flex-wrap gap-1 text-sm">
          {Object.keys(TIMEFRAMES).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3.5 py-1 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                timeframe === tf
                  ? isDark
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-white shadow-sm'
                  : isDark
                    ? 'text-slate-400 hover:bg-slate-800'
                    : 'text-slate-600 hover:bg-slate-100'
              }`}
              aria-label={`Select ${tf} timeframe`}
            >
              {tf}
            </button>
          ))}
        </div>

        <button
          onClick={() => refetch()}
          title="Refresh candlestick data"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded-lg"
          aria-label="Refresh chart data"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800/80" style={{ height }}>
        <div ref={chartRef} className="h-full w-full" />

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 dark:bg-slate-950/70 backdrop-blur-xs text-slate-600 dark:text-slate-300">
            <Loader2 className="h-7 w-7 animate-spin text-violet-500 mb-2" />
            <div className="text-sm font-medium">Loading candlestick data…</div>
          </div>
        )}

        {isError && (!ohlcData || ohlcData.length === 0) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-xs p-6 text-center text-slate-600 dark:text-slate-300">
            <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Historical OHLC data temporarily unavailable</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              {error instanceof ApiError && error.isRateLimited
                ? 'CoinGecko API rate limit reached (HTTP 429). The chart will auto-recover once cooldown expires.'
                : error?.message || 'Failed to fetch historical candlestick prices.'}
            </div>
            <button
              onClick={() => refetch()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-slate-900"
            >
              <RotateCcw className="h-3 w-3" /> Retry
            </button>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
              Live Binance price updates continue to stream in real-time
            </div>
          </div>
        )}

        {isError && ohlcData && ohlcData.length > 0 && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-600 dark:text-amber-300 backdrop-blur-md">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            <span>Cached historical data (stale)</span>
          </div>
        )}

        {!isLoading && !isError && ohlcData && ohlcData.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 dark:bg-slate-950/70 p-6 text-center text-slate-500">
            <div className="text-sm font-medium">No candlestick records available for {timeframe} timeframe</div>
          </div>
        )}
      </div>
    </motion.div>
  )
})