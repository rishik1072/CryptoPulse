import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { pageTransition } from '@/lib/motion'

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={shouldReduceMotion ? undefined : pageTransition}
        initial={shouldReduceMotion ? undefined : 'initial'}
        animate={shouldReduceMotion ? undefined : 'animate'}
        exit={shouldReduceMotion ? undefined : 'exit'}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}