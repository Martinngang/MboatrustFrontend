import { useEffect, useState, type ReactNode } from 'react'
import { C } from './MobileLayout'

/** Shimmering placeholder block — base primitive for the SkeletonX convenience
 * wrappers below. Animation comes from the .animate-shimmer class in
 * index.css (respects the global prefers-reduced-motion guard). */
export function Skeleton({ variant = 'block', width, height, className = '' }: {
  variant?: 'block' | 'text' | 'circle' | 'card'
  width?: number | string
  height?: number | string
  className?: string
}) {
  const shapeClass = variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded-md' : 'rounded-2xl'
  const defaultHeight = variant === 'text' ? '0.9em' : variant === 'circle' ? width ?? 40 : variant === 'card' ? 140 : 80
  return (
    <div
      aria-hidden
      className={`animate-shimmer ${shapeClass} ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? defaultHeight,
        border: `1px solid ${C.parchmentDark}`,
      }}
    />
  )
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ size = 40, className = '' }: { size?: number; className?: string }) {
  return <Skeleton variant="circle" width={size} height={size} className={className} />
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${className}`} style={{ borderColor: C.parchmentDark, background: C.white }}>
      <Skeleton variant="card" className="mb-3" />
      <Skeleton variant="text" width="70%" className="mb-2" />
      <Skeleton variant="text" width="45%" />
    </div>
  )
}

export function SkeletonList({ rows = 4, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border p-3" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <SkeletonAvatar />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="55%" />
            <Skeleton variant="text" width="35%" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Shows skeleton content for `delayMs`, then swaps to `children`. Purely a
 * deliberate polish beat for high-traffic list/detail screens on mount — this
 * app has no real fetch layer, so never use this on forms (typing must never
 * feel delayed) or anywhere a real async boundary (image load, evidence
 * upload) already exists — tie the skeleton to that instead. */
export function useDeferredReveal(delayMs = 320) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), delayMs)
    return () => clearTimeout(t)
  }, [delayMs])
  return ready
}
export function DeferredReveal({ delayMs = 320, skeleton, children }: { delayMs?: number; skeleton: ReactNode; children: ReactNode }) {
  const ready = useDeferredReveal(delayMs)
  return <>{ready ? children : skeleton}</>
}
