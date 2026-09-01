import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, fmt, type JobPosting } from '../context'
import { C, FONT, AppShell, Card, Header, StatusBadge, PillButton } from '../components/MobileLayout'
import { DataTable, type DataTableColumn } from '../components/dataview/DataTable'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { EmptyState } from '../components/EmptyState'
import { AppIcon } from '../components/icons'
import { useToast } from '../components/Toast'
import { apiErrorMessage } from '../api/client'
import { useUpdateBidStatusMutation, useBidQuery } from '../api/tenders'
import { useStartConversationMutation } from '../api/messaging'
import { useBidsWithScoresQuery, useRecommendedContractorsQuery, type BidWithScore, type MatchScore } from '../api/matching'
import { useContractorLeaderboardQuery } from '../api/contractors'
import { useMaterials } from '../materials'
import { useAssignSupplierMutation } from '../api/projects'
import {
  MilestoneScheduleEditor, makeDefaultSchedule, scheduleTotal, scheduleRowsValid, type DraftScheduleMilestone,
} from '../components/MilestoneScheduleEditor'

/** Small color-coded "63/100" pill — the same 0-100 composite score powers
 * both the bids table and the recommended-contractors list below, so both
 * read this one component instead of two ad hoc renderings. */
function MatchScoreBadge({ score }: { score: MatchScore }) {
  const tone = score.total >= 70 ? 'success' : score.total >= 40 ? 'warning' : 'neutral'
  const breakdown = score.breakdown
  const title = `Category ${breakdown.category}/30 · Location ${breakdown.location}/15 · Reliability ${breakdown.reliability}/20 · Rating ${breakdown.rating}/10 · Experience ${breakdown.experience}/10 · Certifications ${breakdown.certifications}/10 · Availability ${breakdown.availability}/5`
  return (
    <span
      title={title}
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
      style={{ fontFamily: FONT.mono, background: `var(--status-${tone}-bg)`, color: `var(--status-${tone}-text)` }}
    >
      {score.total}/100 match
    </span>
  )
}

/** Direct-hire search — lets a funder find a specific contractor they
 * already know (by name, skill/category, or region) instead of relying only
 * on the algorithmic Recommended list below. Matches the same contractor
 * pool the Recommended list already surfaces (verified or not) rather than
 * hard-filtering to KYC-verified only — with zero contractors verified on a
 * fresh/demo platform, a verified-only filter made this return empty no
 * matter what was typed, while Recommended kept showing the same
 * contractors right next to it. Each result still carries its own verified
 * badge (see kycStatus below) so the funder can see who's vetted without the
 * search hiding everyone else. Reuses the same public /contractor-profiles/
 * leaderboard endpoint the Leaderboard screen already hits, so no new
 * backend surface for this beyond broadening its `search` matching (see
 * contractorLeaderboardService.js). */
