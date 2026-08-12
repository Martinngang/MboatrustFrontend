import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { C, FONT, STATUS_TONE_VARS, type StatusTone } from './MobileLayout'
import { GoogleGlyph } from './icons'

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      className="animate-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" opacity="0.25" />
      <path d="M22 12A10 10 0 0 0 12 2" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ── Inline alert (form-level error/info banner) ───────────────────────────────
export function InlineAlert({ tone = 'error', children }: { tone?: StatusTone; children: ReactNode }) {
  const { bg, text } = STATUS_TONE_VARS[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className="mb-5 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm leading-snug animate-pop-in"
      style={{ background: bg, color: text, fontFamily: FONT.sans }}
    >
      <span className="mt-0.5 flex-shrink-0">
        {tone === 'error' ? (
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.3" /><path d="M7.5 4.5V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="7.5" cy="10.4" r="0.9" fill="currentColor" /></svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.3" /><path d="M7.5 6.5V10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="7.5" cy="4.6" r="0.9" fill="currentColor" /></svg>
        )}
      </span>
      <span className="min-w-0">{children}</span>
    </div>
  )
}

// ── Field label + error ────────────────────────────────────────────────────────
export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1.5 block text-[10px] uppercase tracking-widest">
      {children}
    </label>
  )
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null
  return (
    <p style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }} className="mt-1.5 text-xs animate-pop-in">
      {children}
    </p>
  )
}

const inputBase = 'w-full rounded-xl border-2 px-4 py-3.5 text-sm outline-none transition-all focus:border-[var(--color-forest)] focus:shadow-[0_0_0_4px_rgba(26,71,49,0.1)]'

// ── Generic text field (email, name, etc.) ────────────────────────────────────
export function TextField({
  label, error, containerClassName = '', ...rest
}: { label: string; error?: string; containerClassName?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={containerClassName}>
      <FieldLabel>{label}</FieldLabel>
      <input
        {...rest}
        className={inputBase}
        style={{ borderColor: error ? 'var(--status-error-text)' : C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
        aria-invalid={Boolean(error)}
      />
      <FieldError>{error}</FieldError>
    </div>
  )
}

// ── Password field with show/hide toggle ──────────────────────────────────────
export function PasswordField({
  label, error, value, onChange, placeholder, autoComplete, containerClassName = '',
}: {
  label: string
  error?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  containerClassName?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className={containerClassName}>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`${inputBase} pr-11`}
          style={{ borderColor: error ? 'var(--status-error-text)' : C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
          style={{ color: C.inkSubtle }}
        >
          {visible ? (
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="M2 8.5S4.8 3.5 8.5 3.5 15 8.5 15 8.5 12.2 13.5 8.5 13.5 2 8.5 2 8.5Z" stroke="currentColor" strokeWidth="1.3" /><circle cx="8.5" cy="8.5" r="2.2" stroke="currentColor" strokeWidth="1.3" /></svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="M2 8.5S4.8 3.5 8.5 3.5 15 8.5 15 8.5 12.2 13.5 8.5 13.5 2 8.5 2 8.5Z" stroke="currentColor" strokeWidth="1.3" /><circle cx="8.5" cy="8.5" r="2.2" stroke="currentColor" strokeWidth="1.3" /><path d="M2.5 2.5L14.5 14.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          )}
        </button>
      </div>
      <FieldError>{error}</FieldError>
    </div>
  )
}

// ── Google button ─────────────────────────────────────────────────────────────
export function GoogleAuthButton({ onClick, loading, label = 'Continue with Google' }: {
  onClick: () => void
  loading: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2.5 rounded-xl border-2 py-3.5 text-sm font-semibold transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
      style={{ borderColor: C.parchmentDark, background: C.white, color: C.ink, fontFamily: FONT.sans, boxShadow: C.shadowSm }}
    >
      {loading ? (
        <Spinner size={17} color={C.inkSubtle} />
      ) : (
        <GoogleGlyph size={18} />
      )}
      {loading ? 'Signing in…' : label}
    </button>
  )
}

// ── "or" divider ───────────────────────────────────────────────────────────────
export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1" style={{ background: C.parchmentDark }} />
      <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">{label}</span>
      <div className="h-px flex-1" style={{ background: C.parchmentDark }} />
    </div>
  )
}

// ── Segmented method switcher (Phone / Email) ─────────────────────────────────
export function AuthMethodTabs<T extends string>({ options, value, onChange }: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="mb-6 flex rounded-xl border p-1" style={{ borderColor: C.parchmentDark, background: C.parchment }}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className="flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all"
          style={{
            fontFamily: FONT.sans,
            background: value === opt.id ? C.forest : 'transparent',
            color: value === opt.id ? C.white : C.inkMuted,
            boxShadow: value === opt.id ? '0 6px 16px -6px rgba(26,71,49,0.4)' : 'none',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
