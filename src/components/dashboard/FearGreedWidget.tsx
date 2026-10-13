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
  const { data: queriedData, isLoading: queryLoading, error, refetch } = useFearGreedIndex()

  const data = providedData ?? queriedData
  const isLoading = providedLoading || (!providedData ? queryLoading : false)

  if (isLoading) {
    return (
      <GlassCard className="flex flex-col justify-center items-center text-center p-6">
        <div className="text-xs text-muted tracking-[1.5px]">FEAR &amp; GREED</div>
        <Skeleton className="h-24 w-24 rounded-full mt-6 mb-4" />
        <Skeleton className="h-6 w-28 mt-2" />
        <Skeleton className="h-4 w-36 mt-2" />
      </GlassCard>
    )
  }

  if (error || !data) {
    return (
      <GlassCard className="flex flex-col justify-center items-center text-center p-6">
        <div className="text-xs text-muted tracking-[1.5px]">FEAR &amp; GREED</div>
        <div className="my-6 flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-slate-300 dark:border-slate-700 text-3xl font-normal text-slate-400">
          —
        </div>
        <div className="font-medium text-base text-slate-700 dark:text-slate-300">Data Unavailable</div>
        <div className="text-xs text-muted mt-1 max-w-xs">Live sentiment index could not be retrieved</div>
        <button
          onClick={() => refetch()}
          className="mt-3 text-xs text-violet-600 hover:text-violet-500 font-medium underline cursor-pointer"
        >
          Retry
        </button>
      </GlassCard>
    )
  }

  const value = data.value
  const classification =
    ('classification' in data && typeof data.classification === 'string' ? data.classification : undefined) ??
    ('value_classification' in data && typeof data.value_classification === 'string' ? data.value_classification : undefined) ??
    'Neutral'

  const strokeColor = value > 50 ? '#22c55e' : value > 25 ? '#eab308' : '#ef4444'

  return (
    <GlassCard className="flex flex-col justify-center items-center text-center">
      <div className="text-xs text-muted tracking-[1.5px]">FEAR &amp; GREED</div>
      
      <div className="relative mt-6 mb-4">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 120 120">
          <circle 
            cx="60" cy="60" r="48" 
            fill="none" 
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="10" 
          />
          <motion.circle 
            cx="60" cy="60" r="48" 
            fill="none" 
            stroke={strokeColor}
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
      
      <div className="font-medium text-xl tracking-tight">{classification}</div>
      <div className="text-xs text-muted mt-1">Alternative.me sentiment index</div>
    </GlassCard>
  )
}