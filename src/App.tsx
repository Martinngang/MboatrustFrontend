import type { ReactNode } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppProvider, useApp, type Role } from './context'
import { TemplatesProvider } from './templates'
import { MaterialsProvider } from './materials'
import { CustomFieldsProvider } from './customFields'
import { TeamProvider } from './team'
import { FeeConfigProvider } from './feeConfig'
import { VerificationProvider } from './verification'
import { MessagingProvider } from './messaging'
import { ThemeProvider } from './theme'
import { OfflineQueueProvider } from './offlineQueue'
import { PWAInstallProvider } from './pwaInstall'
import { C } from './components/MobileLayout'
import { ToastProvider } from './components/Toast'
import { CommandPaletteProvider } from './components/shell/CommandPalette'
import { KeyboardShortcutsProvider } from './components/shell/KeyboardShortcuts'
import { NotificationsDrawerProvider } from './components/NotificationsDrawer'

// Landing
import { LandingScreen } from './screens/Landing'
// Onboarding
import { LanguageScreen, SignupScreen, OTPScreen, LoginScreen, RoleScreen, ProfileSetupScreen, AdminLoginScreen } from './screens/Onboarding'
// Dashboard
import { HomeScreen } from './screens/Dashboard'
// Funder
import {
  BrowseProjectsScreen, ProjectDetailScreen, CreateProjectScreen, MilestonesScreen, FundProjectScreen,
  MilestoneReviewScreen, DisputeScreen, TransactionHistoryScreen, BidComparisonScreen,
  RecipientProfileScreen, VideoVerificationScheduleScreen,
} from './screens/FunderScreens'
// Messaging
import { ConversationListScreen, ChatDetailScreen } from './screens/MessagingScreens'
// Financial
import {
  PooledFundingScreen, InviteCoFunderScreen, RecurringContributionSetupScreen, ManageRecurringScreen, CurrencyConverterScreen,
} from './screens/FinancialScreens'
// Marketplace
import { AddCertificationScreen, MaterialCostEstimatorScreen, AvailabilityCalendarScreen } from './screens/MarketplaceScreens'
// Community
import { GroupSetupScreen, JoinGroupScreen, GroupMembersScreen, GroupDashboardScreen, ReferralScreen, PublicShowcaseScreen } from './screens/CommunityScreens'
// Compliance
import { KycExplainerScreen, KycVerifyScreen } from './screens/ComplianceScreens'
// Recipient
import { MilestoneSubmitScreen, WithdrawalScreen, ReputationScreen, RecipientProjectsScreen, SubmissionStatusScreen, RateRecipientScreen, ProjectHistoryScreen } from './screens/RecipientScreens'
// Contractor
import { BrowseJobsScreen, JobDetailScreen, SubmitBidScreen, MyBidsScreen, ContractDetailScreen, EarningsScreen, ContractorProfileScreen } from './screens/ContractorScreens'
import { ContractorPortfolioScreen, EditContractorPortfolioScreen, ContractorLeaderboardScreen } from './screens/ContractorPortfolioScreens'
// Land
import { BrowseLandScreen, LandListingDetailScreen, CreateListingScreen, MyListingsScreen, ContactSellerScreen, PurchaseOfferScreen } from './screens/LandScreens'
// Shared
import { SettingsScreen, HelpScreen, ProfileScreen, SubscriptionScreen, DeleteAccountScreen } from './screens/SharedScreens'
import { PaymentCallbackScreen } from './screens/PaymentCallbackScreen'
import { PayoutSettingsScreen } from './screens/PayoutSettingsScreen'
// Additional
import {
  ContractorOnboardingScreen, PostJobScreen, ContractSummaryScreen, RateContractorScreen, LandScheduleVisitScreen,
  VerifierRegistrationScreen, VerifierDashboard, VerifierTaskDetailScreen, VerifierReportScreen, VerifierProfileScreen,
  DisputeResolutionScreen, AdminFraudAnalyticsScreen,
} from './screens/AdditionalScreens'
import {
  QuincaillerieRegistrationScreen, QuincaillerieDashboardScreen, QuincaillerieProfileScreen, RequestMaterialsScreen,
} from './screens/QuincaillerieScreens'
import { InventoryScreen } from './screens/InventoryScreen'
import { InventoryItemFormScreen } from './screens/InventoryItemFormScreen'
import { AdminOverviewScreen, AdminUsersScreen, AdminProjectsScreen, AdminVerificationsScreen, AdminLandScreen, AdminContractorsScreen, AdminCommunityScreen, AdminNotificationsScreen, AdminSettingsScreen, AdminAccountsScreen } from './screens/AdminScreens'
// Co-signer
import { AddCoSignerScreen } from './screens/CoSignerScreens'
// Workspace (new management-app view-switcher demo)
import { WorkspaceProjectsScreen } from './screens/WorkspaceProjectsScreen'
import { WorkspaceJobsScreen } from './screens/WorkspaceJobsScreen'
import { WorkspaceLandScreen } from './screens/WorkspaceLandScreen'
import { TenderBidsScreen, NegotiationScreen } from './screens/TenderBidsScreen'
import { GlobalActivityScreen } from './screens/GlobalActivityScreen'
import { TemplatesScreen } from './screens/TemplatesScreen'
import { TeamManagementScreen } from './screens/TeamManagementScreen'
import { NotificationPreferencesScreen } from './screens/NotificationPreferencesScreen'
// PWA
import { InstallModal } from './components/InstallModal'

