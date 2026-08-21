import type { IconName } from '../icons'

export interface AdminNavItem {
  key: string
  label: string
  icon: IconName
  path: string
}

export interface AdminNavSection {
  section: string
  items: AdminNavItem[]
}

/** Single source of truth for the admin sidebar's structure — same "one
 * config drives the whole IA" pattern the Technique Academy admin panel
 * uses for its own nav, adapted to MboaTrust's own sections/entities. Add
 * a route here and it shows up in the sidebar automatically; nothing else
 * needs to change. */
export const ADMIN_NAV: AdminNavSection[] = [
  {
    section: 'Overview',
    items: [
      { key: 'overview', label: 'Dashboard', icon: 'barChart', path: '/admin' },
    ],
  },
  {
    section: 'Users',
    items: [
      { key: 'users', label: 'All Users', icon: 'users', path: '/admin/users' },
    ],
  },
  {
    section: 'Projects & Escrow',
    items: [
      { key: 'projects', label: 'Projects', icon: 'folder', path: '/admin/projects' },
    ],
  },
  {
    section: 'Land',
    items: [
      { key: 'land', label: 'Listings', icon: 'home', path: '/admin/land' },
    ],
  },
  {
    section: 'Contractors',
    items: [
      { key: 'contractors', label: 'Directory', icon: 'hardHat', path: '/admin/contractors' },
    ],
  },
  {
    section: 'Community & Funding',
    items: [
      { key: 'community', label: 'Community', icon: 'users', path: '/admin/community' },
    ],
  },
  {
    section: 'Disputes, Risk & Verifications',
    items: [
      { key: 'disputes', label: 'Disputes', icon: 'scale', path: '/admin/disputes' },
      { key: 'fraud', label: 'Fraud & Risk', icon: 'alert', path: '/admin/fraud-analytics' },
      { key: 'verifications', label: 'Verifications', icon: 'shieldCheck', path: '/admin/verifications' },
    ],
  },
  {
    section: 'Notifications',
    items: [
      { key: 'notifications', label: 'Broadcast', icon: 'megaphone', path: '/admin/notifications' },
    ],
  },
  {
    section: 'Platform',
    items: [
      { key: 'settings', label: 'Settings', icon: 'settings', path: '/admin/settings' },
      { key: 'admins', label: 'Admin accounts', icon: 'lock', path: '/admin/accounts' },
    ],
  },
]
