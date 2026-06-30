import { useMemo } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { useLivePriceStore } from '@/store/useLivePriceStore'

interface SparklinePoint {
  value: number
}

interface SparklineProps {
  symbol: string
  color?: string
}

export function Sparkline({ symbol, color = '#7c3aed' }: SparklineProps) {
  const { prices } = useLivePriceStore()
  const priceData = prices[symbol]

  // Generate simple sparkline data from current price (simulated history)
  const data = useMemo<SparklinePoint[]>(() => {
    if (!priceData) return []
    const base = priceData.price
    return Array.from({ length: 12 }, (_, i) => ({
      value: base * (0.985 + (i % 5) * 0.005) * (i / 12 + 0.9),
    }))
  }, [priceData])

  if (!priceData) return <div className="h-8 w-20 bg-white/10 rounded" />

  return (
    <div className="h-8 w-20 -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line 
            type="natural" 
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