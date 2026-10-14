import { useEffect, useRef, memo } from 'react'
import { createChart, ColorType, LineSeries } from 'lightweight-charts'
import type { IChartApi, ISeriesApi, LineData, Time } from 'lightweight-charts'
import { useLivePriceStore } from '@/store/useLivePriceStore'

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
  const dataPointsRef = useRef<LineData[]>([])

  const { prices } = useLivePriceStore()

  const currentPrice = prices[symbol]?.price

  // Initialize chart once
  useEffect(() => {
    if (!chartRef.current) return

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.08)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.08)' },
      },
      crosshair: {
        mode: 0,
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
      crosshairMarkerBackgroundColor: '#050816',
    })

    chartInstance.current = chart
    seriesRef.current = lineSeries

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current && chartInstance.current) {
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
      } catch {
        // Safe cleanup
      }
    }
  }, [height, color])

  // Efficiently append new price points without duplicate timestamps
  useEffect(() => {
    if (!currentPrice || !seriesRef.current || !Number.isFinite(currentPrice)) return

    const now = Math.floor(Date.now() / 1000) as Time
    const points = dataPointsRef.current
    const last = points.length > 0 ? points[points.length - 1] : null

    if (last && Number(last.time) === Number(now)) {
      last.value = currentPrice
    } else {
      points.push({ time: now, value: currentPrice })
      if (points.length > 80) {
        points.shift()
      }
    }

    try {
      seriesRef.current.setData([...points])
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