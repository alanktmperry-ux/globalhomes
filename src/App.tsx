import React, { Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { I18nProvider } from "@/shared/lib/i18n";

import { CurrencyProvider } from "@/shared/lib/CurrencyContext";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { Loader2 } from "lucide-react";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import { DefaultSEOHead } from "@/features/seo/components/DefaultSEOHead";
import { HelpWidget } from "@/features/help/components/HelpWidget";

// Lazy-loaded pages
const Index = React.lazy(() => import("./pages/Index"));
const SavedPage = React.lazy(() => import("./pages/SavedPage"));
const MessagesPage = React.lazy(() => import("./pages/MessagesPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const AgentPortalPage = React.lazy(() => import("./pages/AgentPortalPage"));
const AgentLandingPage = React.lazy(() => import("./pages/AgentLandingPage"));
const FindAgentPage = React.lazy(() => import("./features/agents/pages/FindAgentPage"));
const PocketListingPage = React.lazy(() => import("./pages/PocketListingPage"));
const AgentDashboardLayout = React.lazy(() => import("./pages/AgentDashboardLayout"));
const MyAgenciesPage = React.lazy(() => import("./pages/MyAgenciesPage"));
const SeekerAuthPage = React.lazy(() => import("./pages/SeekerAuthPage"));
const AgentAuthPage = React.lazy(() => import("./pages/AgentAuthPage"));
const CheckEmailPage = React.lazy(() => import("./pages/CheckEmailPage"));
const AuthLandingPage = React.lazy(() => import("./pages/AuthLandingPage"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const ForgotPasswordPage = React.lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = React.lazy(() => import("./pages/ResetPasswordPage"));
const AgencyProfilePage = React.lazy(() => import("./pages/AgencyProfilePage"));
const PropertyDetailPage = React.lazy(() => import("./pages/PropertyDetailPage"));
const AgentPublicProfilePage = React.lazy(() => import("./pages/AgentPublicProfilePage"));
const BuyerSettingsPage = React.lazy(() => import("./pages/BuyerSettingsPage"));
const TermsPage = React.lazy(() => import("./pages/TermsPage"));
const PrivacyPage = React.lazy(() => import("./pages/PrivacyPage"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const MarketingLandingPage = React.lazy(() => import("./features/marketing/pages/MarketingLandingPage"));
const WaitlistPage = React.lazy(() => import("./features/marketing/pages/WaitlistPage"));
const AgentPerformanceDashboard = React.lazy(() => import("./features/agents/pages/AgentPerformanceDashboard"));
const DemoAccessPage = React.lazy(() => import("./features/agents/pages/DemoAccessPage"));
const AuthConfirmPage = React.lazy(() => import("./features/auth/pages/AuthConfirmPage"));
const AuthCallbackPage = React.lazy(() => import("./features/auth/pages/AuthCallbackPage"));
const OnboardingRolePage = React.lazy(() => import("./features/auth/pages/OnboardingRolePage"));
const MyApplicationsPage = React.lazy(() => import("./features/rental/pages/MyApplicationsPage"));
const PublicLayout = React.lazy(() => import("@/shared/components/layout/PublicLayout"));
const BuyPage = React.lazy(() => import("./pages/BuyPage"));
const SuburbsIndexPage = React.lazy(() => import("./pages/SuburbsIndexPage"));
const SigningPage = React.lazy(() => import("./pages/SigningPage"));
const TenantPortalPage = React.lazy(() => import("./features/tenant/pages/TenantPortalPage"));
const SupplierPortalPage = React.lazy(() => import("./features/supplier/pages/SupplierPortalPage"));
const SuppliersPage = React.lazy(() => import("@/features/agents/components/dashboard/SuppliersPage"));

// Lazy-loaded dashboard sub-pages
const DashboardOverview = React.lazy(() => import("@/features/agents/components/dashboard/DashboardOverview"));
const ListingsPage = React.lazy(() => import("@/features/agents/components/dashboard/ListingsPage"));
const VoiceLeadsPage = React.lazy(() => import("@/features/agents/components/dashboard/VoiceLeadsPage"));
const BuyerConciergePage = React.lazy(() => import("@/features/agents/components/dashboard/BuyerConciergePage"));
const PreMarketPage = React.lazy(() => import("@/features/agents/components/dashboard/PreMarketPage"));
const LeadMarketplacePage = React.lazy(() => import("@/features/agents/components/dashboard/LeadMarketplacePage"));
const AnalyticsPage = React.lazy(() => import("@/features/agents/components/dashboard/AnalyticsPage"));
const NetworkPage = React.lazy(() => import("@/features/agents/components/dashboard/NetworkPage"));
const SettingsPage = React.lazy(() => import("@/features/agents/components/dashboard/SettingsPage"));
const TeamPage = React.lazy(() => import("@/features/agents/components/dashboard/TeamPage"));
const TeamOverviewPage = React.lazy(() => import("@/features/agents/pages/TeamOverviewPage"));
const AgentProfilePage = React.lazy(() => import("@/features/agents/components/dashboard/ProfilePage"));
const DocumentsPage = React.lazy(() => import("@/features/agents/components/dashboard/DocumentsPage"));
const BillingPage = React.lazy(() => import("@/features/agents/components/dashboard/BillingPage"));
const ReviewsPage = React.lazy(() => import("@/features/agents/components/dashboard/ReviewsPage"));
const TerritoryPage = React.lazy(() => import("@/features/agents/components/dashboard/TerritoryPage"));
const ContactsPage = React.lazy(() => import("@/features/agents/components/dashboard/ContactsPage"));
const ListingDetailPage = React.lazy(() => import("@/features/agents/components/dashboard/ListingDetailPage"));
const TrustAccountingPage = React.lazy(() => import("@/features/agents/components/dashboard/TrustAccountingPage"));
const InvestmentDashboardPage = React.lazy(() => import("@/features/agents/components/dashboard/InvestmentDashboardPage"));
const TrustLedgerPage = React.lazy(() => import("@/features/agents/components/dashboard/TrustLedgerPage"));
const BankReconciliationPage = React.lazy(() => import("@/features/agents/components/dashboard/BankReconciliationPage"));
const ReportsPage = React.lazy(() => import("@/features/agents/components/dashboard/ReportsPage"));
const SellerScoringPage = React.lazy(() => import("@/features/agents/components/dashboard/SellerScoringPage"));
const PipelinePage = React.lazy(() => import("@/features/agents/components/dashboard/PipelinePage"));
const InspectionModePage = React.lazy(() => import("@/features/agents/components/dashboard/InspectionModePage"));
const SettlementConcierge = React.lazy(() => import("@/features/agents/components/dashboard/SettlementConcierge"));
const CommissionCalculator = React.lazy(() => import("@/features/agents/components/dashboard/CommissionCalculator"));
const PerformancePage = React.lazy(() => import("@/features/agents/components/dashboard/PerformancePage"));
const HelpPage = React.lazy(() => import("@/features/agents/components/dashboard/HelpPage"));
const RentRollPage = React.lazy(() => import("@/features/agents/components/dashboard/RentRollPage"));
const TenancyDetailPage = React.lazy(() => import("@/features/agents/components/dashboard/TenancyDetailPage"));
const InspectionReportPage = React.lazy(() => import("./pages/InspectionReportPage"));
const OpenHomesPage = React.lazy(() => import("@/features/open-homes/components/AgentOpenHomeManager"));
const OpenHomeSignInPage = React.lazy(() => import("@/features/open-homes/pages/OpenHomeSignInPage"));
const RentalApplicationsPage = React.lazy(() => import("@/features/agents/components/dashboard/RentalApplicationsPage"));
const AutomationSettingsPage = React.lazy(() => import("@/features/agents/components/dashboard/AutomationSettingsPage"));
const AgentEOIPage = React.lazy(() => import("@/features/offmarket/pages/AgentEOIPage"));
const AgencyOnboardingPage = React.lazy(() => import("@/features/agents/pages/AgencyOnboardingPage"));
const PartnerAuthPage = React.lazy(() => import("./features/partners/pages/PartnerAuthPage"));
const PartnerDashboardLayout = React.lazy(() => import("./features/partners/pages/PartnerDashboardLayout"));
const PartnerOverviewPage = React.lazy(() => import("./features/partners/pages/PartnerOverviewPage"));
const PartnerAcceptPage = React.lazy(() => import("./features/partners/pages/PartnerAcceptPage"));
const PartnerTrustPage = React.lazy(() => import("./features/partners/pages/PartnerTrustPage"));
const PartnerRentRollPage = React.lazy(() => import("./features/partners/pages/PartnerRentRollPage"));
const PartnerArrearsPage = React.lazy(() => import("./features/partners/pages/PartnerArrearsPage"));
const PartnerJoinPage = React.lazy(() => import("./features/partners/pages/PartnerJoinPage"));
const PartnerTeamPage = React.lazy(() => import("./features/partners/pages/PartnerTeamPage"));
const PartnerAccessPage = React.lazy(() => import("./features/agents/components/dashboard/PartnerAccessPage"));
const ReviewSubmitPage = React.lazy(() => import("./features/agents/pages/ReviewSubmitPage"));
const VerifyReviewPage = React.lazy(() => import("./features/agents/pages/VerifyReviewPage"));
const StrataDirectoryPage = React.lazy(() => import("./features/strata/pages/StrataDirectoryPage"));
const SchemeProfilePage = React.lazy(() => import("./features/strata/pages/SchemeProfilePage"));
const StrataDashboardLayout = React.lazy(() => import("./features/strata/pages/StrataDashboardLayout"));
const StrataAuthPage = React.lazy(() => import("./features/strata/pages/StrataAuthPage"));
const HelpCentrePage = React.lazy(() => import("./pages/HelpCentrePage"));
const FaqPage = React.lazy(() => import("./pages/FaqPage"));
const HelpAgentsPage = React.lazy(() => import("./pages/HelpAgentsPage"));
const HelpBuyersPage = React.lazy(() => import("./pages/HelpBuyersPage"));
const HelpRentersPage = React.lazy(() => import("./pages/HelpRentersPage"));
const HelpVendorsPage = React.lazy(() => import("./pages/HelpVendorsPage"));
const HelpContactPage = React.lazy(() => import("./pages/HelpContactPage"));
const CRMPage = React.lazy(() => import("./features/crm/pages/CRMPage"));
const SavedSearchesPage = React.lazy(() => import("./features/alerts/pages/SavedSearchesPage"));
const StampDutyPage = React.lazy(() => import("./pages/StampDutyPage"));
const MortgageCalculatorPage = React.lazy(() => import("./features/mortgage/pages/MortgageCalculatorPage"));
const SchoolPage = React.lazy(() => import("./pages/SchoolPage"));
const SuburbProfilePage = React.lazy(() => import("./features/suburb/pages/SuburbProfilePage"));
const SuburbPage = React.lazy(() => import("./pages/SuburbPage"));
const RentSearchPage = React.lazy(() => import("./features/rental/pages/RentSearchPage"));
const VendorReportPage = React.lazy(() => import("./pages/VendorReportPage"));
const ListingPerformancePage = React.lazy(() => import("./pages/ListingPerformancePage"));
const RentalPropertyPage = React.lazy(() => import("./features/rental/pages/RentalPropertyPage"));
const LiveAuctionPage = React.lazy(() => import("./features/auctions/pages/LiveAuctionPage"));
const InspectionReportPublic = React.lazy(() => import("./pages/InspectionReportPage_Public"));
const BrokerLogin = React.lazy(() => import("./pages/broker/BrokerLogin"));
const BrokerPortal = React.lazy(() => import("./pages/broker/BrokerPortal"));
const ReferralLandingPage = React.lazy(() => import("./features/referral/pages/ReferralLandingPage"));
const ReferralDashboardPage = React.lazy(() => import("./features/referral/pages/ReferralDashboardPage"));
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const ImpersonationBanner = () => {
  const { impersonating, impersonatedUser, stopImpersonation } = useAuth();
  const navigate = useNavigate();
  if (!impersonating) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: 'linear-gradient(90deg, #d97706, #ea580c)', padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
      <span style={{ color: '#FAEEDA', fontSize: '12px', fontWeight: 500 }}>
        Viewing as {impersonatedUser} — you are in admin impersonation mode
      </span>
      <button
        onClick={async () => { await stopImpersonation(); navigate('/admin'); }}
        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', padding: '4px 12px', color: '#FAEEDA', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}
      >
        Exit — return to admin
      </button>
    </div>
  );
};

const ScrollToTop = (): null => {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

/** Redirects /search?q=foo to /?q=foo so shared/bookmarked search URLs don't 404 */
function SearchRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/${search}`} replace />;
}

const queryClient = new QueryClient();

const App = () => (
  <AppErrorBoundary>
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <BrowserRouter>
      <CurrencyProvider>
      <AuthProvider>
        <TooltipProvider>
          
            <DefaultSEOHead />
            <Sonner position="top-center" richColors closeButton duration={5000} />
            <ImpersonationBanner />
            <ScrollToTop />
             <HelpWidget />
             <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public with shared navbar/footer */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Index />} />
                  {/* /search?q=... redirects to /?q=... so bookmarked/shared search URLs don't 404 */}
                  <Route path="/search" element={<SearchRedirect />} />
                  <Route path="/property/:id" element={<PropertyDetailPage />} />
                  <Route path="/agent/:id" element={<AgentPublicProfilePage />} />
                  <Route path="/agents" element={<FindAgentPage />} />
                  <Route path="/for-agents" element={<AgentLandingPage />} />
                  <Route path="/suburbs" element={<SuburbsIndexPage />} />
                  <Route path="/launch" element={<MarketingLandingPage />} />
                  <Route path="/waitlist" element={<WaitlistPage />} />
                  <Route path="/agency/:slug" element={<AgencyProfilePage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/sign/:token" element={<SigningPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/strata" element={<StrataDirectoryPage />} />
                  <Route path="/schemes/:id" element={<SchemeProfilePage />} />
                  <Route path="/stamp-duty-calculator" element={<StampDutyPage />} />
                  <Route path="/mortgage-calculator" element={<MortgageCalculatorPage />} />
                  <Route path="/school/:state/:slug" element={<SchoolPage />} />
                  
                  <Route path="/buy" element={<BuyPage />} />
                  <Route path="/buy/:state/:suburb" element={<SuburbPage />} />
                  <Route path="/suburb/:state/:slug" element={<SuburbProfilePage />} />
                  <Route path="/rent" element={<RentSearchPage />} />
                  <Route path="/rent/property/:id" element={<RentalPropertyPage />} />
                  
                  
                  <Route path="/help" element={<HelpCentrePage />} />
                  <Route path="/help/faq" element={<FaqPage />} />
                  <Route path="/help/agents" element={<HelpAgentsPage />} />
                  <Route path="/help/buyers" element={<HelpBuyersPage />} />
                  <Route path="/help/renters" element={<HelpRentersPage />} />
                  <Route path="/help/vendors" element={<HelpVendorsPage />} />
                  <Route path="/help/contact" element={<HelpContactPage />} />
                </Route>

                {/* Public standalone pages (no shared layout) */}
                <Route path="/auctions/:id/live" element={<LiveAuctionPage />} />

                {/* Auth pages (no shared layout) */}
                <Route path="/auth" element={<AuthLandingPage />} />
                <Route path="/login" element={<SeekerAuthPage />} />
                <Route path="/agents/login" element={<AgentAuthPage />} />
                <Route path="/agents/demo" element={<DemoAccessPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/auth/confirm" element={<AuthConfirmPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="/onboarding/role" element={<OnboardingRolePage />} />
                <Route path="/open-home/signin/:token" element={<OpenHomeSignInPage />} />
                <Route path="/vendor-report/:token" element={<VendorReportPage />} />
                <Route path="/inspection-report/:token" element={<InspectionReportPublic />} />
                <Route path="/tenant/portal" element={<TenantPortalPage />} />
                <Route path="/supplier/portal" element={<SupplierPortalPage />} />
                <Route path="/review/:token" element={<ReviewSubmitPage />} />
                <Route path="/strata/login" element={<StrataAuthPage />} />
                <Route path="/broker/login" element={<BrokerLogin />} />
                <Route path="/broker/portal" element={<BrokerPortal />} />
                <Route path="/check-email" element={<CheckEmailPage />} />

                {/* International Agent Referral Portal */}
                <Route path="/refer" element={<ReferralLandingPage />} />
                <Route path="/referral/dashboard" element={<ProtectedRoute><ReferralDashboardPage /></ProtectedRoute>} />

                {/* Authenticated */}
                <Route path="/saved" element={<ProtectedRoute><SavedSearchesPage /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><BuyerSettingsPage /></ProtectedRoute>} />
                <Route path="/my-applications" element={<ProtectedRoute><MyApplicationsPage /></ProtectedRoute>} />

                {/* Agent */}
                <Route path="/agent-dashboard" element={<ProtectedRoute requireAgent><AgentPerformanceDashboard /></ProtectedRoute>} />
                <Route path="/agent-portal" element={<ProtectedRoute requireAgent><AgentPortalPage /></ProtectedRoute>} />
                <Route path="/pocket-listing" element={<ProtectedRoute requireAgent><PocketListingPage /></ProtectedRoute>} />
                {/* Onboarding — accessible to any authenticated user (no requireAgent) */}
                <Route path="/dashboard/onboarding" element={<ProtectedRoute><AgencyOnboardingPage /></ProtectedRoute>} />

                <Route path="/dashboard" element={<ProtectedRoute requireAgent><AgentDashboardLayout /></ProtectedRoute>}>
                  <Route index element={<DashboardOverview />} />
                  <Route path="profile" element={<AgentProfilePage />} />
                  <Route path="territory" element={<TerritoryPage />} />
                  <Route path="listings" element={<ListingsPage />} />
                  <Route path="listings/new" element={<PocketListingPage />} />
                  <Route path="listings/:listingId" element={<ListingDetailPage />} />
                  <Route path="listings/:listingId/eoi" element={<AgentEOIPage />} />
                  <Route path="listings/:propertyId/performance" element={<ListingPerformancePage />} />
                  <Route path="contacts" element={<ContactsPage />} />
                  <Route path="leads" element={<VoiceLeadsPage />} />
                  <Route path="concierge" element={<BuyerConciergePage />} />
                  <Route path="pre-market" element={<PreMarketPage />} />
                  <Route path="lead-marketplace" element={<LeadMarketplacePage />} />
                  <Route path="rental-applications" element={<RentalApplicationsPage />} />
                  <Route path="pipeline" element={<PipelinePage />} />
                  <Route path="crm" element={<CRMPage />} />
                  <Route path="inspection-mode" element={<InspectionModePage />} />
                  <Route path="settlements" element={<SettlementConcierge />} />
                  <Route path="commission" element={<CommissionCalculator />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="network" element={<NetworkPage />} />
                  <Route path="opportunities" element={<SellerScoringPage />} />
                  <Route path="team" element={<TeamPage />} />
                  <Route path="team-overview" element={<TeamOverviewPage />} />
                  <Route path="agencies" element={<MyAgenciesPage />} />
                  <Route path="documents" element={<DocumentsPage />} />
                  <Route path="billing" element={<BillingPage />} />
                  <Route path="reviews" element={<ReviewsPage />} />
                  <Route path="investments" element={<InvestmentDashboardPage />} />
                  <Route path="trust" element={<TrustAccountingPage />} />
                  <Route path="trust-ledger" element={<TrustLedgerPage />} />
                  <Route path="reconciliation" element={<BankReconciliationPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="performance" element={<PerformancePage />} />
                  <Route path="rent-roll" element={<RentRollPage />} />
                  <Route path="tenancies/:tenancyId" element={<TenancyDetailPage />} />
                  <Route path="inspection/:inspectionId" element={<InspectionReportPage />} />
                  <Route path="open-homes" element={<OpenHomesPage />} />
                  <Route path="automation" element={<AutomationSettingsPage />} />
                  <Route path="suppliers" element={<SuppliersPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="help" element={<HelpPage />} />
                  <Route path="partner-access" element={<PartnerAccessPage />} />
                </Route>

                {/* Partner */}
                <Route path="/partner/login" element={<PartnerAuthPage />} />
                <Route path="/partner/accept" element={<PartnerAcceptPage />} />
                <Route path="/partner/join" element={<PartnerJoinPage />} />
                <Route path="/partner" element={<ProtectedRoute requirePartner><PartnerDashboardLayout /></ProtectedRoute>}>
                  <Route path="dashboard" element={<PartnerOverviewPage />} />
                  <Route path="team" element={<PartnerTeamPage />} />
                  <Route path="trust" element={<PartnerTrustPage />} />
                  <Route path="rent-roll" element={<PartnerRentRollPage />} />
                  <Route path="arrears" element={<PartnerArrearsPage />} />
                </Route>

                {/* Strata */}
                <Route path="/strata-dashboard" element={<ProtectedRoute><StrataDashboardLayout /></ProtectedRoute>} />

                {/* Admin */}
                <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
        </TooltipProvider>
      </AuthProvider>
      </CurrencyProvider>
      </BrowserRouter>
    </I18nProvider>
  </QueryClientProvider>
  </HelmetProvider>
  </AppErrorBoundary>
);

export default App;
