import { Component, type ReactNode } from 'react'
import { C, FONT } from './tokens'

/** Catches a render crash in the routed screen content only — Sidebar/
 * TopBar/BottomNav live outside this boundary (as AppShell siblings of
 * `{children}`), so a bug in one screen can no longer take down the whole
 * shell and leave the app chrome (including bottom nav on mobile)
 * inaccessible. Keyed by pathname in AppShell, so navigating away from the
 * broken screen remounts a fresh boundary automatically. */
export class ScreenErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ScreenErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 px-6 text-center">
          <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-bold">Something went wrong loading this page</div>
          <div style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="max-w-sm text-sm">
            Try again, or head back home — the rest of the app is unaffected.
          </div>
          <button
            onClick={() => (window.location.hash = '#/home')}
            className="mt-2 rounded-full px-5 py-2.5 text-sm font-semibold"
            style={{ background: C.forest, color: C.white, fontFamily: FONT.sans }}
          >
            Go to Home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
