import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, fmt } from '../context'
import { C, FONT, AppShell, Card, StatusBadge, Stars, PillButton, Header } from '../components/MobileLayout'
import { ActivityTimeline } from '../components/ActivityTimeline'
import { LandFlagBadge } from '../components/LandFlagBadge'
import { NeighboringListingsMap } from '../components/NeighboringListingsMap'
import { ChipGroup } from '../components/Chip'
import { Tabs } from '../components/Tabs'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { EmptyState } from '../components/EmptyState'
import { DeferredReveal, SkeletonCard } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { apiErrorMessage } from '../api/client'
import {
  useCreateLandOfferMutation,
  useCounterOfferMutation,
  useAcceptOfferMutation,
  useDeclineOfferMutation,
  useWithdrawOfferMutation,
} from '../api/landOffers'
import { useStartConversationMutation, useSendMessageMutation } from '../api/messaging'
import { useAddLandDocumentMutation } from '../api/land'
import { useVerificationTasksQuery } from '../api/reputation'

// ── Browse land ────────────────────────────────────────────────────────────────
export function BrowseLandScreen() {
  const nav = useNavigate()
  const { landListings } = useApp()
  const [view, setView] = useState<'list' | 'map'>('list')
  const [region, setRegion] = useState('All')
  const regions = ['All', 'Centre', 'Littoral', 'West', 'South West']
  const filtered = region === 'All' ? landListings : landListings.filter((l) => l.region === region)

  return (
    <AppShell>
      <Header title="Land & Property" back action={
        <div className="w-40">
          <Tabs
            tabs={[{ id: 'list', label: 'List', icon: 'menu' }, { id: 'map', label: 'Map', icon: 'mapPin' }]}
            value={view}
            onChange={(v) => setView(v as 'list' | 'map')}
            variant="pill"
          />
        </div>
      }>
        <div className="flex items-center gap-2 border rounded-xl px-3 py-2.5 mb-4" style={{ borderColor: C.parchmentDark, background: C.cream }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4" stroke={C.inkSubtle} strokeWidth="1.3" />
            <line x1="9" y1="9" x2="12" y2="12" stroke={C.inkSubtle} strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input placeholder="Search by city, region, size..." className="flex-1 bg-transparent outline-none text-sm" style={{ fontFamily: FONT.sans, color: C.ink }} />
        </div>

        <div className="overflow-x-auto pb-1">
          <ChipGroup options={regions} value={region} onChange={(v) => setRegion(v as string)} />
        </div>
      </Header>

      {view === 'map' ? (
        <div className="flex-1 relative mx-5 my-4 rounded-2xl overflow-hidden" style={{ minHeight: '400px', background: C.parchment }}>
          <img
            src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop&auto=format"
            alt="Map of Cameroon"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(15,27,20,0.3)' }}>
            <div className="text-center text-white">
              <div style={{ fontFamily: FONT.serif }} className="text-lg font-bold">Map view</div>
              <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.7)' }} className="text-xs mt-1">Tap a pin to view listing</div>
            </div>
          </div>
          {filtered.slice(0, 3).map((listing, i) => {
            const positions = [{ x: '35%', y: '40%' }, { x: '55%', y: '55%' }, { x: '45%', y: '65%' }]
            const { x, y } = positions[i]
            return (
              <button key={listing.id} onClick={() => nav(`/land/listing/${listing.id}`)}
                className="absolute flex flex-col items-center" style={{ left: x, top: y, transform: 'translate(-50%, -100%)' }}>
                <div className="rounded-full px-2 py-1 text-xs font-bold mb-1" style={{ background: listing.verified ? C.forest : C.amber, color: C.white, fontFamily: FONT.mono }}>
                  {(listing.price / 1000000).toFixed(0)}M
                </div>
                <div className="w-2 h-2 rounded-full" style={{ background: listing.verified ? C.forest : C.amber }} />
              </button>
            )
          })}
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-4">
          <EmptyState
            icon="mapPin"
            title="No listings found"
            description="Try a different region, or check back soon for new plots."
            illustration="tilt"
          />
        </div>
      ) : (
        <DeferredReveal
          skeleton={
            <div className="px-5 py-4 space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} className="h-56" />)}
            </div>
          }
        >
          <StaggerList className="px-5 py-4 space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 xl:grid-cols-3">
            {filtered.map((l) => (
              <StaggerItem key={l.id}>
                <Card variant="interactive" onClick={() => nav(`/land/listing/${l.id}`)}>
                  <div className="relative">
                    <img src={l.image} alt={l.title} className="w-full h-36 object-cover rounded-t-xl" />
                    <div className="absolute top-3 right-3">
                      {l.verified ? (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: C.forest }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
                          </svg>
                          <span style={{ fontFamily: FONT.mono, color: C.white }} className="text-[9px] uppercase tracking-wider">Verified</span>
                        </div>
                      ) : (
                        <div className="px-2 py-1 rounded-full" style={{ background: C.amber }}>
                          <span style={{ fontFamily: FONT.mono, color: C.forestDark }} className="text-[9px] uppercase tracking-wider">Pending</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm mb-0.5">{l.title}</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-2">{l.city}, {l.region} · {l.size}</div>
                    <div className="flex items-center justify-between">
                      <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-xl font-bold">{fmt(l.price)}</div>
                      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{l.titleType}</div>
                    </div>
                    {(l.disputed || l.duplicateOfListingId) && (
                      <div className="mt-2"><LandFlagBadge listing={l} compact /></div>
                    )}
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
        </DeferredReveal>
      )}
    </AppShell>
  )
}

// ── Land listing detail ────────────────────────────────────────────────────────
export function LandListingDetailScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { landListings, offers, devUserId } = useApp()
  const { show: showToast } = useToast()
  const listing = landListings.find((l) => l.id === id) ?? landListings[0]
  const listingOffers = offers.filter((o) => o.listingId === listing.id)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [interested, setInterested] = useState(false)
  const [counteringId, setCounteringId] = useState<string | null>(null)
  const [counterAmount, setCounterAmount] = useState('')
  const [actingOn, setActingOn] = useState<string | null>(null)
  const isSeller = Boolean(devUserId && listing.sellerId && devUserId === listing.sellerId)

  // Real, human, on-site verifier report — only exists when an admin has
  // actually assigned a verifier and they've filed one.
  const { data: verificationTasks = [] } = useVerificationTasksQuery({ targetType: 'land_listing', targetId: listing.id })
  const siteVisitReport = verificationTasks.find((t) => t.status === 'submitted')

  const counterOffer = useCounterOfferMutation()
  const acceptOffer = useAcceptOfferMutation()
  const declineOffer = useDeclineOfferMutation()
  const withdrawOffer = useWithdrawOfferMutation()

  const runOfferAction = async (offerId: string, action: () => Promise<unknown>, successMessage: string) => {
    setActingOn(offerId)
    try {
      await action()
      showToast({ title: successMessage, tone: 'success' })
      setCounteringId(null)
    } catch (err) {
      showToast({ title: 'Action failed', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setActingOn(null)
    }
  }

  const handleAccept = (offerId: string) =>
    runOfferAction(offerId, async () => {
      const result = await acceptOffer.mutateAsync(offerId)
      if (!isSeller) nav('/funder/fund', { state: { projectId: result.projectId } })
    }, isSeller ? 'Offer accepted — buyer can now fund the purchase' : 'Offer accepted')
  const handleDecline = (offerId: string) => runOfferAction(offerId, () => declineOffer.mutateAsync(offerId), 'Offer declined')
  const handleWithdraw = (offerId: string) => runOfferAction(offerId, () => withdrawOffer.mutateAsync(offerId), 'Offer withdrawn')
  const submitCounter = (offerId: string) =>
    runOfferAction(offerId, () => counterOffer.mutateAsync({ offerId, counterAmount: Number(counterAmount) }), 'Counter-offer sent')

  const photos = [listing.image, listing.image.replace('w=400', 'w=400&crop=entropy')]

  return (
    <AppShell noNav>
      {/* Photo carousel */}
      <div className="relative h-56 sm:h-72 lg:h-96">
        <img src={photos[photoIdx]} alt={listing.title} className="w-full h-full object-cover" />
        <button onClick={() => nav(-1)} aria-label="Back" className="absolute top-6 left-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {photos.map((_, i) => (
            <button key={i} onClick={() => setPhotoIdx(i)} className="w-1.5 h-1.5 rounded-full transition-all" style={{ background: i === photoIdx ? C.white : 'rgba(255,255,255,0.4)' }} />
          ))}
        </div>
        {listing.verified ? (
          <div className="absolute top-6 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: C.forest }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: FONT.mono, color: C.white }} className="text-[10px] uppercase tracking-wider">Verified listing</span>
          </div>
        ) : (
          <div className="absolute top-6 right-4 px-3 py-1.5 rounded-full" style={{ background: C.amber }}>
            <span style={{ fontFamily: FONT.mono, color: C.forestDark }} className="text-[10px] uppercase tracking-wider">Under verification</span>
          </div>
        )}
      </div>

      <div className="px-5 py-5 space-y-5 overflow-y-auto sm:mx-auto sm:max-w-3xl">
        {/* Title + price */}
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-1">{listing.city}, {listing.region} · {listing.size}</div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-xl font-bold mb-2">{listing.title}</h1>
          <div style={{ fontFamily: FONT.serif, color: C.forest }} className="text-2xl font-bold">{fmt(listing.price)}</div>
        </div>

        {/* Key details */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Plot size', value: listing.size },
            { label: 'Title type', value: listing.titleType },
            { label: 'Verification', value: listing.verified ? 'Complete' : 'In progress' },
            { label: 'Disputes', value: listing.disputed ? 'Yes — flagged' : listing.duplicateOfListingId ? 'Duplicate flagged' : 'None found' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border p-3" style={{ borderColor: C.parchmentDark, background: C.white }}>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-widest mb-0.5">{label}</div>
              <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{value}</div>
            </div>
          ))}
        </div>

        {(listing.disputed || listing.duplicateOfListingId) && <LandFlagBadge listing={listing} />}

        {/* Description */}
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">About this plot</div>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm leading-relaxed">{listing.description}</p>
        </div>

        {/* Neighboring context */}
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Nearby listings & recent sales</div>
          <NeighboringListingsMap listing={listing} />
        </div>

        {/* Document verification */}
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Document verification status</div>
          <div className="space-y-2">
            {listing.docs.map((doc, i) => {
              // Real per-document status when we have it; `listing.verified`
              // is only a fallback for mock/pre-auth preview data that never
              // carried individual document records (see documentStatuses on
              // LandListing). Previously this hardcoded the first document as
              // always "verified" regardless of its real status.
              const realStatus = listing.documentStatuses[i]?.verificationStatus
              const flagged = realStatus === 'flagged'
              const verified = realStatus ? realStatus === 'verified' : listing.verified
              const tone = flagged ? 'error' : verified ? 'success' : 'warning'
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: C.parchmentDark, background: `var(--status-${tone}-bg)` }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: flagged ? 'var(--status-error-text)' : verified ? C.forest : C.amber }}>
                    {verified ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                    ) : flagged ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <line x1="2.5" y1="2.5" x2="7.5" y2="7.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
                        <line x1="7.5" y1="2.5" x2="2.5" y2="7.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <circle cx="5" cy="5" r="3.5" stroke={C.forestDark} strokeWidth="1" />
                        <line x1="5" y1="3" x2="5" y2="5.5" stroke={C.forestDark} strokeWidth="1" strokeLinecap="round" />
                        <circle cx="5" cy="7" r="0.5" fill={C.forestDark} />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm">{doc}</span>
                  <span style={{ fontFamily: FONT.mono, color: `var(--status-${tone}-text)` }} className="text-[9px] ml-auto uppercase tracking-wider">
                    {flagged ? 'Flagged' : verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Site verification visit — only rendered when a verifier was
            actually assigned and has filed a real report, not just because
            the listing happens to be marked verified. */}
        {siteVisitReport && (
          <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Verification site visit</div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: siteVisitReport.confirmedMatch === false ? 'var(--status-error-bg)' : 'var(--status-success-bg)' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2C6.2 2 4 4.2 4 7C4 11 9 16 9 16C9 16 14 11 14 7C14 4.2 11.8 2 9 2Z" stroke={siteVisitReport.confirmedMatch === false ? 'var(--status-error-text)' : C.forest} strokeWidth="1.3" />
                  <circle cx="9" cy="7" r="2" stroke={siteVisitReport.confirmedMatch === false ? 'var(--status-error-text)' : C.forest} strokeWidth="1.2" />
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-xs font-semibold">
                  {siteVisitReport.confirmedMatch === false ? 'Site visit found a mismatch' : 'Site inspected by an independent verifier'}
                </div>
                {siteVisitReport.reportText && (
                  <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mt-0.5 leading-relaxed">"{siteVisitReport.reportText}"</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Seller */}
        {listing.seller && (
          <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Seller</div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style={{ background: C.forest, fontFamily: FONT.serif }}>
                {listing.seller[0]}
              </div>
              <div>
                <div style={{ fontFamily: FONT.sans, color: C.ink }} className="font-semibold">{listing.seller}</div>
                {listing.sellerRating && <Stars rating={listing.sellerRating} />}
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">
                  {listing.verified ? 'Identity verified' : 'Verification pending'}
                </div>
              </div>
            </div>
          </div>
        )}

        {!listing.verified && (
          <div className="rounded-xl p-4 border" style={{ background: 'var(--status-warning-bg)', borderColor: C.amber }}>
            <div style={{ fontFamily: FONT.mono, color: 'var(--status-warning-text)' }} className="text-[10px] uppercase tracking-widest mb-1">Verification in progress</div>
            <p style={{ fontFamily: FONT.sans, color: 'var(--status-warning-text)' }} className="text-xs leading-relaxed">
              This listing's documents are currently being verified by our team. You can express interest but no funds will be accepted until verification is complete.
            </p>
          </div>
        )}

        {/* Activity */}
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Activity</div>
          <ActivityTimeline events={[
            { id: 'listed', label: 'Listing published', status: 'done' },
            { id: 'docs', label: listing.verified ? 'Documents verified' : 'Documents under verification', status: listing.verified ? 'done' : 'current' },
          ]} />
        </div>

        {/* Offers */}
        {listingOffers.length > 0 && (
          <div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">
              {isSeller ? 'Offers received' : 'Your offers'}
            </div>
            <div className="space-y-2">
              {listingOffers.map((o) => {
                const isBuyerOfOffer = Boolean(devUserId && devUserId === o.buyerId)
                const canRespondToPending = o.status === 'pending' && isSeller
                const canRespondToCounter = o.status === 'countered' && isBuyerOfOffer
                const canWithdraw = ['pending', 'countered'].includes(o.status) && isBuyerOfOffer
                const busy = actingOn === o.id
                return (
                  <div key={o.id} className="rounded-xl border p-3" style={{ borderColor: C.parchmentDark, background: C.white }}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{fmt(o.amount)}{isSeller ? ` from ${o.buyerName}` : ''}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    {o.counterAmount != null && (
                      <div style={{ fontFamily: FONT.sans, color: C.forest }} className="text-xs font-semibold mb-1">Countered at {fmt(o.counterAmount)}</div>
                    )}
                    {o.message && <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mb-2">{o.message}</p>}
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] mb-2">{o.date}</div>

                    {counteringId === o.id ? (
                      <div className="flex gap-2">
                        <input type="number" value={counterAmount} onChange={(e) => setCounterAmount(e.target.value)} placeholder="Counter amount"
                          className="flex-1 border-2 rounded-lg px-3 py-2 outline-none text-sm"
                          style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }} />
                        <PillButton onClick={() => submitCounter(o.id)} disabled={busy || !counterAmount || Number(counterAmount) <= 0}>{busy ? '…' : 'Send'}</PillButton>
                        <PillButton onClick={() => setCounteringId(null)} variant="ghost">Cancel</PillButton>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {canRespondToPending && (
                          <>
                            <PillButton onClick={() => handleAccept(o.id)} disabled={busy}>{busy ? '…' : 'Accept'}</PillButton>
                            <PillButton onClick={() => { setCounteringId(o.id); setCounterAmount(String(o.amount)) }} variant="secondary" disabled={busy}>Counter</PillButton>
                            <PillButton onClick={() => handleDecline(o.id)} variant="ghost" disabled={busy}>Decline</PillButton>
                          </>
                        )}
                        {canRespondToCounter && (
                          <>
                            <PillButton onClick={() => handleAccept(o.id)} disabled={busy}>{busy ? '…' : 'Accept counter'}</PillButton>
                            <PillButton onClick={() => handleDecline(o.id)} variant="ghost" disabled={busy}>Decline</PillButton>
                          </>
                        )}
                        {canWithdraw && !canRespondToCounter && (
                          <PillButton onClick={() => handleWithdraw(o.id)} variant="ghost" disabled={busy}>{busy ? '…' : 'Withdraw'}</PillButton>
                        )}
                        {o.status === 'accepted' && isBuyerOfOffer && listing.linkedProjectId && (
                          <PillButton onClick={() => nav('/funder/fund', { state: { projectId: listing.linkedProjectId } })}>Fund this purchase</PillButton>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-8 pt-4 border-t space-y-3 sm:mx-auto sm:max-w-3xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        {isSeller ? (
          <PillButton onClick={() => nav(`/land/schedule/${listing.id}`)} variant="secondary" fullWidth>Manage visit requests</PillButton>
        ) : !interested ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <PillButton onClick={() => nav(`/land/contact/${listing.id}`)} variant="secondary" fullWidth>Contact seller</PillButton>
              {listing.verified ? (
                <PillButton onClick={() => nav(`/land/offer/${listing.id}`)} fullWidth>Make an offer</PillButton>
              ) : (
                <PillButton onClick={() => setInterested(true)} fullWidth>Follow for updates</PillButton>
              )}
            </div>
            {listing.verified && !isSeller && (
              <PillButton onClick={() => nav(`/land/schedule/${listing.id}`)} variant="ghost" fullWidth>Schedule a visit</PillButton>
            )}
          </>
        ) : (
          <div className="rounded-xl border p-4 text-center" style={{ background: 'var(--status-success-bg)', borderColor: C.forestLight }}>
            <div style={{ fontFamily: FONT.serif, color: C.forest }} className="font-bold">Interest registered</div>
            <div style={{ fontFamily: FONT.sans, color: 'var(--status-success-text)' }} className="text-xs mt-1">The seller has been notified. You'll hear within 48 hours.</div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

// ── Contact seller ─────────────────────────────────────────────────────────────
export function ContactSellerScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { landListings, devUserId } = useApp()
  const { show: showToast } = useToast()
  const listing = landListings.find((l) => l.id === id) ?? landListings[0]
  const [revealed, setRevealed] = useState(false)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const startConversation = useStartConversationMutation(devUserId)
  const sendMessage = useSendMessageMutation(devUserId)

  const submit = async () => {
    if (!listing.sellerId) {
      showToast({ title: 'Cannot message this seller', description: 'This listing has no seller account attached.', tone: 'error' })
      return
    }
    setSending(true)
    try {
      const conversation = await startConversation.mutateAsync({ contextType: 'land_listing', contextId: listing.id, otherUserId: listing.sellerId })
      await sendMessage.mutateAsync({ conversationId: conversation.id, body: message.trim() })
      setConversationId(conversation.id)
      setSent(true)
    } catch (err) {
      showToast({ title: 'Failed to send message', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: C.forest }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M8 18L15 25L28 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Message sent</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            {listing.seller} has been notified and will usually reply within 48 hours.
          </p>
          {conversationId && (
            <div className="w-full mb-3">
              <PillButton onClick={() => nav(`/messages/${conversationId}`)} fullWidth>View conversation</PillButton>
            </div>
          )}
          <PillButton onClick={() => nav(`/land/listing/${listing.id}`)} variant="secondary" fullWidth>Back to listing</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Contact Seller" subtitle={listing.title} back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl border p-4 flex items-center gap-3" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ background: C.forest, fontFamily: FONT.serif }}>
            {listing.seller[0]}
          </div>
          <div>
            <div style={{ fontFamily: FONT.sans, color: C.ink }} className="font-semibold">{listing.seller}</div>
            {listing.sellerRating && <Stars rating={listing.sellerRating} />}
          </div>
        </div>

        <div className="rounded-xl border p-4" style={{ borderColor: C.parchmentDark, background: C.parchment }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Phone number</div>
          {revealed ? (
            <div style={{ fontFamily: FONT.mono, color: C.ink }} className="text-sm font-semibold">+237 6{Math.floor(10000000 + Math.random() * 89999999)}</div>
          ) : (
            <button onClick={() => setRevealed(true)} className="text-sm font-semibold" style={{ fontFamily: FONT.sans, color: C.forest }}>Tap to reveal number →</button>
          )}
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Send a message</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
            placeholder="Introduce yourself and ask any questions about the plot..."
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm resize-none"
            style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }} />
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={submit} fullWidth disabled={!message.trim() || sending}>{sending ? 'Sending…' : 'Send message'}</PillButton>
      </div>
    </AppShell>
  )
}

// ── Purchase / offer ────────────────────────────────────────────────────────────
export function PurchaseOfferScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { landListings } = useApp()
  const { show: showToast } = useToast()
  const listing = landListings.find((l) => l.id === id) ?? landListings[0]
  const [amount, setAmount] = useState(String(listing.price))
  const [financing, setFinancing] = useState<'cash' | 'financed'>('cash')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const createOffer = useCreateLandOfferMutation()

  // No funds move here — this only creates a pending LandOffer for the
  // seller to accept/counter/decline. Escrow only happens once an offer is
  // actually accepted (see the accept-offer flow), which is when a real KYC
  // gate on the amount actually matters.
  const submit = async () => {
    try {
      await createOffer.mutateAsync({
        listingId: listing.id,
        offerAmount: Number(amount) || listing.price,
        message: `${financing === 'cash' ? 'Cash offer' : 'Financed offer'}. ${message}`.trim(),
      })
      setSubmitted(true)
    } catch (err) {
      showToast({ title: 'Failed to submit offer', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  if (submitted) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: C.amber }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M8 18L15 25L28 11" stroke={C.forestDark} strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Offer submitted</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            Your offer of {fmt(Number(amount) || listing.price)} for {listing.title} has been sent to {listing.seller}. Funds only move once both parties agree and documents are confirmed.
          </p>
          <PillButton onClick={() => nav(`/land/listing/${listing.id}`)} fullWidth>Back to listing</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Make an Offer" subtitle={listing.title} back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl p-5 text-center" style={{ background: C.forest }}>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-xs uppercase tracking-widest mb-1">Asking price</div>
          <div style={{ fontFamily: FONT.serif }} className="text-3xl font-bold text-white">{fmt(listing.price)}</div>
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Your offer (XAF)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
            style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-2">Payment plan</label>
          <div className="grid grid-cols-2 gap-3">
            {(['cash', 'financed'] as const).map((f) => (
              <button key={f} onClick={() => setFinancing(f)}
                className="py-3 rounded-xl text-sm font-semibold capitalize transition-all border-2"
                style={{ borderColor: financing === f ? C.forest : C.parchmentDark, background: financing === f ? 'var(--status-success-bg)' : C.white, color: financing === f ? C.forest : C.inkMuted, fontFamily: FONT.sans }}>
                {f === 'cash' ? 'Full cash' : 'Financing needed'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Note to seller (optional)</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
            placeholder="Timeline, questions, or conditions for this offer..."
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm resize-none"
            style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }} />
        </div>

        <div className="rounded-xl border p-3" style={{ background: 'var(--status-success-bg)', borderColor: 'var(--status-success-text)' }}>
          <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-[10px] uppercase tracking-widest mb-1">How this works</div>
          <p style={{ fontFamily: FONT.sans, color: 'var(--status-success-text)' }} className="text-xs leading-relaxed">
            This is a non-binding offer. If the seller accepts, funds move into escrow and are only released once ownership documents are transferred and verified.
          </p>
        </div>

      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={submit} fullWidth disabled={!amount || Number(amount) <= 0 || createOffer.isPending}>{createOffer.isPending ? 'Submitting…' : 'Submit offer'}</PillButton>
      </div>
    </AppShell>
  )
}

// ── Create listing screen ──────────────────────────────────────────────────────
const LISTING_DOC_TYPES: { type: string; label: string }[] = [
  { type: 'title_deed', label: 'Title deed / ownership document' },
  { type: 'tax_receipt', label: 'Land tax receipt (current year)' },
  { type: 'survey_plan', label: 'Survey plan (geo-referenced)' },
  { type: 'no_dispute_letter', label: 'No-dispute / no-objection letter' },
]

export function CreateListingScreen() {
  const nav = useNavigate()
  const { addListing } = useApp()
  const addDocument = useAddLandDocumentMutation()
  const { show: showToast } = useToast()
  const [form, setForm] = useState({ title: '', region: '', city: '', size: '', price: '', titleType: '', description: '' })
  const [step, setStep] = useState<'details' | 'documents' | 'done'>('details')
  const [listingId, setListingId] = useState<string | null>(null)
  // Per document type: which one is mid-upload right now, and which have
  // succeeded — drives the tile's spinner/checkmark state.
  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const [uploadedTypes, setUploadedTypes] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  // The listing has to actually exist (with a real id) before any document
  // can be attached to it — POST /land-listings/:id/documents needs one —
  // so creation happens here, on leaving the details step, not at the end.
  const proceedToDocuments = async () => {
    setCreating(true)
    try {
      const created = await addListing({
        title: form.title || 'Untitled listing',
        region: form.region,
        city: form.city,
        size: form.size,
        price: Number(form.price) || 0,
        verified: false,
        titleType: form.titleType || 'Documents under verification',
        seller: 'You',
        sellerRating: null,
        disputed: false,
        image: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=400&h=250&fit=crop&auto=format',
        description: form.description,
        docs: [],
        documentStatuses: [],
      })
      setListingId(created.id)
      setStep('documents')
    } catch (err) {
      showToast({ title: 'Failed to create listing', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setCreating(false)
    }
  }

  const uploadDocument = async (type: string, file: File | null) => {
    if (!file || !listingId) return
    setUploadingType(type)
    try {
      await addDocument.mutateAsync({ listingId, file, type })
      setUploadedTypes((prev) => (prev.includes(type) ? prev : [...prev, type]))
    } catch (err) {
      showToast({ title: 'Upload failed', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setUploadingType(null)
    }
  }

  if (step === 'done') {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'var(--status-warning-bg)' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="6" y="4" width="24" height="28" rx="2" stroke={C.amber} strokeWidth="2" />
              <line x1="12" y1="12" x2="24" y2="12" stroke={C.amber} strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="17" x2="24" y2="17" stroke={C.amber} strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="22" x2="20" y2="22" stroke={C.amber} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Listing submitted</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8 leading-relaxed">
            Your land listing has been submitted for verification. Our team will review your documents and may contact you for the site visit. This usually takes 3–5 business days.
          </p>
          <PillButton onClick={() => nav('/land/my-listings')} fullWidth>View my listings</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="New Land Listing" back>
        <div className="flex gap-2">
          {(['details', 'documents'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: i <= ['details', 'documents'].indexOf(step) ? C.forest : C.parchmentDark, color: i <= ['details', 'documents'].indexOf(step) ? C.white : C.inkSubtle, fontFamily: FONT.mono }}>
                  {i + 1}
                </div>
                <span style={{ fontFamily: FONT.mono, color: i <= ['details', 'documents'].indexOf(step) ? C.forest : C.inkSubtle }} className="text-[10px] uppercase tracking-wide">{s}</span>
              </div>
              {i === 0 && <div className="flex-1 h-px" style={{ background: (step as string) === 'documents' || (step as string) === 'done' ? C.forest : C.parchmentDark }} />}
            </div>
          ))}
        </div>
      </Header>

      <div className="px-5 py-5 space-y-4 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        {step === 'details' ? (
          <>
            {[
              { key: 'title', label: 'Listing title', placeholder: 'e.g. 800m² plot — Bastos, Yaoundé' },
              { key: 'city', label: 'City', placeholder: 'e.g. Yaoundé' },
              { key: 'region', label: 'Region', placeholder: 'e.g. Centre' },
              { key: 'size', label: 'Plot size', placeholder: 'e.g. 800 m²' },
              { key: 'price', label: 'Asking price (XAF)', placeholder: 'e.g. 28000000' },
              { key: 'titleType', label: 'Title type', placeholder: 'e.g. Freehold title deed' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">{label}</label>
                <input value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
                  style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
              </div>
            ))}
            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3} placeholder="Describe the plot — access, utilities, neighbourhood..."
                className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm resize-none"
                style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl p-4 border" style={{ background: 'var(--status-info-bg)', borderColor: 'var(--status-info-text)' }}>
              <div style={{ fontFamily: FONT.mono, color: 'var(--status-info-text)' }} className="text-[10px] uppercase tracking-widest mb-1">Documents required</div>
              <p style={{ fontFamily: FONT.sans, color: 'var(--status-info-text)' }} className="text-xs leading-relaxed">
                All documents are verified by our team before the listing goes live. Required: title deed or ownership letter, land tax receipt, survey plan, and no-dispute certificate.
              </p>
            </div>
            {LISTING_DOC_TYPES.map(({ type, label }) => {
              const uploaded = uploadedTypes.includes(type)
              const uploading = uploadingType === type
              return (
                <label key={type}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all cursor-pointer"
                  style={{ borderColor: uploaded ? C.forest : C.parchmentDark, background: uploaded ? 'var(--status-success-bg)' : C.white, opacity: uploading ? 0.7 : 1 }}>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => uploadDocument(type, e.target.files?.[0] ?? null)}
                  />
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: uploaded ? C.forest : C.parchment }}>
                    {uploaded ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7L5.5 9.5L11 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M4 7H10M7 4V10" stroke={C.inkSubtle} strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{label}</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">
                      {uploading ? 'Uploading…' : uploaded ? 'Uploaded' : 'Tap to upload'}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={() => step === 'details' ? proceedToDocuments() : setStep('done')} fullWidth disabled={creating || uploadingType !== null}>
          {step === 'details' ? (creating ? 'Creating…' : 'Next: Upload documents') : 'Submit listing for verification'}
        </PillButton>
      </div>
    </AppShell>
  )
}

// ── My listings screen ─────────────────────────────────────────────────────────
export function MyListingsScreen() {
  const nav = useNavigate()
  const { landListings, offers, devUserId } = useApp()
  const mine = landListings.filter((l) => l.sellerId && l.sellerId === devUserId)

  return (
    <AppShell>
      <Header title="My Listings" back action={
        <button onClick={() => nav('/land/create')} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.forest }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 3V11M3 7H11" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      } />

      {mine.length === 0 ? (
        <div className="px-5 py-4">
          <EmptyState
            icon="mapPin"
            title="No listings yet"
            description="List a plot for sale and it'll show up here once submitted."
            action={<PillButton onClick={() => nav('/land/create')}>+ New listing</PillButton>}
            illustration="tilt"
          />
        </div>
      ) : (
        <StaggerList className="px-5 py-4 space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
          {mine.map((l) => {
            const listingOffers = offers.filter((o) => o.listingId === l.id && ['pending', 'countered'].includes(o.status))
            return (
              <StaggerItem key={l.id}>
                <Card variant="interactive" onClick={() => nav(`/land/listing/${l.id}`)}>
                  <div className="flex gap-3 p-4">
                    <img src={l.image} alt={l.title} className="w-20 h-16 object-cover rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div style={{ fontFamily: FONT.serif, color: C.ink }} className="font-bold text-sm leading-tight">{l.title}</div>
                        <StatusBadge status={l.verified ? 'verified' : 'unverified'} />
                      </div>
                      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider mb-1">{l.size}</div>
                      <div style={{ fontFamily: FONT.serif, color: C.forest }} className="font-bold">{fmt(l.price)}</div>
                      {listingOffers.length > 0 && (
                        <div style={{ fontFamily: FONT.mono, color: C.amber }} className="text-[9px] uppercase tracking-wider mt-1">{listingOffers.length} pending offer{listingOffers.length > 1 ? 's' : ''}</div>
                      )}
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            )
          })}
        </StaggerList>
      )}
    </AppShell>
  )
}