function ContractorSearchPanel({ onMessage, onView, actingOn }: {
  onMessage: (contractorId: string) => void
  onView: (userId: string) => void
  actingOn: string | null
}) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(t)
  }, [query])

  const searchActive = debouncedQuery.length >= 2
  const { data, isLoading, isFetching } = useContractorLeaderboardQuery({
    search: debouncedQuery || undefined, limit: 8, enabled: searchActive,
  })
  const results = data?.rows ?? []

  return (
    <div>
      <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-[0.3em]">
        Search contractors
      </p>
      <div className="relative mb-3">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.inkSubtle }}>
          <AppIcon name="search" size={16} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, skill, or location…"
          className="w-full rounded-xl border-2 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[var(--color-forest)]"
          style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
        />
      </div>

      {!searchActive ? (
        <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="px-1 text-xs">
          Type at least 2 characters to search every contractor on the platform — by name, trade, or region.
        </p>
      ) : isLoading || isFetching ? (
        <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="px-1 text-xs">Searching…</p>
      ) : results.length === 0 ? (
        <EmptyState
          icon="search"
          title="No matching contractors"
          description="Try a different name, skill, or region."
        />
      ) : (
        <StaggerList className="space-y-3">
          {results.map((r) => (
            <StaggerItem key={r.userId}>
              <Card>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: C.forest, fontFamily: FONT.serif }}>
                      {r.fullName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold truncate">{r.fullName}</span>
                        {r.kycStatus === 'verified' && (
                          <span title="ID verified"><AppIcon name="shieldCheck" size={13} style={{ color: C.forest }} /></span>
                        )}
                      </div>
                      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-1 truncate">
                        {[r.categories.slice(0, 2).join(', '), r.regions[0]].filter(Boolean).join(' · ') || 'No trade/region listed'}
                      </div>
                      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">
                        {r.yearsExperience > 0 ? `${r.yearsExperience} yrs experience · ` : ''}
                        {r.stats.completedProjects} completed · {r.stats.ratingCount > 0 ? `${r.stats.avgRating?.toFixed(1)}★ (${r.stats.ratingCount})` : 'No ratings yet'}
                      </div>
                      <div className="mt-2 flex items-center gap-4">
                        <button
                          onClick={() => onView(r.userId)}
                          className="text-xs font-semibold"
                          style={{ fontFamily: FONT.sans, color: C.forest }}
                        >
                          View portfolio →
                        </button>
                        <button
                          disabled={actingOn === r.userId}
                          onClick={() => onMessage(r.userId)}
                          className="text-xs font-semibold disabled:opacity-50"
                          style={{ fontFamily: FONT.sans, color: C.forest }}
                        >
                          {actingOn === r.userId ? '…' : 'Message →'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  )
}

/** Lets the funder browse real, verified supplier profiles (business
 * details, categories, rating, and a link into their full profile/live
 * inventory) and assign one as this tender's preferred materials supplier —
 * or unassign it — any time after the tender is posted. Deliberately a
 * separate step from PostJobScreen's creation form: comparing real stores
 * (location, pricing, what they actually stock) needs the same browse-then-
 * commit shape ContractorSearchPanel above already uses for contractors,
 * not a same-page picker filled in before any of that context exists. */
function SupplierAssignPanel({ job, projectId }: { job: JobPosting | undefined; projectId: string | undefined }) {
  const nav = useNavigate()
  const { show: showToast } = useToast()
  const { suppliers } = useMaterials()
  const assignMutation = useAssignSupplierMutation()
  const [browsing, setBrowsing] = useState(false)
  const verified = suppliers.filter((s) => s.verificationStatus === 'verified')
  const assigned = job?.materialsManagedBy === 'supplier' && job.preferredSupplierId
    ? suppliers.find((s) => s.id === job.preferredSupplierId)
    : null

  const assign = async (supplierId: string | null) => {
    if (!projectId) return
    try {
      await assignMutation.mutateAsync({ projectId, supplierId })
      showToast({ title: supplierId ? 'Supplier assigned' : 'Supplier unassigned', tone: 'success' })
      setBrowsing(false)
    } catch (err) {
      showToast({ title: 'Failed to update supplier', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  return (
    <div>
      <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-[0.3em]">
        Materials supplier
      </p>
      {assigned ? (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold truncate">{assigned.businessName}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{assigned.address}, {assigned.region}</div>
              </div>
              <button onClick={() => nav(`/supplier/profile/${assigned.id}`)} className="flex-shrink-0 text-xs font-semibold" style={{ fontFamily: FONT.sans, color: C.forest }}>
                View profile →
              </button>
            </div>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mt-2">
              The awarded contractor and you can both request materials from this store for any milestone.
            </p>
            <button
              disabled={assignMutation.isPending}
              onClick={() => assign(null)}
              className="mt-3 text-xs font-semibold disabled:opacity-50"
              style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }}
            >
              {assignMutation.isPending ? '…' : 'Unassign supplier'}
            </button>
          </div>
        </Card>
      ) : !browsing ? (
        <button
          onClick={() => setBrowsing(true)}
          className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 border-dashed text-sm font-semibold"
          style={{ borderColor: C.forest, color: C.forest, fontFamily: FONT.sans }}
        >
          Find & assign a supplier →
        </button>
      ) : verified.length === 0 ? (
        <EmptyState
          icon="store"
          title="No verified suppliers yet"
          description="Once a store registers and is admin-verified, it'll show up here to compare and assign."
        />
      ) : (
        <StaggerList className="space-y-3">
          {verified.map((s) => (
            <StaggerItem key={s.id}>
              <Card>
                <div className="p-4">
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold truncate">{s.businessName}</span>
                    <AppIcon name="shieldCheck" size={13} style={{ color: C.forest }} />
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{s.address}, {s.region}</div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-1">
                    {s.registeredCategories.slice(0, 3).join(', ') || 'No categories listed'}
                    {s.averageRating > 0 ? ` · ${s.averageRating.toFixed(1)}★` : ''}
                  </div>
                  <div className="mt-2 flex items-center gap-4">
                    <button onClick={() => nav(`/supplier/profile/${s.id}`)} className="text-xs font-semibold" style={{ fontFamily: FONT.sans, color: C.forest }}>
                      View profile & inventory →
                    </button>
                    <button
                      disabled={assignMutation.isPending}
                      onClick={() => assign(s.id)}
                      className="text-xs font-semibold disabled:opacity-50"
                      style={{ fontFamily: FONT.sans, color: C.forest }}
                    >
                      {assignMutation.isPending ? '…' : 'Assign →'}
                    </button>
                  </div>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  )
}

/** Tender owner's view of the real bids placed on one of their own tenders —
 * a new screen rather than repurposing BidComparisonScreen, which compares
 * generic contractor profiles, not actual Bid records against a specific
 * tender. Built on the same shared DataTable used by every other pillar. */
export function TenderBidsScreen() {
  const nav = useNavigate()
  const { jobId } = useParams()
  const { devUserId, jobs } = useApp()
  const { show: showToast } = useToast()
  const { data: bids, isLoading } = useBidsWithScoresQuery(jobId)
  const { data: recommended, isLoading: recommendedLoading } = useRecommendedContractorsQuery(jobId, 5)
  // An accepted bid only reaches 'closed' (mapTenderStatus collapses
  // completed/cancelled together) via real completion — cancelling a
  // tender is blocked once a bid is accepted (see projectController.cancel).
  const job = jobs.find((j) => j.id === jobId)
  const startConversation = useStartConversationMutation(devUserId)
  const [actingOn, setActingOn] = useState<string | null>(null)

  const messageContact = async (contextType: 'bid' | 'project', contextId: string, contractorId: string | undefined, key: string) => {
    if (!contractorId) return
    setActingOn(key)
    try {
      const conversation = await startConversation.mutateAsync({ contextType, contextId, otherUserId: contractorId })
      nav(conversation.draft ? `/messages/new_${contractorId}?contextType=${contextType}&contextId=${contextId}` : `/messages/${conversation.id}`)
    } catch (err) {
      showToast({ title: 'Failed to start conversation', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setActingOn(null)
    }
  }

  const columns: DataTableColumn<BidWithScore>[] = [
    { key: 'contractor', header: 'Contractor', sortValue: (b) => b.contractorName, render: (b) => <span className="font-medium">{b.contractorName}</span>, width: 'minmax(160px, 1.5fr)' },
    { key: 'match', header: 'Match', sortValue: (b) => b.score.total, render: (b) => <MatchScoreBadge score={b.score} /> },
    {
      key: 'status', header: 'Status', sortValue: (b) => b.status,
      render: (b) => b.status === 'pending' ? (
        <span
          className="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
          style={{
            background: b.lastProposedBy === 'contractor' ? 'var(--status-warning-bg)' : 'var(--status-info-bg)',
            color: b.lastProposedBy === 'contractor' ? 'var(--status-warning-text)' : 'var(--status-info-text)',
            fontFamily: FONT.mono,
          }}
        >
          {b.lastProposedBy === 'contractor' ? 'Your turn' : 'Awaiting contractor'}
        </span>
      ) : <StatusBadge status={b.status} />,
    },
    { key: 'price', header: 'Price', align: 'right', sortValue: (b) => b.price, render: (b) => <span style={{ color: C.ink }}>{fmt(b.price)}</span> },
    { key: 'timeline', header: 'Timeline', render: (b) => <span style={{ color: C.inkMuted }}>{b.timeline}</span> },
    { key: 'materials', header: 'Materials plan', render: (b) => <span style={{ color: C.inkMuted }} className="line-clamp-1">{b.materials || '—'}</span> },
    { key: 'submitted', header: 'Submitted', sortValue: (b) => b.submitted, render: (b) => <span style={{ color: C.inkSubtle, fontFamily: FONT.mono }} className="text-xs">{b.submitted}</span> },
  ]

  return (
    <AppShell>
      <Header title="Bids on this tender" subtitle={isLoading ? 'Loading…' : `${bids?.length ?? 0} received`} back onBack={() => nav(-1)} />

      <div className="px-1">
        {!isLoading && (bids?.length ?? 0) === 0 ? (
          <EmptyState
            icon="clipboard"
            title="No bids yet"
            description="Once contractors submit bids on this tender, they'll show up here for you to compare and award."
          />
        ) : (
          <DataTable
            columns={columns}
            rows={bids ?? []}
            getRowId={(b) => b.id}
            onRowClick={(b) => nav(`/negotiation/${b.id}`)}
            rowActions={(b) => (
              b.status === 'pending' ? (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => nav(`/negotiation/${b.id}`)}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                    style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
                  >
                    Negotiate →
                  </button>
                </div>
              ) : b.status === 'accepted' ? (
                <div className="flex justify-end gap-2">
                  <button
                    disabled={actingOn === b.id}
                    onClick={() => messageContact('bid', b.id, b.contractorId, b.id)}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
                    style={{ background: C.parchment, color: C.forest, fontFamily: FONT.sans }}
                  >
                    {actingOn === b.id ? '…' : 'Message'}
                  </button>
                  <button
                    onClick={() => nav(`/funder/contract-summary/${b.id}`)}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                    style={{ background: C.parchment, color: C.forest, fontFamily: FONT.sans }}
                  >
                    Contract
                  </button>
                  {job?.status === 'closed' && (
                    <button
                      onClick={() => nav(`/funder/rate-contractor/${jobId}`)}
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                      style={{ background: C.amber, color: C.forestDark, fontFamily: FONT.sans }}
                    >
                      Rate
                    </button>
                  )}
                </div>
              ) : null
            )}
          />
        )}
      </div>

      <div className="px-5 py-5">
        <SupplierAssignPanel job={job} projectId={jobId} />
      </div>

      <div className="grid gap-6 px-5 py-5 lg:grid-cols-2">
      <div>
        <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-[0.3em]">
          Recommended contractors
        </p>
        {recommendedLoading ? null : (recommended?.length ?? 0) === 0 ? (
          <EmptyState
            icon="users"
            title="No contractors match yet"
            description="Once contractors join with a matching trade, they'll be ranked here — even before they place a bid."
          />
        ) : (
          <StaggerList className="space-y-3">
            {recommended!.map((r) => (
              <StaggerItem key={r.contractorId}>
                <Card>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: C.forest, fontFamily: FONT.serif }}>
                        {r.fullName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold truncate">{r.fullName}</span>
                          <MatchScoreBadge score={r.score} />
                        </div>
                        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-1">
                          {r.stats.completedProjects} completed · {r.stats.ratingCount > 0 ? `${r.stats.avgRating?.toFixed(1)}★ (${r.stats.ratingCount})` : 'No ratings yet'}
                        </div>
                        {r.aiRationale && (
                          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs italic mt-2 leading-relaxed">"{r.aiRationale}"</p>
                        )}
                        <div className="mt-2 flex items-center gap-4">
                          <button
                            onClick={() => nav(`/contractor/portfolio/${r.contractorId}`)}
                            className="text-xs font-semibold"
                            style={{ fontFamily: FONT.sans, color: C.forest }}
                          >
                            View portfolio →
                          </button>
                          <button
                            disabled={actingOn === r.contractorId}
                            onClick={() => jobId && messageContact('project', jobId, r.contractorId, r.contractorId)}
                            className="text-xs font-semibold disabled:opacity-50"
                            style={{ fontFamily: FONT.sans, color: C.forest }}
                          >
                            {actingOn === r.contractorId ? '…' : 'Message →'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>

      <ContractorSearchPanel
        actingOn={actingOn}
        onView={(userId) => nav(`/contractor/portfolio/${userId}`)}
        onMessage={(contractorId) => jobId && messageContact('project', jobId, contractorId, contractorId)}
      />
      </div>

      <div className="px-5 pb-8 pt-4">
        <PillButton onClick={() => nav('/funder/post-job')} variant="secondary" fullWidth>+ Post another tender</PillButton>
      </div>
    </AppShell>
  )
}

/** One negotiation round, rendered oldest-first — price/timeline/schedule/
 * message, whoever proposed it. The shared building block both the rounds
 * history and the review-before-sending preview (inside the counter form)
 * use, so a round looks identical whether it already happened or is about
 * to. */
function RoundCard({ round, isLatest }: { round: BidNegotiationRoundLike; isLatest: boolean }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: isLatest ? C.forest : C.parchmentDark, background: isLatest ? 'var(--status-success-bg)' : C.white }}>
      <div className="flex items-center justify-between mb-2">
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{ background: round.proposedBy === 'funder' ? 'var(--status-info-bg)' : 'var(--status-warning-bg)', color: round.proposedBy === 'funder' ? 'var(--status-info-text)' : 'var(--status-warning-text)', fontFamily: FONT.mono }}
        >
          {round.proposedBy === 'funder' ? 'Funder' : 'Contractor'} proposed
        </span>
        <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">
          {round.createdAt ? new Date(round.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Now'}
        </span>
      </div>
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-bold">{fmt(round.price)}</span>
        <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-xs">{round.timelineDays} days</span>
      </div>
      {round.message && (
        <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs italic mt-1">"{round.message}"</p>
      )}
      {round.milestones.length > 0 && (
        <div className="mt-2 space-y-1 pt-2 border-t" style={{ borderColor: C.parchmentDark }}>
          {round.milestones.map((m, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span style={{ fontFamily: FONT.sans, color: C.inkMuted }}>{m.title}{m.description ? ` — ${m.description}` : ''}</span>
              <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>{fmt(m.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
interface BidNegotiationRoundLike { proposedBy: 'funder' | 'contractor'; price: number; timelineDays: number; milestones: { title: string; description: string; amount: number }[]; message: string; createdAt: string }

/** The negotiation surface for one bid — reachable by the funder (from the
 * bids table) and the contractor (from My Bids) alike. Shows the full
 * proposed-terms history oldest→newest, and, only when it's the viewer's
 * turn (bid.lastProposedBy is the OTHER party), lets them Accept the
 * current terms as-is, Counter (price/timeline/schedule + a note), or
 * Reject outright. */
export function NegotiationScreen() {
  const nav = useNavigate()
  const { bidId } = useParams()
  const { devUserId, jobs, counterBid } = useApp()
  const { show: showToast } = useToast()
  const { data: bid, isLoading } = useBidQuery(bidId)
  const updateStatus = useUpdateBidStatusMutation()
  const job = jobs.find((j) => j.id === bid?.jobId)

  const [mode, setMode] = useState<'view' | 'counter' | 'reject'>('view')
  const [useSchedule, setUseSchedule] = useState(false)
  const [weekly, setWeekly] = useState(false)
  const [milestones, setMilestones] = useState<DraftScheduleMilestone[]>(makeDefaultSchedule(3))
  const [priceStr, setPriceStr] = useState('')
  const [timelineStr, setTimelineStr] = useState('')
  const [message, setMessage] = useState('')
  const [acting, setActing] = useState(false)

  if (isLoading) return <AppShell noNav>{null}</AppShell>
  if (!bid) {
    return (
      <AppShell noNav>
        <Header title="Negotiation" back />
        <div className="px-5 py-8"><EmptyState icon="clipboard" title="Not found" description="This bid may have been withdrawn or doesn't exist." illustration="tilt" /></div>
      </AppShell>
    )
  }

  const myParty: 'funder' | 'contractor' | null =
    !devUserId ? null : job?.ownerId === devUserId ? 'funder' : bid.contractorId === devUserId ? 'contractor' : null
  const myTurn = myParty !== null && bid.status === 'pending' && bid.lastProposedBy !== myParty
  const currentRound = bid.rounds[bid.rounds.length - 1]
  const priceTarget = Number(priceStr) || 0
  const scheduleSum = scheduleTotal(milestones)
  const counterOk = priceTarget > 0 && Number(timelineStr) > 0 && (!useSchedule || (scheduleRowsValid(milestones) && scheduleSum === priceTarget))

  const openCounterForm = () => {
    setPriceStr(String(currentRound?.price ?? bid.price))
    setTimelineStr(String(currentRound?.timelineDays ?? 14))
    const existing = currentRound?.milestones ?? []
    setUseSchedule(existing.length > 0)
    setWeekly(false)
    setMilestones(existing.length > 0
      ? existing.map((m, i) => ({ id: i + 1, title: m.title, amount: String(m.amount), description: m.description }))
      : makeDefaultSchedule(3))
    setMessage('')
    setMode('counter')
  }

  const submitCounter = async () => {
    setActing(true)
    try {
      await counterBid(bid.id, {
        price: priceTarget,
        timelineDays: Number(timelineStr),
        milestones: useSchedule ? milestones.map((m) => ({ title: m.title, description: m.description, amount: Number(m.amount) || 0 })) : [],
        message,
      })
      showToast({ title: 'Counter-offer sent', tone: 'success' })
      setMode('view')
    } catch (err) {
      showToast({ title: 'Failed to send counter-offer', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setActing(false)
    }
  }

  const accept = async () => {
    setActing(true)
    try {
      const result = await updateStatus.mutateAsync({ bidId: bid.id, status: 'accepted' })
      showToast({ title: 'Contract awarded', description: result.contract ? 'The final terms are now locked in.' : undefined, tone: 'success' })
      nav(myParty === 'funder' ? `/funder/tender/${bid.jobId}/bids` : '/contractor/bids')
    } catch (err) {
      showToast({ title: 'Failed to accept', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setActing(false)
    }
  }

  const reject = async () => {
    setActing(true)
    try {
      await updateStatus.mutateAsync({ bidId: bid.id, status: myParty === 'contractor' ? 'withdrawn' : 'rejected' })
      showToast({ title: myParty === 'contractor' ? 'Bid withdrawn' : 'Bid rejected', tone: 'info' })
      nav(myParty === 'funder' ? `/funder/tender/${bid.jobId}/bids` : '/contractor/bids')
    } catch (err) {
      showToast({ title: 'Failed to reject', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setActing(false)
    }
  }

  if (mode === 'counter') {
    return (
      <AppShell noNav>
        <Header title="Send a Counter-Offer" subtitle={job?.title} back onBack={() => setMode('view')} />
        <div className="px-5 py-5 space-y-4 overflow-y-auto sm:mx-auto sm:max-w-2xl">
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">
              {useSchedule ? 'Target price (XAF) — your schedule below must add up to this' : 'Price (XAF)'}
            </label>
            <input type="number" value={priceStr} onChange={(e) => setPriceStr(e.target.value)}
              className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }} />
          </div>
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Timeline (days)</label>
            <input type="number" value={timelineStr} onChange={(e) => setTimelineStr(e.target.value)}
              className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }} />
          </div>
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Message (optional)</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
              placeholder="Explain your counter-offer..."
              className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm resize-none"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }} />
          </div>

          <button
            onClick={() => setUseSchedule((v) => !v)}
            className="w-full flex items-center justify-between py-3 px-4 rounded-xl border-2 border-dashed text-sm font-semibold"
            style={{ borderColor: C.forest, color: C.forest, fontFamily: FONT.sans }}
          >
            <span>{useSchedule ? '− Remove detailed schedule' : '+ Propose a detailed payment schedule'}</span>
          </button>

          {useSchedule && (
            <MilestoneScheduleEditor milestones={milestones} onChange={setMilestones} budget={priceTarget} weekly={weekly} onWeeklyChange={setWeekly} />
          )}
        </div>
        <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
          <PillButton onClick={submitCounter} fullWidth disabled={!counterOk || acting}>{acting ? 'Sending…' : 'Send counter-offer'}</PillButton>
        </div>
      </AppShell>
    )
  }

  if (mode === 'reject') {
    return (
      <AppShell noNav>
        <Header title={myParty === 'contractor' ? 'Withdraw Bid' : 'Reject Bid'} back onBack={() => setMode('view')} />
        <div className="px-5 py-5 space-y-4 overflow-y-auto sm:mx-auto sm:max-w-2xl">
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
            {myParty === 'contractor'
              ? 'Withdrawing ends this negotiation. You can submit a fresh bid later if the tender is still open.'
              : 'Rejecting ends this negotiation — the contractor will be notified.'}
          </p>
        </div>
        <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
          <PillButton onClick={reject} variant="danger" fullWidth disabled={acting}>{acting ? 'Working…' : myParty === 'contractor' ? 'Withdraw bid' : 'Reject bid'}</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Negotiation" subtitle={job?.title} back />
      <div className="px-5 py-5 space-y-4 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        {bid.status !== 'pending' && (
          <div className="rounded-xl border p-3 text-center" style={{ borderColor: C.parchmentDark, background: C.parchment }}>
            <StatusBadge status={bid.status} />
          </div>
        )}
        {bid.status === 'pending' && (
          <div className="rounded-xl border p-3 text-center" style={{ borderColor: myTurn ? C.forest : C.parchmentDark, background: myTurn ? 'var(--status-success-bg)' : C.parchment }}>
            <span style={{ fontFamily: FONT.sans, color: myTurn ? 'var(--status-success-text)' : C.inkMuted }} className="text-sm font-semibold">
              {myTurn ? "It's your turn to respond" : `Waiting on the ${bid.lastProposedBy === 'funder' ? 'contractor' : 'funder'}`}
            </span>
          </div>
        )}

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Negotiation history</p>
          <div className="space-y-2">
            {bid.rounds.map((r, i) => <RoundCard key={i} round={r} isLatest={i === bid.rounds.length - 1} />)}
          </div>
        </div>
      </div>

      {myTurn && (
        <div className="px-5 pb-8 pt-4 border-t space-y-2 backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
          <PillButton onClick={accept} fullWidth disabled={acting}>{acting ? 'Working…' : `Accept — ${fmt(currentRound?.price ?? bid.price)}`}</PillButton>
          <div className="flex gap-2">
            <button onClick={openCounterForm} className="flex-1 py-3 rounded-xl font-semibold text-sm border" style={{ borderColor: C.forest, color: C.forest, fontFamily: FONT.sans }}>Counter</button>
            <button onClick={() => setMode('reject')} className="flex-1 py-3 rounded-xl font-semibold text-sm border" style={{ borderColor: 'var(--status-error-bg)', color: 'var(--status-error-text)', background: 'var(--status-error-bg)', fontFamily: FONT.sans }}>
              {myParty === 'contractor' ? 'Withdraw' : 'Reject'}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
