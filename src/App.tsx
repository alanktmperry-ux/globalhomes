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
import SeekerAuthPage from "./pages/SeekerAuthPage";
import AgentAuthPage from "./pages/AgentAuthPage";
import AuthLandingPage from "./pages/AuthLandingPage";
import AdminDashboard from "./pages/AdminDashboard";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AgencyProfilePage from "./pages/AgencyProfilePage";
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
              <Route path="/agents" element={<AgentLandingPage />} />
              <Route path="/auth" element={<AuthLandingPage />} />
              <Route path="/login" element={<SeekerAuthPage />} />
              <Route path="/agents/login" element={<AgentAuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/agency/:slug" element={<AgencyProfilePage />} />

              {/* Authenticated */}
              <Route path="/saved" element={<ProtectedRoute><SavedPage /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

              {/* Agent-only */}
              <Route path="/agent-portal" element={<ProtectedRoute requireAgent><AgentPortalPage /></ProtectedRoute>} />
              <Route path="/pocket-listing" element={<ProtectedRoute requireAgent><PocketListingPage /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute requireAgent><AgentDashboardLayout /></ProtectedRoute>}>
                <Route index element={<DashboardOverview />} />
                <Route path="listings" element={<ListingsPage />} />
                <Route path="leads" element={<VoiceLeadsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="network" element={<NetworkPage />} />
                <Route path="team" element={<TeamPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Admin-only */}
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />

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
