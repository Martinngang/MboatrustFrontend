import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fmt } from '../context'
import { useMaterials, type MaterialOrderItem } from '../materials'
import { useMyInventoryQuery, useSupplierInventoryQuery } from '../api/inventoryItems'
import { useProjectQuery } from '../api/projects'
import {
  useMaterialOrdersForMySupplierQuery, useConfirmMaterialOrderMutation, useRejectMaterialOrderMutation,
  useCreateMaterialOrderMutation,
} from '../api/materialOrders'
import {
  C, FONT, AppShell, Card, PillButton, Header, StepIndicator,
  DashboardShell, DashboardHero, Stars, MomoOmPicker,
} from '../components/MobileLayout'
import { ChipGroup } from '../components/Chip'
import { Tabs } from '../components/Tabs'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { EmptyState } from '../components/EmptyState'
import { MaterialOrderCard } from '../components/MaterialOrderCard'
import { InventoryItemCard } from '../components/InventoryItemCard'
import { RegionSelect } from '../components/LocationSelect'
import { getCameroonRegionName } from '../utils/locationData'
import { CATEGORY_NAMES } from '../inventoryTaxonomy'
import { AppIcon } from '../components/icons'
import { useToast } from '../components/Toast'

function toPaymentProvider(m: 'momo' | 'om'): 'mtn_momo' | 'orange_money' {
  return m === 'momo' ? 'mtn_momo' : 'orange_money'
}

// ── Supplier registration / onboarding ──────────────────────────────
export function SupplierRegistrationScreen() {
  const nav = useNavigate()
  const { show: showToast } = useToast()
  const { registerSupplier } = useMaterials()
  const [step, setStep] = useState<'business' | 'payout' | 'id'>('business')
  const [form, setForm] = useState({
    businessName: '', address: '', regionCode: '', categories: [] as string[], phone: '',
  })
  const [method, setMethod] = useState<'momo' | 'om'>('momo')
  const [payoutPhoneNumber, setPayoutPhoneNumber] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const finish = async () => {
    setSubmitting(true)
    try {
      await registerSupplier({
        businessName: form.businessName.trim(),
        address: form.address.trim(),
        region: form.regionCode ? getCameroonRegionName(form.regionCode) : '',
        categories: form.categories,
        phone: form.phone.trim(),
        paymentProvider: toPaymentProvider(method),
        payoutPhoneNumber: payoutPhoneNumber.trim(),
        docUploaded: !!docFile,
      })
      nav('/supplier/dashboard')
    } catch {
      showToast({ title: 'Registration failed', description: 'Please check your connection and try again.', tone: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell noNav>
      <Header title="Register as a Supplier" back>
        <StepIndicator steps={['Business', 'Payout', 'Verification']} current={step === 'business' ? 0 : step === 'payout' ? 1 : 2} />
      </Header>

      <div className="px-5 py-5 space-y-4 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        {step === 'business' && (
          <>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
              Register your construction-materials business — quincaillerie, sand, blocks, stone, cement, steel, timber, roofing, plumbing/electrical supplies, or any other building-materials trade — so funders can pay you directly for materials on a milestone, instead of releasing cash to the contractor.
            </p>
            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Business name</label>
              <input
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                placeholder="e.g. Douala Building Supplies Co."
                className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
                style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
              />
            </div>
            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Address</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street, quarter"
                className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
                style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
              />
            </div>
            <RegionSelect value={form.regionCode} onChange={(regionCode) => setForm({ ...form, regionCode })} label="Region" />
            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-2">What do you stock?</label>
              <ChipGroup options={CATEGORY_NAMES} value={form.categories} onChange={(v) => setForm({ ...form, categories: v as string[] })} multiple />
            </div>
            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+237 6XX XXX XXX"
                className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
                style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
              />
            </div>
            <PillButton
              onClick={() => setStep('payout')}
              fullWidth
              disabled={!form.businessName.trim() || !form.regionCode || form.categories.length === 0}
            >
              Next: Payout details
            </PillButton>
          </>
        )}

        {step === 'payout' && (
          <>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
              When a funder approves a materials milestone, payment is released straight to this account.
            </p>
            <MomoOmPicker method={method} onChange={setMethod} />
            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Payout number</label>
              <input
                value={payoutPhoneNumber}
                onChange={(e) => setPayoutPhoneNumber(e.target.value)}
                placeholder="+237 6XX XXX XXX"
                className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
                style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
              />
            </div>
            <PillButton onClick={() => setStep('id')} fullWidth disabled={!payoutPhoneNumber.trim()}>Next: Verification</PillButton>
          </>
        )}

        {step === 'id' && (
          <>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
              Upload a business registration document or trader's ID. An admin reviews this before your listing shows as verified to funders and contractors.
            </p>
            <label
              className="w-full border-2 border-dashed rounded-2xl py-10 flex flex-col items-center gap-3 transition-all cursor-pointer"
              style={{ borderColor: docFile ? C.forest : C.parchmentDark, background: docFile ? 'var(--status-success-bg)' : C.white }}
            >
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} />
              {docFile ? (
                <>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: C.forest }}>
                    <AppIcon name="check" size={22} style={{ color: '#fff' }} />
                  </div>
                  <span style={{ fontFamily: FONT.sans, color: C.forest }} className="text-sm font-semibold">{docFile.name}</span>
                </>
              ) : (
                <>
                  <AppIcon name="idCard" size={32} style={{ color: C.inkSubtle }} strokeWidth={1.5} />
                  <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">Tap to upload document</span>
                  <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">JPG, PNG or PDF</span>
                </>
              )}
            </label>
            <PillButton onClick={finish} fullWidth disabled={!docFile || submitting}>{submitting ? 'Submitting…' : 'Complete registration'}</PillButton>
          </>
        )}
      </div>
    </AppShell>
  )
}

