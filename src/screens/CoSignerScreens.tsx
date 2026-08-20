import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context'
import { useUserSearchQuery } from '../api/users'
import { useAddCoSignerMutation, useMyProjectsQuery } from '../api/projects'
import { EmptyState } from '../components/EmptyState'
import { C, FONT, AppShell, Card, PillButton, Header } from '../components/MobileLayout'
import { useToast } from '../components/Toast'
import { apiErrorMessage } from '../api/client'

// ── Add co-signer (project owner) ──────────────────────────────────────────────
// A co-signer must be an existing, already-registered account — the backend
// has no concept of inviting someone who hasn't signed up yet, and a project
// has exactly one co-signer (Project.coSignerId), not a list. The former
// "invite anyone by phone number, they approve via a no-login link" flow is
// gone: the person found here approves the normal way, by logging into
// their own account and reviewing the milestone like the funder does.
export function AddCoSignerScreen() {
  const nav = useNavigate()
  const { projectId } = useParams()
  const { devUserId } = useApp()
  const { data: projects = [], isLoading } = useMyProjectsQuery(devUserId ?? undefined)
  const { show: showToast } = useToast()
  // Only the project's own owner can add a co-signer (backend 403s
  // otherwise), so this only ever resolves from the caller's own projects
  // — never falls back to an arbitrary stranger's project.
  const project = projects.find((p) => p.id === projectId)
  const addCoSigner = useAddCoSignerMutation()

  const [query, setQuery] = useState('')
  const { data: results = [], isFetching } = useUserSearchQuery(query)
  const [added, setAdded] = useState<string | null>(null)

  const select = async (userId: string, name: string) => {
    if (!project) return
    try {
      await addCoSigner.mutateAsync({ projectId: project.id, coSignerId: userId })
      setAdded(name)
    } catch (err) {
      showToast({ title: 'Failed to add co-signer', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  if (isLoading) return <AppShell noNav>{null}</AppShell>
  if (!project) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <EmptyState icon="users" title="Project not found" description="This project isn't one of yours." illustration="tilt" />
        </div>
      </AppShell>
    )
  }

  if (added) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: C.forest }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M8 18L15 25L28 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Co-signer added</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            {added} is now the community co-signer for <strong style={{ color: C.ink }}>{project.title}</strong>. They'll review each milestone alongside you before funds are released — they can see it after signing into their own account.
          </p>
          <PillButton onClick={() => nav(`/funder/project/${project.id}`)} fullWidth>Back to project</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Add a Co-signer" subtitle={project.title} back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-xl border p-3" style={{ background: 'var(--status-info-bg)', borderColor: 'var(--status-info-text)' }}>
          <p style={{ fontFamily: FONT.sans, color: 'var(--status-info-text)' }} className="text-xs leading-relaxed">
            A community co-signer — a trusted local figure with a Mboa Trust account — reviews milestone evidence alongside you. Search for their name, phone, or email; they must already be registered.
          </p>
        </div>

        {project.coSignerId && (
          <div>
            <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Current co-signer</p>
            <Card>
              <div className="flex items-center justify-between p-3">
                <span style={{ fontFamily: FONT.sans }} className="text-sm font-medium">{project.coSignerName ?? 'Co-signer'}</span>
              </div>
            </Card>
          </div>
        )}

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Search by name, phone, or email</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Chief Njoya, +237677..., or name@email.com"
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
            style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
          />
        </div>

        {query.trim().length >= 2 && (
          <div className="space-y-2">
            {isFetching && <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">Searching…</p>}
            {!isFetching && results.length === 0 && (
              <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">No matching account found. They'll need to create one first.</p>
            )}
            {results.map((u) => (
              <button
                key={u.id}
                onClick={() => select(u.id, u.fullName)}
                disabled={addCoSigner.isPending}
                className="w-full text-left rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                style={{ borderColor: C.parchmentDark, background: C.white }}
              >
                <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{u.fullName}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">{u.phoneNumber || u.email || u.roles.join(', ')}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
