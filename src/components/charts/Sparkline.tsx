import { memo, useMemo, useCallback } from 'react'
import { LineChart, Line } from 'recharts'
import { useLivePriceStore } from '@/store/useLivePriceStore'

interface SparklinePoint {
  value: number
}

interface SparklineProps {
  symbol?: string
  color?: string
  data?: number[]
}

export const Sparkline = memo(function Sparkline({ symbol, color = '#7c3aed', data: explicitData }: SparklineProps) {
  const symUpper = symbol ? symbol.toUpperCase() : ''
  const hasExplicitData = Boolean(explicitData && explicitData.length > 0)

  // Use targeted selectors to prevent re-rendering when other coins tick
  const history = useLivePriceStore(
    useCallback((state) => (!hasExplicitData && symUpper ? state.priceHistory[symUpper] : undefined), [hasExplicitData, symUpper])
  )
  const hasLivePrice = useLivePriceStore(
    useCallback((state) => (!hasExplicitData && symUpper ? Boolean(state.prices[symUpper]) : false), [hasExplicitData, symUpper])
  )

  const points = useMemo(() => {
    if (explicitData && explicitData.length > 0) {
      return explicitData.filter(Number.isFinite)
    }

    if (history && history.length > 0) {
      return history.filter(Number.isFinite)
    }

    return []
  }, [explicitData, history])

  const chartData = useMemo<SparklinePoint[]>(() => {
    return points.map((val) => ({ value: val }))
  }, [points])

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
    <div className="h-8 w-20 -mx-1 overflow-hidden">
      <LineChart width={80} height={32} data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          strokeWidth={1.5} 
          dot={false} 
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  )
})