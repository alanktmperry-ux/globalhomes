import { SidebarProvider } from '@/components/ui/sidebar';
import { Outlet } from 'react-router-dom';
import AgentDashboardSidebar from '@/components/agent-dashboard/AgentDashboardSidebar';

const AgentDashboardLayout = () => {
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
