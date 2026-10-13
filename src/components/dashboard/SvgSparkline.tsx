import { useMemo } from 'react'

interface SvgSparklineProps {
  data?: number[]
  color?: string
  width?: number
  height?: number
  positive?: boolean
  className?: string
}

export function SvgSparkline({
  data,
  color,
  width = 120,
  height = 36,
  positive = true,
  className = '',
}: SvgSparklineProps) {
  // If data is missing or too short, generate a clean decorative sine wave that matches positive/negative
  const points = useMemo(() => {
    if (data && data.length >= 2) {
      const valid = data.filter(Number.isFinite)
      if (valid.length >= 2) return valid
    }
    // Fallback subtle wave
    return positive
      ? [10, 12, 11, 15, 14, 18, 16, 21, 20, 24]
      : [24, 21, 22, 18, 19, 15, 16, 12, 14, 10]
  }, [data, positive])

  const strokeColor = color ?? (positive ? '#10B981' : '#EF4444')

  const pathD = useMemo(() => {
    const min = Math.min(...points)
    const max = Math.max(...points)
    const range = max - min || 1
    const padding = 4
    const availableHeight = height - padding * 2

    const coords = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * width
      const y = height - padding - ((val - min) / range) * availableHeight
      return { x, y }
    })

    if (coords.length < 2) return ''

    // Smooth cubic bezier curve
    let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`
    for (let i = 0; i < coords.length - 1; i++) {
      const current = coords[i]
      const next = coords[i + 1]
      const cpX1 = current.x + (next.x - current.x) * 0.5
      const cpY1 = current.y
      const cpX2 = current.x + (next.x - current.x) * 0.5
      const cpY2 = next.y
      d += ` C ${cpX1.toFixed(1)} ${cpY1.toFixed(1)}, ${cpX2.toFixed(1)} ${cpY2.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`
    }
    return d
  }, [points, width, height])

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible ${className}`}
    >
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
