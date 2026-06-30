import type { ReactNode } from 'react'
import { GlassCard } from './GlassCard'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <GlassCard className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-muted opacity-60">{icon}</div>
      <div className="text-xl font-medium tracking-tight">{title}</div>
      <p className="max-w-[260px] mt-2 text-sm text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </GlassCard>
  )
}