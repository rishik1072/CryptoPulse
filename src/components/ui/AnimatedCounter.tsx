import { useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

export interface AnimatedCounterProps {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
  decimals?: number
}

export function AnimatedCounter({ 
  value, 
  prefix = '', 
  suffix = '', 
  duration = 1.2,
  decimals,
}: AnimatedCounterProps) {
  const count = useMotionValue(0)
  
  const effectiveDecimals =
    typeof decimals === 'number' && decimals >= 0
      ? decimals
      : !Number.isInteger(value)
      ? 2
      : 0

  const formatted = useTransform(count, (latest) => {
    if (!Number.isFinite(latest)) return '0'

    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: effectiveDecimals,
      maximumFractionDigits: effectiveDecimals,
    }).format(latest)
  })

  useEffect(() => {
    const controls = animate(count, value, {
      duration,
      ease: [0.23, 1, 0.32, 1],
    })
    return controls.stop
  }, [value, count, duration])

  return (
    <span className="tabular-nums">
      {prefix}
      <motion.span>{formatted}</motion.span>
      {suffix}
    </span>
  )
}