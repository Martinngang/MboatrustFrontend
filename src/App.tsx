import type { ReactNode } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppProvider, useApp } from './context'
import { TemplatesProvider } from './templates'
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
import { LanguageScreen, SignupScreen, OTPScreen, LoginScreen, RoleScreen, ProfileSetupScreen } from './screens/Onboarding'
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
import { GroupSetupScreen, GroupMembersScreen, GroupDashboardScreen, ReferralScreen, PublicShowcaseScreen } from './screens/CommunityScreens'
// Compliance
import { KycExplainerScreen, KycVerifyScreen } from './screens/ComplianceScreens'
// Recipient
import { MilestoneSubmitScreen, WithdrawalScreen, ReputationScreen, RecipientProjectsScreen, SubmissionStatusScreen, RateRecipientScreen, ProjectHistoryScreen } from './screens/RecipientScreens'
// Contractor
import { BrowseJobsScreen, JobDetailScreen, SubmitBidScreen, MyBidsScreen, ContractDetailScreen, EarningsScreen, ContractorProfileScreen } from './screens/ContractorScreens'
// Land
import { BrowseLandScreen, LandListingDetailScreen, CreateListingScreen, MyListingsScreen, ContactSellerScreen, PurchaseOfferScreen } from './screens/LandScreens'
// Shared
import { SettingsScreen, HelpScreen, ProfileScreen, SubscriptionScreen, DeleteAccountScreen } from './screens/SharedScreens'
// Additional
import {
  ContractorOnboardingScreen, PostJobScreen, ContractSummaryScreen, RateContractorScreen, LandScheduleVisitScreen,
  VerifierRegistrationScreen, VerifierDashboard, VerifierTaskDetailScreen, VerifierReportScreen, VerifierProfileScreen,
  AdminPanelScreen, DisputeResolutionScreen, AdminFraudAnalyticsScreen,
} from './screens/AdditionalScreens'
// Co-signer
import { AddCoSignerScreen } from './screens/CoSignerScreens'
// Workspace (new management-app view-switcher demo)
import { WorkspaceProjectsScreen } from './screens/WorkspaceProjectsScreen'
import { WorkspaceJobsScreen } from './screens/WorkspaceJobsScreen'
import { WorkspaceLandScreen } from './screens/WorkspaceLandScreen'
import { TenderBidsScreen } from './screens/TenderBidsScreen'
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

// A signed-in visitor who lands on the marketing page or an auth screen
// (bookmark, back-button, restored session on reload) belongs at their
// dashboard, not back at square one.
function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useApp()
  return isLoggedIn ? <Navigate to="/home" replace /> : <>{children}</>
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
                      <Route path="/role" element={<RedirectIfAuthed><RoleScreen /></RedirectIfAuthed>} />
                      <Route path="/profile" element={<RedirectIfAuthed><ProfileSetupScreen /></RedirectIfAuthed>} />
                      {/* Public — no login required */}
                      <Route path="/showcase" element={<PublicShowcaseScreen />} />

                      {/* Home (role-aware) */}
                      <Route path="/home" element={<P><HomeScreen /></P>} />

                      {/* Workspace (new management-app view-switcher demo) */}
                      <Route path="/workspace/projects" element={<P><WorkspaceProjectsScreen /></P>} />
                      <Route path="/workspace/jobs" element={<P><WorkspaceJobsScreen /></P>} />
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
                      <Route path="/funder/post-job" element={<P><PostJobScreen /></P>} />
                      <Route path="/funder/tender/:jobId/bids" element={<P><TenderBidsScreen /></P>} />
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
                      <Route path="/contractor/bid/:id?" element={<P><SubmitBidScreen /></P>} />
                      <Route path="/contractor/bids" element={<P><MyBidsScreen /></P>} />
                      <Route path="/contractor/contract/:bidId" element={<P><ContractDetailScreen /></P>} />
                      <Route path="/contractor/earnings" element={<P><EarningsScreen /></P>} />
        
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
                      <Route path="/groups/members/:id?" element={<P><GroupMembersScreen /></P>} />
                      <Route path="/groups/dashboard/:id?" element={<P><GroupDashboardScreen /></P>} />
                      <Route path="/referrals" element={<P><ReferralScreen /></P>} />

                      {/* Compliance */}
                      <Route path="/compliance/kyc" element={<P><KycExplainerScreen /></P>} />
                      <Route path="/compliance/kyc/verify" element={<P><KycVerifyScreen /></P>} />

                      {/* Admin */}
                      <Route path="/admin" element={<P><AdminPanelScreen /></P>} />
                      <Route path="/admin/disputes" element={<P><DisputeResolutionScreen /></P>} />
                      <Route path="/admin/fraud-analytics" element={<P><AdminFraudAnalyticsScreen /></P>} />
        
                      {/* Shared — notifications live in the NotificationsDrawer overlay
                          (see components/NotificationsDrawer.tsx), not a routed page. */}
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
      </TemplatesProvider>
    </AppProvider>
    </PWAInstallProvider>
    </ThemeProvider>
    </QueryClientProvider>
  )
}
