import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/shared/lib/i18n";
import { CurrencyProvider } from "@/shared/lib/CurrencyContext";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import Index from "./pages/Index";
import SavedPage from "./pages/SavedPage";
import MessagesPage from "./pages/MessagesPage";
import ProfilePage from "./pages/ProfilePage";
import AgentPortalPage from "./pages/AgentPortalPage";
import AgentLandingPage from "./pages/AgentLandingPage";
import PocketListingPage from "./pages/PocketListingPage";
import AgentDashboardLayout from "./pages/AgentDashboardLayout";
import DashboardOverview from "@/features/agents/components/dashboard/DashboardOverview";
import ListingsPage from "@/features/agents/components/dashboard/ListingsPage";
import VoiceLeadsPage from "@/features/agents/components/dashboard/VoiceLeadsPage";
import AnalyticsPage from "@/features/agents/components/dashboard/AnalyticsPage";
import NetworkPage from "@/features/agents/components/dashboard/NetworkPage";
import SettingsPage from "@/features/agents/components/dashboard/SettingsPage";
import TeamPage from "@/features/agents/components/dashboard/TeamPage";
import AgentProfilePage from "@/features/agents/components/dashboard/ProfilePage";
import DocumentsPage from "@/features/agents/components/dashboard/DocumentsPage";
import MyAgenciesPage from "./pages/MyAgenciesPage";
import BillingPage from "@/features/agents/components/dashboard/BillingPage";
import ReviewsPage from "@/features/agents/components/dashboard/ReviewsPage";
import TerritoryPage from "@/features/agents/components/dashboard/TerritoryPage";
import ContactsPage from "@/features/agents/components/dashboard/ContactsPage";
import ListingDetailPage from "@/features/agents/components/dashboard/ListingDetailPage";
import TrustAccountingPage from "@/features/agents/components/dashboard/TrustAccountingPage";
import InvestmentDashboardPage from "@/features/agents/components/dashboard/InvestmentDashboardPage";
import TrustLedgerPage from "@/features/agents/components/dashboard/TrustLedgerPage";
import BankReconciliationPage from "@/features/agents/components/dashboard/BankReconciliationPage";
import ReportsPage from "@/features/agents/components/dashboard/ReportsPage";
import PipelinePage from "@/features/agents/components/dashboard/PipelinePage";
import InspectionModePage from "@/features/agents/components/dashboard/InspectionModePage";
import SeekerAuthPage from "./pages/SeekerAuthPage";
import AgentAuthPage from "./pages/AgentAuthPage";
import AuthLandingPage from "./pages/AuthLandingPage";
import AdminDashboard from "./pages/AdminDashboard";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AgencyProfilePage from "./pages/AgencyProfilePage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import AgentPublicProfilePage from "./pages/AgentPublicProfilePage";
import BuyerSettingsPage from "./pages/BuyerSettingsPage";
import AgentPerformanceDashboard from "./features/agents/pages/AgentPerformanceDashboard";
import DemoAccessPage from "./features/agents/pages/DemoAccessPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <CurrencyProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Index />} />
              <Route path="/property/:id" element={<PropertyDetailPage />} />
              <Route path="/agent/:id" element={<AgentPublicProfilePage />} />
              <Route path="/agents" element={<AgentLandingPage />} />
              <Route path="/auth" element={<AuthLandingPage />} />
              <Route path="/login" element={<SeekerAuthPage />} />
              <Route path="/agents/login" element={<AgentAuthPage />} />
              <Route path="/agents/demo" element={<DemoAccessPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/agency/:slug" element={<AgencyProfilePage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />

              {/* Authenticated (protection temporarily removed) */}
              <Route path="/saved" element={<SavedPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<BuyerSettingsPage />} />

              {/* Agent */}
              <Route path="/agent-dashboard" element={<AgentPerformanceDashboard />} />
              <Route path="/agent-portal" element={<AgentPortalPage />} />
              <Route path="/pocket-listing" element={<PocketListingPage />} />
              <Route path="/dashboard" element={<AgentDashboardLayout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="profile" element={<AgentProfilePage />} />
                <Route path="territory" element={<TerritoryPage />} />
                <Route path="listings" element={<ListingsPage />} />
                <Route path="listings/:listingId" element={<ListingDetailPage />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="leads" element={<VoiceLeadsPage />} />
                <Route path="pipeline" element={<PipelinePage />} />
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
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Admin */}
              <Route path="/admin" element={<AdminDashboard />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
      </CurrencyProvider>
    </I18nProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