// ── Supplier dashboard ───────────────────────────────────────────────
export function SupplierDashboardScreen() {
  const nav = useNavigate()
  const { show: showToast } = useToast()
  const { mySupplier, isLoadingMySupplier } = useMaterials()
  const [tab, setTab] = useState<'inventory' | 'orders' | 'history'>('orders')
  const { data: inventorySummary } = useMyInventoryQuery({ status: 'all', limit: 1 }, Boolean(mySupplier))
  const { data: lowStockSummary } = useMyInventoryQuery({ status: 'active', lowStockOnly: true, limit: 1 }, Boolean(mySupplier))
  const isVerified = mySupplier?.verificationStatus === 'verified'
  const { data: orders = [] } = useMaterialOrdersForMySupplierQuery('all', isVerified)
  const confirmOrder = useConfirmMaterialOrderMutation()
  const rejectOrder = useRejectMaterialOrderMutation()

  if (isLoadingMySupplier) return <AppShell noNav>{null}</AppShell>

  if (!mySupplier || mySupplier.verificationStatus !== 'verified') {
    const isPending = mySupplier?.verificationStatus === 'pending'
    const isRejected = mySupplier?.verificationStatus === 'rejected'
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: isRejected ? 'var(--status-error-bg)' : 'var(--status-info-bg)', color: isRejected ? 'var(--status-error-text)' : 'var(--status-info-text)' }}
          >
            <AppIcon name={isPending ? 'hourglass' : isRejected ? 'alert' : 'store'} size={30} strokeWidth={1.5} />
          </div>
          <div style={{ fontFamily: FONT.serif }} className="mb-2 text-lg font-bold">
            {isPending ? 'Application under review' : isRejected ? "Registration wasn't approved" : 'Register as a supplier'}
          </div>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mb-6 max-w-sm text-sm">
            {isPending
              ? "An admin is reviewing your registration. You'll start receiving material order requests once approved."
              : isRejected
                ? 'You can update your details and resubmit for review.'
                : 'Register your store to start receiving material order requests tied to real milestones.'}
          </p>
          {!isPending && <PillButton onClick={() => nav('/supplier/register')}>{isRejected ? 'Resubmit registration' : 'Get started'}</PillButton>}
        </div>
      </AppShell>
    )
  }

  const requested = orders.filter((o) => o.status === 'requested')
  const history = orders.filter((o) => o.status !== 'requested')
  const earnings = orders.filter((o) => o.status === 'confirmed' || o.status === 'out_for_delivery' || o.status === 'delivered').reduce((s, o) => s + o.totalAmount, 0)

  return (
    <AppShell>
      <DashboardShell>
        <DashboardHero
          eyebrow="Supplier"
          title={mySupplier.businessName}
          background={`linear-gradient(135deg, ${C.moss} 0%, ${C.forest} 100%)`}
          stats={[
            { label: 'Pending orders', value: String(requested.length) },
            { label: 'Completed', value: String(mySupplier.completedOrderCount) },
            { label: 'Rating', value: mySupplier.averageRating > 0 ? mySupplier.averageRating.toFixed(1) : '—' },
          ]}
          action={
            <button onClick={() => nav(`/supplier/profile/${mySupplier.id}`)} className="rounded-full px-4 py-2.5 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
              View public profile →
            </button>
          }
        />

        <div className="mt-6">
          <Tabs
            tabs={[{ id: 'orders', label: `Orders${requested.length > 0 ? ` (${requested.length})` : ''}` }, { id: 'inventory', label: 'Inventory' }, { id: 'history', label: 'History' }]}
            value={tab}
            onChange={(v) => setTab(v as typeof tab)}
            variant="pill"
          />
        </div>

        {tab === 'orders' && (
          <div className="mt-4 space-y-3">
            {requested.length === 0 ? (
              <Card><div className="p-4 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>No incoming order requests right now.</div></Card>
            ) : (
              requested.map((order) => (
                <div key={order.id}>
                  <MaterialOrderCard order={order} />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={async () => {
                        try {
                          await confirmOrder.mutateAsync({ orderId: order.id })
                          showToast({ title: 'Order confirmed — receipt generated', tone: 'success' })
                        } catch {
                          showToast({ title: 'Failed to confirm order', tone: 'error' })
                        }
                      }}
                      disabled={confirmOrder.isPending || rejectOrder.isPending}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                      style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
                    >
                      Confirm pricing & fulfill
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await rejectOrder.mutateAsync({ orderId: order.id, reason: 'Item(s) currently out of stock' })
                          showToast({ title: 'Order rejected', tone: 'info' })
                        } catch {
                          showToast({ title: 'Failed to reject order', tone: 'error' })
                        }
                      }}
                      disabled={confirmOrder.isPending || rejectOrder.isPending}
                      className="px-3 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50"
                      style={{ borderColor: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'inventory' && (
          <div className="mt-4 space-y-4">
            <Card>
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex gap-5">
                  <div>
                    <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-xl font-bold">{inventorySummary?.total ?? 0}</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">Products</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: FONT.serif, color: (lowStockSummary?.total ?? 0) > 0 ? 'var(--status-error-text)' : C.ink }} className="text-xl font-bold">{lowStockSummary?.total ?? 0}</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">Low stock</div>
                  </div>
                </div>
                <PillButton onClick={() => nav('/supplier/inventory')}>Manage inventory →</PillButton>
              </div>
            </Card>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="px-1 text-xs">
              A full product catalogue — categories, images, specs, stock levels and more — lives on its own page so it doesn't crowd this dashboard.
            </p>
          </div>
        )}

        {tab === 'history' && (
          <div className="mt-4 space-y-3">
            <Card>
              <div className="p-4 flex items-center justify-between">
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Total earnings</div>
                <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-bold">{fmt(earnings)}</div>
              </div>
            </Card>
            {history.length === 0 ? (
              <Card><div className="p-4 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>No completed orders yet.</div></Card>
            ) : (
              history.map((order) => <MaterialOrderCard key={order.id} order={order} compact />)
            )}
          </div>
        )}
      </DashboardShell>
    </AppShell>
  )
}

// ── Request materials (funder/contractor side) ─────────────────
export function RequestMaterialsScreen() {
  const nav = useNavigate()
  const { projectId, milestoneId } = useParams()
  const { show: showToast } = useToast()
  // Pillar-agnostic single-project fetch (funding or tender) — this screen
  // is reached from a contractor's active tender contract, which
  // useApp().projects (funding-only) could never resolve.
  const { data: project, isLoading: projectLoading } = useProjectQuery(projectId)
  const { suppliers } = useMaterials()
  const createOrder = useCreateMaterialOrderMutation()

  const milestone = project?.milestones.find((m) => m.id === milestoneId)

  const [category, setCategory] = useState('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cart, setCart] = useState<Record<string, number>>({}) // inventoryItemId -> quantity
  const [customItems, setCustomItems] = useState<MaterialOrderItem[]>([])
  const [customForm, setCustomForm] = useState({ name: '', quantity: '1', unitPrice: '' })
  const [submitted, setSubmitted] = useState(false)

  // The project owner chose a preferred supplier at creation time (see
  // PostJobScreen) — pre-select it so the requester skips the store-picker
  // step entirely, rather than asking them to re-find a store that was
  // already decided on when the project was posted.
  useEffect(() => {
    if (project?.materialsManagedBy === 'supplier' && project.preferredSupplierId && !selectedId) {
      setSelectedId(project.preferredSupplierId)
    }
  }, [project, selectedId])

  const addCustomItem = () => {
    const quantity = Number(customForm.quantity) || 0
    const unitPrice = Number(customForm.unitPrice) || 0
    if (!customForm.name.trim() || quantity <= 0 || unitPrice <= 0) return
    setCustomItems((items) => [...items, { inventoryItemId: null, name: customForm.name.trim(), quantity, unitPrice, subtotal: quantity * unitPrice }])
    setCustomForm({ name: '', quantity: '1', unitPrice: '' })
  }

  const verified = suppliers.filter((s) => s.verificationStatus === 'verified')
  const filtered = category === 'All' ? verified : verified.filter((s) => s.registeredCategories.includes(category))
  const selected = suppliers.find((s) => s.id === selectedId) ?? null
  const { data: selectedInventory = [] } = useSupplierInventoryQuery(selected?.id)

  const cartItems: MaterialOrderItem[] = [
    ...selectedInventory
      .filter((i) => (cart[i.id] ?? 0) > 0)
      .map((i) => ({ inventoryItemId: i.id, name: i.name, quantity: cart[i.id], unitPrice: i.price, subtotal: cart[i.id] * i.price })),
    ...customItems,
  ]
  const total = cartItems.reduce((s, it) => s + it.subtotal, 0)

  const submit = async () => {
    if (!selected || !project || !milestone || cartItems.length === 0) return
    try {
      await createOrder.mutateAsync({
        projectId: project.id, milestoneId: milestone.id, supplierId: selected.id,
        items: cartItems.map(({ inventoryItemId, name: n, quantity, unitPrice }) => ({ inventoryItemId, name: n, quantity, unitPrice })),
      })
      setSubmitted(true)
    } catch {
      showToast({ title: 'Failed to send order request', description: 'Please check your connection and try again.', tone: 'error' })
    }
  }

  if (projectLoading) {
    return <AppShell noNav>{null}</AppShell>
  }

  if (!project || !milestone) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <EmptyState icon="store" title="Milestone not found" illustration="tilt" />
        </div>
      </AppShell>
    )
  }

  if (submitted) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: C.forest }}>
            <AppIcon name="checkCircle" size={36} style={{ color: '#fff' }} strokeWidth={1.5} />
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Order sent</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            {selected?.businessName} will confirm pricing and availability. You'll see the digital receipt here once they do.
          </p>
          <PillButton onClick={() => nav(-1)} fullWidth>Back to project</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Request Materials" subtitle={`${milestone.title} — ${project.title}`} back />

      <div className="px-5 py-5 space-y-4 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        {!selected ? (
          <>
            <div className="overflow-x-auto pb-1">
              <ChipGroup options={['All', ...CATEGORY_NAMES]} value={category} onChange={(v) => setCategory(v as string)} />
            </div>
            {filtered.length === 0 ? (
              <EmptyState icon="store" title="No verified suppliers in this category yet" illustration="tilt" />
            ) : (
              <StaggerList className="space-y-2">
                {filtered.map((s) => (
                  <StaggerItem key={s.id}>
                    <Card variant="interactive" onClick={() => setSelectedId(s.id)}>
                      <div className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: C.forest }}>
                          <AppIcon name="store" size={18} style={{ color: '#fff' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold truncate">{s.businessName}</div>
                            <AppIcon name="shieldCheck" size={13} style={{ color: C.forest }} />
                          </div>
                          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{s.address}, {s.region}</div>
                          <Stars rating={s.averageRating} />
                        </div>
                      </div>
                    </Card>
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </>
        ) : (
          <>
            <button onClick={() => setSelectedId(null)} style={{ fontFamily: FONT.sans, color: C.forest }} className="text-sm font-semibold">← Choose a different store</button>
            <Card>
              <div className="p-4">
                <div style={{ fontFamily: FONT.sans }} className="font-bold">{selected.businessName}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{selected.address}, {selected.region}</div>
              </div>
            </Card>

            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Their inventory</div>
            <div className="space-y-2">
              {selectedInventory.length === 0 ? (
                <div style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs italic">This store hasn't listed any items yet — add a custom item below.</div>
              ) : selectedInventory.map((item) => (
                <InventoryItemCard
                  key={item.id}
                  item={item}
                  quantityControl={{ quantity: cart[item.id] ?? 0, onChange: (q) => setCart({ ...cart, [item.id]: q }) }}
                />
              ))}
            </div>

            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Add a custom item</div>
            <Card>
              <div className="p-3 space-y-2">
                <input
                  value={customForm.name}
                  onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                  placeholder="Item not in their list"
                  className="w-full border-2 rounded-lg px-3 py-2 outline-none text-sm"
                  style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
                />
                <div className="flex gap-2">
                  <input
                    value={customForm.quantity}
                    onChange={(e) => setCustomForm({ ...customForm, quantity: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="Qty"
                    inputMode="numeric"
                    className="w-20 border-2 rounded-lg px-3 py-2 outline-none text-sm"
                    style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
                  />
                  <input
                    value={customForm.unitPrice}
                    onChange={(e) => setCustomForm({ ...customForm, unitPrice: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="Unit price (XAF)"
                    inputMode="numeric"
                    className="flex-1 border-2 rounded-lg px-3 py-2 outline-none text-sm"
                    style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
                  />
                  <button
                    onClick={addCustomItem}
                    disabled={!customForm.name.trim() || !customForm.unitPrice}
                    className="px-4 rounded-lg text-sm font-semibold disabled:opacity-50"
                    style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
                  >
                    Add
                  </button>
                </div>
                {customItems.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {customItems.map((it, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span style={{ fontFamily: FONT.sans, color: C.inkMuted }}>{it.quantity}× {it.name}</span>
                        <button onClick={() => setCustomItems((items) => items.filter((_, idx) => idx !== i))} style={{ color: 'var(--status-error-text)' }}>
                          <AppIcon name="close" size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {cartItems.length > 0 && (
              <div className="rounded-2xl border p-4 space-y-2" style={{ borderColor: C.parchmentDark, background: C.parchment }}>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Order summary</div>
                {cartItems.map((it, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span style={{ fontFamily: FONT.sans, color: C.inkMuted }}>{it.quantity}× {it.name}</span>
                    <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>{fmt(it.subtotal)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: C.parchmentDark }}>
                  <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">Total</span>
                  <span style={{ fontFamily: FONT.serif, color: C.ink }} className="text-base font-bold">{fmt(total)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
          <PillButton onClick={submit} fullWidth disabled={cartItems.length === 0 || createOrder.isPending}>
            {createOrder.isPending ? 'Sending…' : 'Send order request'}
          </PillButton>
        </div>
      )}
    </AppShell>
  )
}

// ── Supplier public profile ──────────────────────────────────────
export function SupplierProfileScreen() {
  const { id } = useParams()
  const { suppliers } = useMaterials()
  const supplier = suppliers.find((s) => s.id === id)
  const { data: inventory = [] } = useSupplierInventoryQuery(supplier?.id)

  if (!supplier) {
    return (
      <AppShell>
        <Header title="Supplier" back />
        <div className="px-5 py-8">
          <EmptyState icon="store" title="Not found" illustration="tilt" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title={supplier.businessName} back tone="dark" background={C.forest}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ background: 'rgba(255,255,255,0.15)', fontFamily: FONT.serif }}>
            {supplier.businessName[0]}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <div style={{ fontFamily: FONT.serif }} className="text-xl font-bold text-white">{supplier.businessName}</div>
              {supplier.verificationStatus === 'verified' && <AppIcon name="shieldCheck" size={16} style={{ color: '#fff' }} />}
            </div>
            <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[10px] uppercase tracking-wider mt-0.5">{supplier.address}, {supplier.region}</div>
          </div>
        </div>
      </Header>

      <div className="px-5 py-5 space-y-4 sm:mx-auto sm:max-w-2xl">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Rating', value: supplier.averageRating > 0 ? supplier.averageRating.toFixed(1) : '—' },
            { label: 'Completed', value: String(supplier.completedOrderCount) },
            { label: 'Status', value: supplier.verificationStatus === 'verified' ? 'Verified' : 'Pending' },
          ].map(({ label, value }) => (
            <Card key={label}>
              <div className="p-3 text-center">
                <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-bold">{value}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            </Card>
          ))}
        </div>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Categories</p>
          <div className="flex flex-wrap gap-2">
            {supplier.registeredCategories.map((c) => (
              <span key={c} className="rounded-full px-3 py-1 text-xs" style={{ background: C.parchment, color: C.inkMuted, fontFamily: FONT.sans }}>{c}</span>
            ))}
          </div>
        </div>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Inventory</p>
          {inventory.length === 0 ? (
            <Card><div className="p-4 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>No items listed yet.</div></Card>
          ) : (
            <div className="space-y-2">
              {inventory.map((item) => <InventoryItemCard key={item.id} item={item} />)}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
