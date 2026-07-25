import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, fmt } from '../context'
import { useVerification } from '../verification'
import { C, FONT, AppShell, Card, PillButton, Header, StatusBadge } from '../components/MobileLayout'
import { EvidenceMetadataBadge, EvidenceWarningBanner } from '../components/EvidenceMetadataBadge'
import { ContactPicker, type PickedContact } from '../components/ContactPicker'

const SUGGESTED_CONTACTS = [
  { name: 'Chief Njoya T.', phone: '+237 677 555 010', role: 'Village committee chief' },
  { name: 'Pastor Ekwalla M.', phone: '+237 677 555 020', role: 'Community pastor' },
  { name: 'Councillor Ateba R.', phone: '+237 677 555 030', role: 'Local council member' },
]

// ── Add co-signer (project owner) ──────────────────────────────────────────────
export function AddCoSignerScreen() {
  const nav = useNavigate()
  const { projectId } = useParams()
  const { projects } = useApp()
  const { addCoSigner, coSigners } = useVerification()
  const project = projects.find((p) => p.id === projectId) ?? projects[0]
  const existing = coSigners[project.id] ?? []

  const [contact, setContact] = useState<PickedContact | null>(null)
  const [added, setAdded] = useState<{ name: string; id: string } | null>(null)

  const invite = () => {
    if (!contact) return
    const created = addCoSigner(project.id, contact.name, contact.phone)
    setAdded({ name: contact.name, id: created.id })
  }

  if (added) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: C.forest }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M8 18L15 25L28 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Co-signer invited</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-2">
            {added.name} has been added as a community co-signer for <strong style={{ color: C.ink }}>{project.title}</strong>.
          </p>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">They'll review each milestone alongside you before funds are released.</p>
          <div className="w-full rounded-2xl border p-4 mb-6" style={{ borderColor: C.parchmentDark, background: C.parchment }}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-1">Shareable review link (mock)</div>
            <div style={{ fontFamily: FONT.mono, color: C.ink }} className="text-xs break-all">#/cosign/{added.id}</div>
          </div>
          <PillButton onClick={() => nav(`/funder/project/${project.id}`)} fullWidth>Back to project</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Add a Co-signer" subtitle={project.title} back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-xl border p-3" style={{ background: '#EFF6FF', borderColor: '#BFDBFE' }}>
          <p style={{ fontFamily: FONT.sans, color: '#1E40AF' }} className="text-xs leading-relaxed">
            A community co-signer — a trusted local figure — reviews milestone evidence alongside you. Their approval or flag shows on the milestone timeline.
          </p>
        </div>

        {existing.length > 0 && (
          <div>
            <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Current co-signers</p>
            <div className="space-y-2">
              {existing.map((c) => (
                <Card key={c.id}>
                  <div className="flex items-center justify-between p-3">
                    <span style={{ fontFamily: FONT.sans }} className="text-sm font-medium">{c.name}</span>
                    <StatusBadge status={c.status} />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <ContactPicker suggestions={SUGGESTED_CONTACTS} onChange={setContact} />
      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={invite} fullWidth disabled={!contact}>Send invitation</PillButton>
      </div>
    </AppShell>
  )
}

// ── Co-signer approval (the co-signer's own view) ──────────────────────────────
export function CoSignerApprovalScreen() {
  const { coSignerId } = useParams()
  const { projects } = useApp()
  const { findCoSigner, decideCoSigner, getEvidenceMeta } = useVerification()
  const coSigner = findCoSigner(coSignerId ?? '')
  const project = projects.find((p) => p.id === coSigner?.projectId) ?? projects[0]
  const milestone = project.milestones.find((m) => m.status === 'under_review') ?? project.milestones.find((m) => m.status !== 'released') ?? project.milestones[0]
  const meta = getEvidenceMeta(`${project.id}:${milestone.id}`)

  const [note, setNote] = useState('')
  const [decided, setDecided] = useState<'approved' | 'flagged' | null>(null)

  const decide = (decision: 'approved' | 'flagged') => {
    if (coSigner) decideCoSigner(coSigner.id, decision, note)
    setDecided(decision)
  }

  if (!coSigner) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">This co-signer invitation link isn't valid.</p>
        </div>
      </AppShell>
    )
  }

  const finalStatus = decided ?? (coSigner.status !== 'pending' ? coSigner.status : null)
  if (finalStatus) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: finalStatus === 'approved' ? C.forest : '#DC2626' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              {finalStatus === 'approved' ? (
                <path d="M8 18L15 25L28 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              ) : (
                <path d="M12 12L24 24M24 12L12 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              )}
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">{finalStatus === 'approved' ? 'Milestone approved' : 'Concern flagged'}</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
            Thank you, {coSigner.name}. Your {finalStatus === 'approved' ? 'approval' : 'flag'} has been recorded and is now visible to the funder.
          </p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Community Review" subtitle={project.title} back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl border p-4" style={{ background: '#F0FDF4', borderColor: '#86EFAC' }}>
          <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-[10px] uppercase tracking-widest mb-1">You've been invited as a co-signer</div>
          <p style={{ fontFamily: FONT.sans, color: '#15803D' }} className="text-xs leading-relaxed">
            Hi {coSigner.name}, please review the evidence below for {project.title} and confirm it matches what you know about this project.
          </p>
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-1">Milestone</div>
          <div style={{ fontFamily: FONT.serif }} className="font-bold">{milestone.title}</div>
          <div style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-xs mt-0.5">{fmt(milestone.amount)}</div>
        </div>

        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Submitted evidence</div>
          <div className="grid grid-cols-2 gap-2">
            {[project.image, project.image].map((src, i) => (
              <div key={i} className="relative aspect-video overflow-hidden rounded-xl border" style={{ borderColor: C.parchmentDark }}>
                <img src={src} alt={`Evidence ${i + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
          <div className="mt-2"><EvidenceMetadataBadge meta={meta} /></div>
          {meta.flagged && meta.flagReason && <div className="mt-3"><EvidenceWarningBanner reason={meta.flagReason} /></div>}
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Your note (optional)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            placeholder="Anything you'd like the funder to know..."
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm resize-none"
            style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }} />
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t space-y-3 sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <button onClick={() => decide('approved')} className="w-full py-4 rounded-xl font-bold text-sm" style={{ background: C.forest, color: C.white, fontFamily: FONT.sans }}>
          ✓ Approve this milestone
        </button>
        <button onClick={() => decide('flagged')} className="w-full py-3.5 rounded-xl font-semibold text-sm border" style={{ borderColor: '#FECACA', color: '#DC2626', background: '#FEF2F2', fontFamily: FONT.sans }}>
          Flag a concern
        </button>
      </div>
    </AppShell>
  )
}
