import { useEffect, useRef, useState } from 'react'
import { C, FONT } from './MobileLayout'
import { AppIcon } from './icons'
import type { LocationOption } from '../utils/locationData'

/** Generic searchable single-select combobox — type to filter a real
 * dataset (country/region/city lists, currently the only caller), click or
 * Enter to pick. Disabled state shows its own hint (e.g. "Select a country
 * first") rather than the normal placeholder, since every current use is a
 * dependent second field in a Country→City / Region→Town pair. */
export function SearchableSelect({
  label, placeholder = 'Search…', disabledHint, value, onChange, options, disabled, error,
  emptyMessage = 'No matches found',
}: {
  label: string
  placeholder?: string
  disabledHint?: string
  value: string
  onChange: (value: string) => void
  options: LocationOption[]
  disabled?: boolean
  error?: string
  emptyMessage?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value) ?? null

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('pointerdown', onDocPointerDown)
    return () => document.removeEventListener('pointerdown', onDocPointerDown)
  }, [])

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  const pick = (option: LocationOption) => {
    onChange(option.value)
    setOpen(false)
    setQuery('')
  }

  const clear = () => {
    onChange('')
    setQuery('')
  }

  return (
    <div ref={rootRef} className="relative">
      <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1.5 block text-[10px] uppercase tracking-widest">{label}</label>
      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          value={open ? query : (selected?.label ?? '')}
          placeholder={disabled ? (disabledHint ?? placeholder) : placeholder}
          onFocus={() => { if (!disabled) { setOpen(true); setQuery('') } }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); setQuery('') }
            if (e.key === 'Enter' && filtered.length > 0) { e.preventDefault(); pick(filtered[0]) }
          }}
          className="w-full rounded-xl border-2 px-4 py-3 pr-9 text-sm outline-none transition-all focus:border-[var(--color-forest)] focus:shadow-[0_0_0_4px_rgba(26,71,49,0.1)] disabled:cursor-not-allowed"
          style={{ borderColor: error ? 'var(--status-error-text)' : C.parchmentDark, background: disabled ? C.parchment : C.white, fontFamily: FONT.sans, color: disabled ? C.inkSubtle : C.ink }}
        />
        {selected && !disabled ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            aria-label={`Clear ${label}`}
          >
            <AppIcon name="close" size={14} style={{ color: C.inkSubtle }} />
          </button>
        ) : (
          !disabled && (
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: C.inkSubtle }}>
              {open ? '▾' : '▸'}
            </span>
          )
        )}
      </div>
      {error && <p style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }} className="mt-1 text-xs">{error}</p>}

      {open && !disabled && (
        <div
          className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border-2 shadow-lg"
          style={{ borderColor: C.parchmentDark, background: C.white }}
        >
          {filtered.length === 0 ? (
            <div style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="px-4 py-3 text-sm">{emptyMessage}</div>
          ) : (
            filtered.slice(0, 200).map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o)}
                className="flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-[var(--color-parchment)]"
                style={{ fontFamily: FONT.sans, color: C.ink, background: o.value === value ? C.parchment : 'transparent' }}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
