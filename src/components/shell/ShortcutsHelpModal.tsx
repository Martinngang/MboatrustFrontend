import { C, FONT } from '../MobileLayout'
import { Modal } from '../Modal'

const GROUPS: { title: string; rows: { keys: string[]; label: string }[] }[] = [
  { title: 'Navigate', rows: [
    { keys: ['G', 'H'], label: 'Go to Home' },
    { keys: ['G', 'P'], label: 'Go to Projects' },
    { keys: ['G', 'M'], label: 'Go to Messages' },
    { keys: ['G', 'A'], label: 'Go to Activity log' },
  ] },
  { title: 'Actions', rows: [
    { keys: ['C'], label: 'Create (role-aware quick action)' },
    { keys: ['⌘', 'K'], label: 'Open command palette' },
    { keys: ['?'], label: 'Show this shortcuts panel' },
    { keys: ['Esc'], label: 'Close any open panel or dialog' },
  ] },
]

export function ShortcutsHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" size="sm">
      <div className="space-y-5">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 text-[10px] uppercase tracking-widest">{g.title}</div>
            <div className="space-y-2">
              {g.rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm">{r.label}</span>
                  <span className="flex gap-1">
                    {r.keys.map((k, i) => (
                      <kbd
                        key={i}
                        style={{ fontFamily: FONT.mono, color: C.inkMuted, borderColor: C.parchmentDark, background: C.parchment }}
                        className="rounded border px-1.5 py-0.5 text-[10px]"
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs leading-relaxed">
          Shortcuts are disabled while typing in a text field. "G" combos wait up to a second for the second key.
        </p>
      </div>
    </Modal>
  )
}
