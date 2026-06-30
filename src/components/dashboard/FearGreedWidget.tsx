import { useFearGreedIndex } from '@/services/fearGreed'
import { GlassCard } from '@/components/ui/GlassCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { motion } from 'framer-motion'

interface FearGreedWidgetProps {
  data?: {
    value: number
    classification?: string
    value_classification?: string
    timestamp?: number
  } | null
  isLoading?: boolean
}

export function FearGreedWidget({ data: providedData, isLoading: providedLoading = false }: FearGreedWidgetProps) {
  const { data: queriedData, isLoading: queryLoading, error } = useFearGreedIndex()

  const data = providedData ?? queriedData
  const isLoading = providedLoading || (!providedData ? queryLoading : false)

  const value = data?.value ?? 0
  const classification =
    (data && 'classification' in data && typeof data.classification === 'string' ? data.classification : undefined) ??
    (data && 'value_classification' in data && typeof data.value_classification === 'string' ? data.value_classification : undefined) ??
    'Neutral'

  if (error) {
    return (
      <GlassCard>
        <div className="text-center text-muted text-sm">Fear &amp; Greed unavailable</div>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="flex flex-col justify-center items-center text-center">
      <div className="text-xs text-muted tracking-[1.5px]">FEAR &amp; GREED</div>
      
      {isLoading ? (
        <Skeleton className="h-20 w-20 rounded-full mt-4" />
      ) : (
        <div className="relative mt-6 mb-4">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 120 120">
            <circle 
              cx="60" cy="60" r="48" 
              fill="none" 
              stroke="#1e2937" 
              strokeWidth="10" 
            />
            <motion.circle 
              cx="60" cy="60" r="48" 
              fill="none" 
              stroke={value > 50 ? '#22c55e' : value > 25 ? '#eab308' : '#ef4444'}
              strokeWidth="10"
              strokeDasharray={`${(value / 100) * 301.6} 301.6`}
              strokeLinecap="round"
              initial={{ strokeDashoffset: 301.6 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-semibold tabular-nums tracking-[-2px]">{value}</div>
          </div>
        </div>
      )}
      
      <div className="font-medium text-xl tracking-tight">{classification}</div>
      <div className="text-xs text-muted mt-1">Updated every 30 minutes</div>
    </GlassCard>
  )
}