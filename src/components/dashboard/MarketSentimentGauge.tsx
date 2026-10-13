import { Flame, Info } from 'lucide-react'
import { motion } from 'framer-motion'

interface MarketSentimentGaugeProps {
  value?: number
  classification?: string
}

export function MarketSentimentGauge({
  value = 68,
  classification = 'Greed',
}: MarketSentimentGaugeProps) {
  // Normalize value between 0 and 100
  const normalizedValue = Math.min(Math.max(value, 0), 100)

  // Map 0-100 to angle: from 180 deg (left) to 0 deg (right)
  // At 0 -> 180 deg, at 50 -> 90 deg, at 100 -> 0 deg
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
    if (val >= 60) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    if (val >= 45) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    if (val >= 25) return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0E1326] p-5 shadow-lg shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-white">Market Sentiment</h3>
        </div>
        <button
          className="text-slate-500 hover:text-slate-300 transition"
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
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="35%" stopColor="#F97316" />
              <stop offset="65%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
          </defs>

          {/* Background Track (Dark Arc) */}
          <path
            d="M 18 85 A 72 72 0 0 1 162 85"
            fill="none"
            stroke="#1B2238"
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
            opacity={0.88}
          />

          {/* Needle / Indicator Dot */}
          <motion.circle
            cx={needleX}
            cy={needleY}
            r="6.5"
            fill="#FFFFFF"
            stroke="#0E1326"
            strokeWidth="2.5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
          />
        </svg>

        {/* Center Numbers and Badge */}
        <div className="-mt-14 flex flex-col items-center justify-center text-center">
          <div className="text-4xl font-extrabold tracking-tight text-white">{value}</div>
          <span
            className={`mt-1 inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wider ${getBadgeColors(
              value
            )}`}
          >
            {classification}
          </span>
        </div>
      </div>

      {/* Description text */}
      <p className="mt-4 text-center text-xs leading-relaxed text-slate-400">
        Market sentiment is currently in <span className="font-medium text-slate-200">{classification}</span> territory, indicating strong bullish sentiment.
      </p>
    </div>
  )
}
