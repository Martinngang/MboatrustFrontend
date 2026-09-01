import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { C, BottomNav } from '../MobileLayout'
import { pageVariants, pageTransition } from '../motion'
import { ScreenErrorBoundary } from '../ErrorBoundary'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { OfflineSyncBanner } from '../OfflineSyncBanner'

/** Management-app shell: persistent Sidebar + TopBar (breadcrumbs, global
 * search → command palette, quick-create, avatar menu), wrapping every
 * authenticated screen. Same exported name/signature as the AppShell this
 * replaces, so none of the ~13 screen files that do `<AppShell>...<\/AppShell>`
 * need to change. TopBar renders at every breakpoint (see its own comment) —
 * this file used to also render a second, ad-hoc mobile-only utility row
 * here, inside the scrolling <main>. That row wasn't sticky or fixed, so it
 * scrolled out of view immediately; it's gone now that TopBar itself covers
 * mobile.
 *
 * fullBleed: when true the normal padding/max-width content wrapper is
 * bypassed and children fill the entire <main> area directly — used for
 * immersive screens like Messaging where the screen manages its own
 * internal scroll rather than relying on the outer <main> scroll. */
export function AppShell({
  children,
  noNav,
  fullBleed,
}: {
  children: ReactNode
  noNav?: boolean
  fullBleed?: boolean
}) {
  const loc = useLocation()
  const reduceMotion = useReducedMotion()

  return (
    // fixed + inset-0 (not h-dvh): pins all four edges directly to the
    // browser's actual visual viewport, recomputed by the browser itself on
    // every paint — not to a `100dvh` height value React only assigns once
    // React commits, which can get committed against a stale/mid-transition
    // viewport on first paint (e.g. right as the mobile browser's address
    // bar is collapsing). overflow-hidden still caps it so overflow-y-auto
    // on <main> below remains the only thing that scrolls. BottomNav itself
    // is no longer part of this shell's flow at all — see the render below.
    <div className="fixed inset-0 w-full overflow-hidden" style={{ background: C.gradientSurface, color: C.ink }}>
      <OfflineSyncBanner />
      <div className="mx-auto flex h-full max-w-[1600px] flex-col lg:flex-row">
        <Sidebar />

        {/* Grid, not flex, for this column: a flex child's height comes from
            flex-basis/flex-grow resolving against the row, and on some
            mobile engines a `flex-1 overflow-y-auto` pane sized that way
            computes a definite height for mouse/programmatic scrolling but
            doesn't get recognized as a touch-scrollable region — wheel
            scroll and clicks look fine, but swipes do nothing. Grid's
            `minmax(0,1fr)` track sizing gives <main> the same definite,
            bounded height through a different (and, for touch, more
            reliable) codepath. Just TopBar (auto) + <main> (1fr) now —
            BottomNav is `position:fixed` (see MobileLayout.tsx), so it's no
            longer part of this flow and doesn't need its own row. */}
        <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)]">
          <TopBar />

          {/* min-h-0: grid items get the same automatic min-height:auto
              floor flex items do, which would otherwise let this track grow
              to fit content instead of clamping to the row's minmax(0,1fr).
              touchAction: 'pan-y' is set explicitly (not left to the
              default) so no ancestor or sibling gesture handler — Framer
              Motion's drag/tap gestures, dnd-kit's sensors, or a future
              addition — can ever suppress vertical touch panning here. */}
          <main
            className={`min-h-0 overscroll-contain ${fullBleed ? 'overflow-hidden' : 'overflow-y-auto'}`}
            style={{ touchAction: 'pan-y' }}
          >
            {fullBleed ? (
              // Full-bleed screens manage their own scroll internally.
              // We still wrap in ScreenErrorBoundary but skip the
              // padding/max-width motion wrapper so children can fill
              // the entire <main> area flush to its edges.
              <ScreenErrorBoundary key={loc.pathname}>
                <div className="h-full w-full overflow-hidden">
                  {children}
                </div>
              </ScreenErrorBoundary>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={loc.pathname}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={reduceMotion ? { duration: 0 } : pageTransition}
                  // pb-28 (not pb-4): clears the fixed BottomNav so it never
                  // overlaps the last bit of a page's content on mobile —
                  // BottomNav is ~60-95px tall depending on the device's
                  // safe-area inset, so 112px leaves comfortable headroom.
                  // Reverts to the original pb-8 at lg, where BottomNav is
                  // hidden and the sidebar/topbar shell is used instead.
                  className="mx-auto w-full max-w-6xl px-4 pt-4 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-8"
                >
                  <ScreenErrorBoundary key={loc.pathname}>{children}</ScreenErrorBoundary>
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>

      {/* Rendered here (sibling of the scrolling shell, never inside the
          Framer Motion page-transition wrapper above) so nothing between
          it and <body> ever has a `transform` — the one thing that would
          silently break its `position:fixed`. See MobileLayout.tsx. */}
      {!noNav && <BottomNav />}
    </div>
  )
}
