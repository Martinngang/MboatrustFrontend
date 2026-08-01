import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompliance } from '../../compliance'
import { C, FONT } from '../MobileLayout'

interface ChecklistItem {
  id: string
  label: string
  path: string
}

const ITEMS_BY_ROLE: Record<string, ChecklistItem> = {
  funder: { id: 'explore', label: 'Browse fundable projects', path: '/workspace/projects' },
  recipient: { id: 'explore', label: 'Check your project status', path: '/recipient/submission-status' },
  contractor: { id: 'explore', label: 'Browse open tenders', path: '/contractor/jobs' },
  seller: { id: 'explore', label: 'List your first property', path: '/land/create' },
}

/** Dismissible first-login progress checklist — Notion/ClickUp-style. KYC
 * status is real account state; the other two steps are self-reported
 * (clicking through marks them done) since this demo has no backing state
 * for "linked payout method," matching how many production checklists work
 * for steps that aren't independently verifiable client-side. */
export function OnboardingChecklistWidget({ role }: { role: string }) {
  const nav = useNavigate()
  const { myKyc } = useCompliance()
  const storageKey = `mboatrust-onboarding-checklist:${role}`
  const [dismissed, setDismissed] = useState(false)
  const [done, setDone] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
      if (stored?.dismissed) setDismissed(true)
      if (Array.isArray(stored?.done)) setDone(new Set(stored.done))
    } catch { /* ignore */ }
  }, [storageKey])

  const roleItem = ITEMS_BY_ROLE[role] ?? ITEMS_BY_ROLE.funder
  const items: ChecklistItem[] = [
    { id: 'kyc', label: 'Verify your identity', path: '/compliance/kyc' },
    { id: 'payout', label: 'Link MoMo or Orange Money', path: '/shared/settings' },
    roleItem,
  ]
  const isDone = (id: string) => (id === 'kyc' ? myKyc.status === 'verified' : done.has(id))
  const doneCount = items.filter((it) => isDone(it.id)).length

  const persist = (nextDone: Set<string>, nextDismissed: boolean) => {
    try { localStorage.setItem(storageKey, JSON.stringify({ done: [...nextDone], dismissed: nextDismissed })) } catch { /* ignore */ }
  }

  const markDone = (item: ChecklistItem) => {
    if (item.id !== 'kyc') {
      const next = new Set(done)
      next.add(item.id)
      setDone(next)
      persist(next, dismissed)
    }
    nav(item.path)
  }

  const dismiss = () => {
    setDismissed(true)
    persist(done, true)
  }

  if (dismissed || doneCount === items.length) return null

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white, boxShadow: C.shadowSm }}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-sm font-bold">Get set up</div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mt-0.5 text-[10px] uppercase tracking-widest">{doneCount} of {items.length} complete</div>
        </div>
        <button onClick={dismiss} aria-label="Dismiss checklist" style={{ color: C.inkSubtle }} className="text-lg leading-none">×</button>
      </div>
      <div className="space-y-1.5">
        {items.map((it) => {
          const complete = isDone(it.id)
          return (
            <button
              key={it.id}
              onClick={() => markDone(it)}
              disabled={complete}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--color-parchment)] disabled:hover:bg-transparent"
            >
              <span
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: complete ? C.emerald : 'transparent', border: complete ? 'none' : `1.5px solid ${C.parchmentDark}` }}
              >
                {complete && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>}
              </span>
              <span
                style={{ fontFamily: FONT.sans, color: complete ? C.inkSubtle : C.ink, textDecoration: complete ? 'line-through' : 'none' }}
                className="text-sm"
              >
                {it.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
