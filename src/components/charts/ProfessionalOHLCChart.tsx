import { useEffect, useRef, useState, memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts'
import type { ISeriesApi, CandlestickData, Time } from 'lightweight-charts'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useOHLCData } from '@/services/historical'
import { ApiError } from '@/services/coingecko'
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react'
import { RubberSegment } from '@/components/reactbits/RubberSegment'

import { DESIGN_TOKENS } from '@/lib/theme'

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
  const currentCandleRef = useRef<CandlestickData | null>(null)

  const { preferences } = useAuthStore()
  const themeRef = useRef(preferences.theme)
  themeRef.current = preferences.theme

  // Subscribe strictly to this symbol's live updates to prevent re-renders on unrelated ticker ticks
  const symUpper = symbol.toUpperCase()
  const symLower = symbol.toLowerCase()
  const livePrice = useLivePriceStore(
    useCallback((state) => state.prices[symUpper] || state.prices[symLower], [symUpper, symLower])
  )

  const days = TIMEFRAMES[timeframe] || 7
  const { data: ohlcData, isLoading, isError, error, refetch } = useOHLCData(coinId, days)

  // Initialize chart once
  useEffect(() => {
    if (!chartRef.current) return

    const isCurrentlyDark = document.documentElement.classList.contains('dark') || themeRef.current === 'dark'
    const tokens = isCurrentlyDark ? DESIGN_TOKENS.dark : DESIGN_TOKENS.light

    const chart = createChart(chartRef.current, {
      width: Math.max(chartRef.current.clientWidth, 100),
      height,
      layout: {
        background: { type: ColorType.Solid, color: tokens.surface },
        textColor: tokens.mutedText,
      },
      grid: {
        vertLines: { color: tokens.chartGrid },
        horzLines: { color: tokens.chartGrid },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: tokens.chartCrosshair },
        horzLine: { color: tokens.chartCrosshair },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
    })

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: tokens.positive,
      downColor: tokens.negative,
      borderUpColor: tokens.positive,
      borderDownColor: tokens.negative,
      wickUpColor: tokens.positive,
      wickDownColor: tokens.negative,
    })

    chartInstance.current = chart
    candleSeries.current = candle

    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current && chartInstance.current && chartRef.current.clientWidth > 0) {
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
        currentCandleRef.current = null
      } catch {
        // Safe disposal
      }
    }
  }, [height])

  // Sync theme changes to existing chart instance dynamically without recreation
  useEffect(() => {
    if (!chartInstance.current) return

    const isCurrentlyDark = preferences.theme === 'dark'
    const tokens = isCurrentlyDark ? DESIGN_TOKENS.dark : DESIGN_TOKENS.light

    chartInstance.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: tokens.surface },
        textColor: tokens.mutedText,
      },
      grid: {
        vertLines: { color: tokens.chartGrid },
        horzLines: { color: tokens.chartGrid },
      },
      crosshair: {
        vertLine: { color: tokens.chartCrosshair },
        horzLine: { color: tokens.chartCrosshair },
      },
    })

    if (candleSeries.current) {
      candleSeries.current.applyOptions({
        upColor: tokens.positive,
        downColor: tokens.negative,
        borderUpColor: tokens.positive,
        borderDownColor: tokens.negative,
        wickUpColor: tokens.positive,
        wickDownColor: tokens.negative,
      })
    }
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
        const lastCandle = candleData[candleData.length - 1]
        lastCandleTime.current = Number(lastCandle.time)
        currentCandleRef.current = { ...lastCandle }
        // Ensure chart scales properly to match the selected timeframe data
        chartInstance.current?.timeScale().fitContent()
      }
    } catch {
      // Prevent chart crash on unexpected series error
    }
  }, [ohlcData])

  // Live price incremental update (update active candle bounds without resetting data)
  useEffect(() => {
    if (!livePrice || !candleSeries.current || !currentCandleRef.current) {
      return
    }

    const current = currentCandleRef.current
    const updatedCandle: CandlestickData = {
      time: current.time,
      open: current.open,
      high: Math.max(current.high, livePrice.price),
      low: Math.min(current.low, livePrice.price),
      close: livePrice.price,
    }

    // Update in-memory reference
    currentCandleRef.current = updatedCandle

    try {
      candleSeries.current.update(updatedCandle)
    } catch {
      // Safe update
    }
  }, [livePrice])

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
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground p-1.5 rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer"
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
            <Loader2 className="h-7 w-7 animate-spin text-accent mb-2" />
            <div className="text-xs font-medium text-muted">Loading candlestick data…</div>
          </div>
        )}

        {isError && (!ohlcData || ohlcData.length === 0) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90 backdrop-blur-xs p-6 text-center text-foreground">
            <AlertCircle className="h-8 w-8 text-accent mb-2" />
            <div className="text-sm font-semibold text-foreground">Historical OHLC data temporarily unavailable</div>
            <div className="text-xs text-muted max-w-sm mt-1">
              {error instanceof ApiError && error.isRateLimited
                ? 'CoinGecko API rate limit reached (HTTP 429). The chart will auto-recover once cooldown expires.'
                : error?.message || 'Failed to fetch historical candlestick prices.'}
            </div>
            <button
              onClick={() => refetch()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent hover:bg-accent-hover px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] transition-colors cursor-pointer shadow-md shadow-accent/15"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[var(--accent-contrast)]" /> Retry
            </button>
            <div className="text-[11px] text-positive mt-2 font-mono">
              Live Binance price updates continue to stream in real-time
            </div>
          </div>
        )}

        {isError && ohlcData && ohlcData.length > 0 && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs text-accent backdrop-blur-md">
            <AlertCircle className="h-3.5 w-3.5 text-accent" />
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