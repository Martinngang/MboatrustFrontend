import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { uploadAttachment, type BackendAttachment } from './messaging'

export const SUPPORT_CATEGORIES = [
  'payments_escrow',
  'projects_milestones',
  'bids_contracts',
  'verification_kyc',
  'land_marketplace',
  'materials_suppliers',
  'account_login',
  'messaging',
  'other',
] as const
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  payments_escrow: 'Payments & escrow',
  projects_milestones: 'Projects & milestones',
  bids_contracts: 'Bids & contracts',
  verification_kyc: 'Verification & KYC',
  land_marketplace: 'Land marketplace',
  materials_suppliers: 'Materials & suppliers',
  account_login: 'Account & login',
  messaging: 'Messaging',
  other: 'Other',
}

export type SupportTicketType = 'bug_report' | 'feedback' | 'question' | 'contact_support'
export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent'

export const SUPPORT_TYPE_LABELS: Record<SupportTicketType, string> = {
  bug_report: 'Report a problem',
  feedback: 'Give feedback',
  question: 'Ask a question',
  contact_support: 'Contact support',
}

export interface SupportTicketContext {
  platform?: 'web' | 'mobile'
  screen?: string
  screenLabel?: string
  feature?: string
  appVersion?: string
}

export interface SupportTicketResponse {
  id: string
  authorId: string
  authorName: string
  isAdmin: boolean
  message: string
  createdAt: string
}

export interface SupportTicket {
  id: string
  submittedById: string
  submittedByName: string
  submittedByEmail?: string
  type: SupportTicketType
  category: SupportCategory
  subject: string
  description: string
  attachments: BackendAttachment[]
  context: SupportTicketContext
  status: SupportTicketStatus
  priority: SupportTicketPriority
  /** Null while the ticket is still in the unassigned queue. */
  assignedToId: string | null
  assignedToName: string | null
  responses: SupportTicketResponse[]
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

interface BackendUserRef {
  _id: string
  fullName: string
  email?: string
}

interface BackendResponse {
  _id: string
  authorId: BackendUserRef | string
  isAdmin: boolean
  message: string
  createdAt: string
}

interface BackendSupportTicket {
  _id: string
  submittedBy: BackendUserRef | string
  type: SupportTicketType
  category: SupportCategory
  subject: string
  description: string
  attachments: BackendAttachment[]
  context: SupportTicketContext
  status: SupportTicketStatus
  priority: SupportTicketPriority
  assignedTo?: BackendUserRef | string | null
  responses: BackendResponse[]
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

function mapTicket(t: BackendSupportTicket): SupportTicket {
  const submitter = typeof t.submittedBy === 'object' ? t.submittedBy : null
  const assignee = t.assignedTo && typeof t.assignedTo === 'object' ? t.assignedTo : null
  return {
    id: t._id,
    submittedById: submitter ? submitter._id : String(t.submittedBy),
    submittedByName: submitter?.fullName ?? 'Unknown user',
    submittedByEmail: submitter?.email,
    type: t.type,
    category: t.category,
    subject: t.subject,
    description: t.description,
    attachments: t.attachments ?? [],
    context: t.context ?? {},
    status: t.status,
    priority: t.priority,
    assignedToId: assignee ? assignee._id : (typeof t.assignedTo === 'string' ? t.assignedTo : null),
    assignedToName: assignee?.fullName ?? null,
    responses: (t.responses ?? []).map((r) => {
      const author = typeof r.authorId === 'object' ? r.authorId : null
      return {
        id: r._id,
        authorId: author ? author._id : String(r.authorId),
        authorName: author?.fullName ?? (r.isAdmin ? 'Support team' : 'You'),
        isAdmin: r.isAdmin,
        message: r.message,
        createdAt: r.createdAt,
      }
    }),
    resolvedAt: t.resolvedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

// ── Help articles (FAQ) ──────────────────────────────────────────────────
export interface HelpArticle {
  id: string
  question: string
  answer: string
  category: SupportCategory
  tags: string[]
  isPublished: boolean
  createdAt: string
}

interface BackendHelpArticle {
  _id: string
  question: string
  answer: string
  category: SupportCategory
  tags: string[]
  isPublished: boolean
  createdAt: string
}

function mapArticle(a: BackendHelpArticle): HelpArticle {
  return { id: a._id, question: a.question, answer: a.answer, category: a.category, tags: a.tags ?? [], isPublished: a.isPublished, createdAt: a.createdAt }
}

export function useHelpArticlesQuery(filter: { category?: string; q?: string; isPublished?: boolean } = {}) {
  return useQuery({
    queryKey: ['helpArticles', filter],
    queryFn: async (): Promise<HelpArticle[]> => {
      const { data } = await api.get<{ data: BackendHelpArticle[] }>('/help-articles', { params: { ...filter, limit: 100 } })
      return data.data.map(mapArticle)
    },
    staleTime: 30_000,
  })
}

export interface HelpArticleInput {
  question: string
  answer: string
  category: SupportCategory
  tags: string[]
  isPublished: boolean
}

export function useCreateHelpArticleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: HelpArticleInput) => {
      const { data } = await api.post<{ data: BackendHelpArticle }>('/help-articles', input)
      return mapArticle(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['helpArticles'] }),
  })
}

