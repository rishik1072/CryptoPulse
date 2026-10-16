import { useEffect, useRef, memo, useCallback } from 'react'
import { createChart, ColorType, LineSeries } from 'lightweight-charts'
import type { IChartApi, ISeriesApi, LineData, Time } from 'lightweight-charts'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useAuthStore } from '@/store/useAuthStore'
import { DESIGN_TOKENS } from '@/lib/theme'

interface RealTimePriceChartProps {
  symbol: string
  color?: string
  height?: number
}

export const RealTimePriceChart = memo(({ 
  symbol, 
  color = '#7c3aed', 
  height = 180 
}: RealTimePriceChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const isInitializedRef = useRef(false)

  const { preferences } = useAuthStore()

  const symUpper = symbol.toUpperCase()
  const currentPrice = useLivePriceStore(
    useCallback((state) => state.prices[symUpper]?.price, [symUpper])
  )

  // Initialize chart once
  useEffect(() => {
    if (!chartRef.current) return

    const isCurrentlyDark = preferences.theme === 'dark' || document.documentElement.classList.contains('dark')
    const tokens = isCurrentlyDark ? DESIGN_TOKENS.dark : DESIGN_TOKENS.light

    const chart = createChart(chartRef.current, {
      width: Math.max(chartRef.current.clientWidth, 100),
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
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
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
    })

    const lineSeries = chart.addSeries(LineSeries, {
      color,
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: color,
      crosshairMarkerBackgroundColor: tokens.surfaceElevated,
    })

    chartInstance.current = chart
    seriesRef.current = lineSeries
    isInitializedRef.current = false

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current && chartInstance.current && chartRef.current.clientWidth > 0) {
        chartInstance.current.resize(
          chartRef.current.clientWidth, 
          height
        )
      }
    })
    resizeObserver.observe(chartRef.current)

    return () => {
      try {
        resizeObserver.disconnect()
        chart.remove()
        chartInstance.current = null
        seriesRef.current = null
        isInitializedRef.current = false
      } catch {
        // Safe cleanup
      }
    }
  }, [height, color, preferences.theme])

  // Dynamically sync theme changes without recreation
  useEffect(() => {
    if (!chartInstance.current) return
    const isCurrentlyDark = preferences.theme === 'dark'
    const tokens = isCurrentlyDark ? DESIGN_TOKENS.dark : DESIGN_TOKENS.light
    chartInstance.current.applyOptions({
      layout: { textColor: tokens.mutedText },
      grid: {
        vertLines: { color: tokens.chartGrid },
        horzLines: { color: tokens.chartGrid },
      },
      crosshair: {
        vertLine: { color: tokens.chartCrosshair },
        horzLine: { color: tokens.chartCrosshair },
      },
    })
  }, [preferences.theme])

  // Incrementally append or update price points using O(1) series.update()
  useEffect(() => {
    if (!currentPrice || !seriesRef.current || !Number.isFinite(currentPrice)) return

    const now = Math.floor(Date.now() / 1000) as Time
    const point: LineData = { time: now, value: currentPrice }

    try {
      seriesRef.current.update(point)
    } catch {
      // Safe update
    }
  }, [currentPrice])

  return (
    <div 
      ref={chartRef} 
      className="w-full rounded-xl overflow-hidden bg-white/5" 
      style={{ height }} 
    />
  )
})