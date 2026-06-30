import { motion, AnimatePresence } from 'framer-motion'

interface GlobalLoadingProps {
  isLoading?: boolean
}

export function GlobalLoading({ isLoading = false }: GlobalLoadingProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 z-[200] h-[1px] bg-white/10 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-secondary to-primary"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            exit={{ width: '100%', opacity: 0 }}
            transition={{ 
              duration: 1.2, 
              ease: [0.23, 1, 0.32, 1] 
            }}
          />
        </div>
      )}
    </AnimatePresence>
  )
}