// ── Full web layout wrapper ─────────────────────────────────────────────────
function WebFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full" style={{ background: C.cream, color: C.ink }}>
      <ToastProvider>
        <NotificationsDrawerProvider>
          <CommandPaletteProvider>
            <KeyboardShortcutsProvider>
              {children}
              <InstallModal />
            </KeyboardShortcutsProvider>
          </CommandPaletteProvider>
        </NotificationsDrawerProvider>
      </ToastProvider>
    </div>
  )
}

// ── Route guard: everything past onboarding requires a signed-in session ─────
function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useApp()
  return isLoggedIn ? <>{children}</> : <Navigate to="/" replace />
}

function P({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>
}

// Gates a route to accounts holding a specific role, on top of the same
// auth check RequireAuth does — checked against `roles` (every role an
// account holds, multi-role accounts included), not just the single
// primary `role`, so a funder who *also* holds a contractor role isn't
// wrongly blocked from contractor-only actions. Only applied to routes
// that are unambiguously one role's action (posting a tender, submitting a
// bid, reviewing bids on a tender) — screens legitimately viewed by more
// than one role (e.g. a funder previewing their own tender's public detail
// page) stay ungated at the route level and are instead handled by
// in-screen checks like JobDetailScreen's isOwnTender.
function RequireRole({ role, children }: { role: NonNullable<Role>; children: ReactNode }) {
  const { isLoggedIn, roles } = useApp()
  if (!isLoggedIn) return <Navigate to="/" replace />
  if (!roles.includes(role)) return <Navigate to="/home" replace />
  return <>{children}</>
}

// Same idea as RequireAuth, but for the /admin* routes specifically: being
// logged in isn't enough (AdminPanelScreen etc. already backstop that with
// a backend-driven "Access denied" state), this redirects before that
// round-trip even happens — straight to the admin door if not signed in at
// all, or back to the consumer dashboard if signed in as something else.
function RequireAdmin({ children }: { children: ReactNode }) {
  const { isLoggedIn, isAdmin } = useApp()
  if (!isLoggedIn) return <Navigate to="/admin/login" replace />
  if (!isAdmin) return <Navigate to="/home" replace />
  return <>{children}</>
}

// A signed-in visitor who lands on the marketing page or an auth screen
// (bookmark, back-button, restored session on reload) belongs at their
// dashboard, not back at square one — an admin's "dashboard" is /admin,
// never the consumer /home (which assumes a funder/recipient/contractor/
// seller role an admin account never has).
function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { isLoggedIn, isAdmin } = useApp()
  if (!isLoggedIn) return <>{children}</>
  return <Navigate to={isAdmin ? '/admin' : '/home'} replace />
}

/** Full-bleed brand splash shown only for the brief window while a
 * restored Firebase session is being resolved on page load — without it,
 * an already-authenticated visitor would flash the signed-out Landing
 * screen before `authChecked` flips true. */
