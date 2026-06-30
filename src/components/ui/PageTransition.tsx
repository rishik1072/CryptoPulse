import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { pageTransition } from '@/lib/motion'

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}