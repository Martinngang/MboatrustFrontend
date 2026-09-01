import { useState, useRef, useCallback } from 'react'
import { C } from './MobileLayout'

interface Props {
  beforeImage: string
  afterImage: string
  beforeLabel?: string
  afterLabel?: string
  height?: number
  className?: string
}

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'Before (Site Prep)',
  afterLabel = 'After (Completed Pour)',
  height = 260,
  className = '',
}: Props) {
  const [sliderPos, setSliderPos] = useState(50) // percentage 0-100
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPos(percent)
  }, [])

  const onTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX)
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      handleMove(e.clientX)
    }
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={() => (isDragging.current = true)}
      onMouseUp={() => (isDragging.current = false)}
      onMouseLeave={() => (isDragging.current = false)}
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
      className={`relative select-none overflow-hidden rounded-2xl border cursor-ew-resize shadow-md ${className}`}
      style={{ height, borderColor: C.parchmentDark }}
    >
      {/* After Image (Background Layer) */}
      <img
        src={afterImage}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Before Image (Clipped Foreground Layer) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: `${sliderPos}%` }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="absolute top-0 left-0 h-full object-cover max-w-none"
          style={{ width: containerRef.current ? containerRef.current.clientWidth : '100%' }}
        />
      </div>

      {/* Vertical Split Line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl z-20 pointer-events-none"
        style={{ left: `${sliderPos}%` }}
      >
        {/* Handle Knob */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg border-2 flex items-center justify-center pointer-events-auto"
          style={{ borderColor: C.forest }}
        >
          <div className="flex gap-0.5 items-center">
            <span className="text-[10px] font-bold" style={{ color: C.forest }}>‹</span>
            <span className="text-[10px] font-bold" style={{ color: C.forest }}>›</span>
          </div>
        </div>
      </div>

      {/* Floating Badges */}
      <div
        className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold text-white z-10 pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.65)' }}
      >
        {beforeLabel}
      </div>
      <div
        className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold text-white z-10 pointer-events-none"
        style={{ background: 'rgba(15, 122, 82, 0.85)' }}
      >
        {afterLabel}
      </div>

      {/* Bottom Drag Instruction */}
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-mono text-white/90 z-10 pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.5)' }}
      >
        ⇄ Drag slider to compare
      </div>
    </div>
  )
}
