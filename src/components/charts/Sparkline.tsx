import { useMemo } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { useLivePriceStore } from '@/store/useLivePriceStore'

interface SparklinePoint {
  value: number
}

interface SparklineProps {
  symbol?: string
  color?: string
  data?: number[]
}

export function Sparkline({ symbol, color = '#7c3aed', data: explicitData }: SparklineProps) {
  const { prices, priceHistory } = useLivePriceStore()

  const points = useMemo(() => {
    if (explicitData && explicitData.length > 0) {
      return explicitData.filter(Number.isFinite)
    }

    if (symbol) {
      const history = priceHistory[symbol.toUpperCase()] || []
      if (history.length > 0) {
        return history.filter(Number.isFinite)
      }
    }

    return []
  }, [explicitData, symbol, priceHistory])

  const chartData = useMemo<SparklinePoint[]>(() => {
    return points.map((val) => ({ value: val }))
  }, [points])

  const hasLivePrice = symbol ? Boolean(prices[symbol.toUpperCase()]) : false

  if (chartData.length < 2) {
    return (
      <div className="flex h-8 w-20 items-center justify-center">
        {hasLivePrice ? (
          <span className="inline-flex items-center gap-1 rounded bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
            live
          </span>
        ) : (
          <span className="text-[11px] text-slate-400 font-mono">—</span>
        )}
      </div>
    )
  }

  return (
    <div className="h-8 w-20 -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={1.5} 
            dot={false} 
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}