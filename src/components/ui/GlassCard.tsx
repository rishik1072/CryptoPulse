import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cardHover, easings } from '@/lib/motion'

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
      initial={{ opacity: 0, y: 8, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.24, ease: easings.premium }}
      whileHover={hover ? cardHover.whileHover : undefined}
      whileTap={hover ? cardHover.whileTap : undefined}
      className={cn(
        'glass relative h-full overflow-hidden rounded-[24px] border border-slate-200/80 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.22)]',
        paddingClass,
        className
      )}
    >
      <div className="relative z-10 h-full">{children}</div>
      <div className="noise pointer-events-none absolute inset-0 rounded-[24px] opacity-60" />
    </motion.div>
  )
}