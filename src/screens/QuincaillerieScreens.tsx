import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, fmt } from '../context'
import {
  useMaterials, type MaterialOrderItem, type InventoryItem,
} from '../materials'
import {
  C, FONT, AppShell, Card, PillButton, Header, StepIndicator,
  DashboardShell, DashboardHero, Stars, MomoOmPicker,
} from '../components/MobileLayout'
import { ChipGroup } from '../components/Chip'
import { Tabs } from '../components/Tabs'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { EmptyState } from '../components/EmptyState'
import { MaterialOrderCard } from '../components/MaterialOrderCard'
import { RegionSelect } from '../components/LocationSelect'
import { getCameroonRegionName } from '../utils/locationData'
import { AppIcon } from '../components/icons'
import { useToast } from '../components/Toast'

const CATEGORY_OPTIONS = ['Cement', 'Roofing', 'Plumbing', 'Electrical', 'Timber']
const UNIT_OPTIONS: InventoryItem['unit'][] = ['bag', 'sheet', 'meter', 'unit', 'roll', 'litre']

function toPaymentProvider(m: 'momo' | 'om'): 'mtn_momo' | 'orange_money' {
  return m === 'momo' ? 'mtn_momo' : 'orange_money'
}

// ── Quincaillerie registration / onboarding ──────────────────────────────
export function QuincaillerieRegistrationScreen() {
  const nav = useNavigate()
  const { registerQuincaillerie } = useMaterials()
  const [step, setStep] = useState<'business' | 'payout' | 'id'>('business')
  const [form, setForm] = useState({
    businessName: '', address: '', regionCode: '', categories: [] as string[], phone: '',
  })
  const [method, setMethod] = useState<'momo' | 'om'>('momo')
  const [payoutPhoneNumber, setPayoutPhoneNumber] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)

  const finish = () => {
    registerQuincaillerie({
      businessName: form.businessName.trim(),
      address: form.address.trim(),
      region: form.regionCode ? getCameroonRegionName(form.regionCode) : '',
      categories: form.categories,
      phone: form.phone.trim(),
      paymentProvider: toPaymentProvider(method),
      payoutPhoneNumber: payoutPhoneNumber.trim(),
      docUploaded: !!docFile,
    })
    nav('/quincaillerie/dashboard')
  }

  return (
    <AppShell noNav>
      <Header title="Register a Quincaillerie" back>
        <StepIndicator steps={['Business', 'Payout', 'Verification']} current={step === 'business' ? 0 : step === 'payout' ? 1 : 2} />
      </Header>

      <div className="px-5 py-5 space-y-4 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        {step === 'business' && (
          <>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
              Register your hardware/building-materials store so funders can pay you directly for materials on a milestone, instead of releasing cash to the contractor.
            </p>
            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Business name</label>
              <input
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                placeholder="e.g. Douala Quincaillerie Centrale"
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
              <ChipGroup options={CATEGORY_OPTIONS} value={form.categories} onChange={(v) => setForm({ ...form, categories: v as string[] })} multiple />
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
            <PillButton onClick={finish} fullWidth disabled={!docFile}>Complete registration</PillButton>
          </>
        )}
      </div>
    </AppShell>
  )
}

