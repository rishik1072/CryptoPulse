import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cardHover } from '@/lib/motion'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

export function GlassCard({ 
  children, 
  className, 
  hover = true,
  padding = 'lg'
}: GlassCardProps) {
  const paddingClass = {
    sm: 'p-4 sm:p-5',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8'
  }[padding]

  return (
    <motion.div
      whileHover={hover ? cardHover.whileHover : undefined}
      whileTap={hover ? cardHover.whileTap : undefined}
      className={cn(
        'glass relative h-full overflow-hidden rounded-[28px] border border-white/10 shadow-premium',
        paddingClass,
        className
      )}
    >
      <div className="relative z-10 h-full">{children}</div>
      <div className="noise pointer-events-none absolute inset-0 rounded-[28px] opacity-60" />
    </motion.div>
  )
}