export function useUpdateHelpArticleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<HelpArticleInput> }) => {
      const { data } = await api.patch<{ data: BackendHelpArticle }>(`/help-articles/${id}`, input)
      return mapArticle(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['helpArticles'] }),
  })
}

export function useDeleteHelpArticleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/help-articles/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['helpArticles'] }),
  })
}

// ── Support tickets ──────────────────────────────────────────────────────
export function useSupportTicketsQuery(
  // `priority` and `assignedTo` are admin-only triage filters — the backend
  // ignores them for a non-admin rather than leaking other people's queues.
  // `assignedTo` also accepts the two pseudo-values 'me' and 'unassigned'.
  filter: { status?: string; type?: string; category?: string; search?: string; priority?: string; assignedTo?: string } = {}
) {
  return useQuery({
    queryKey: ['supportTickets', filter],
    queryFn: async (): Promise<SupportTicket[]> => {
      const { data } = await api.get<{ data: BackendSupportTicket[] }>('/support-tickets', { params: { ...filter, limit: 100 } })
      return data.data.map(mapTicket)
    },
    staleTime: 10_000,
  })
}

export function useSupportTicketQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['supportTicket', id],
    queryFn: async (): Promise<SupportTicket> => {
      const { data } = await api.get<{ data: BackendSupportTicket }>(`/support-tickets/${id}`)
      return mapTicket(data.data)
    },
    enabled: Boolean(id),
  })
}

export interface CreateSupportTicketInput {
  type: SupportTicketType
  category: SupportCategory
  subject: string
  description: string
  files?: File[]
  context?: SupportTicketContext
}

export function useCreateSupportTicketMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ files, ...input }: CreateSupportTicketInput) => {
      const attachments: BackendAttachment[] = []
      for (const file of files ?? []) {
        attachments.push(await uploadAttachment(file))
      }
      const { data } = await api.post<{ data: BackendSupportTicket }>('/support-tickets', { ...input, attachments })
      return mapTicket(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supportTickets'] }),
  })
}

export function useAddSupportTicketResponseMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const { data } = await api.post<{ data: BackendSupportTicket }>(`/support-tickets/${ticketId}/responses`, { message })
      return mapTicket(data.data)
    },
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: ['supportTickets'] })
      qc.setQueryData(['supportTicket', ticket.id], ticket)
    },
  })
}

export function useUpdateSupportTicketStatusMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ticketId, status, priority }: { ticketId: string; status: SupportTicketStatus; priority?: SupportTicketPriority }) => {
      const { data } = await api.patch<{ data: BackendSupportTicket }>(`/support-tickets/${ticketId}/status`, { status, priority })
      return mapTicket(data.data)
    },
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: ['supportTickets'] })
      qc.setQueryData(['supportTicket', ticket.id], ticket)
    },
  })
}

/** Admin-only. Pass `assignedTo: null` to hand a ticket back to the
 * unassigned queue — that's a real triage action, not a no-op. */
export function useAssignSupportTicketMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ticketId, assignedTo }: { ticketId: string; assignedTo: string | null }) => {
      const { data } = await api.patch<{ data: BackendSupportTicket }>(`/support-tickets/${ticketId}/assignee`, { assignedTo })
      return mapTicket(data.data)
    },
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: ['supportTickets'] })
      qc.setQueryData(['supportTicket', ticket.id], ticket)
    },
  })
}
