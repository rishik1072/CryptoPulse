import React from 'react'
import { cn } from '@/lib/utils'

export interface ShinyTextProps {
  children?: React.ReactNode
  text?: string
  className?: string
  shineColor?: string
  speed?: string | number
}

export function ShinyText({
  children,
  text,
  className = '',
  shineColor = 'rgba(255, 255, 255, 0.85)',
  speed = '4s',
}: ShinyTextProps) {
  const content = text ?? children
  const formattedSpeed = typeof speed === 'number' ? `${speed}s` : speed

  return (
    <span
      className={cn(
        'relative inline-flex items-center bg-clip-text text-transparent select-none',
        'bg-[linear-gradient(110deg,currentColor_35%,var(--shine-color)_50%,currentColor_65%)]',
        'bg-[length:250%_100%] animate-[shine_4s_ease-in-out_infinite]',
        className
      )}
      style={
        {
          '--shine-color': shineColor,
          animationDuration: formattedSpeed,
        } as React.CSSProperties
      }
    >
      {content}
    </span>
  )
}
