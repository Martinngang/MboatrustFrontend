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

// Opacity-only — deliberately no x/y/scale. AppShell wraps every screen's
// content in a motion.div using these variants, and every screen renders
// its own `position: sticky` Header (MobileLayout.tsx) inside that content.
// Any x/y/scale value here makes Framer Motion set an inline `transform` on
// the wrapper — even at rest, since `y: 0` still resolves to
// `transform: translateY(0px)`, not an absent property — and a transformed
// ancestor breaks `position: sticky` for everything inside it (it stops
// sticking to the true scrolling container). That's exactly what used to
// make every screen's title/back header scroll away instead of staying
// pinned. See BottomNav's comment in MobileLayout.tsx for the same
// invariant applied to `position: fixed`.
export const pageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const pageTransition: Transition = { duration: 0.28, ease: easeDecel }
