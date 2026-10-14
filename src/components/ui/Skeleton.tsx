import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-slate-200/70 dark:bg-white/[0.05] before:absolute before:inset-0 before:animate-[shimmer_2s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-slate-300/50 dark:before:via-white/10 before:to-transparent',
        className
      )}
    />
  )
}