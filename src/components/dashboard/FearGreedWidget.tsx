import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useFearGreedIndex } from '@/services/fearGreed'
import { CountUp } from '@/components/reactbits/CountUp'
import { Skeleton } from '@/components/ui/Skeleton'

interface FearGreedWidgetProps {
  data?: {
    value: number
    classification?: string
    value_classification?: string
    timestamp?: string | number
  } | null
  isLoading?: boolean
}

// Fixed SVG circular gauge geometry:
// Radius: 62, viewBox: 160x160 -> circumference: 2 * PI * 62 = 389.56
const GAUGE_RADIUS = 62
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS

function getSentimentTier(val: number) {
  if (val <= 24) {
    return {
      color: 'var(--negative)',
      badgeBg: 'bg-[var(--negative)]/15 border-[var(--negative)]/30 text-[var(--negative)]',
      label: 'Extreme Fear',
    }
  }
  if (val <= 44) {
    return {
      color: '#FF7A50',
      badgeBg: 'bg-[#FF7A50]/15 border-[#FF7A50]/30 text-[#FF7A50]',
      label: 'Fear',
    }
  }
  if (val <= 54) {
    return {
      color: 'var(--accent)',
      badgeBg: 'bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)]',
      label: 'Neutral',
    }
  }
  if (val <= 74) {
    return {
      color: 'var(--positive)',
      badgeBg: 'bg-[var(--positive)]/15 border-[var(--positive)]/30 text-[var(--positive)]',
      label: 'Greed',
    }
  }
  return {
    color: 'var(--positive)',
    badgeBg: 'bg-[var(--positive)]/20 border-[var(--positive)]/40 text-[var(--positive)]',
    label: 'Extreme Greed',
  }
}

export function FearGreedWidget({
  data: providedData,
  isLoading: providedLoading = false,
}: FearGreedWidgetProps) {
  const { data: queriedData, isLoading: queryLoading, error, refetch } = useFearGreedIndex()
  const shouldReduceMotion = useReducedMotion()

  const data = providedData !== undefined ? providedData : queriedData
  const isLoading = providedLoading || (providedData === undefined && queryLoading)

  const formattedUpdate = useMemo(() => {
    if (!data?.timestamp) return null
    try {
      const tsNum = typeof data.timestamp === 'string' ? parseInt(data.timestamp, 10) : data.timestamp
      if (Number.isNaN(tsNum)) return null
      // Alternative.me timestamp is in seconds
      const date = new Date(tsNum * 1000)
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return null
    }
  }, [data?.timestamp])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#262D38] bg-[#151921] p-5 text-center flex flex-col items-center justify-center">
        <div className="text-xs uppercase font-mono tracking-wider text-[#94A3B8] mb-4 font-semibold">
          Fear &amp; Greed Index
        </div>
        <Skeleton className="w-36 h-36 rounded-full mx-auto" />
        <Skeleton className="h-5 w-28 rounded-full mt-4" />
        <Skeleton className="h-3.5 w-44 mt-2.5" />
      </div>
    )
  }

  if (error || !data || data.value === null || data.value === undefined || Number.isNaN(data.value)) {
    return (
      <div className="rounded-xl border border-[#262D38] bg-[#151921] p-5 text-center flex flex-col items-center justify-center">
        <div className="text-xs uppercase font-mono tracking-wider text-[#94A3B8] mb-4 font-semibold">
          Fear &amp; Greed Index
        </div>
        <div className="w-36 h-36 flex items-center justify-center rounded-full border border-dashed border-[#262D38] bg-[#1E232E]/50 mb-3">
          <AlertCircle className="h-8 w-8 text-[#FFB300]" />
        </div>
        <div className="text-sm font-semibold text-[#F0F4F8]">Data Unavailable</div>
        <div className="text-xs text-[#94A3B8] max-w-xs mt-1">
          {error instanceof Error ? error.message : 'Live market sentiment index could not be retrieved.'}
        </div>
        <button
          onClick={() => refetch()}
          className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition-colors cursor-pointer"
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </div>
    )
  }

  // Ensure score strictly clamped to 0..100
  const score = Math.min(Math.max(Number(data.value), 0), 100)
  const tier = getSentimentTier(score)

  const classification =
    ('classification' in data && typeof data.classification === 'string' && data.classification) ||
    ('value_classification' in data && typeof data.value_classification === 'string' && data.value_classification) ||
    tier.label

  // Arc math: starts at top (-90deg), sweeps clockwise
  const strokeOffset = GAUGE_CIRCUMFERENCE - (score / 100) * GAUGE_CIRCUMFERENCE

  return (
    <div
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Fear and Greed Index: ${score} out of 100, ${classification}`}
      className="rounded-xl border border-border bg-surface p-5 text-center flex flex-col items-center justify-center shadow-sm"
    >
      {/* Widget Header */}
      <div className="text-xs uppercase font-mono tracking-wider text-muted mb-4 font-semibold">
        Fear &amp; Greed Index
      </div>

      {/* Circular Gauge Center Container */}
      <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center">
        <svg
          className="w-full h-full -rotate-90"
          viewBox="0 0 160 160"
          aria-hidden="true"
        >
          {/* Subtle Outer Track */}
          <circle
            cx="80"
            cy="80"
            r={GAUGE_RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth="10"
          />

          {/* Animated Progress Arc */}
          <motion.circle
            cx="80"
            cy="80"
            r={GAUGE_RADIUS}
            fill="none"
            stroke={tier.color}
            strokeWidth="10"
            strokeDasharray={GAUGE_CIRCUMFERENCE}
            strokeDashoffset={strokeOffset}
            strokeLinecap={score > 0 ? 'round' : 'butt'}
            initial={{ strokeDashoffset: GAUGE_CIRCUMFERENCE }}
            animate={{ strokeDashoffset: strokeOffset }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 1.2, ease: [0.22, 1, 0.36, 1] }
            }
          />
        </svg>

        {/* Centered Numerical Value (perfectly centered, zero track overlap) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground tabular-nums leading-none">
            <CountUp to={score} duration={1.2} />
          </div>
          <span className="text-[10px] font-mono uppercase text-muted mt-1">/ 100</span>
        </div>
      </div>

      {/* Sentiment Classification Badge */}
      <div className="mt-3.5 flex flex-col items-center">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tier.badgeBg} transition-colors`}
        >
          {classification}
        </span>

        {/* Data Source & Verified Timestamp */}
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#94A3B8] font-mono">
          <span className="text-[#94A3B8]">Alternative.me</span>
          {formattedUpdate && (
            <>
              <span className="text-[#64748B]">•</span>
              <span className="text-[#94A3B8]">{formattedUpdate}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}