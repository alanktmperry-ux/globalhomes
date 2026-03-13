import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import { CurrencyProvider } from "@/lib/CurrencyContext";
import { AuthProvider } from "@/lib/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import SavedPage from "./pages/SavedPage";
import MessagesPage from "./pages/MessagesPage";
import ProfilePage from "./pages/ProfilePage";
import AgentPortalPage from "./pages/AgentPortalPage";
import AgentLandingPage from "./pages/AgentLandingPage";
import PocketListingPage from "./pages/PocketListingPage";
import AgentDashboardLayout from "./pages/AgentDashboardLayout";
import DashboardOverview from "./components/agent-dashboard/DashboardOverview";
import ListingsPage from "./components/agent-dashboard/ListingsPage";
import VoiceLeadsPage from "./components/agent-dashboard/VoiceLeadsPage";
import AnalyticsPage from "./components/agent-dashboard/AnalyticsPage";
import NetworkPage from "./components/agent-dashboard/NetworkPage";
import SettingsPage from "./components/agent-dashboard/SettingsPage";
import TeamPage from "./components/agent-dashboard/TeamPage";
import AgentProfilePage from "./components/agent-dashboard/ProfilePage";
import DocumentsPage from "./components/agent-dashboard/DocumentsPage";
import MyAgenciesPage from "./pages/MyAgenciesPage";
import BillingPage from "./components/agent-dashboard/BillingPage";
import ReviewsPage from "./components/agent-dashboard/ReviewsPage";
import TerritoryPage from "./components/agent-dashboard/TerritoryPage";
import ContactsPage from "./components/agent-dashboard/ContactsPage";
import ListingDetailPage from "./components/agent-dashboard/ListingDetailPage";
import TrustAccountingPage from "./components/agent-dashboard/TrustAccountingPage";
import ReportsPage from "./components/agent-dashboard/ReportsPage";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/agency/:slug" element={<AgencyProfilePage />} />

              {/* Authenticated (protection temporarily removed) */}
              <Route path="/saved" element={<SavedPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<BuyerSettingsPage />} />

              {/* Agent */}
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
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="network" element={<NetworkPage />} />
                <Route path="team" element={<TeamPage />} />
                <Route path="agencies" element={<MyAgenciesPage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="reviews" element={<ReviewsPage />} />
                <Route path="trust" element={<TrustAccountingPage />} />
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
);

export default App;