// ── Quincaillerie dashboard ───────────────────────────────────────────────
export function QuincaillerieDashboardScreen() {
  const nav = useNavigate()
  const { show: showToast } = useToast()
  const {
    myQuincaillerie, getInventoryForQuincaillerie, addInventoryItem, updateInventoryItem, removeInventoryItem,
    getOrdersForQuincaillerie, confirmMaterialOrder, rejectMaterialOrder,
  } = useMaterials()
  const [tab, setTab] = useState<'inventory' | 'orders' | 'history'>('orders')
  const [newItem, setNewItem] = useState({ itemName: '', category: CATEGORY_OPTIONS[0], unit: 'bag' as InventoryItem['unit'], currentPrice: '' })

  if (!myQuincaillerie || myQuincaillerie.verificationStatus !== 'verified') {
    const isPending = myQuincaillerie?.verificationStatus === 'pending'
    const isRejected = myQuincaillerie?.verificationStatus === 'rejected'
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
            {isPending ? 'Application under review' : isRejected ? "Registration wasn't approved" : 'Register your quincaillerie'}
          </div>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mb-6 max-w-sm text-sm">
            {isPending
              ? "An admin is reviewing your registration. You'll start receiving material order requests once approved."
              : isRejected
                ? 'You can update your details and resubmit for review.'
                : 'Register your store to start receiving material order requests tied to real milestones.'}
          </p>
          {!isPending && <PillButton onClick={() => nav('/quincaillerie/register')}>{isRejected ? 'Resubmit registration' : 'Get started'}</PillButton>}
        </div>
      </AppShell>
    )
  }

  const inventory = getInventoryForQuincaillerie(myQuincaillerie.id)
  const orders = getOrdersForQuincaillerie(myQuincaillerie.id)
  const requested = orders.filter((o) => o.status === 'requested')
  const history = orders.filter((o) => o.status !== 'requested')
  const earnings = orders.filter((o) => o.status === 'confirmed' || o.status === 'fulfilled' || o.status === 'delivered').reduce((s, o) => s + o.totalAmount, 0)

  const submitNewItem = () => {
    if (!newItem.itemName.trim() || !newItem.currentPrice) return
    addInventoryItem(myQuincaillerie.id, { itemName: newItem.itemName.trim(), category: newItem.category, unit: newItem.unit, currentPrice: Number(newItem.currentPrice) })
    setNewItem({ itemName: '', category: CATEGORY_OPTIONS[0], unit: 'bag', currentPrice: '' })
    showToast({ title: 'Item added', tone: 'success' })
  }

  return (
    <AppShell>
      <DashboardShell>
        <DashboardHero
          eyebrow="Quincaillerie"
          title={myQuincaillerie.businessName}
          background={`linear-gradient(135deg, ${C.moss} 0%, ${C.forest} 100%)`}
          stats={[
            { label: 'Pending orders', value: String(requested.length) },
            { label: 'Completed', value: String(myQuincaillerie.completedOrderCount) },
            { label: 'Rating', value: myQuincaillerie.averageRating > 0 ? myQuincaillerie.averageRating.toFixed(1) : '—' },
          ]}
          action={
            <button onClick={() => nav(`/quincaillerie/profile/${myQuincaillerie.id}`)} className="rounded-full px-4 py-2.5 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
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
                      onClick={() => { confirmMaterialOrder(order.id); showToast({ title: 'Order confirmed — receipt generated', tone: 'success' }) }}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
                      style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
                    >
                      Confirm pricing & fulfill
                    </button>
                    <button
                      onClick={() => { rejectMaterialOrder(order.id, 'Item(s) currently out of stock'); showToast({ title: 'Order rejected', tone: 'info' }) }}
                      className="px-3 py-2 rounded-lg text-xs font-semibold border"
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
              <div className="p-4 space-y-3">
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Add item</div>
                <input
                  value={newItem.itemName}
                  onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
                  placeholder="Item name"
                  className="w-full border-2 rounded-xl px-3 py-2 outline-none text-sm"
                  style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
                />
                <ChipGroup options={CATEGORY_OPTIONS} value={newItem.category} onChange={(v) => setNewItem({ ...newItem, category: v as string })} />
                <div className="flex gap-2">
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value as InventoryItem['unit'] })}
                    className="border-2 rounded-xl px-3 py-2 outline-none text-sm"
                    style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
                  >
                    {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input
                    value={newItem.currentPrice}
                    onChange={(e) => setNewItem({ ...newItem, currentPrice: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="Price (XAF)"
                    inputMode="numeric"
                    className="flex-1 border-2 rounded-xl px-3 py-2 outline-none text-sm"
                    style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
                  />
                </div>
                <PillButton onClick={submitNewItem} fullWidth disabled={!newItem.itemName.trim() || !newItem.currentPrice}>Add to inventory</PillButton>
              </div>
            </Card>

            {inventory.length === 0 ? (
              <EmptyState icon="clipboard" title="No items yet" description="Add what you stock so contractors can order it against a milestone." illustration="tilt" />
            ) : (
              <StaggerList className="space-y-2">
                {inventory.map((item) => (
                  <StaggerItem key={item.id}>
                    <Card>
                      <div className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold truncate">{item.itemName}</div>
                          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{item.category} · per {item.unit}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <input
                            value={item.currentPrice}
                            onChange={(e) => updateInventoryItem(item.id, { currentPrice: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 })}
                            className="w-24 border-2 rounded-lg px-2 py-1.5 text-xs text-right outline-none"
                            style={{ borderColor: C.parchmentDark, fontFamily: FONT.mono, color: C.ink }}
                          />
                          <button onClick={() => removeInventoryItem(item.id)} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: 'var(--status-error-text)' }}>
                            <AppIcon name="close" size={14} />
                          </button>
                        </div>
                      </div>
                    </Card>
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
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

// ── Request materials (contractor/recipient side) ────────────────────────
export function RequestMaterialsScreen() {
  const nav = useNavigate()
  const { projectId, milestoneId } = useParams()
  const { projects, name, devUserId } = useApp()
  const { quincailleries, getInventoryForQuincaillerie, requestMaterialOrder } = useMaterials()

  const project = projects.find((p) => p.id === projectId)
  const milestone = project?.milestones.find((m) => m.id === milestoneId)

  const [category, setCategory] = useState('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cart, setCart] = useState<Record<string, number>>({}) // inventoryItemId -> quantity
  const [customItems, setCustomItems] = useState<MaterialOrderItem[]>([])
  const [customForm, setCustomForm] = useState({ name: '', quantity: '1', unitPrice: '' })
  const [submitted, setSubmitted] = useState(false)

  const addCustomItem = () => {
    const quantity = Number(customForm.quantity) || 0
    const unitPrice = Number(customForm.unitPrice) || 0
    if (!customForm.name.trim() || quantity <= 0 || unitPrice <= 0) return
    setCustomItems((items) => [...items, { inventoryItemId: null, name: customForm.name.trim(), quantity, unitPrice, subtotal: quantity * unitPrice }])
    setCustomForm({ name: '', quantity: '1', unitPrice: '' })
  }

  const verified = quincailleries.filter((q) => q.verificationStatus === 'verified')
  const filtered = category === 'All' ? verified : verified.filter((q) => q.registeredCategories.includes(category))
  const selected = quincailleries.find((q) => q.id === selectedId) ?? null
  const selectedInventory = selected ? getInventoryForQuincaillerie(selected.id) : []

  const cartItems: MaterialOrderItem[] = [
    ...selectedInventory
      .filter((i) => (cart[i.id] ?? 0) > 0)
      .map((i) => ({ inventoryItemId: i.id, name: i.itemName, quantity: cart[i.id], unitPrice: i.currentPrice, subtotal: cart[i.id] * i.currentPrice })),
    ...customItems,
  ]
  const total = cartItems.reduce((s, it) => s + it.subtotal, 0)

  const submit = () => {
    if (!selected || !project || !milestone || cartItems.length === 0) return
    requestMaterialOrder({
      projectId: project.id, projectTitle: project.title, milestoneId: milestone.id, milestoneTitle: milestone.title,
      quincaillerieId: selected.id, requestedBy: name || 'You', requestedById: devUserId ?? undefined,
      items: cartItems.map(({ inventoryItemId, name: n, quantity, unitPrice }) => ({ inventoryItemId, name: n, quantity, unitPrice })),
    })
    setSubmitted(true)
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
          <PillButton onClick={() => nav(`/funder/project/${project.id}`)} fullWidth>Back to project</PillButton>
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
              <ChipGroup options={['All', ...CATEGORY_OPTIONS]} value={category} onChange={(v) => setCategory(v as string)} />
            </div>
            {filtered.length === 0 ? (
              <EmptyState icon="store" title="No verified quincailleries in this category yet" illustration="tilt" />
            ) : (
              <StaggerList className="space-y-2">
                {filtered.map((q) => (
                  <StaggerItem key={q.id}>
                    <Card variant="interactive" onClick={() => setSelectedId(q.id)}>
                      <div className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: C.forest }}>
                          <AppIcon name="store" size={18} style={{ color: '#fff' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold truncate">{q.businessName}</div>
                            <AppIcon name="shieldCheck" size={13} style={{ color: C.forest }} />
                          </div>
                          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{q.address}, {q.region}</div>
                          <Stars rating={q.averageRating} />
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
                <Card key={item.id}>
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold truncate">{item.itemName}</div>
                      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{fmt(item.currentPrice)} per {item.unit}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setCart({ ...cart, [item.id]: Math.max(0, (cart[item.id] ?? 0) - 1) })}
                        className="w-7 h-7 rounded-full border flex items-center justify-center text-sm font-bold"
                        style={{ borderColor: C.parchmentDark }}
                      >−</button>
                      <span style={{ fontFamily: FONT.mono, color: C.ink }} className="w-6 text-center text-sm">{cart[item.id] ?? 0}</span>
                      <button
                        onClick={() => setCart({ ...cart, [item.id]: (cart[item.id] ?? 0) + 1 })}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: C.forest }}
                      >+</button>
                    </div>
                  </div>
                </Card>
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
          <PillButton onClick={submit} fullWidth disabled={cartItems.length === 0}>Send order request</PillButton>
        </div>
      )}
    </AppShell>
  )
}

// ── Quincaillerie public profile ──────────────────────────────────────────
export function QuincaillerieProfileScreen() {
  const { id } = useParams()
  const { quincailleries, getInventoryForQuincaillerie } = useMaterials()
  const quincaillerie = quincailleries.find((q) => q.id === id)

  if (!quincaillerie) {
    return (
      <AppShell>
        <Header title="Quincaillerie" back />
        <div className="px-5 py-8">
          <EmptyState icon="store" title="Not found" illustration="tilt" />
        </div>
      </AppShell>
    )
  }

  const inventory = getInventoryForQuincaillerie(quincaillerie.id)

  return (
    <AppShell>
      <Header title={quincaillerie.businessName} back tone="dark" background={C.forest}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ background: 'rgba(255,255,255,0.15)', fontFamily: FONT.serif }}>
            {quincaillerie.businessName[0]}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <div style={{ fontFamily: FONT.serif }} className="text-xl font-bold text-white">{quincaillerie.businessName}</div>
              {quincaillerie.verificationStatus === 'verified' && <AppIcon name="shieldCheck" size={16} style={{ color: '#fff' }} />}
            </div>
            <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[10px] uppercase tracking-wider mt-0.5">{quincaillerie.address}, {quincaillerie.region}</div>
          </div>
        </div>
      </Header>

      <div className="px-5 py-5 space-y-4 sm:mx-auto sm:max-w-2xl">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Rating', value: quincaillerie.averageRating > 0 ? quincaillerie.averageRating.toFixed(1) : '—' },
            { label: 'Completed', value: String(quincaillerie.completedOrderCount) },
            { label: 'Status', value: quincaillerie.verificationStatus === 'verified' ? 'Verified' : 'Pending' },
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
            {quincaillerie.registeredCategories.map((c) => (
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
              {inventory.map((item) => (
                <Card key={item.id}>
                  <div className="p-3 flex items-center justify-between">
                    <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">{item.itemName}</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs">{fmt(item.currentPrice)} / {item.unit}</div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
