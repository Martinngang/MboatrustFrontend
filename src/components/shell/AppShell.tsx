import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { C, BottomNav, NotificationBell } from '../MobileLayout'
import { ConnectivityBar } from '../ConnectivityBar'
import { InstallButton } from '../InstallButton'
import { pageVariants, pageTransition } from '../motion'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

/** Management-app shell: persistent Sidebar + TopBar (breadcrumbs, global
 * search → command palette, quick-create, avatar menu), wrapping every
 * authenticated screen. Same exported name/signature as the AppShell this
 * replaces, so none of the ~13 screen files that do `<AppShell>...</AppShell>`
 * need to change. */
export function AppShell({ children, noNav }: { children: ReactNode; noNav?: boolean }) {
  const loc = useLocation()
  const reduceMotion = useReducedMotion()

  return (
    <div className="min-h-screen w-full" style={{ background: C.gradientSurface, color: C.ink }}>
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <Sidebar />

        <div className="flex flex-1 flex-col">
          <TopBar />

          <main className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between gap-2 px-4 pt-3 lg:hidden">
              <InstallButton />
              <div className="flex items-center gap-2">
                <ConnectivityBar />
                <NotificationBell />
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={loc.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={reduceMotion ? { duration: 0 } : pageTransition}
                className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8 lg:py-8"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
          {!noNav && <div className="lg:hidden"><BottomNav /></div>}
        </div>
      </div>
    </div>
  )
}
