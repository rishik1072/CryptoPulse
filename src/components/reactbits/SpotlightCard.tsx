import React, { useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  spotlightColor?: string
  spotlightSize?: number
  bordered?: boolean
}

export function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(0, 230, 118, 0.08)',
  spotlightSize = 280,
  bordered = true,
  ...props
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return
    const rect = divRef.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setOpacity(1)
  }, [])

  const handleMouseEnter = useCallback(() => {
    setOpacity(1)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setOpacity(0)
  }, [])

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative isolate overflow-hidden rounded-xl bg-surface text-foreground transition-colors',
        bordered && 'border border-border',
        className
      )}
      {...props}
    >
      {/* Subtle radial spotlight overlay following pointer */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 -z-10"
        style={{
          opacity,
          background: `radial-gradient(${spotlightSize}px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
        }}
        aria-hidden="true"
      />
      {children}
    </div>
  )
}
