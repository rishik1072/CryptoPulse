import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

export function GlassCard({ 
  children, 
  className, 
  hover = false,
  padding = 'lg'
}: GlassCardProps) {
  const paddingClass = {
    none: 'p-0',
    sm: 'p-3.5 sm:p-4',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6'
  }[padding]

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative h-full overflow-hidden rounded-xl border border-border bg-surface text-foreground shadow-sm transition-all',
        hover && 'hover:border-accent/40 hover:bg-surface-elevated',
        paddingClass,
        className
      )}
    >
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  )
}