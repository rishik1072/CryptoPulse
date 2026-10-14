import { useInView, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef } from 'react'

interface CountUpProps {
  to: number
  from?: number
  direction?: 'up' | 'down'
  delay?: number
  duration?: number
  className?: string
  startWhen?: boolean
  separator?: string
  decimals?: number
  prefix?: string
  suffix?: string
  onStart?: () => void
  onEnd?: () => void
}

export function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 1.6,
  className = '',
  startWhen = true,
  separator = '',
  decimals,
  prefix = '',
  suffix = '',
  onStart,
  onEnd,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const shouldReduceMotion = useReducedMotion()

  const motionValue = useMotionValue(direction === 'down' ? to : from)
  const damping = 20 + 40 * (1 / duration)
  const stiffness = 100 * (1 / duration)

  const springValue = useSpring(motionValue, {
    damping,
    stiffness,
  })

  const isInView = useInView(ref, { once: true, margin: '0px' })

  const getDecimalPlaces = (num: number): number => {
    if (decimals !== undefined) return decimals
    const str = num.toString()
    if (str.includes('.')) {
      const dec = str.split('.')[1]
      if (parseInt(dec, 10) !== 0) {
        return dec.length
      }
    }
    return 0
  }

  const maxDecimals = decimals !== undefined ? decimals : Math.max(getDecimalPlaces(from), getDecimalPlaces(to))

  const formatValue = useCallback(
    (latest: number) => {
      const options: Intl.NumberFormatOptions = {
        useGrouping: !!separator,
        minimumFractionDigits: maxDecimals,
        maximumFractionDigits: maxDecimals,
      }

      const formattedNumber = Intl.NumberFormat('en-US', options).format(latest)
      const numString = separator ? formattedNumber.replace(/,/g, separator) : formattedNumber
      return `${prefix}${numString}${suffix}`
    },
    [maxDecimals, separator, prefix, suffix]
  )

  useEffect(() => {
    if (ref.current) {
      if (shouldReduceMotion) {
        ref.current.textContent = formatValue(to)
      } else {
        ref.current.textContent = formatValue(direction === 'down' ? to : from)
      }
    }
  }, [from, to, direction, formatValue, shouldReduceMotion])

  useEffect(() => {
    if (shouldReduceMotion) {
      if (ref.current) ref.current.textContent = formatValue(to)
      return
    }

    if (isInView && startWhen) {
      if (typeof onStart === 'function') {
        onStart()
      }

      const timeoutId = setTimeout(() => {
        motionValue.set(direction === 'down' ? from : to)
      }, delay * 1000)

      const durationTimeoutId = setTimeout(
        () => {
          if (typeof onEnd === 'function') {
            onEnd()
          }
        },
        delay * 1000 + duration * 1000
      )

      return () => {
        clearTimeout(timeoutId)
        clearTimeout(durationTimeoutId)
      }
    }
  }, [isInView, startWhen, motionValue, direction, from, to, delay, onStart, onEnd, duration, shouldReduceMotion, formatValue])

  useEffect(() => {
    if (shouldReduceMotion) return

    const unsubscribe = springValue.on('change', (latest: number) => {
      if (ref.current) {
        ref.current.textContent = formatValue(latest)
      }
    })

    return () => unsubscribe()
  }, [springValue, formatValue, shouldReduceMotion])

  return <span className={className} ref={ref} />
}
