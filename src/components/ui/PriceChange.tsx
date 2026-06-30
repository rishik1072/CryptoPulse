import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PriceChangeProps {
  value: number
  className?: string
}

export function PriceChange({ value, className }: PriceChangeProps) {
  const isPositive = value >= 0
  return (
    <div className={cn(
      "inline-flex items-center gap-1 text-sm font-medium tabular-nums",
      isPositive ? "text-success" : "text-danger",
      className
    )}>
      {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {Math.abs(value).toFixed(2)}%
    </div>
  )
}