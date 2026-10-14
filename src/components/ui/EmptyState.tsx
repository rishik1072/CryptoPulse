import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  boxed?: boolean
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  boxed = false,
}: EmptyStateProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center text-center py-12 px-4 max-w-sm mx-auto', className)}>
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <h3 className="text-sm font-semibold text-foreground font-heading">{title}</h3>
      {description && <p className="mt-1 text-xs text-muted leading-relaxed">{description}</p>}
      {action && <div className="mt-3.5">{action}</div>}
    </div>
  )

  if (boxed) {
    return (
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
        {content}
      </div>
    )
  }

  return content
}