function AuthGate({ children }: { children: ReactNode }) {
  const { authChecked } = useApp()
  if (!authChecked) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center" style={{ background: C.cream }}>
        <div
          className="h-9 w-9 animate-spin rounded-full border-[3px]"
          style={{ borderColor: C.parchmentDark, borderTopColor: C.forest }}
          role="status"
          aria-label="Loading"
        />
      </div>
    )
  }
  return <>{children}</>
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <PWAInstallProvider>
    <AppProvider>
      <TemplatesProvider>
      <MaterialsProvider>
      <CustomFieldsProvider>
      <TeamProvider>
      <FeeConfigProvider>
        <VerificationProvider>
          <MessagingProvider>
                <OfflineQueueProvider>
                <HashRouter>
                  <WebFrame>
                    <AuthGate>
                    <Routes>
                      {/* Onboarding */}
                      <Route path="/" element={<RedirectIfAuthed><LandingScreen /></RedirectIfAuthed>} />
                      <Route path="/language" element={<LanguageScreen />} />
                      <Route path="/signup" element={<RedirectIfAuthed><SignupScreen /></RedirectIfAuthed>} />
                      <Route path="/otp" element={<OTPScreen />} />
                      <Route path="/login" element={<RedirectIfAuthed><LoginScreen /></RedirectIfAuthed>} />
                      {/* Deliberately NOT wrapped in RedirectIfAuthed (unlike /,
                          /signup, /login above) — these two are reached only
                          mid-onboarding, before isLoggedIn flips true, with one
                          exception: ProfileSetupScreen.finish() sets isLoggedIn
                          true and navigates away in the same handler. Wrapping
                          this route meant RedirectIfAuthed (still mounted,
                          guarding the outgoing /profile render) reacted to that
                          same isLoggedIn flip and threw its own competing
                          `<Navigate to="/home">`, which — because effects from
                          the outgoing tree can still fire after the new route
                          starts navigating — won the race and silently
                          overwrote finish()'s real destination
                          (`/quincaillerie/register`) back to `/home`. Every
                          other onboarding destination happened to also be
                          `/home`, which is exactly why this only ever showed up
                          for the one path that goes somewhere else. Removing
                          the guard here also fixes ProfileScreen's "Switch
                          role" link, which navigates an *already logged-in*
                          user to /role on purpose — RedirectIfAuthed was
                          silently bouncing that straight back to /home too. */}
                      <Route path="/role" element={<RoleScreen />} />
                      <Route path="/profile" element={<ProfileSetupScreen />} />
                      {/* Public — no login required */}
                      <Route path="/showcase" element={<PublicShowcaseScreen />} />
                      <Route path="/contractors/leaderboard" element={<ContractorLeaderboardScreen />} />

                      {/* Home (role-aware) */}
                      <Route path="/home" element={<P><HomeScreen /></P>} />

                      {/* Workspace (new management-app view-switcher demo) */}
                      <Route path="/workspace/projects" element={<P><WorkspaceProjectsScreen /></P>} />
                      <Route path="/workspace/jobs" element={<RequireRole role="funder"><WorkspaceJobsScreen /></RequireRole>} />
                      <Route path="/workspace/land" element={<P><WorkspaceLandScreen /></P>} />
                      <Route path="/activity" element={<P><GlobalActivityScreen /></P>} />
                      <Route path="/funder/templates" element={<P><TemplatesScreen /></P>} />
                      <Route path="/workspace/team" element={<P><TeamManagementScreen /></P>} />
                      <Route path="/shared/notifications/preferences" element={<P><NotificationPreferencesScreen /></P>} />
        
                      {/* Funder */}
                      <Route path="/funder/browse" element={<P><BrowseProjectsScreen /></P>} />
                      <Route path="/funder/project/:id" element={<P><ProjectDetailScreen /></P>} />
                      <Route path="/funder/recipient/:id?" element={<P><RecipientProfileScreen /></P>} />
                      <Route path="/funder/create" element={<P><CreateProjectScreen /></P>} />
                      <Route path="/funder/milestones" element={<P><MilestonesScreen /></P>} />
                      <Route path="/funder/fund" element={<P><FundProjectScreen /></P>} />
                      <Route path="/funder/review/:id?" element={<P><MilestoneReviewScreen /></P>} />
                      <Route path="/funder/dispute/:id/:milestoneId" element={<P><DisputeScreen /></P>} />
                      <Route path="/funder/video-verification/:projectId/:milestoneId" element={<P><VideoVerificationScheduleScreen /></P>} />
                      <Route path="/funder/transactions" element={<P><TransactionHistoryScreen /></P>} />
                      <Route path="/funder/contractors" element={<P><BidComparisonScreen /></P>} />
                      <Route path="/funder/post-job" element={<RequireRole role="funder"><PostJobScreen /></RequireRole>} />
                      <Route path="/funder/tender/:jobId/bids" element={<RequireRole role="funder"><TenderBidsScreen /></RequireRole>} />
                      <Route path="/negotiation/:bidId" element={<P><NegotiationScreen /></P>} />
                      <Route path="/funder/contract-summary/:bidId" element={<P><ContractSummaryScreen /></P>} />
                      <Route path="/funder/rate-contractor/:jobId" element={<P><RateContractorScreen /></P>} />
                      <Route path="/funder/rate-recipient/:id" element={<P><RateRecipientScreen /></P>} />
        
                      {/* Recipient */}
                      <Route path="/recipient/projects" element={<P><RecipientProjectsScreen /></P>} />
                      <Route path="/recipient/submit/:id?" element={<P><MilestoneSubmitScreen /></P>} />
                      <Route path="/recipient/submission-status" element={<P><SubmissionStatusScreen /></P>} />
                      <Route path="/recipient/withdrawal" element={<P><WithdrawalScreen /></P>} />
                      <Route path="/recipient/reputation" element={<P><ReputationScreen /></P>} />
                      <Route path="/recipient/history" element={<P><ProjectHistoryScreen /></P>} />
        
                      {/* Contractor */}
                      <Route path="/contractor/onboarding" element={<P><ContractorOnboardingScreen /></P>} />
                      <Route path="/contractor/profile" element={<P><ContractorProfileScreen /></P>} />
                      <Route path="/contractor/jobs" element={<P><BrowseJobsScreen /></P>} />
                      <Route path="/contractor/job/:id" element={<P><JobDetailScreen /></P>} />
                      <Route path="/contractor/bid/:id?" element={<RequireRole role="contractor"><SubmitBidScreen /></RequireRole>} />
                      <Route path="/contractor/bids" element={<P><MyBidsScreen /></P>} />
                      <Route path="/contractor/contract/:bidId" element={<P><ContractDetailScreen /></P>} />
                      {/* Same screen as /recipient/submit — the capture/geotag/notes
                          flow is identical regardless of whether the submitter owns
                          the project or is its accepted contractor (see
                          MilestoneSubmitScreen's own project-lookup fix); this route
                          just gives a contractor a URL that isn't misleadingly
                          "/recipient/...". */}
                      <Route path="/contractor/submit/:id?" element={<P><MilestoneSubmitScreen /></P>} />
                      <Route path="/contractor/earnings" element={<P><EarningsScreen /></P>} />
                      <Route path="/contractor/portfolio/edit" element={<P><EditContractorPortfolioScreen /></P>} />
                      <Route path="/contractor/portfolio/:userId" element={<P><ContractorPortfolioScreen /></P>} />
        
                      {/* Land */}
                      <Route path="/land/browse" element={<P><BrowseLandScreen /></P>} />
                      <Route path="/land/listing/:id" element={<P><LandListingDetailScreen /></P>} />
                      <Route path="/land/contact/:id?" element={<P><ContactSellerScreen /></P>} />
                      <Route path="/land/offer/:id?" element={<P><PurchaseOfferScreen /></P>} />
                      <Route path="/land/create" element={<P><CreateListingScreen /></P>} />
                      <Route path="/land/my-listings" element={<P><MyListingsScreen /></P>} />
                      <Route path="/land/schedule/:id" element={<P><LandScheduleVisitScreen /></P>} />
        
                      {/* Verifier */}
                      <Route path="/verifier/register" element={<P><VerifierRegistrationScreen /></P>} />
                      <Route path="/verifier/dashboard" element={<P><VerifierDashboard /></P>} />
                      <Route path="/verifier/task/:id" element={<P><VerifierTaskDetailScreen /></P>} />
                      <Route path="/verifier/report/:id?" element={<P><VerifierReportScreen /></P>} />
                      <Route path="/verifier/profile" element={<P><VerifierProfileScreen /></P>} />

                      {/* Quincaillerie */}
                      <Route path="/quincaillerie/register" element={<P><QuincaillerieRegistrationScreen /></P>} />
                      <Route path="/quincaillerie/dashboard" element={<P><QuincaillerieDashboardScreen /></P>} />
                      <Route path="/quincaillerie/profile/:id" element={<P><QuincaillerieProfileScreen /></P>} />
                      <Route path="/quincaillerie/inventory" element={<P><InventoryScreen /></P>} />
                      <Route path="/quincaillerie/inventory/new" element={<P><InventoryItemFormScreen /></P>} />
                      <Route path="/quincaillerie/inventory/:id/edit" element={<P><InventoryItemFormScreen /></P>} />
                      <Route path="/materials/request/:projectId/:milestoneId" element={<P><RequestMaterialsScreen /></P>} />

                      {/* Co-signer */}
                      <Route path="/funder/co-signer/:projectId?" element={<P><AddCoSignerScreen /></P>} />
      
                      {/* Messaging */}
                      <Route path="/messages" element={<P><ConversationListScreen /></P>} />
                      <Route path="/messages/:id" element={<P><ChatDetailScreen /></P>} />
    
                      {/* Financial */}
                      <Route path="/funder/project/:id/funding" element={<P><PooledFundingScreen /></P>} />
                      <Route path="/funder/invite-cofunder/:projectId?" element={<P><InviteCoFunderScreen /></P>} />
                      <Route path="/funder/recurring/new/:projectId?" element={<P><RecurringContributionSetupScreen /></P>} />
                      <Route path="/funder/recurring" element={<P><ManageRecurringScreen /></P>} />
                      <Route path="/tools/currency-converter" element={<P><CurrencyConverterScreen /></P>} />
  
                      {/* Marketplace */}
                      <Route path="/contractor/certifications/new" element={<P><AddCertificationScreen /></P>} />
                      <Route path="/tools/material-estimator" element={<P><MaterialCostEstimatorScreen /></P>} />
                      <Route path="/contractor/availability/:contractorId?" element={<P><AvailabilityCalendarScreen /></P>} />

                      {/* Community */}
                      <Route path="/groups/create" element={<P><GroupSetupScreen /></P>} />
                      <Route path="/groups/join/:id?" element={<P><JoinGroupScreen /></P>} />
                      <Route path="/groups/members/:id?" element={<P><GroupMembersScreen /></P>} />
                      <Route path="/groups/dashboard/:id?" element={<P><GroupDashboardScreen /></P>} />
                      <Route path="/referrals" element={<P><ReferralScreen /></P>} />

                      {/* Compliance */}
                      <Route path="/compliance/kyc" element={<P><KycExplainerScreen /></P>} />
                      <Route path="/compliance/kyc/verify" element={<P><KycVerifyScreen /></P>} />

                      {/* Admin */}
                      <Route path="/admin/login" element={<RedirectIfAuthed><AdminLoginScreen /></RedirectIfAuthed>} />
                      <Route path="/admin" element={<RequireAdmin><AdminOverviewScreen /></RequireAdmin>} />
                      <Route path="/admin/users" element={<RequireAdmin><AdminUsersScreen /></RequireAdmin>} />
                      <Route path="/admin/projects" element={<RequireAdmin><AdminProjectsScreen /></RequireAdmin>} />
                      <Route path="/admin/land" element={<RequireAdmin><AdminLandScreen /></RequireAdmin>} />
                      <Route path="/admin/contractors" element={<RequireAdmin><AdminContractorsScreen /></RequireAdmin>} />
                      <Route path="/admin/community" element={<RequireAdmin><AdminCommunityScreen /></RequireAdmin>} />
                      <Route path="/admin/verifications" element={<RequireAdmin><AdminVerificationsScreen /></RequireAdmin>} />
                      <Route path="/admin/notifications" element={<RequireAdmin><AdminNotificationsScreen /></RequireAdmin>} />
                      <Route path="/admin/settings" element={<RequireAdmin><AdminSettingsScreen /></RequireAdmin>} />
                      <Route path="/admin/accounts" element={<RequireAdmin><AdminAccountsScreen /></RequireAdmin>} />
                      <Route path="/admin/disputes" element={<RequireAdmin><DisputeResolutionScreen /></RequireAdmin>} />
                      <Route path="/admin/fraud-analytics" element={<RequireAdmin><AdminFraudAnalyticsScreen /></RequireAdmin>} />
        
                      {/* Shared — notifications live in the NotificationsDrawer overlay
                          (see components/NotificationsDrawer.tsx), not a routed page. */}
                      <Route path="/payment/callback" element={<PaymentCallbackScreen />} />
                      <Route path="/account/payout-settings" element={<P><PayoutSettingsScreen /></P>} />
                      <Route path="/shared/settings" element={<P><SettingsScreen /></P>} />
                      <Route path="/shared/settings/delete-account" element={<P><DeleteAccountScreen /></P>} />
                      <Route path="/shared/help" element={<P><HelpScreen /></P>} />
                      <Route path="/account/subscription" element={<P><SubscriptionScreen /></P>} />
                      <Route path="/shared/profile" element={<P><ProfileScreen /></P>} />
        
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    </AuthGate>
                  </WebFrame>
                </HashRouter>
                </OfflineQueueProvider>
          </MessagingProvider>
        </VerificationProvider>
      </FeeConfigProvider>
      </TeamProvider>
      </CustomFieldsProvider>
      </MaterialsProvider>
      </TemplatesProvider>
    </AppProvider>
    </PWAInstallProvider>
    </ThemeProvider>
    </QueryClientProvider>
  )
}
