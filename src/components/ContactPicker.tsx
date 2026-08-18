import { useState } from 'react'
import { C, FONT, STATUS_TONE_VARS } from './MobileLayout'

export interface ContactSuggestion {
  name: string
  phone: string
  role: string
}

export interface PickedContact {
  name: string
  phone: string
}

/**
 * Suggested-contacts-or-manual-entry picker — used anywhere the app invites a
 * real-world person into a flow (community co-signer, co-funder, etc.). Reports
 * the current selection via onChange; the caller owns the submit button so it
 * can sit in whatever footer layout that screen already uses.
 */
export function ContactPicker({ suggestions, onChange }: {
  suggestions: ContactSuggestion[]
  onChange: (contact: PickedContact | null) => void
}) {
  const [mode, setMode] = useState<'suggested' | 'manual'>('suggested')
  const [selected, setSelected] = useState<string | null>(null)
  const [manual, setManual] = useState({ name: '', phone: '' })

  const switchMode = (m: 'suggested' | 'manual') => {
    setMode(m)
    setSelected(null)
    setManual({ name: '', phone: '' })
    onChange(null)
  }

  const selectSuggested = (s: ContactSuggestion) => {
    setSelected(s.name)
    onChange({ name: s.name, phone: s.phone })
  }

  const updateManual = (field: 'name' | 'phone', value: string) => {
    const next = { ...manual, [field]: value }
    setManual(next)
    onChange(next.name.trim() && next.phone.trim() ? next : null)
  }

  return (
    <div className="space-y-4">
      <div className="flex overflow-hidden rounded-xl border" style={{ borderColor: C.parchmentDark }}>
        {(['suggested', 'manual'] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className="flex-1 py-2.5 text-sm font-semibold transition-all"
            style={{ fontFamily: FONT.sans, background: mode === m ? C.forest : C.white, color: mode === m ? C.white : C.inkMuted }}
          >
            {m === 'suggested' ? 'Suggested contacts' : 'Manual entry'}
          </button>
        ))}
      </div>

      {mode === 'suggested' ? (
        <div className="space-y-2">
          {suggestions.map((s) => (
            <button
              key={s.name}
              onClick={() => selectSuggested(s)}
              className="w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all"
              style={{ borderColor: selected === s.name ? C.forest : C.parchmentDark, background: selected === s.name ? STATUS_TONE_VARS.success.bg : C.white }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: C.forest, fontFamily: FONT.serif }}>
                {s.name[0]}
              </div>
              <div className="flex-1">
                <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">{s.name}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{s.role}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Full name</label>
            <input
              value={manual.name}
              onChange={(e) => updateManual('name', e.target.value)}
              placeholder="e.g. Mama Grace N."
              className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
              style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
            />
          </div>
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Phone number</label>
            <input
              value={manual.phone}
              onChange={(e) => updateManual('phone', e.target.value)}
              placeholder="+237 6XX XXX XXX"
              className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
              style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
