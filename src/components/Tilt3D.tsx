import { useRef, useState, type CSSProperties, type ReactNode } from 'react'

/** Cursor-tracked 3D tilt wrapper — adds a subtle perspective rotation + light
 * glare to any card so hover feels dimensional rather than flat. Pointer-only:
 * touch devices never fire mousemove, so mobile is unaffected.
 *
 * `restX`/`restY` set a baseline tilt the element holds even when the cursor
 * isn't over it — useful for scenes (e.g. the verification orbit) that should
 * read as already-in-3D-space, with the hover motion layered on top. */
export function Tilt3D({
  children,
  className = '',
  style,
  max = 7,
  glare = true,
  restX = 0,
  restY = 0,
  scaleOnHover = true,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  max?: number
  glare?: boolean
  restX?: number
  restY?: number
  scaleOnHover?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const restTransform = `perspective(1000px) rotateX(${restX}deg) rotateY(${restY}deg) scale3d(1,1,1)`
  const [transform, setTransform] = useState(restTransform)
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, o: 0 })

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    const rx = restX + (0.5 - py) * max * 2
    const ry = restY + (px - 0.5) * max * 2
    const scale = scaleOnHover ? 1.015 : 1
    setTransform(`perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale3d(${scale},${scale},${scale})`)
    setGlarePos({ x: px * 100, y: py * 100, o: 0.14 })
  }

  function onLeave() {
    setTransform(restTransform)
    setGlarePos((g) => ({ ...g, o: 0 }))
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{
        position: 'relative',
        ...style,
        transform,
        transformStyle: 'preserve-3d',
        transition: 'transform .35s cubic-bezier(.2,.8,.2,1)',
        willChange: 'transform',
      }}
    >
      {children}
      {glare && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: 'inherit',
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,${glarePos.o}), transparent 62%)`,
            transition: 'opacity .3s ease',
          }}
        />
      )}
    </div>
  )
}
