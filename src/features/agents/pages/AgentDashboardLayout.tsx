import { SidebarProvider } from '@/components/ui/sidebar';
import { Outlet } from 'react-router-dom';
import AgentDashboardSidebar from '@/components/agent-dashboard/AgentDashboardSidebar';
import { DemoModeProvider } from '@/features/agents/context/DemoModeContext';
import DemoModeBanner from '@/features/agents/components/dashboard/DemoModeBanner';

const AgentDashboardLayout = () => {
  return (
    <DemoModeProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background text-foreground">
          <AgentDashboardSidebar />
          <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
            <DemoModeBanner />
            <Outlet />
          </main>
        </div>
      </SidebarProvider>
    </DemoModeProvider>
  );
};

export default AgentDashboardLayout;