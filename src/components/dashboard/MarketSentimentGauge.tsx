import { Flame, Info } from 'lucide-react'
import { motion } from 'framer-motion'

interface MarketSentimentGaugeProps {
  value?: number
  classification?: string
}

export function MarketSentimentGauge({
  value,
  classification,
}: MarketSentimentGaugeProps) {
  // If value is missing, do not fabricate 68
  const hasValue = value != null
  const displayVal = hasValue ? value : 50
  const displayClass = classification || (hasValue ? 'Neutral' : 'Unavailable')

  // Normalize value between 0 and 100
  const normalizedValue = Math.min(Math.max(displayVal, 0), 100)

  // Map 0-100 to angle: from 180 deg (left) to 0 deg (right)
  const angle = 180 - (normalizedValue / 100) * 180
  const radians = (angle * Math.PI) / 180

  // Needle tip position for a radius of 65 on center (90, 85)
  const cx = 90
  const cy = 85
  const needleRadius = 58
  const needleX = cx + needleRadius * Math.cos(radians)
  const needleY = cy - needleRadius * Math.sin(radians)

  // Determine badge color
  const getBadgeColors = (val: number) => {
    if (val >= 60) return 'bg-[var(--positive)]/15 text-[var(--positive)] border-[var(--positive)]/30'
    if (val >= 45) return 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30'
    if (val >= 25) return 'bg-[#FFA000]/15 text-[#FFA000] border-[#FFA000]/30'
    return 'bg-[var(--negative)]/15 text-[var(--negative)] border-[var(--negative)]/30'
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-[#FFB300]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground font-heading">Market Sentiment</h3>
        </div>
        <button
          className="text-muted hover:text-foreground transition cursor-pointer"
          title="Alternative.me Crypto Fear & Greed Index"
          aria-label="Info"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {/* Semi-circular Radial Gauge */}
      <div className="relative mt-4 flex flex-col items-center justify-center">
        <svg className="w-52 h-28 overflow-visible" viewBox="0 0 180 95">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--negative)" />
              <stop offset="50%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--positive)" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <path
            d="M 18 85 A 72 72 0 0 1 162 85"
            fill="none"
            stroke="var(--border)"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Colored Gradient Arc */}
          <path
            d="M 18 85 A 72 72 0 0 1 162 85"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="14"
            strokeLinecap="round"
            opacity={0.9}
          />

          {/* Needle / Indicator Dot */}
          <motion.circle
            cx={needleX}
            cy={needleY}
            r="6.5"
            fill="var(--foreground)"
            stroke="var(--surface)"
            strokeWidth="2.5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
          />
        </svg>

        {/* Center Numbers and Badge */}
        <div className="-mt-14 flex flex-col items-center justify-center text-center">
          <div className="text-4xl font-extrabold tracking-tight text-foreground font-mono tabular-nums">{hasValue ? value : '—'}</div>
          <span
            className={`mt-1 inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wider font-mono ${
              hasValue ? getBadgeColors(displayVal) : 'bg-surface-elevated text-muted border-border'
            }`}
          >
            {displayClass}
          </span>
        </div>
      </div>

      {/* Description text */}
      <p className="mt-4 text-center text-xs leading-relaxed text-muted">
        {hasValue
          ? `Market sentiment is currently in ${displayClass} territory.`
          : 'Sentiment index currently awaiting live network feed.'}
      </p>
    </div>
  )
}
