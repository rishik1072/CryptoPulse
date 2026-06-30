import { useEffect, useRef, useState, memo } from 'react'
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts'
import type { ISeriesApi, CandlestickData, Time } from 'lightweight-charts'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useOHLCData } from '@/services/historical'

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
  const { data: ohlcData } = useOHLCData(coinId, days)

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
    <div className="relative">
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

      <div ref={chartRef} className="w-full rounded-2xl overflow-hidden" style={{ height }} />
    </div>
  )
})