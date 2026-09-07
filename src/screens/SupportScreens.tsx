import { useState } from 'react'
import { C, FONT, AppShell, Card, Header, PillButton, StatusBadge } from '../components/MobileLayout'
import { Drawer } from '../components/shell/Drawer'
import { ChipGroup } from '../components/Chip'
import { useToast } from '../components/Toast'
import { apiErrorMessage } from '../api/client'
import { useFeedbackModal } from '../components/FeedbackModal'
import {
  SUPPORT_CATEGORIES, SUPPORT_CATEGORY_LABELS, SUPPORT_TYPE_LABELS,
  useHelpArticlesQuery, useSupportTicketsQuery, useAddSupportTicketResponseMutation,
  type SupportTicket,
} from '../api/support'

const CATEGORY_FILTER_OPTIONS = ['All', ...SUPPORT_CATEGORIES.map((c) => SUPPORT_CATEGORY_LABELS[c])]

/** Search + browse FAQs, plus the three quick-actions into the shared
 * feedback modal (FeedbackModal.tsx) — reachable from Settings' Support
 * section and from the same modal's own entry points everywhere else. */
export function HelpCenterScreen() {
  const { open: openFeedback } = useFeedbackModal()
  const [search, setSearch] = useState('')
  const [categoryLabel, setCategoryLabel] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const category = categoryLabel === 'All' ? undefined : SUPPORT_CATEGORIES.find((c) => SUPPORT_CATEGORY_LABELS[c] === categoryLabel)
  const { data: articles = [], isLoading } = useHelpArticlesQuery({ category, q: search.trim() || undefined })

  return (
    <AppShell>
      <Header title="Help Center" subtitle="Search FAQs, or reach a real person" back />

      <div className="px-5 py-5 space-y-6 sm:mx-auto sm:max-w-2xl">
        {/* Quick actions */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(['bug_report', 'feedback', 'contact_support'] as const).map((t) => (
            <button
              key={t}
              onClick={() => openFeedback(t)}
              className="rounded-2xl border p-4 text-left transition-colors hover:bg-[var(--color-parchment)]"
              style={{ borderColor: C.parchmentDark, background: C.white }}
            >
              <div style={{ fontFamily: FONT.serif, color: C.ink }} className="font-bold text-sm">{SUPPORT_TYPE_LABELS[t]}</div>
              <div style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="mt-1 text-xs">
                {t === 'bug_report' ? 'Something broke or behaved oddly' : t === 'feedback' ? 'Ideas or suggestions for us' : 'Talk to our support team'}
              </div>
            </button>
          ))}
        </div>

        {/* Search + category filter */}
        <div className="space-y-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search help topics…"
            className="w-full rounded-xl border px-3.5 py-2.5 text-sm"
            style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }}
          />
          <ChipGroup options={CATEGORY_FILTER_OPTIONS} value={categoryLabel} onChange={(v) => setCategoryLabel(v as string)} />
        </div>

        {/* FAQ accordion */}
        {isLoading ? (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p>
        ) : articles.length === 0 ? (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">No help topics match your search.</p>
        ) : (
          <div className="space-y-2">
            {articles.map((a) => {
              const isOpen = expandedId === a.id
              return (
                <Card key={a.id} className="overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isOpen ? null : a.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                  >
                    <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{a.question}</span>
                    <span style={{ color: C.inkSubtle }} className="flex-shrink-0 text-xs">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="border-t px-4 py-3.5" style={{ borderColor: C.parchmentDark }}>
                      <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm leading-relaxed">{a.answer}</p>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function ThreadView({ ticket }: { ticket: SupportTicket }) {
  const { show: showToast } = useToast()
  const [reply, setReply] = useState('')
  const respondMutation = useAddSupportTicketResponseMutation()

  const submitReply = async () => {
    if (!reply.trim()) return
    try {
      await respondMutation.mutateAsync({ ticketId: ticket.id, message: reply.trim() })
      setReply('')
    } catch (err) {
      showToast({ title: 'Could not send reply', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-2">
        <StatusBadge status={ticket.status} />
        <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">{SUPPORT_TYPE_LABELS[ticket.type]}</span>
      </div>
      <div>
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1 text-[10px] uppercase tracking-widest">Description</div>
        <p style={{ fontFamily: FONT.sans, color: C.ink }}>{ticket.description}</p>
      </div>
      {ticket.attachments.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {ticket.attachments.map((att, i) => (
            <a key={i} href={att.url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg border" style={{ borderColor: C.parchmentDark }}>
              {att.type === 'image' ? <img src={att.url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs" style={{ color: C.inkSubtle }}>File</div>}
            </a>
          ))}
        </div>
      )}
      <div className="space-y-3">
        {ticket.responses.map((r) => (
          <div key={r.id} className="rounded-xl border p-3" style={{ borderColor: C.parchmentDark, background: r.isAdmin ? 'var(--status-info-bg)' : C.parchment }}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1 text-[9px] uppercase tracking-widest">{r.isAdmin ? 'Mboa Trust Support' : r.authorName}</div>
            <p style={{ fontFamily: FONT.sans, color: C.ink }}>{r.message}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write a follow-up…"
          className="flex-1 rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }}
        />
        <PillButton variant="primary" onClick={submitReply} disabled={respondMutation.isPending || !reply.trim()}>Send</PillButton>
      </div>
    </div>
  )
}

/** A user's own tickets — the backend already scopes non-admins to their
 * own submissions, so this is a plain list, no client-side filtering by
 * user needed. */
export function MySupportRequestsScreen() {
  const { data: tickets = [], isLoading } = useSupportTicketsQuery()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = tickets.find((t) => t.id === selectedId)

  return (
    <AppShell>
      <Header title="My support requests" subtitle="Track what you've reported" back />

      <div className="px-5 py-5 sm:mx-auto sm:max-w-2xl">
        {isLoading ? (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p>
        ) : tickets.length === 0 ? (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Nothing here yet — anything you report or ask will show up in this list.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors hover:bg-[var(--color-parchment)]"
                style={{ borderColor: C.parchmentDark, background: C.white }}
              >
                <div className="min-w-0">
                  <div style={{ fontFamily: FONT.sans, color: C.ink }} className="truncate text-sm font-medium">{t.subject}</div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mt-0.5 text-[10px] uppercase tracking-wider">{SUPPORT_TYPE_LABELS[t.type]} · {new Date(t.createdAt).toLocaleDateString()}</div>
                </div>
                <StatusBadge status={t.status} />
              </button>
            ))}
          </div>
        )}
      </div>

      <Drawer open={!!selected} onClose={() => setSelectedId(null)} title={selected?.subject} subtitle="Support request">
        {selected && <ThreadView ticket={selected} />}
      </Drawer>
    </AppShell>
  )
}
