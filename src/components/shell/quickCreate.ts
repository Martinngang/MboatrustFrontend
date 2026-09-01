/** Role → primary "create" destination. Shared by TopBar's quick-create
 * button and the global "C" keyboard shortcut so they stay in sync. */
export const QUICK_CREATE_BY_ROLE: Record<string, { label: string; path: string }> = {
  funder: { label: 'Post a tender', path: '/funder/post-job' },
  contractor: { label: 'Add certification', path: '/contractor/certifications/new' },
  seller: { label: 'New listing', path: '/land/create' },
  // A supplier owner has no dedicated /new route — the dashboard itself
  // already branches to registration vs. the real dashboard based on
  // account state, so it's always the right landing spot regardless.
  supplier: { label: 'Manage inventory', path: '/supplier/dashboard' },
}
