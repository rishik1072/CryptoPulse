import { useEffect, useRef, useState, memo } from 'react'
import { motion } from 'framer-motion'
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts'
import type { ISeriesApi, CandlestickData, Time } from 'lightweight-charts'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useOHLCData } from '@/services/historical'
import { ApiError } from '@/services/coingecko'
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react'
import { RubberSegment } from '@/components/reactbits/RubberSegment'

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

  const { preferences } = useAuthStore()
  const themeRef = useRef(preferences.theme)
  themeRef.current = preferences.theme

  const { prices } = useLivePriceStore()
  const livePrice = prices[symbol.toUpperCase()] || prices[symbol]

  const days = TIMEFRAMES[timeframe] || 7
  const { data: ohlcData, isLoading, isError, error, refetch } = useOHLCData(coinId, days)

  // Initialize chart once
  useEffect(() => {
    if (!chartRef.current) return

    const isCurrentlyDark = document.documentElement.classList.contains('dark') || themeRef.current === 'dark'
    const bgColor = isCurrentlyDark ? '#0B0E14' : '#ffffff'
    const textColor = isCurrentlyDark ? '#94A3B8' : '#64748B'
    const gridColor = isCurrentlyDark ? 'rgba(38, 45, 56, 0.45)' : 'rgba(226, 232, 240, 0.8)'

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
      upColor: '#00E676',
      downColor: '#FF5252',
      borderUpColor: '#00E676',
      borderDownColor: '#FF5252',
      wickUpColor: '#00E676',
      wickDownColor: '#FF5252',
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
  }, [height])

  // Sync theme changes to existing chart instance dynamically without recreation
  useEffect(() => {
    if (!chartInstance.current) return

    const isCurrentlyDark = preferences.theme === 'dark'
    const bgColor = isCurrentlyDark ? '#0B0E14' : '#ffffff'
    const textColor = isCurrentlyDark ? '#94A3B8' : '#64748B'
    const gridColor = isCurrentlyDark ? 'rgba(38, 45, 56, 0.45)' : 'rgba(226, 232, 240, 0.8)'

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
  }, [preferences.theme])

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
        <RubberSegment
          items={Object.keys(TIMEFRAMES)}
          value={timeframe}
          onChange={(newTf) => setTimeframe(newTf)}
          aria-label="Chart timeframe selector"
          size="sm"
        />

        <button
          onClick={() => refetch()}
          title="Refresh candlestick data"
          className="inline-flex items-center gap-1 text-xs text-[#94A3B8] hover:text-[#F0F4F8] p-1.5 rounded-lg hover:bg-[#1E232E] transition-colors cursor-pointer"
          aria-label="Refresh chart data"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <div className="relative w-full rounded-xl overflow-hidden border border-border bg-surface" style={{ height }}>
        <div ref={chartRef} className="h-full w-full" />

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/85 backdrop-blur-xs text-foreground">
            <Loader2 className="h-7 w-7 animate-spin text-[#FFB300] mb-2" />
            <div className="text-xs font-medium text-muted">Loading candlestick data…</div>
          </div>
        )}

        {isError && (!ohlcData || ohlcData.length === 0) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90 backdrop-blur-xs p-6 text-center text-foreground">
            <AlertCircle className="h-8 w-8 text-[#FFB300] mb-2" />
            <div className="text-sm font-semibold text-foreground">Historical OHLC data temporarily unavailable</div>
            <div className="text-xs text-muted max-w-sm mt-1">
              {error instanceof ApiError && error.isRateLimited
                ? 'CoinGecko API rate limit reached (HTTP 429). The chart will auto-recover once cooldown expires.'
                : error?.message || 'Failed to fetch historical candlestick prices.'}
            </div>
            <button
              onClick={() => refetch()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition-colors cursor-pointer shadow-md shadow-[#FFB300]/15"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-950" /> Retry
            </button>
            <div className="text-[11px] text-[#00E676] mt-2 font-mono">
              Live Binance price updates continue to stream in real-time
            </div>
          </div>
        )}

        {isError && ohlcData && ohlcData.length > 0 && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-lg border border-[#FFB300]/30 bg-[#FFB300]/10 px-2.5 py-1 text-xs text-[#FFB300] backdrop-blur-md">
            <AlertCircle className="h-3.5 w-3.5 text-[#FFB300]" />
            <span>Cached historical data (stale)</span>
          </div>
        )}

        {!isLoading && !isError && ohlcData && ohlcData.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/85 p-6 text-center text-muted">
            <div className="text-xs font-medium">No candlestick records available for {timeframe} timeframe</div>
          </div>
        )}
      </div>
    </motion.div>
  )
})