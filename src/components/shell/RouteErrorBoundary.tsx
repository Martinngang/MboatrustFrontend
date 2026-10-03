import { Component, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../../context'
import { CrashNotice, reportCrash } from '../ErrorBoundary'
import { AppShell } from './AppShell'
import { AdminShell } from './AdminShell'

/** Plain last-resort boundary: if even the shell-wrapped fallback below throws
 * (e.g. the crash was in the shell itself), show the bare notice instead of a
 * blank page. */
class PlainFallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <CrashNotice /> : this.props.children }
}

interface Props { children: ReactNode; shell: 'app' | 'admin' | 'none' }

class Boundary extends Component<Props, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) { return { error } }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[RouteErrorBoundary]', error, info.componentStack)
    reportCrash('RouteErrorBoundary', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.shell === 'none') return <CrashNotice />
    const Shell = this.props.shell === 'admin' ? AdminShell : AppShell
    return (
      <PlainFallback>
        <Shell><CrashNotice /></Shell>
      </PlainFallback>
    )
  }
}

/**
 * Catches a crash anywhere in a routed screen — including in the screen's OWN
 * body, which ScreenErrorBoundary (inside AppShell) cannot see, because every
 * screen renders its own <AppShell> and a throw before that render means the
 * shell was never mounted. Without this, one bad screen (e.g. a detail page
 * opened with an id that no longer exists) blanked the whole app: sidebar,
 * top bar and bottom nav included, with nothing to click.
 *
 * On a crash the same shell the user was in is rendered around the notice, so
 * the sidebar (and its highlighted item, derived from the URL) stays visible
 * and usable. Keyed by pathname so navigating anywhere else resets it.
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { isLoggedIn, isAdmin } = useApp()
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  const shell: Props['shell'] = !isLoggedIn ? 'none' : isAdminRoute && isAdmin ? 'admin' : isAdminRoute ? 'none' : 'app'
  return <Boundary key={pathname} shell={shell}>{children}</Boundary>
}
