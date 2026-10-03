/**
 * Single source of truth for "which nav item is the current page?" — shared
 * by the consumer Sidebar, the mobile BottomNav, the AdminSidebar and the
 * admin mobile Drawer, so all four can never disagree.
 *
 * The rules that used to be re-implemented (differently, and wrongly) per
 * surface:
 *  - Match on whole path segments: `/land` must not claim `/landing`.
 *  - Exactly ONE item is active. Every nav item declares the route prefixes
 *    it owns and the LONGEST matching prefix wins, so a parent entry like
 *    `/admin` (Dashboard) never lights up alongside `/admin/users`, and a
 *    role-wide prefix like `/funder` never beats a more specific
 *    `/funder/transactions`. Ties go to the earlier target, so callers list
 *    primary tabs before secondary links.
 *  - There is always an answer for a page that lives inside the shell: when
 *    nothing matches, the caller's fallback (the "Menu" hub) is active, so
 *    the highlight can never simply vanish on a sub-page.
 *
 * Pure and dependency-free on purpose (no React, no router) so it's trivially
 * testable and safe to import from anywhere without creating import cycles.
 */

export interface NavMatch {
  /** Stable id of the nav item (unique within one nav surface). */
  id: string
  /** Route prefixes this item owns — its destination plus its sub-pages. */
  paths: string[]
}

/** Length of `prefix` if `pathname` is at/under it (segment-aware), else -1. */
export function matchLength(pathname: string, prefix: string): number {
  if (prefix === '/') return pathname === '/' ? 1 : -1
  const p = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
  return pathname === p || pathname.startsWith(p + '/') ? p.length : -1
}

/** The id of the single nav item that owns `pathname`, or `fallbackId`. */
export function resolveActiveId(pathname: string, targets: NavMatch[], fallbackId?: string): string | null {
  let best: string | null = null
  let bestLen = -1
  for (const target of targets) {
    for (const prefix of target.paths) {
      const len = matchLength(pathname, prefix)
      if (len > bestLen) {
        best = target.id
        bestLen = len
      }
    }
  }
  return best ?? fallbackId ?? null
}
