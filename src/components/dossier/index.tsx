import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { C, FONT } from '../tokens'
import './dossier.css'

/* ── The Sealed Dossier ───────────────────────────────────────────────────────
   Primitives for rendering a project as a notarised document rather than a
   stack of cards. See dossier.css for the paper/wax/letterpress layer.

   The design bet: MboaTrust's product is not "a dashboard for construction
   projects", it's *evidence a funder 5,000km away is willing to release money
   against*. Card UI makes every fact look equally weightless. Documents don't
   — a sealed record reads as expensive to forge, which is exactly the feeling
   the escrow is selling.
   ────────────────────────────────────────────────────────────────────────── */

/** A single leaf of the dossier. `ruled` adds the ledger margin hairline. */
export function Dossier({ children, ruled = false, className = '' }: { children: ReactNode; ruled?: boolean; className?: string }) {
  return <div className={`dsr-sheet ${ruled ? 'dsr-sheet--ruled' : ''} ${className}`}>{children}</div>
}

/** The tab on a physical folder. Sits directly above a Dossier and joins to it. */
export function DossierTab({ children }: { children: ReactNode }) {
  return (
    <div className="dsr-tab">
      <span className="dsr-legend dsr-press">{children}</span>
    </div>
  )
}

/** Mono, letterspaced, uppercase — the small print of the document layer. */
export function Legend({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`dsr-legend dsr-press ${className}`}>{children}</div>
}

export function PerforatedRule() {
  return <div className="dsr-perf" role="presentation" />
}

type StampTone = 'sealed' | 'review' | 'locked' | 'void'

const STAMP_COLOR: Record<StampTone, string> = {
  sealed: C.forest,
  review: C.amber,
  locked: C.inkSubtle,
  void: C.seal,
}

/** A rubber-stamp impression. Deliberately not a badge: rotated, eroded, inked. */
export function RubberStamp({ tone, children }: { tone: StampTone; children: ReactNode }) {
  return (
    <span className={`dsr-stamp ${tone === 'void' ? 'dsr-stamp--void' : ''}`} style={{ color: STAMP_COLOR[tone] }}>
      {children}
    </span>
  )
}

/* ── Wax seal ─────────────────────────────────────────────────────────────── */

const HOLD_MS = 900
const RING_R = 39
const RING_C = 2 * Math.PI * RING_R

/**
 * The press-and-hold approval control.
 *
 * Why a hold rather than a click: releasing a milestone moves real money and
 * cannot be undone from the UI. Every conventional guard for that is a modal
 * asking "are you sure?", which users learn to dismiss without reading. A
 * press-and-hold puts the deliberation in the gesture itself — you cannot
 * perform it by accident, and the thing you are doing (pressing a seal into
 * wax) is the same thing the gesture looks like.
 *
 * Keyboard users get Space-to-hold (same dwell, same ring) and Enter as an
 * immediate commit, since holding a key to confirm is a poor experience for
 * anyone relying on switch or voice input.
 */
/** The wax itself. Shared by the interactive seal and the static impression
 *  so a sealed record and a sealable one are visibly the same object — one
 *  has simply already been pressed. */
function WaxMark({ size, monogram, ring }: { size: number; monogram: string; ring?: ReactNode }) {
  const id = monogram.toLowerCase()
  return (
    <svg width={size} height={size} viewBox="0 0 84 84" aria-hidden="true">
      <defs>
        <radialGradient id={`dsrWax-${id}`} cx="36%" cy="30%">
          <stop offset="0%" stopColor="#D9553F" />
          <stop offset="55%" stopColor="#B23A2E" />
          <stop offset="100%" stopColor="#7E2119" />
        </radialGradient>
        <radialGradient id={`dsrWaxRim-${id}`} cx="50%" cy="50%">
          <stop offset="82%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
        </radialGradient>
      </defs>
      {/* Irregular blob — wax spreads unevenly; a perfect circle reads as a UI chip. */}
      <path
        d="M42 5c9.2-.6 17.4 3.4 24.1 9.3 6.4 5.6 11.6 12.7 12.4 21.2.8 8.8-3.1 17.2-8.4 24.1-5.5 7.1-12.9 13.4-21.8 14.6-9.1 1.2-18.2-2.7-25.4-8.4C15.6 60 9.2 52.4 7.6 43.6 6 34.7 9.4 25.6 15.3 18.9 21.1 12.3 29.4 5.8 42 5Z"
        fill={`url(#dsrWax-${id})`}
      />
      <path
        d="M42 5c9.2-.6 17.4 3.4 24.1 9.3 6.4 5.6 11.6 12.7 12.4 21.2.8 8.8-3.1 17.2-8.4 24.1-5.5 7.1-12.9 13.4-21.8 14.6-9.1 1.2-18.2-2.7-25.4-8.4C15.6 60 9.2 52.4 7.6 43.6 6 34.7 9.4 25.6 15.3 18.9 21.1 12.3 29.4 5.8 42 5Z"
        fill={`url(#dsrWaxRim-${id})`}
      />
      {/* Debossed inner ring — the die's edge biting into the wax. */}
      <circle cx="42" cy="42" r="27" fill="none" stroke="rgba(0,0,0,0.26)" strokeWidth="1.6" />
      <circle cx="42" cy="42" r="27" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" transform="translate(0,-1.2)" />
      {ring}
      <text
        x="42"
        y="47"
        textAnchor="middle"
        style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 21, fontWeight: 700, fill: 'rgba(255,255,255,0.92)', letterSpacing: '0.04em' }}
      >
        {monogram}
      </text>
    </svg>
  )
}

