import { useState, useRef, useCallback } from 'react'
import { FONT } from './MobileLayout'

interface Props {
  mode?: 'building' | 'cadastral'
  floors?: number // 1 (Ground), 2 (R+1), 3 (R+2)
  surfaceAreaSqm?: number
  plotNumber?: string
  height?: number
  className?: string
}

export function BuildingModel3DViewer({
  mode = 'building',
  floors = 2,
  surfaceAreaSqm = 240,
  plotNumber = 'TF #8812/Oce',
  height = 320,
  className = '',
}: Props) {
  const [rotationAngle, setRotationAngle] = useState(45) // degrees
  const [pitchAngle, setPitchAngle] = useState(30) // degrees
  const [zoom, setZoom] = useState(1)
  const [activeFloor, setActiveFloor] = useState<'all' | 'ground' | 'first' | 'second'>('all')
  const [showWireframe, setShowWireframe] = useState(false)
  const [activeMode, setActiveMode] = useState<'building' | 'cadastral'>(mode)

  const isDragging = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y
    lastMousePos.current = { x: e.clientX, y: e.clientY }

    setRotationAngle((prev) => (prev + dx * 0.8) % 360)
    setPitchAngle((prev) => Math.max(15, Math.min(60, prev - dy * 0.5)))
  }, [])

  const handleMouseUp = () => {
    isDragging.current = false
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true
    lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return
    const dx = e.touches[0].clientX - lastMousePos.current.x
    const dy = e.touches[0].clientY - lastMousePos.current.y
    lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }

    setRotationAngle((prev) => (prev + dx * 0.8) % 360)
    setPitchAngle((prev) => Math.max(15, Math.min(60, prev - dy * 0.5)))
  }

  const rad = (rotationAngle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const pitchRad = (pitchAngle * Math.PI) / 180
  const pitchSin = Math.sin(pitchRad)

  // Isometric 3D Projection math
  const project3D = (x: number, y: number, z: number, cx = 200, cy = 180) => {
    const rx = x * cos - y * sin
    const ry = x * sin + y * cos
    const px = cx + rx * zoom
    const py = cy + (ry * pitchSin - z * Math.cos(pitchRad)) * zoom
    return { px, py }
  }

  // Draw 3D Isometric building levels
  const renderBuilding = () => {
    const levels = []
    const baseW = 100
    const baseH = 80
    const levelHeight = 35

    const showLevel0 = activeFloor === 'all' || activeFloor === 'ground'
    const showLevel1 = (activeFloor === 'all' || activeFloor === 'first') && floors >= 2
    const showLevel2 = (activeFloor === 'all' || activeFloor === 'second') && floors >= 3

    // Ground level foundation
    if (showLevel0) {
      levels.push({ zBase: 0, zTop: levelHeight, label: 'Ground Floor (RDC)', color: '#0F7A52', wallColor: '#17A36C' })
    }
    // R+1
    if (showLevel1) {
      levels.push({ zBase: levelHeight + 4, zTop: levelHeight * 2 + 4, label: 'Level 1 (R+1)', color: '#C9971E', wallColor: '#E0B84D' })
    }
    // R+2
    if (showLevel2) {
      levels.push({ zBase: levelHeight * 2 + 8, zTop: levelHeight * 3 + 8, label: 'Level 2 (R+2)', color: '#1E3A5F', wallColor: '#2D4A6E' })
    }

    return levels.map((lvl, idx) => {
      const p0 = project3D(-baseW / 2, -baseH / 2, lvl.zBase)
      const p1 = project3D(baseW / 2, -baseH / 2, lvl.zBase)
      const p2 = project3D(baseW / 2, baseH / 2, lvl.zBase)
      const p3 = project3D(-baseW / 2, baseH / 2, lvl.zBase)

      const t0 = project3D(-baseW / 2, -baseH / 2, lvl.zTop)
      const t1 = project3D(baseW / 2, -baseH / 2, lvl.zTop)
      const t2 = project3D(baseW / 2, baseH / 2, lvl.zTop)
      const t3 = project3D(-baseW / 2, baseH / 2, lvl.zTop)

      return (
        <g key={idx}>
          {/* Floor Slab */}
          <polygon
            points={`${p0.px},${p0.py} ${p1.px},${p1.py} ${p2.px},${p2.py} ${p3.px},${p3.py}`}
            fill={showWireframe ? 'none' : '#EAE7E0'}
            stroke={lvl.color}
            strokeWidth="1.5"
          />
          {/* Walls Front-Right */}
          <polygon
            points={`${p1.px},${p1.py} ${p2.px},${p2.py} ${t2.px},${t2.py} ${t1.px},${t1.py}`}
            fill={showWireframe ? 'none' : lvl.wallColor}
            fillOpacity={showWireframe ? 0 : 0.75}
            stroke={lvl.color}
            strokeWidth="1.5"
          />
          {/* Walls Front-Left */}
          <polygon
            points={`${p2.px},${p2.py} ${p3.px},${p3.py} ${t3.px},${t3.py} ${t2.px},${t2.py}`}
            fill={showWireframe ? 'none' : lvl.color}
            fillOpacity={showWireframe ? 0 : 0.85}
            stroke={lvl.color}
            strokeWidth="1.5"
          />
          {/* Roof Slab */}
          <polygon
            points={`${t0.px},${t0.py} ${t1.px},${t1.py} ${t2.px},${t2.py} ${t3.px},${t3.py}`}
            fill={showWireframe ? 'none' : '#FCFBF9'}
            fillOpacity={showWireframe ? 0 : 0.9}
            stroke={lvl.color}
            strokeWidth="1.5"
          />
          {/* Windows / Openings */}
          {!showWireframe && (
            <>
              <line x1={(p2.px + p3.px) / 2 - 10} y1={(p2.py + t2.py) / 2} x2={(p2.px + p3.px) / 2 + 10} y2={(p2.py + t2.py) / 2} stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
              <line x1={(p1.px + p2.px) / 2 - 10} y1={(p1.py + t1.py) / 2} x2={(p1.px + p2.px) / 2 + 10} y2={(p1.py + t1.py) / 2} stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            </>
          )}
        </g>
      )
    })
  }

  // Draw 3D Cadastral Plot Terrain & Boundary Beacons (Bornes)
  const renderCadastralPlot = () => {
    const w = 140
    const h = 110
    const bA = project3D(-w / 2, -h / 2, 0)
    const bB = project3D(w / 2, -h / 2, 0)
    const bC = project3D(w / 2, h / 2, 0)
    const bD = project3D(-w / 2, h / 2, 0)

    return (
      <g>
        {/* Plot Surface */}
        <polygon
          points={`${bA.px},${bA.py} ${bB.px},${bB.py} ${bC.px},${bC.py} ${bD.px},${bD.py}`}
          fill="#0F7A52"
          fillOpacity="0.15"
          stroke="#0F7A52"
          strokeWidth="2.5"
          strokeDasharray={showWireframe ? '4 4' : 'none'}
        />

        {/* Boundary Beacons (Bornes) */}
        {[
          { pt: bA, label: 'Borne A' },
          { pt: bB, label: 'Borne B' },
          { pt: bC, label: 'Borne C' },
          { pt: bD, label: 'Borne D' },
        ].map((b, i) => (
          <g key={i}>
            <circle cx={b.pt.px} cy={b.pt.py} r="6" fill="#B23A2E" stroke="#FFFFFF" strokeWidth="2" />
            <text
              x={b.pt.px + 8}
              y={b.pt.py - 4}
              fill="#14171B"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {b.label}
            </text>
          </g>
        ))}

        {/* Center Plot Label */}
        <text
          x={(bA.px + bC.px) / 2}
          y={(bA.py + bC.py) / 2}
          textAnchor="middle"
          fill="#0F7A52"
          fontSize="11"
          fontFamily="sans-serif"
          fontWeight="bold"
        >
          {plotNumber} ({surfaceAreaSqm} m²)
        </text>
      </g>
    )
  }

  return (
    <div className={`flex flex-col bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 ${className}`}>
      {/* 3D Top Header Toolbar */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span style={{ fontFamily: FONT.mono }} className="text-xs uppercase font-bold text-emerald-400">
            Interactive 3D Architectural View
          </span>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1 bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveMode('building')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'building' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            🏢 Building 3D
          </button>
          <button
            onClick={() => setActiveMode('cadastral')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'cadastral' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            🗺️ Cadastral Plot
          </button>
        </div>
      </div>

      {/* 3D Canvas Viewport */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        className="relative cursor-grab active:cursor-grabbing select-none flex items-center justify-center bg-radial from-slate-900 to-slate-950 overflow-hidden"
        style={{ height }}
      >
        <svg width="100%" height={height} viewBox="0 0 400 320" className="w-full h-full">
          {/* Subtle Grid Plane */}
          <defs>
            <pattern id="grid3d" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>
          <rect width="400" height="320" fill="url(#grid3d)" />

          {/* Render 3D Model */}
          {activeMode === 'building' ? renderBuilding() : renderCadastralPlot()}
        </svg>

        {/* 3D Touch Rotation Hint */}
        <div className="absolute bottom-3 left-4 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-mono text-slate-300">
          🔄 Drag to Rotate 360° · {Math.round(rotationAngle)}°
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-3 right-4 flex gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl">
          <button onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))} className="w-7 h-7 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-700">
            +
          </button>
          <button onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))} className="w-7 h-7 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-700">
            -
          </button>
          <button onClick={() => setShowWireframe((w) => !w)} className={`px-2 h-7 rounded-lg text-[10px] font-mono font-bold ${showWireframe ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-white'}`}>
            {showWireframe ? 'Solid' : 'Wireframe'}
          </button>
        </div>
      </div>

      {/* Floor Filter Bar (for Building mode) */}
      {activeMode === 'building' && (
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <span style={{ fontFamily: FONT.mono }} className="text-[10px] uppercase text-slate-400 font-bold">
            Isolate Floor Level
          </span>
          <div className="flex gap-1.5">
            {[
              { id: 'all', label: 'All Levels' },
              { id: 'ground', label: 'Ground' },
              ...(floors >= 2 ? [{ id: 'first', label: 'R+1' }] : []),
              ...(floors >= 3 ? [{ id: 'second', label: 'R+2' }] : []),
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFloor(f.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeFloor === f.id ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
