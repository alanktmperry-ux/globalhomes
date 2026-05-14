import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Command } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { MFAChallenge } from '@/features/auth/components/MFAChallenge';
import AdminSidebar from './AdminSidebar';
import AdminCommandPalette from './AdminCommandPalette';
import SetPasswordBanner from './SetPasswordBanner';
import { AdminErrorBoundary } from './AdminErrorBoundary';

const SECTION_LABELS: Record<string, string> = {
  '': 'Command Centre',
  overview: 'Overview',
  approvals: 'Approvals',
  agents: 'Agents',
  listings: 'Listings',
  revenue: 'Revenue',
  outreach: 'Outreach',
  system: 'System',
  insights: 'Insights',
  support: 'Support',
  careers: 'Careers',
  halo: 'Halo',
  brokers: 'Brokers',
  costs: 'Costs',
  'referral-partners': 'Referral Partners',
  audit: 'Audit Log',
  partners: 'Partners',
  buyers: 'Buyers',
  users: 'Users',
};

function getSectionLabel(pathname: string): string {
  const seg = pathname.replace(/^\/admin\/?/, '').split('/')[0] ?? '';
  return SECTION_LABELS[seg] ?? 'Admin';
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { impersonating, impersonatedUser, stopImpersonation, isSupport, isAdmin } = useAuth();
  const [pendingTotal, setPendingTotal] = useState(0);
  const [listingsPendingCount, setListingsPendingCount] = useState<number | undefined>(undefined);
  const [agentsStuckCount, setAgentsStuckCount] = useState<number | undefined>(undefined);
  const [failedPaymentsCount, setFailedPaymentsCount] = useState<number | undefined>(undefined);
  const [supportOpenCount, setSupportOpenCount] = useState<number | undefined>(undefined);
  const [mfaRequired, setMfaRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (cancelled) return;
        setMfaRequired(data.currentLevel === 'aal1' && data.nextLevel === 'aal2');
      } catch { /* non-fatal */ }
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async () => {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!cancelled) setMfaRequired(data.currentLevel === 'aal1' && data.nextLevel === 'aal2');
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  if (mfaRequired) return <MFAChallenge />;

  useEffect(() => {
    let cancelled = false;

    async function loadCounts() {
      try {
        const [agentsRes, demosRes, partnersRes] = await Promise.all([
          supabase.from('agents').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
          (supabase.from('demo_requests' as any).select('id', { count: 'exact', head: true }).eq('status', 'pending')) as any,
          (supabase.from('partners').select('id', { count: 'exact', head: true }).eq('is_verified', false)) as any,
        ]);
        if (cancelled) return;
        const total = (agentsRes.count ?? 0) + (demosRes.count ?? 0) + (partnersRes.count ?? 0);
        setPendingTotal(total);
      } catch {
        if (!cancelled) setPendingTotal(0);
      }

      // Sidebar item badges — each guarded so a column-missing failure
      // gracefully hides the badge instead of showing a fake zero.
      try {
        const r = await (supabase.from('properties') as any)
          .select('id', { count: 'exact', head: true })
          .eq('moderation_status', 'pending');
        if (!cancelled) setListingsPendingCount(r.error ? undefined : (r.count ?? 0));
      } catch {
        if (!cancelled) setListingsPendingCount(undefined);
      }
      try {
        const r = await (supabase.from('agents') as any)
          .select('id', { count: 'exact', head: true })
          .eq('approval_status', 'approved')
          .eq('onboarding_complete', false);
        if (!cancelled) setAgentsStuckCount(r.error ? undefined : (r.count ?? 0));
      } catch {
        if (!cancelled) setAgentsStuckCount(undefined);
      }
      try {
        const since = new Date(Date.now() - 30 * 86400000).toISOString();
        const r = await (supabase.from('agents') as any)
          .select('id', { count: 'exact', head: true })
          .not('payment_failed_at', 'is', null)
          .gte('payment_failed_at', since);
        if (!cancelled) setFailedPaymentsCount(r.error ? undefined : (r.count ?? 0));
      } catch {
        if (!cancelled) setFailedPaymentsCount(undefined);
      }
      try {
        const r = await (supabase.from('support_tickets') as any)
          .select('id', { count: 'exact', head: true })
          .not('status', 'in', '(resolved,closed)');
        if (!cancelled) setSupportOpenCount(r.error ? undefined : (r.count ?? 0));
      } catch {
        if (!cancelled) setSupportOpenCount(undefined);
      }
    }


    loadCounts();
    const interval = window.setInterval(loadCounts, 2 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  const sectionLabel = getSectionLabel(location.pathname);

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar
        pendingApprovalsTotal={pendingTotal}
        isSupport={isSupport && !isAdmin}
        listingsPendingCount={listingsPendingCount}
        agentsStuckCount={agentsStuckCount}
        failedPaymentsCount={failedPaymentsCount}
        supportOpenCount={supportOpenCount}
      />

      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Header strip */}
        {(location.pathname === '/admin' || location.pathname === '/admin/') && <SetPasswordBanner />}
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
            <AdminErrorBoundary>
              <Outlet />
            </AdminErrorBoundary>
          </div>
        </div>
      </main>
      <AdminCommandPalette />
    </div>
  );
}
