import type { StatusTone } from '../components/tokens'
import type { IconName } from '../components/icons'
import type { NotifCategory } from '../context'

/** Copy for every notification type the backend fires that does NOT have
 * bespoke handling in notifications.ts's describe() switch. Single source of
 * truth for both the notification center and real-time toasts (see
 * notificationToasts.ts), so the two can never word the same event
 * differently. Backend stores only {type, payload}; this turns that into
 * something a person reads. `tone` drives the toast colour. */
export interface CatalogEntry {
  icon: IconName
  category: NotifCategory
  title: string
  body: string
  tone: StatusTone
  path?: string
}

type Payload = Record<string, unknown>
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined)
const quoted = (v: unknown, fallback: string) => (str(v) ? `"${str(v)}"` : fallback)
const xaf = (v: unknown) => (typeof v === 'number' || typeof v === 'string' ? `XAF ${Number(v).toLocaleString('fr-FR')}` : '')

const e = (icon: IconName, category: NotifCategory, tone: StatusTone, title: string, body: string, path?: string): CatalogEntry => ({ icon, category, tone, title, body, path })

const BUILDERS: Record<string, (p: Payload) => CatalogEntry> = {
  // ── Money ────────────────────────────────────────────────────────────────
  milestone_payout_received: (p) => e('lock', 'funding', 'success', 'Payment released', `${xaf(p.amount) || 'Funds'} for ${quoted(p.milestoneTitle, 'a milestone')} were sent to your payout method.`, '/contractor/earnings'),
  pooled_contribution_collected: (p) => e('lock', 'funding', 'success', 'Contribution collected', `${xaf(p.amount) || 'A contribution'} was collected toward the project.`, p.projectId ? `/funder/project/${p.projectId}` : undefined),
  pooled_contribution_invited: () => e('handshake', 'funding', 'info', 'Co-funding invitation', 'You were invited to co-fund a project.', '/funder/browse'),
  subscription_past_due: () => e('alert', 'funding', 'warning', 'Subscription payment overdue', 'We could not renew your subscription. Update your payment method to keep your plan.', '/account/subscription'),
  subscription_force_cancelled: () => e('alert', 'funding', 'error', 'Subscription cancelled', 'An administrator cancelled your subscription.', '/account/subscription'),
  referral_rewarded: (p) => e('celebrate', 'funding', 'success', 'Referral reward earned', `${xaf(p.amount) || 'A reward'} was added for your referral.`, '/referrals'),
  referral_removed: () => e('alert', 'funding', 'warning', 'Referral removed', 'An administrator removed one of your referrals.'),
  escrow_refunded: (p) => e('lock', 'funding', 'warning', 'Payment refunded', `${xaf(p.amount) || 'A transaction'} was reversed by an administrator.`, '/funder/transactions'),
  escrow_removed: () => e('alert', 'funding', 'warning', 'Transaction removed', 'An administrator removed a transaction record on your account.', '/funder/transactions'),
  escrow_updated_by_admin: () => e('alert', 'funding', 'info', 'Transaction updated', 'An administrator edited a transaction record on your account.', '/funder/transactions'),
  contract_terminated: (p) => e('flag', 'marketplace', 'error', 'Contract terminated', `The contract${str(p.projectTitle) ? ` for "${str(p.projectTitle)}"` : ''} was terminated by an administrator.`, '/home'),
  contract_edited_or_removed_by_admin: () => e('alert', 'marketplace', 'info', 'Contract updated', 'An administrator made changes to a contract on one of your projects.'),

  // ── Team / people ────────────────────────────────────────────────────────
  co_signer_added: () => e('shieldCheck', 'milestones', 'info', 'You are now a co-signer', 'You were added as a co-signer — your approval is needed on milestone releases.'),
  group_invited: () => e('handshake', 'funding', 'info', 'Group invitation', 'You were invited to join a funding group.', '/groups/join'),
  conversation_created: () => e('message', 'messages', 'info', 'New conversation', 'Someone started a conversation with you.', '/messages'),
  rating_prompt: () => e('star', 'milestones', 'info', 'How did it go?', 'Rate your recent experience to help build trust on the platform.'),
  rating_removed_by_admin: () => e('alert', 'milestones', 'warning', 'Review removed', 'An administrator removed a review connected to your account.'),
  rating_edited_by_admin: () => e('alert', 'milestones', 'info', 'Review updated', 'An administrator edited a review on your profile.'),
  team_member_role_changed_by_admin: (p) => e('alert', 'milestones', 'info', 'Team role changed', `An administrator changed your team role${str(p.role) ? ` to "${str(p.role)}"` : ''}.`),
  team_member_removed_by_admin: () => e('alert', 'milestones', 'warning', 'Removed from a team', 'An administrator removed you from a project team.'),

  // ── Account & admin actions ──────────────────────────────────────────────
  kyc_verified: () => e('shieldCheck', 'verification', 'success', 'Identity verified', 'You now have full access to escrow payments and hiring.', '/home'),
  kyc_rejected: () => e('alert', 'verification', 'error', 'Identity verification not approved', 'We could not verify your document. Review the details and submit again.', '/compliance/kyc'),
  account_deactivated: () => e('alert', 'verification', 'error', 'Account suspended', 'An administrator suspended your account. Contact support to appeal.'),
  account_reactivated: () => e('checkCircle', 'verification', 'success', 'Account restored', 'Your account is active again.'),
  account_deleted: () => e('alert', 'verification', 'error', 'Account deleted', 'An administrator deleted your account.'),
  account_updated_by_admin: () => e('alert', 'verification', 'info', 'Account updated', 'An administrator updated details on your account.', '/shared/profile'),
  password_changed_by_admin: () => e('alert', 'verification', 'warning', 'Password changed', 'An administrator reset your password. Contact support if this was unexpected.'),
  role_granted: (p) => e('shieldCheck', 'verification', 'success', 'New role granted', `You can now use the ${str(p.roleType) ?? 'new'} workspace.`, '/home'),
  role_revoked: (p) => e('alert', 'verification', 'warning', 'Role removed', `The ${str(p.roleType) ?? ''} role was removed from your account.`),
  admin_permissions_changed: () => e('alert', 'verification', 'info', 'Admin permissions updated', 'Your admin permissions were changed.'),
  support_ticket_response: (p) => e('message', 'messages', 'info', 'Support replied', `Our team replied to ${quoted(p.subject, 'your request')}.`, '/shared/support-requests'),
  support_ticket_status_changed: (p) => e('message', 'messages', p.status === 'resolved' ? 'success' : 'info', 'Support request updated', `${quoted(p.subject, 'Your request')} is now ${String(p.status ?? 'updated').replace(/_/g, ' ')}.`, '/shared/support-requests'),

  // ── Verifiers, suppliers, contractors ────────────────────────────────────
  verifier_application_approved: () => e('shieldCheck', 'verification', 'success', 'Verifier application approved', 'You can now receive on-site verification assignments.', '/verifier/dashboard'),
  verifier_application_rejected: () => e('alert', 'verification', 'error', 'Verifier application not approved', 'Update your application and resubmit for review.', '/verifier/register'),
  verifier_profile_edited_by_admin: () => e('alert', 'verification', 'info', 'Verifier profile updated', 'An administrator made changes to your verifier profile.', '/verifier/profile'),
  verifier_invitation_accepted: (p) => e('compass', 'verification', 'success', 'Verifier accepted your invitation', `${str(p.verifierName) ?? 'Your invited verifier'} will confirm the location for ${quoted(p.projectTitle, 'your project')}.`, p.projectId ? `/funder/project/${p.projectId}` : undefined),
  location_verified: (p) => e('checkCircle', 'verification', 'success', 'Location confirmed', 'A verifier confirmed the exact site location of your project.', p.projectId ? `/funder/project/${p.projectId}` : undefined),
  video_verification_requested: () => e('camera', 'verification', 'info', 'Video verification requested', 'A video verification call was requested for a milestone.'),
  video_verification_scheduled: () => e('camera', 'verification', 'info', 'Video verification scheduled', 'A video verification call was scheduled.'),
  supplier_application_approved: () => e('checkCircle', 'verification', 'success', 'Supplier application approved', 'Your store is live and can receive material orders.', '/supplier/dashboard'),
  supplier_application_rejected: () => e('alert', 'verification', 'error', 'Supplier application not approved', 'Update your details and resubmit for review.', '/supplier/register'),
  supplier_selected_for_project: (p) => e('store', 'marketplace', 'success', 'You were selected as a supplier', `A funder chose you to supply materials for ${quoted(p.projectTitle, 'a project')}.`, '/supplier/dashboard'),
  contractor_certification_verified: (p) => e('shieldCheck', 'verification', 'success', 'Certification verified', `${quoted(p.title, 'Your certification')} is now verified on your profile.`, '/contractor/portfolio'),
  contractor_certification_rejected: (p) => e('alert', 'verification', 'error', 'Certification not verified', `${quoted(p.title, 'Your certification')} could not be verified. Edit and resubmit it.`, '/contractor/certifications/new'),
  contractor_certification_removed: (p) => e('alert', 'verification', 'warning', 'Certification removed', `${quoted(p.title, 'A certification')} was removed by an administrator.`),
  contractor_certification_edited_by_admin: () => e('alert', 'verification', 'info', 'Certification updated', 'An administrator edited one of your certifications.'),
  contractor_profile_edited_by_admin: () => e('alert', 'verification', 'info', 'Profile updated', 'An administrator made changes to your contractor profile.', '/contractor/portfolio'),

  // ── Materials orders ─────────────────────────────────────────────────────
  material_order_confirmed: () => e('store', 'marketplace', 'success', 'Material order confirmed', 'The supplier confirmed your order.'),
  material_order_rejected: (p) => e('store', 'marketplace', 'error', 'Material order declined', str(p.reason) ? `The supplier declined: "${str(p.reason)}"` : 'The supplier could not fulfil your order. Try another supplier.'),
  material_order_dispatched: () => e('store', 'marketplace', 'info', 'Order dispatched', 'Your materials are on the way.'),
  material_order_delivered: () => e('checkCircle', 'marketplace', 'success', 'Order delivered', 'Delivery of your materials was confirmed.'),
  material_order_cancelled: () => e('store', 'marketplace', 'warning', 'Order cancelled', 'A pending material order was cancelled.'),

  // ── Land ─────────────────────────────────────────────────────────────────
  land_offer_received: () => e('home', 'marketplace', 'info', 'New offer on your land', 'A buyer made an offer on your listing.', '/land/my-listings'),
  land_offer_countered: () => e('home', 'marketplace', 'info', 'Offer countered', 'The seller countered your offer.', '/land/browse'),
  land_offer_declined: () => e('home', 'marketplace', 'warning', 'Offer declined', 'Your offer on a listing was declined.', '/land/browse'),
  visit_requested: () => e('home', 'marketplace', 'info', 'Site visit requested', 'A buyer asked to visit your listed land.', '/land/my-listings'),
  visit_confirmed: () => e('checkCircle', 'marketplace', 'success', 'Site visit confirmed', 'Your land visit was confirmed.'),
  land_listing_verified: (p) => e('checkCircle', 'marketplace', 'success', 'Listing verified', `${quoted(p.title, 'Your listing')} is now shown as verified.`, '/land/my-listings'),
  land_listing_verification_rejected: (p) => e('alert', 'marketplace', 'error', 'Listing not verified', `${quoted(p.title, 'Your listing')} did not pass verification.`, '/land/my-listings'),
  land_listing_removed: (p) => e('alert', 'marketplace', 'error', 'Listing removed', `${quoted(p.title, 'Your listing')} was removed by an administrator.`),
  land_listing_edited_by_admin: (p) => e('alert', 'marketplace', 'info', 'Listing edited', `An administrator edited ${quoted(p.title, 'your listing')}.`, '/land/my-listings'),

  // ── Disputes ─────────────────────────────────────────────────────────────
  dispute_resolved_counterparty: (p) => e('checkCircle', 'milestones', 'info', 'Dispute resolved', `An administrator resolved a dispute${str(p.projectTitle) ? ` on "${str(p.projectTitle)}"` : ''}.`, p.projectId ? `/funder/project/${p.projectId}` : undefined),
}

export function catalogEntry(type: string, payload: Payload): CatalogEntry | null {
  const build = BUILDERS[type]
  return build ? build(payload ?? {}) : null
}
