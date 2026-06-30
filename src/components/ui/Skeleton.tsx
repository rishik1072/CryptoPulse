import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white/[0.08] before:absolute before:inset-0 before:animate-[shimmer_1.8s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent',
        className
      )}
    />
  )
}