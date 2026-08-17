// Shared style tokens — split out of MobileLayout.tsx so leaf-ish files that
// only need color/font/tone constants (no components, no hooks) don't have
// to import that file at all. MobileLayout.tsx re-exports AppShell (which
// pulls in the whole shell/ directory), so anything inside shell/ that
// imported these tokens FROM MobileLayout.tsx created a real circular
// import: MobileLayout → shell/AppShell → shell/TopBar → ... → back to
// MobileLayout for C/FONT, tripping "Cannot access 'C' before
// initialization" depending on which module happened to load first. This
// file has zero dependencies of its own, so nothing can cycle through it.

// ── Shared style tokens ──────────────────────────────────────────────────────
// These resolve through CSS custom properties (see index.css) so every screen
// using C.xxx in an inline style automatically follows the active theme —
// see theme.tsx for the ThemeProvider that flips [data-theme] on <html>.
export const C = {
  forest: 'var(--color-forest)',
  forestLight: 'var(--color-forest-light)',
  // Small text sitting directly on the page background in both themes —
  // neither forest nor forestLight alone passes WCAG AA contrast in both
  // (see index.css's --color-nav-active for the numbers). Use this instead
  // of forest/forestLight for that specific role.
  navActive: 'var(--color-nav-active)',
  forestDark: 'var(--color-forest-dark)',
  amber: 'var(--color-amber)',
  amberLight: 'var(--color-amber-light)',
  ink: 'var(--color-ink)',
  inkMuted: 'var(--color-ink-muted)',
  inkSubtle: 'var(--color-ink-subtle)',
  parchment: 'var(--color-parchment)',
  parchmentDark: 'var(--color-parchment-dark)',
  cream: 'var(--color-cream)',
  seal: 'var(--color-seal)',
  white: 'var(--color-surface)',
  // Role-accent tokens — used only for dashboard hero differentiation between roles.
  steel: 'var(--color-steel)',
  moss: 'var(--color-moss)',
  // Translucent glass surfaces (sticky nav bars, glassmorphism dashboard shell).
  glassBg: 'var(--surface-glass-bg)',
  glassBorder: 'var(--surface-glass-border)',
  navGlassBg: 'var(--nav-glass-bg)',
  navGlassBorder: 'var(--nav-glass-border)',
  // High-contrast border + accent glow for premium hover/active states — same
  // green identity in both themes, just brighter against the dark surface.
  borderBright: 'var(--border-bright)',
  glowPrimary: 'var(--glow-primary)',
  // Elevation scale — colored, soft shadows tinted to the active theme,
  // replacing hand-written box-shadow strings scattered per screen.
  shadowSm: 'var(--shadow-sm)',
  shadowMd: 'var(--shadow-md)',
  shadowLg: 'var(--shadow-lg)',
  shadowXl: 'var(--shadow-xl)',
  glowForest: 'rgba(var(--glow-primary-rgb), 0.35)',
  glowAmber: 'rgba(var(--glow-amber-rgb), 0.35)',
  // Named gradients, formalizing patterns already used inline throughout.
  gradientPrimary: 'var(--gradient-primary)',
  gradientSurface: 'var(--gradient-surface)',
  gradientAmber: 'var(--gradient-amber)',
  gradientMesh: 'var(--gradient-mesh)',
  // Semantic brand aliases (obsidian/gold/emerald) — same underlying vars as
  // forest/amber/cream above, named for the shell/data-view layer so new code
  // reads on-brand without duplicating the token values.
  emerald: 'var(--color-forest)',
  emeraldLight: 'var(--color-forest-light)',
  emeraldDark: 'var(--color-forest-dark)',
  gold: 'var(--color-amber)',
  goldLight: 'var(--color-amber-light)',
  obsidian: 'var(--color-cream)',
  obsidianSurface: 'var(--color-parchment)',
}

// ── Typography convention ────────────────────────────────────────────────────
// Eyebrow:  text-[10px] uppercase tracking-[0.3em] + FONT.mono
// Display:  text-3xl sm:text-4xl font-bold        + FONT.serif  (hero/page-level only)
// H1/title: text-2xl font-bold                    + FONT.serif
// H2/section: text-lg font-semibold               + FONT.serif
// Body:     text-sm                               + FONT.sans
// Caption:  text-xs uppercase tracking-wide        + FONT.mono
// Converge new screens on this pairing table instead of drifting per-screen.

export const FONT = {
  serif: "'Playfair Display', Georgia, serif",
  sans: "'Inter', system-ui, sans-serif",
  mono: "'DM Mono', 'Courier New', monospace",
}

// ── Status tones ─────────────────────────────────────────────────────────────
// Statuses route through 5 semantic tones (--status-*-bg/-text in index.css)
// so dark mode gets real theme-aware colors instead of the light-only hex
// pairs this used to hardcode per status string.
export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'
export const STATUS_TONE_VARS: Record<StatusTone, { bg: string; text: string }> = {
  success: { bg: 'var(--status-success-bg)', text: 'var(--status-success-text)' },
  warning: { bg: 'var(--status-warning-bg)', text: 'var(--status-warning-text)' },
  error: { bg: 'var(--status-error-bg)', text: 'var(--status-error-text)' },
  info: { bg: 'var(--status-info-bg)', text: 'var(--status-info-text)' },
  neutral: { bg: 'var(--status-neutral-bg)', text: 'var(--status-neutral-text)' },
}
