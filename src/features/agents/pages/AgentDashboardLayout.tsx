import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import AgentDashboardSidebar from '@/features/agents/components/dashboard/AgentDashboardSidebar';

const AgentDashboardLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(true);

  useEffect(() => {
    if (!user || checked) return;
    const checkOnboarding = async () => {
      const { data: agent } = await supabase.from('agents').select('onboarding_complete').eq('user_id', user.id).single();
      if (agent) {
        const complete = !!(agent as any).onboarding_complete;
        setOnboardingComplete(complete);
        if (!complete && !location.pathname.includes('/dashboard/onboarding')) {
          navigate('/dashboard/onboarding', { replace: true });
        }
      }
      setChecked(true);
    };
    checkOnboarding();
  }, [user, checked, location.pathname, navigate]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AgentDashboardSidebar />
        <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AgentDashboardLayout;
