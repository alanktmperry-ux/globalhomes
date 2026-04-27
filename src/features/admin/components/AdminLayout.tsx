import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Command } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import AdminSidebar from './AdminSidebar';
import AdminCommandPalette from './AdminCommandPalette';

const SECTION_LABELS: Record<string, string> = {
  '': 'Command Centre',
  approvals: 'Approvals',
  agents: 'Agents',
  listings: 'Listings',
  revenue: 'Revenue',
  outreach: 'Outreach',
  system: 'System',
};

function getSectionLabel(pathname: string): string {
  const seg = pathname.replace(/^\/admin\/?/, '').split('/')[0] ?? '';
  return SECTION_LABELS[seg] ?? 'Admin';
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { impersonating, impersonatedUser, stopImpersonation } = useAuth();
  const [pendingTotal, setPendingTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadCounts() {
      try {
        const [agentsRes, propsRes, demosRes] = await Promise.all([
          supabase.from('agents').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
          supabase.from('properties').select('id', { count: 'exact', head: true }).eq('is_active', false),
          (supabase.from('demo_requests' as any).select('id', { count: 'exact', head: true }).eq('status', 'pending')) as any,
        ]);
        if (cancelled) return;
        const total = (agentsRes.count ?? 0) + (propsRes.count ?? 0) + (demosRes.count ?? 0);
        setPendingTotal(total);
      } catch {
        if (!cancelled) setPendingTotal(0);
      }
    }

    loadCounts();
    const interval = window.setInterval(loadCounts, 2 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  const sectionLabel = getSectionLabel(location.pathname);

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar pendingApprovalsTotal={pendingTotal} />

      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Header strip */}
        <header className="flex-shrink-0 border-b border-border bg-card/40 backdrop-blur-sm">
          {impersonating && (
            <div className="bg-warning/15 text-warning-foreground px-4 py-2 text-xs flex items-center justify-between gap-3">
              <span>
                Viewing as <strong>{impersonatedUser}</strong> — admin impersonation active
              </span>
              <button
                onClick={async () => { await stopImpersonation(); navigate('/admin'); }}
                className="rounded-md bg-warning/20 hover:bg-warning/30 px-2 py-1 font-medium"
              >
                Exit impersonation
              </button>
            </div>
          )}
          <div className="h-12 px-5 flex items-center justify-between gap-3">
            <nav className="text-sm flex items-center gap-2">
              <span className="text-muted-foreground">Admin</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-semibold text-foreground">{sectionLabel}</span>
            </nav>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 text-xs"
              onClick={() => {
                // Wired up in Prompt 6
                window.dispatchEvent(new CustomEvent('admin:open-command-palette'));
              }}
            >
              <Command size={14} />
              <span>Quick actions</span>
              <kbd className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <Outlet />
          </div>
        </div>
      </main>
      <AdminCommandPalette />
    </div>
  );
}
