import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context'
import { QUICK_CREATE_BY_ROLE } from './quickCreate'
import { ShortcutsHelpModal } from './ShortcutsHelpModal'

const GO_TARGETS: Record<string, string> = { h: '/home', m: '/messages', a: '/activity' }
const GO_PROJECTS_BY_ROLE: Record<string, string> = {
  funder: '/workspace/projects', recipient: '/recipient/projects', contractor: '/workspace/jobs', seller: '/workspace/land',
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

const ShortcutsHelpContext = createContext<{ show: () => void } | null>(null)
export function useShortcutsHelp() {
  const ctx = useContext(ShortcutsHelpContext)
  if (!ctx) throw new Error('useShortcutsHelp must be used within a KeyboardShortcutsProvider')
  return ctx
}

/** Global power-user shortcuts, ClickUp/Linear-style: "C" for a role-aware
 * quick-create, "G" then a second key to jump to a section, "?" for this
 * help panel. Disabled while focus is in a text field so normal typing
 * never misfires a navigation. Mounted once in App.tsx. */
export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const nav = useNavigate()
  const { role, isLoggedIn, authChecked } = useApp()
  const [helpOpen, setHelpOpen] = useState(false)
  const leaderActive = useRef(false)
  const leaderTimeout = useRef<number | undefined>(undefined)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Mounted above App.tsx's AuthGate loading splash — belt-and-braces
      // alongside the isLoggedIn check so no shortcut can ever fire before
      // the app has finished its initial auth check.
      if (!authChecked || !isLoggedIn) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingTarget(e.target)) return
      const key = e.key.toLowerCase()

      if (leaderActive.current) {
        leaderActive.current = false
        window.clearTimeout(leaderTimeout.current)
        if (key === 'p') { e.preventDefault(); nav(GO_PROJECTS_BY_ROLE[role ?? 'funder']) }
        else if (GO_TARGETS[key]) { e.preventDefault(); nav(GO_TARGETS[key]) }
        return
      }

      if (key === 'g') {
        leaderActive.current = true
        leaderTimeout.current = window.setTimeout(() => { leaderActive.current = false }, 900)
        return
      }
      if (key === 'c') {
        const target = QUICK_CREATE_BY_ROLE[role ?? 'funder']
        if (target) { e.preventDefault(); nav(target.path) }
        return
      }
      if (e.key === '?') { e.preventDefault(); setHelpOpen(true) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [nav, role, isLoggedIn, authChecked])

  return (
    <ShortcutsHelpContext.Provider value={{ show: () => setHelpOpen(true) }}>
      {children}
      <ShortcutsHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </ShortcutsHelpContext.Provider>
  )
}
