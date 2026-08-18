import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, fmt } from '../context'
import { C, FONT, AppShell, Card, Header, StatusBadge, PillButton } from '../components/MobileLayout'
import { DataTable, type DataTableColumn } from '../components/dataview/DataTable'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { apiErrorMessage } from '../api/client'
import { useUpdateBidStatusMutation } from '../api/tenders'
import { useStartConversationMutation } from '../api/messaging'
import { useBidsWithScoresQuery, useRecommendedContractorsQuery, type BidWithScore, type MatchScore } from '../api/matching'

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
  const updateStatus = useUpdateBidStatusMutation()
  const startConversation = useStartConversationMutation(devUserId)
  const [actingOn, setActingOn] = useState<string | null>(null)

  const messageContact = async (contextType: 'bid' | 'project', contextId: string, contractorId: string | undefined, key: string) => {
    if (!contractorId) return
    setActingOn(key)
    try {
      const conversation = await startConversation.mutateAsync({ contextType, contextId, otherUserId: contractorId })
      nav(`/messages/${conversation.id}`)
    } catch (err) {
      showToast({ title: 'Failed to start conversation', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setActingOn(null)
    }
  }

  const decide = async (bid: BidWithScore, status: 'accepted' | 'rejected') => {
    setActingOn(bid.id)
    try {
      const result = await updateStatus.mutateAsync({ bidId: bid.id, status })
      if (status === 'accepted') {
        showToast({
          title: 'Contract awarded',
          description: result.contract ? 'A digital contract has been generated.' : undefined,
          tone: 'success',
        })
      }
    } catch (err) {
      showToast({ title: 'Action failed', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setActingOn(null)
    }
  }

  const columns: DataTableColumn<BidWithScore>[] = [
    { key: 'contractor', header: 'Contractor', sortValue: (b) => b.contractorName, render: (b) => <span className="font-medium">{b.contractorName}</span>, width: 'minmax(160px, 1.5fr)' },
    { key: 'match', header: 'Match', sortValue: (b) => b.score.total, render: (b) => <MatchScoreBadge score={b.score} /> },
    { key: 'status', header: 'Status', sortValue: (b) => b.status, render: (b) => <StatusBadge status={b.status} /> },
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
            rowActions={(b) => (
              b.status === 'pending' ? (
                <div className="flex justify-end gap-2">
                  <button
                    disabled={actingOn === b.id}
                    onClick={() => decide(b, 'rejected')}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
                    style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
                  >
                    Reject
                  </button>
                  <button
                    disabled={actingOn === b.id}
                    onClick={() => decide(b, 'accepted')}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
                    style={{ background: C.emerald, color: '#fff', fontFamily: FONT.sans }}
                  >
                    {actingOn === b.id ? '…' : 'Accept'}
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
                        <button
                          disabled={actingOn === r.contractorId}
                          onClick={() => jobId && messageContact('project', jobId, r.contractorId, r.contractorId)}
                          className="mt-2 text-xs font-semibold disabled:opacity-50"
                          style={{ fontFamily: FONT.sans, color: C.forest }}
                        >
                          {actingOn === r.contractorId ? '…' : 'Message →'}
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>

      <div className="px-5 pb-8 pt-4">
        <PillButton onClick={() => nav('/funder/post-job')} variant="secondary" fullWidth>+ Post another tender</PillButton>
      </div>
    </AppShell>
  )
}
