import { createContext, useContext, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Modal } from './Modal'
import { ChipGroup } from './Chip'
import { useToast } from './Toast'
import { useBreadcrumbTrail } from './shell/Breadcrumbs'
import { C, FONT, PillButton } from './MobileLayout'
import { apiErrorMessage } from '../api/client'
import {
  SUPPORT_CATEGORIES, SUPPORT_CATEGORY_LABELS, SUPPORT_TYPE_LABELS,
  useCreateSupportTicketMutation, type SupportCategory, type SupportTicketType,
} from '../api/support'

const TYPE_OPTIONS: SupportTicketType[] = ['bug_report', 'feedback', 'question', 'contact_support']

/** Coarse product area behind the exact route — `screen` already records the
 * precise path, but that's too high-cardinality to group by, so this gives
 * admins the "which part of the app generates the most bug reports" cut that
 * a raw path list can't. Derived from the first route segment, which is how
 * App.tsx already partitions the app (/funder/*, /contractor/*, /admin/*…). */
function featureFromPath(pathname: string): string {
  const [first, second] = pathname.split('/').filter(Boolean)
  if (!first) return 'home'
  // `/shared/*` and `/tools/*` are grouped umbrellas — the segment after them
  // is the part that actually identifies the feature.
  if ((first === 'shared' || first === 'tools') && second) return `${first}:${second}`
  return first
}

/** Mirrors NotificationsDrawer.tsx's exact provider/hook shape — a single
 * overlay reachable from anywhere (TopBar's global icon, Help Center's
 * quick-action cards, the Settings support rows), never a routed page, so
 * it never loses the page the user was actually on underneath it. */
const FeedbackModalContext = createContext<{ open: (presetType?: SupportTicketType) => void; close: () => void } | null>(null)

export function useFeedbackModal() {
  const ctx = useContext(FeedbackModalContext)
  if (!ctx) throw new Error('useFeedbackModal must be used within FeedbackModalProvider')
  return ctx
}

export function FeedbackModalProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const trail = useBreadcrumbTrail()
  const { show: showToast } = useToast()
  const createMutation = useCreateSupportTicketMutation()

  const [isOpen, setIsOpen] = useState(false)
  const [presetType, setPresetType] = useState<SupportTicketType | undefined>(undefined)
  const [type, setType] = useState<SupportTicketType>('feedback')
  const [category, setCategory] = useState<SupportCategory>('other')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [contextChip, setContextChip] = useState<{ screen: string; screenLabel: string; feature: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setType('feedback')
    setCategory('other')
    setSubject('')
    setDescription('')
    setFiles([])
  }

  const open = (preset?: SupportTicketType) => {
    resetForm()
    setPresetType(preset)
    if (preset) setType(preset)
    // Captured now, at the moment the form opens — not re-derived at submit
    // time, so it always reflects the page the user was actually reporting
    // from even if this overlay stays open while something else re-renders.
    const lastCrumb = trail[trail.length - 1]
    setContextChip({
      screen: location.pathname,
      screenLabel: lastCrumb?.label ?? 'App',
      feature: featureFromPath(location.pathname),
    })
    setIsOpen(true)
  }
  const close = () => setIsOpen(false)

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList) return
    setFiles((prev) => [...prev, ...Array.from(fileList)])
  }

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      showToast({ title: 'Missing details', description: 'Please add a subject and a description.', tone: 'error' })
      return
    }
    try {
      await createMutation.mutateAsync({
        type,
        category,
        subject: subject.trim(),
        description: description.trim(),
        files,
        context: contextChip
          ? { platform: 'web', screen: contextChip.screen, screenLabel: contextChip.screenLabel, feature: contextChip.feature, appVersion: '1.0.0' }
          : undefined,
      })
      showToast({ title: 'Thanks — we got it', description: "We'll follow up in My support requests.", tone: 'success' })
      close()
    } catch (err) {
      showToast({ title: 'Could not submit', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  return (
    <FeedbackModalContext.Provider value={{ open, close }}>
      {children}
      <Modal
        open={isOpen}
        onClose={close}
        title={presetType ? SUPPORT_TYPE_LABELS[presetType] : 'Help & feedback'}
        size="md"
        footer={
          <>
            <PillButton variant="secondary" onClick={close}>Cancel</PillButton>
            <PillButton variant="primary" onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Submitting…' : 'Submit'}
            </PillButton>
          </>
        }
      >
        <div className="space-y-4">
          {!presetType && (
            <div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1.5 text-[10px] uppercase tracking-widest">What's this about?</div>
              <ChipGroup options={TYPE_OPTIONS.map((t) => SUPPORT_TYPE_LABELS[t])} value={SUPPORT_TYPE_LABELS[type]} onChange={(label) => {
                const found = TYPE_OPTIONS.find((t) => SUPPORT_TYPE_LABELS[t] === label)
                if (found) setType(found)
              }} />
            </div>
          )}

          {contextChip && (
            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs" style={{ background: C.parchment, fontFamily: FONT.mono, color: C.inkMuted }}>
              From: {contextChip.screenLabel}
              <button onClick={() => setContextChip(null)} aria-label="Remove context" className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
            </div>
          )}

          <div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1.5 text-[10px] uppercase tracking-widest">Category</div>
            <ChipGroup
              options={SUPPORT_CATEGORIES.map((c) => SUPPORT_CATEGORY_LABELS[c])}
              value={SUPPORT_CATEGORY_LABELS[category]}
              onChange={(label) => {
                const found = SUPPORT_CATEGORIES.find((c) => SUPPORT_CATEGORY_LABELS[c] === label)
                if (found) setCategory(found)
              }}
            />
          </div>

          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1.5 block text-[10px] uppercase tracking-widest">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="A short summary"
              className="w-full rounded-xl border px-3.5 py-2 text-sm"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }}
            />
          </div>

          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1.5 block text-[10px] uppercase tracking-widest">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What happened, or what would you like to tell us?"
              className="w-full resize-none rounded-xl border px-3.5 py-2.5 text-sm"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }}
            />
          </div>

          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1.5 block text-[10px] uppercase tracking-widest">Screenshots (optional)</label>
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs" style={{ background: C.parchment, fontFamily: FONT.sans, color: C.inkMuted }}>
                  {f.name}
                  <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} aria-label="Remove file" className="opacity-60 hover:opacity-100">✕</button>
                </span>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.inkMuted }}
              >
                + Add screenshot
              </button>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />
            </div>
          </div>
        </div>
      </Modal>
    </FeedbackModalContext.Provider>
  )
}
