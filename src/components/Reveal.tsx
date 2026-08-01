import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/** Fades + lifts children in once they cross into the viewport. Wraps section
 * content on the landing page so scrolling feels choreographed, not static. */
export function Reveal({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          obs.unobserve(el)
        }
      },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className={`reveal-up ${inView ? 'in' : ''} ${className}`} style={style}>
      {children}
    </div>
  )
}
