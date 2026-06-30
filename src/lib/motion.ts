import type { Variants } from 'framer-motion'

// Premium easing curves (Apple / Linear inspired)
export const easings = {
  premium: [0.23, 1.0, 0.32, 1] as const,
  spring: { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } as const,
  gentle: { type: 'spring', stiffness: 280, damping: 28 } as const,
}

// Page transition
export const pageTransition: Variants = {
  initial: { 
    opacity: 0, 
    y: 16, 
    scale: 0.985,
    filter: 'blur(2px)'
  },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    filter: 'blur(0px)',
    transition: { 
      duration: 0.36, 
      ease: easings.premium 
    } 
  },
  exit: { 
    opacity: 0, 
    y: -14, 
    scale: 0.985,
    filter: 'blur(1px)',
    transition: { duration: 0.22, ease: easings.premium } 
  }
}

// Card hover (premium lift)
export const cardHover = {
  whileHover: { 
    y: -3, 
    scale: 1.005,
    transition: easings.gentle 
  },
  whileTap: { 
    scale: 0.995 
  }
}

// Button interaction
export const buttonMotion = {
  whileHover: { scale: 1.01 },
  whileTap: { scale: 0.985 },
  transition: { duration: 0.1 }
}

// Sidebar slide
export const sidebarVariants: Variants = {
  open: { 
    x: 0, 
    transition: { ...easings.spring, delayChildren: 0.05 } 
  },
  closed: { 
    x: '-100%', 
    transition: { ...easings.spring } 
  }
}

// Dropdown / Modal
export const dropdownVariants: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0.96, 
    y: -8 
  },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { ...easings.spring, duration: 0.22 } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.96, 
    y: -6,
    transition: { duration: 0.15 } 
  }
}

// Skeleton shimmer
export const shimmerVariants: Variants = {
  animate: {
    backgroundPosition: ['200% 0%', '-200% 0%'],
    transition: {
      duration: 1.8,
      ease: 'linear',
      repeat: Infinity,
    }
  }
}

// Price flash (smooth)
export const priceFlash = (isPositive: boolean) => ({
  initial: { 
    color: isPositive ? '#22c55e' : '#ef4444',
    scale: 1.02 
  },
  animate: { 
    color: '#f8fafc', 
    scale: 1 
  },
  transition: { duration: 0.7, ease: easings.premium }
})