/** A seal that has already been pressed. Display only — no gesture, because
 *  there is nothing left to commit. */
export function SealImpression({ monogram = 'MT', caption, size = 64 }: { monogram?: string; caption?: string; size?: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div style={{ transform: 'rotate(-4deg)', filter: 'drop-shadow(0 4px 7px rgba(20,23,27,0.26))' }}>
        <WaxMark size={size} monogram={monogram} />
      </div>
      {caption && <Legend>{caption}</Legend>}
    </div>
  )
}

export function WaxSeal({
  onSeal,
  disabled = false,
  monogram = 'MT',
  caption,
  label,
}: {
  onSeal: () => void
  disabled?: boolean
  monogram?: string
  caption?: string
  label: string
}) {
  const [pressing, setPressing] = useState(false)
  const [struck, setStruck] = useState(false)
  const timer = useRef<number | null>(null)

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  useEffect(() => clear, [clear])

  const commit = useCallback(() => {
    clear()
    setPressing(false)
    setStruck(true)
    onSeal()
  }, [clear, onSeal])

  const start = useCallback(() => {
    if (disabled || struck) return
    setPressing(true)
    timer.current = window.setTimeout(commit, HOLD_MS)
  }, [disabled, struck, commit])

  const cancel = useCallback(() => {
    clear()
    setPressing(false)
  }, [clear])

  if (disabled) {
    return (
      <div className="dsr-seal-socket" title={label}>
        <span style={{ fontFamily: FONT.mono, fontSize: 8.5, letterSpacing: '0.14em', color: C.inkSubtle }}>UNSEALED</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        aria-label={label}
        className={`dsr-seal ${pressing ? 'dsr-seal--pressing' : ''} ${struck ? 'dsr-seal--struck' : ''}`}
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onKeyDown={(e) => {
          if (e.key === ' ') { e.preventDefault(); start() }
          if (e.key === 'Enter') { e.preventDefault(); commit() }
        }}
        onKeyUp={(e) => { if (e.key === ' ') cancel() }}
      >
        <WaxMark
          size={84}
          monogram={monogram}
          ring={
            /* Dwell ring — fills over HOLD_MS while held. */
            <circle
              cx="42"
              cy="42"
              r={RING_R}
              fill="none"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={pressing || struck ? 0 : RING_C}
              transform="rotate(-90 42 42)"
              style={{ transition: `stroke-dashoffset ${pressing ? HOLD_MS : 180}ms linear` }}
            />
          }
        />
      </button>
      <Legend>{struck ? 'sealed' : pressing ? 'hold…' : caption ?? 'press & hold'}</Legend>
    </div>
  )
}

/* ── Ledger record ────────────────────────────────────────────────────────── */

export type RecordState = 'sealed' | 'review' | 'locked'

/**
 * One milestone, as an entry in the ledger. The record number sits in the
 * ruled margin, the amount sits in a right-hand column like a ledger's money
 * column, and the seal (or its empty socket) terminates the row — so scanning
 * down the page answers "what is proven, and what isn't" before reading a word.
 */
export function LedgerRecord({
  index,
  title,
  amount,
  state,
  meta,
  seal,
}: {
  index: number
  title: string
  amount: string
  state: RecordState
  meta?: ReactNode
  seal?: ReactNode
}) {
  return (
    <div
      className={`dsr-record ${state === 'review' ? 'dsr-record--live' : ''} ${state === 'locked' ? 'dsr-record--locked' : ''} flex items-start gap-3 sm:gap-4 py-4 pr-4 pl-3 sm:pl-4`}
    >
      {/* Margin column — the entry number, left of the red rule. */}
      <div className="w-8 sm:w-10 flex-shrink-0 text-right pr-2 sm:pr-3 pt-0.5">
        <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.inkSubtle }} className="dsr-press tabular-nums">
          {String(index).padStart(2, '0')}
        </span>
      </div>

      <div className="flex-1 min-w-0 pl-2 sm:pl-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h3 style={{ fontFamily: FONT.serif, color: C.ink }} className="dsr-press text-[15px] sm:text-base font-semibold leading-snug">
            {title}
          </h3>
          <RubberStamp tone={state === 'sealed' ? 'sealed' : state === 'review' ? 'review' : 'locked'}>
            {state === 'sealed' ? 'sealed' : state === 'review' ? 'in review' : 'not yet due'}
          </RubberStamp>
        </div>
        {meta && <div className="mt-1.5">{meta}</div>}
      </div>

      {/* Money column. */}
      <div className="text-right flex-shrink-0 pt-0.5">
        <div style={{ fontFamily: FONT.mono, color: C.ink }} className="dsr-press text-[13px] tabular-nums">
          {amount}
        </div>
      </div>

      {seal && <div className="flex-shrink-0 pl-1 sm:pl-2">{seal}</div>}
    </div>
  )
}
