import React, { Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { I18nProvider } from "@/shared/lib/i18n";
import { CurrencyProvider } from "@/shared/lib/CurrencyContext";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { Loader2 } from "lucide-react";
import AppErrorBoundary from "@/components/AppErrorBoundary";

// Lazy-loaded pages
const Index = React.lazy(() => import("./pages/Index"));
const SavedPage = React.lazy(() => import("./pages/SavedPage"));
const MessagesPage = React.lazy(() => import("./pages/MessagesPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const AgentPortalPage = React.lazy(() => import("./pages/AgentPortalPage"));
const AgentLandingPage = React.lazy(() => import("./pages/AgentLandingPage"));
const PocketListingPage = React.lazy(() => import("./pages/PocketListingPage"));
const AgentDashboardLayout = React.lazy(() => import("./pages/AgentDashboardLayout"));
const MyAgenciesPage = React.lazy(() => import("./pages/MyAgenciesPage"));
const SeekerAuthPage = React.lazy(() => import("./pages/SeekerAuthPage"));
const AgentAuthPage = React.lazy(() => import("./pages/AgentAuthPage"));
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
const AgentPerformanceDashboard = React.lazy(() => import("./features/agents/pages/AgentPerformanceDashboard"));
const DemoAccessPage = React.lazy(() => import("./features/agents/pages/DemoAccessPage"));
const PublicLayout = React.lazy(() => import("@/shared/components/layout/PublicLayout"));

// Lazy-loaded dashboard sub-pages
const DashboardOverview = React.lazy(() => import("@/features/agents/components/dashboard/DashboardOverview"));
const ListingsPage = React.lazy(() => import("@/features/agents/components/dashboard/ListingsPage"));
const VoiceLeadsPage = React.lazy(() => import("@/features/agents/components/dashboard/VoiceLeadsPage"));
const AnalyticsPage = React.lazy(() => import("@/features/agents/components/dashboard/AnalyticsPage"));
const NetworkPage = React.lazy(() => import("@/features/agents/components/dashboard/NetworkPage"));
const SettingsPage = React.lazy(() => import("@/features/agents/components/dashboard/SettingsPage"));
const TeamPage = React.lazy(() => import("@/features/agents/components/dashboard/TeamPage"));
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
const PipelinePage = React.lazy(() => import("@/features/agents/components/dashboard/PipelinePage"));
const InspectionModePage = React.lazy(() => import("@/features/agents/components/dashboard/InspectionModePage"));
const SettlementConcierge = React.lazy(() => import("@/features/agents/components/dashboard/SettlementConcierge"));
const CommissionCalculator = React.lazy(() => import("@/features/agents/components/dashboard/CommissionCalculator"));
const HelpPage = React.lazy(() => import("@/features/agents/components/dashboard/HelpPage"));
const RentRollPage = React.lazy(() => import("@/features/agents/components/dashboard/RentRollPage"));
const TenancyDetailPage = React.lazy(() => import("@/features/agents/components/dashboard/TenancyDetailPage"));
const RentalApplicationsPage = React.lazy(() => import("@/features/agents/components/dashboard/RentalApplicationsPage"));
const AgencyOnboardingPage = React.lazy(() => import("@/features/agents/pages/AgencyOnboardingPage"));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <AppErrorBoundary>
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <CurrencyProvider>
      <AuthProvider>
        <TooltipProvider>
          
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public with shared navbar/footer */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/property/:id" element={<PropertyDetailPage />} />
                  <Route path="/agent/:id" element={<AgentPublicProfilePage />} />
                  <Route path="/agents" element={<AgentLandingPage />} />
                  <Route path="/agency/:slug" element={<AgencyProfilePage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                </Route>

                {/* Auth pages (no shared layout) */}
                <Route path="/auth" element={<AuthLandingPage />} />
                <Route path="/login" element={<SeekerAuthPage />} />
                <Route path="/agents/login" element={<AgentAuthPage />} />
                <Route path="/agents/demo" element={<DemoAccessPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Authenticated */}
                <Route path="/saved" element={<ProtectedRoute><SavedPage /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><BuyerSettingsPage /></ProtectedRoute>} />

                {/* Agent */}
                <Route path="/agent-dashboard" element={<ProtectedRoute><AgentPerformanceDashboard /></ProtectedRoute>} />
                <Route path="/agent-portal" element={<ProtectedRoute><AgentPortalPage /></ProtectedRoute>} />
                <Route path="/pocket-listing" element={<ProtectedRoute><PocketListingPage /></ProtectedRoute>} />
                <Route path="/dashboard" element={<AgentDashboardLayout />}>
                  <Route index element={<DashboardOverview />} />
                  <Route path="profile" element={<AgentProfilePage />} />
                  <Route path="territory" element={<TerritoryPage />} />
                  <Route path="listings" element={<ListingsPage />} />
                  <Route path="listings/:listingId" element={<ListingDetailPage />} />
                  <Route path="contacts" element={<ContactsPage />} />
                  <Route path="leads" element={<VoiceLeadsPage />} />
                  <Route path="rental-applications" element={<RentalApplicationsPage />} />
                  <Route path="pipeline" element={<PipelinePage />} />
                  <Route path="inspection-mode" element={<InspectionModePage />} />
                  <Route path="settlements" element={<SettlementConcierge />} />
                  <Route path="commission" element={<CommissionCalculator />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="network" element={<NetworkPage />} />
                  <Route path="team" element={<TeamPage />} />
                  <Route path="agencies" element={<MyAgenciesPage />} />
                  <Route path="documents" element={<DocumentsPage />} />
                  <Route path="billing" element={<BillingPage />} />
                  <Route path="reviews" element={<ReviewsPage />} />
                  <Route path="investments" element={<InvestmentDashboardPage />} />
                  <Route path="trust" element={<TrustAccountingPage />} />
                  <Route path="trust-ledger" element={<TrustLedgerPage />} />
                  <Route path="reconciliation" element={<BankReconciliationPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="rent-roll" element={<RentRollPage />} />
                  <Route path="tenancies/:tenancyId" element={<TenancyDetailPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="help" element={<HelpPage />} />
                  <Route path="onboarding" element={<AgencyOnboardingPage />} />
                </Route>

                {/* Admin */}
                <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
      </CurrencyProvider>
    </I18nProvider>
  </QueryClientProvider>
  </HelmetProvider>
  </AppErrorBoundary>
);

export default App;
