import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, fmt, type Bid } from '../context'
import { C, FONT, AppShell, Header, StatusBadge, PillButton } from '../components/MobileLayout'
import { DataTable, type DataTableColumn } from '../components/dataview/DataTable'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { apiErrorMessage } from '../api/client'
import { useBidsQuery, useUpdateBidStatusMutation } from '../api/tenders'
import { useStartConversationMutation } from '../api/messaging'

/** Tender owner's view of the real bids placed on one of their own tenders —
 * a new screen rather than repurposing BidComparisonScreen, which compares
 * generic contractor profiles, not actual Bid records against a specific
 * tender. Built on the same shared DataTable used by every other pillar. */
export function TenderBidsScreen() {
  const nav = useNavigate()
  const { jobId } = useParams()
  const { devUserId, jobs } = useApp()
  const { show: showToast } = useToast()
  const { data: bids, isLoading } = useBidsQuery({ projectId: jobId })
  // An accepted bid only reaches 'closed' (mapTenderStatus collapses
  // completed/cancelled together) via real completion — cancelling a
  // tender is blocked once a bid is accepted (see projectController.cancel).
  const job = jobs.find((j) => j.id === jobId)
  const updateStatus = useUpdateBidStatusMutation()
  const startConversation = useStartConversationMutation(devUserId)
  const [actingOn, setActingOn] = useState<string | null>(null)

  const message = async (bid: Bid) => {
    if (!bid.contractorId || !jobId) return
    setActingOn(bid.id)
    try {
      const conversation = await startConversation.mutateAsync({ contextType: 'bid', contextId: bid.id, otherUserId: bid.contractorId })
      nav(`/messages/${conversation.id}`)
    } catch (err) {
      showToast({ title: 'Failed to start conversation', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setActingOn(null)
    }
  }

  const decide = async (bid: Bid, status: 'accepted' | 'rejected') => {
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

  const columns: DataTableColumn<Bid>[] = [
    { key: 'contractor', header: 'Contractor', sortValue: (b) => b.contractorName, render: (b) => <span className="font-medium">{b.contractorName}</span>, width: 'minmax(160px, 1.5fr)' },
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
                    style={{ background: C.emerald, color: C.white, fontFamily: FONT.sans }}
                  >
                    {actingOn === b.id ? '…' : 'Accept'}
                  </button>
                </div>
              ) : b.status === 'accepted' ? (
                <div className="flex justify-end gap-2">
                  <button
                    disabled={actingOn === b.id}
                    onClick={() => message(b)}
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

      <div className="px-5 pb-8 pt-4">
        <PillButton onClick={() => nav('/funder/post-job')} variant="secondary" fullWidth>+ Post another tender</PillButton>
      </div>
    </AppShell>
  )
}
