import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useApp } from '../context'
import {
  useContractorPortfolioQuery, useContractorCompletedWorkQuery, useContractorLeaderboardQuery,
  useUpsertMyContractorProfileMutation, type PortfolioImage,
} from '../api/contractors'
import { useCertificationsForUserQuery } from '../api/certifications'
import { useRatingsQuery } from '../api/reputation'
import { C, FONT, AppShell, Card, Header, PillButton, Stars, StatusBadge, ThemeToggle } from '../components/MobileLayout'
import { ChipGroup } from '../components/Chip'
import { EmptyState } from '../components/EmptyState'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { AppIcon } from '../components/icons'
import { useToast } from '../components/Toast'
import { apiErrorMessage } from '../api/client'

const TRADES = ['Civil & Masonry', 'Plumbing & Water', 'Electrical', 'Roofing', 'Carpentry', 'Painting', 'Excavation', 'Solar Installation']
const REGIONS = ['Centre', 'Littoral', 'North West', 'South West', 'West', 'Far North', 'North', 'Adamawa', 'East', 'South']

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card variant="glass">
      <div className="p-3 text-center">
        <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-bold">{value}</div>
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider mt-0.5">{label}</div>
      </div>
    </Card>
  )
}

// ── Public-facing contractor portfolio — what a funder sees when
// evaluating a contractor, and what the contractor sees as "how funders
// see me" from their own edit screen. ─────────────────────────────────────
export function ContractorPortfolioScreen() {
  const nav = useNavigate()
  const { userId } = useParams()
  const { devUserId } = useApp()
  const isSelf = devUserId === userId
  const { data: portfolio, isLoading } = useContractorPortfolioQuery(userId)
  const { data: completedWork = [] } = useContractorCompletedWorkQuery(userId)
  const { data: certifications = [] } = useCertificationsForUserQuery(userId)
  const { data: reviews = [] } = useRatingsQuery({ toUserId: userId, roleContext: 'contractor' })

  if (isLoading || !portfolio) return <AppShell noNav>{null}</AppShell>

  const initials = (portfolio.fullName || '').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '—'
  const verifiedCertCount = certifications.filter((c) => c.status === 'verified').length

  return (
    <AppShell>
      <Header title="Contractor Portfolio" back tone="dark" background={C.forest}>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)', fontFamily: FONT.serif }}>
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <div style={{ fontFamily: FONT.serif }} className="text-xl font-bold text-white truncate">{portfolio.fullName}</div>
              {portfolio.kycStatus === 'verified' && <AppIcon name="shieldCheck" size={16} style={{ color: '#fff' }} />}
            </div>
            {portfolio.headline && (
              <div style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.85)' }} className="text-sm mt-1">{portfolio.headline}</div>
            )}
            <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[10px] uppercase tracking-wider mt-1">
              {portfolio.categories[0] ?? 'General Contracting'}{portfolio.regions[0] ? ` · ${portfolio.regions[0]}` : ''}
            </div>
          </div>
        </div>
      </Header>

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        {isSelf && (
          <div className="flex gap-2">
            <PillButton onClick={() => nav('/contractor/portfolio/edit')} fullWidth>Edit portfolio</PillButton>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          <StatTile label="Completed" value={String(portfolio.stats.completedProjects)} />
          <StatTile label="Rating" value={portfolio.stats.ratingCount > 0 ? `${(portfolio.stats.avgRating ?? 0).toFixed(1)}` : '—'} />
          <StatTile label="Years exp." value={String(portfolio.yearsExperience)} />
          <StatTile label="Completion" value={`${Math.round(portfolio.stats.completionRate * 100)}%`} />
        </div>

        {portfolio.bio && (
          <Card><div className="p-4">
            <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">About</p>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm leading-relaxed">{portfolio.bio}</p>
          </div></Card>
        )}

        {portfolio.categories.length > 0 && (
          <div>
            <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Skills &amp; trades</p>
            <div className="flex flex-wrap gap-2">
              {portfolio.categories.map((c) => (
                <span key={c} className="rounded-full px-3 py-1 text-xs" style={{ background: C.parchment, color: C.inkMuted, fontFamily: FONT.sans }}>{c}</span>
              ))}
            </div>
          </div>
        )}

        {portfolio.services.length > 0 && (
          <div>
            <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Services offered</p>
            <div className="flex flex-wrap gap-2">
              {portfolio.services.map((s) => (
                <span key={s} className="rounded-full px-3 py-1 text-xs border" style={{ borderColor: C.parchmentDark, color: C.ink, fontFamily: FONT.sans }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Portfolio</p>
          {portfolio.portfolioImages.length === 0 ? (
            <Card><div className="p-4 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>No portfolio images yet.</div></Card>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {portfolio.portfolioImages.map((img) => (
                <div key={img._id ?? img.url} className="relative aspect-square overflow-hidden rounded-xl border" style={{ borderColor: C.parchmentDark }}>
                  <img src={img.url} alt={img.caption || 'Portfolio work'} className="h-full w-full object-cover" />
                  {img.caption && (
                    <div className="absolute inset-x-0 bottom-0 truncate px-2 py-1 text-[10px] text-white" style={{ background: 'rgba(0,0,0,0.55)', fontFamily: FONT.sans }}>{img.caption}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">
            Certifications {verifiedCertCount > 0 && `(${verifiedCertCount} verified)`}
          </p>
          {certifications.length === 0 ? (
            <Card><div className="p-4 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>No certifications added yet.</div></Card>
          ) : (
            <div className="space-y-2">
              {certifications.map((c) => (
                <Card key={c.id}>
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold truncate">{c.name}</div>
                      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{c.issuer}</div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Completed work</p>
          {completedWork.length === 0 ? (
            <Card><div className="p-4 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>No completed platform projects yet.</div></Card>
          ) : (
            <div className="space-y-2">
              {completedWork.map((w) => (
                <Card key={w.id}>
                  <div className="p-3">
                    <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">{w.projectTitle}</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mt-0.5">
                      {w.category}{w.location ? ` · ${w.location}` : ''} · {new Date(w.completedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Client reviews</p>
          <div className="space-y-3">
            {reviews.length === 0 && (
              <Card><div className="p-4 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>No reviews yet.</div></Card>
            )}
            {reviews.map((r) => (
              <Card key={r.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{r.fromName}</div>
                    <Stars rating={r.score} />
                  </div>
                  {r.comment && <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed italic">"{r.comment}"</p>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

// ── Self-editing: headline, bio, skills/regions, services, portfolio images ──
export function EditContractorPortfolioScreen() {
  const nav = useNavigate()
  const { devUserId } = useApp()
  const { show: showToast } = useToast()
  const { data: existing, isLoading } = useContractorPortfolioQuery(devUserId ?? undefined)
  const upsert = useUpsertMyContractorProfileMutation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    headline: '', bio: '', categories: [] as string[], regions: [] as string[],
    services: [] as string[], yearsExperience: '0', existingPortfolioImages: [] as PortfolioImage[],
  })
  const [serviceInput, setServiceInput] = useState('')
  const [newImages, setNewImages] = useState<File[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!existing) return
    setForm({
      headline: existing.headline, bio: existing.bio, categories: existing.categories, regions: existing.regions,
      services: existing.services, yearsExperience: String(existing.yearsExperience), existingPortfolioImages: existing.portfolioImages,
    })
  }, [existing])

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  const addService = () => {
    const v = serviceInput.trim()
    if (!v || form.services.includes(v)) return
    set('services', [...form.services, v])
    setServiceInput('')
  }

  const onPickImages = (files: FileList | null) => {
    if (!files) return
    setNewImages((prev) => [...prev, ...Array.from(files)].slice(0, 8 - form.existingPortfolioImages.length))
  }

  const save = async () => {
    setSaving(true)
    try {
      await upsert.mutateAsync({
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        categories: form.categories,
        regions: form.regions,
        services: form.services,
        yearsExperience: Number(form.yearsExperience) || 0,
        existingPortfolioImages: form.existingPortfolioImages,
        newPortfolioImages: newImages,
      })
      showToast({ title: 'Portfolio saved', tone: 'success' })
      setNewImages([])
      nav(devUserId ? `/contractor/portfolio/${devUserId}` : '/contractor/profile')
    } catch (err) {
      showToast({ title: 'Failed to save', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <AppShell noNav>{null}</AppShell>

  return (
    <AppShell noNav>
      <Header title="Edit Portfolio" back />
      <div className="px-5 py-5 space-y-4 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        <Card><div className="p-4 space-y-3">
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Headline</label>
            <input
              value={form.headline}
              onChange={(e) => set('headline', e.target.value)}
              placeholder="e.g. Master Plumber — 12 years, Douala"
              maxLength={140}
              className="w-full border-2 rounded-xl px-3 py-2.5 outline-none text-sm"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }}
            />
          </div>
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">About</label>
            <textarea
              value={form.bio}
              onChange={(e) => set('bio', e.target.value)}
              rows={4}
              placeholder="Tell funders about your experience and how you work."
              className="w-full border-2 rounded-xl px-3 py-2.5 outline-none text-sm resize-none"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }}
            />
          </div>
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Years of experience</label>
            <input
              value={form.yearsExperience}
              onChange={(e) => set('yearsExperience', e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              className="w-24 border-2 rounded-xl px-3 py-2.5 outline-none text-sm"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }}
            />
          </div>
        </div></Card>

        <Card><div className="p-4">
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-2">Skills &amp; trades</label>
          <ChipGroup options={TRADES} value={form.categories} onChange={(v) => set('categories', v as string[])} multiple />
        </div></Card>

        <Card><div className="p-4">
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-2">Regions you work in</label>
          <ChipGroup options={REGIONS} value={form.regions} onChange={(v) => set('regions', v as string[])} multiple tone="amber" />
        </div></Card>

        <Card><div className="p-4">
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-2">Services offered</label>
          <div className="flex gap-2 mb-2">
            <input
              value={serviceInput}
              onChange={(e) => setServiceInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addService() } }}
              placeholder="e.g. Roof installation"
              className="flex-1 border-2 rounded-lg px-3 py-2 outline-none text-sm"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }}
            />
            <button onClick={addService} disabled={!serviceInput.trim()} className="px-4 rounded-lg text-sm font-semibold disabled:opacity-50" style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}>Add</button>
          </div>
          {form.services.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.services.map((s) => (
                <span key={s} className="flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5 text-xs" style={{ background: C.parchment, color: C.ink, fontFamily: FONT.sans }}>
                  {s}
                  <button onClick={() => set('services', form.services.filter((x) => x !== s))} className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10">
                    <AppIcon name="close" size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div></Card>

        <Card><div className="p-4">
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-2">Portfolio images</label>
          <div className="flex flex-wrap gap-3">
            {form.existingPortfolioImages.map((img) => (
              <div key={img._id ?? img.url} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border" style={{ borderColor: C.parchmentDark }}>
                <img src={img.url} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => set('existingPortfolioImages', form.existingPortfolioImages.filter((i) => i !== img))}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60"
                >
                  <AppIcon name="close" size={11} style={{ color: '#fff' }} />
                </button>
              </div>
            ))}
            {newImages.map((file, i) => (
              <div key={i} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border" style={{ borderColor: C.forest }}>
                <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                <button onClick={() => setNewImages((prev) => prev.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60">
                  <AppIcon name="close" size={11} style={{ color: '#fff' }} />
                </button>
              </div>
            ))}
            {form.existingPortfolioImages.length + newImages.length < 8 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed"
                style={{ borderColor: C.parchmentDark, color: C.inkSubtle }}
              >
                <AppIcon name="image" size={18} />
                <span style={{ fontFamily: FONT.mono }} className="text-[9px] uppercase">Add</span>
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onPickImages(e.target.files); e.target.value = '' }} />
        </div></Card>

        <PillButton onClick={save} fullWidth disabled={saving}>{saving ? 'Saving…' : 'Save portfolio'}</PillButton>
      </div>
    </AppShell>
  )
}

// ── Public contractor leaderboard — visible to everyone, no login required.
// Ranked by contractorLeaderboardService's weighted score (completed
// projects, ratings, reliability, verified experience). ────────────────────
const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export function ContractorLeaderboardScreen() {
  const nav = useNavigate()
  const { isLoggedIn } = useApp()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const { data, isLoading } = useContractorLeaderboardQuery({ search: search || undefined, category: category === 'All' ? undefined : category, limit: 50 })
  const rows = data?.rows ?? []

  return (
    <div style={{ background: C.cream, color: C.ink, minHeight: '100vh' }}>
      <div className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ borderColor: C.navGlassBorder, background: C.navGlassBg }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <button onClick={() => nav(isLoggedIn ? '/home' : '/')} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden" style={{ background: '#FFFFFF', border: `1px solid ${C.parchmentDark}` }}>
              <img src="/brand/logo-64.png" alt="Mboa Trust" className="h-7 w-7 object-contain" />
            </div>
            <span style={{ fontFamily: FONT.serif }} className="text-lg font-bold">Mboa Trust</span>
          </button>
          <ThemeToggle />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <div className="mb-8 max-w-2xl">
          <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-xs uppercase tracking-[0.3em]">Contractor Leaderboard</div>
          <h1 style={{ fontFamily: FONT.serif }} className="mt-3 text-3xl font-bold sm:text-4xl">The platform's top-performing contractors.</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mt-3 text-sm sm:text-base leading-relaxed">
            Ranked by completed projects, ratings, reliability, and verified experience — no login required to browse.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contractors by name…"
            className="w-full sm:max-w-xs border-2 rounded-xl px-4 py-2.5 outline-none text-sm"
            style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
          />
          <div className="overflow-x-auto">
            <ChipGroup options={['All', ...TRADES]} value={category} onChange={(v) => setCategory(v as string)} />
          </div>
        </div>

        {isLoading ? (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-10 text-center text-sm">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon="trophy" title="No contractors match these filters" illustration="tilt" />
        ) : (
          <StaggerList className="space-y-2.5">
            {rows.map((r) => (
              <StaggerItem key={r.userId}>
                <Link
                  to={`/contractor/portfolio/${r.userId}`}
                  className="flex items-center gap-4 rounded-2xl border-2 p-4 transition-all hover:border-[var(--color-forest)]"
                  style={{ borderColor: C.parchmentDark, background: C.white, boxShadow: C.shadowSm }}
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center text-lg font-bold" style={{ fontFamily: FONT.serif, color: C.inkSubtle }}>
                    {RANK_MEDAL[r.rank] ?? `#${r.rank}`}
                  </div>
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white font-bold" style={{ background: C.forest, fontFamily: FONT.serif }}>
                    {r.fullName.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '—'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div style={{ fontFamily: FONT.sans }} className="font-semibold text-sm truncate">{r.fullName}</div>
                      {r.kycStatus === 'verified' && <AppIcon name="shieldCheck" size={13} style={{ color: C.forest }} />}
                    </div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mt-0.5">
                      {r.categories[0] ?? 'General Contracting'}{r.regions[0] ? ` · ${r.regions[0]}` : ''} · {r.yearsExperience} yrs
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <Stars rating={r.stats.avgRating ?? 0} />
                      <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{r.stats.completedProjects} completed</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div style={{ fontFamily: FONT.serif, color: C.forest }} className="text-xl font-bold">{r.score.total}</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider">score</div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>
    </div>
  )
}
