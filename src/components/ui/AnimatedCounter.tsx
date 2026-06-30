import { useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

interface AnimatedCounterProps {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
}

export function AnimatedCounter({ 
  value, 
  prefix = '', 
  suffix = '', 
  duration = 1.2 
}: AnimatedCounterProps) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, latest => Math.round(latest))

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
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  )
}