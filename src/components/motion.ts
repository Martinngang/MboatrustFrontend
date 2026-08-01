import type { Transition, Variants } from 'framer-motion'

// Shared Framer Motion vocabulary so screens reuse the same easing/timing
// instead of inventing new ones per component. Mirrors the two CSS easing
// families already established in index.css for Reveal/Tilt3D/onboarding:
// a smooth deceleration for reveals, a bouncy overshoot for emphasis "pop".
export const easeDecel = [0.2, 0.7, 0.2, 1] as const
export const easeBounce = [0.2, 1.4, 0.4, 1] as const

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeDecel } },
}

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: easeBounce } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15, ease: easeDecel } },
}

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export const pageTransition: Transition = { duration: 0.28, ease: easeDecel }
