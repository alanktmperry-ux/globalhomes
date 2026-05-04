import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { buildAuditMeta } from '@/shared/lib/auditLog';
import AgentApprovalQueue from '@/features/admin/components/AgentApprovalQueue';
import { UnconfirmedSignups } from '@/features/admin/components/UnconfirmedSignups';

type TabKey = 'agents' | 'demos' | 'partners';


interface DemoRow {
  id: string;
  full_name: string;
  email: string;
  agency_name: string | null;
  phone: string | null;
  message: string | null;
  created_at: string;
  status: string;
}

interface PartnerRow {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  partner_type: string;
  abn: string | null;
  message: string | null;
  created_at: string;
}

async function logAudit(actionType: string, entityType: string, entityId: string, metadata: Record<string, unknown> = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase.from('audit_log') as any).insert({
      user_id: user.id,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      description: `${actionType} for ${entityType} ${entityId}`,
      metadata: buildAuditMeta(metadata) as any,
    });
  } catch (err) {
    console.error('[ApprovalsPage] audit log failed', err);
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: '2-digit' });
}


function CountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="bg-blue-600 text-white text-[11px] rounded-full px-1.5 py-0.5 ml-1.5">
      {count}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-stone-400 text-sm">{message}</div>
  );
}

// Listing approvals removed — listings auto-publish on submission.


// ─────────────────────────────────────────────────────
// Tab 2 — Demo Requests
// ─────────────────────────────────────────────────────

function DemosTab({ onCount }: { onCount: (n: number) => void }) {
  const [rows, setRows] = useState<DemoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from('demo_requests' as any) as any)
        .select('id, full_name, email, agency_name, phone, message, created_at, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const list = (data ?? []) as DemoRow[];
      setRows(list);
      onCount(list.length);
    } catch (err) {
      toast.error(getErrorMessage(err));
      onCount(0);
    } finally {
      setLoading(false);
    }
  }, [onCount]);

  useEffect(() => { load(); }, [load]);

  const action = async (row: DemoRow, accept: boolean) => {
    setBusyId(row.id);
    try {
      const newStatus = accept ? 'accepted' : 'declined';
      const { error } = await (supabase.from('demo_requests' as any) as any)
        .update({ status: newStatus })
        .eq('id', row.id);
      if (error) throw error;
      await logAudit(accept ? 'demo_accepted' : 'demo_declined', 'demo_request', row.id, { name: row.full_name, email: row.email });
      if (accept) toast.success(`Demo accepted — follow up with ${row.full_name}`);
      else toast.success('Demo declined');
      setRows(prev => {
        const next = prev.filter(r => r.id !== row.id);
        onCount(next.length);
        return next;
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  if (rows.length === 0) return <EmptyState message="No pending demo requests" />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Name</th>
            <th className="text-left px-4 py-3 font-medium">Agency</th>
            <th className="text-left px-4 py-3 font-medium">Email</th>
            <th className="text-left px-4 py-3 font-medium">Phone</th>
            <th className="text-left px-4 py-3 font-medium">Message</th>
            <th className="text-left px-4 py-3 font-medium">Submitted</th>
            <th className="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-t border-border">
              <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{row.agency_name || '—'}</td>
              <td className="px-4 py-3 text-muted-foreground">{row.email}</td>
              <td className="px-4 py-3 text-muted-foreground">{row.phone || '—'}</td>
              <td className="px-4 py-3 text-muted-foreground max-w-xs">
                {row.message ? (row.message.length > 80 ? row.message.slice(0, 80) + '…' : row.message) : '—'}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{fmtDate(row.created_at)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <Button size="sm" variant="ghost" disabled={busyId === row.id} onClick={() => action(row, true)} title="Accept">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busyId === row.id} onClick={() => action(row, false)} title="Decline">
                    <XCircle size={16} className="text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Tab 3 — Partners
// ─────────────────────────────────────────────────────

function PartnersTab({ onCount }: { onCount: (n: number) => void }) {
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Bug Fix 2: query the real `partners` table (no `partner_applications` table exists).
      // A partner is "pending" when it hasn't been verified yet.
      const { data, error } = await (supabase.from('partners') as any)
        .select('id, company_name, contact_name, contact_email, contact_phone, partner_type, abn, notes, created_at')
        .eq('is_verified', false)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const list = (data ?? []).map((r: any) => ({
        id: r.id,
        business_name: r.company_name,
        contact_name: r.contact_name,
        email: r.contact_email,
        phone: r.contact_phone,
        partner_type: r.partner_type,
        abn: r.abn,
        message: r.notes,
        created_at: r.created_at,
      })) as PartnerRow[];
      setRows(list);
      onCount(list.length);
    } catch (err) {
      console.error('[PartnersTab] load failed', err);
      setRows([]);
      onCount(0);
    } finally {
      setLoading(false);
    }
  }, [onCount]);

  useEffect(() => { load(); }, [load]);

  const action = async (row: PartnerRow, approve: boolean) => {
    setBusyId(row.id);
    try {
      const patch = approve
        ? { is_verified: true, verified_at: new Date().toISOString() }
        : { is_verified: false, notes: (row.message ? row.message + '\n' : '') + '[Rejected by admin]' };
      const { error } = await (supabase.from('partners') as any)
        .update(patch)
        .eq('id', row.id);
      if (error) throw error;
      await logAudit(approve ? 'partner_approved' : 'partner_rejected', 'partner', row.id, { business: row.business_name });
      toast.success(approve ? 'Partner approved' : 'Partner rejected');
      setRows(prev => {
        const next = prev.filter(r => r.id !== row.id);
        onCount(next.length);
        return next;
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  if (rows.length === 0) return <EmptyState message="No pending partner applications" />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Business</th>
            <th className="text-left px-4 py-3 font-medium">Contact</th>
            <th className="text-left px-4 py-3 font-medium">Email</th>
            <th className="text-left px-4 py-3 font-medium">Partner Type</th>
            <th className="text-left px-4 py-3 font-medium">ABN</th>
            <th className="text-left px-4 py-3 font-medium">Submitted</th>
            <th className="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const typeLabel = row.partner_type === 'mortgage_broker' || row.partner_type === 'broker'
              ? 'Mortgage Broker'
              : row.partner_type === 'trust_accountant' || row.partner_type === 'accountant'
                ? 'Trust Accountant'
                : row.partner_type;
            return (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium text-foreground">{row.business_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.contact_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.email}</td>
                <td className="px-4 py-3"><Badge variant="secondary">{typeLabel}</Badge></td>
                <td className="px-4 py-3 text-muted-foreground">{row.abn || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(row.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" disabled={busyId === row.id} onClick={() => action(row, true)} title="Approve">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busyId === row.id} onClick={() => action(row, false)} title="Reject">
                      <XCircle size={16} className="text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Page Shell
// ─────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const [tab, setTab] = useState<TabKey>('agents');
  const [counts, setCounts] = useState<{ agents: number; listings: number; demos: number; partners: number }>({
    agents: 0, listings: 0, demos: 0, partners: 0,
  });

  const setAgentsCount = useCallback((n: number) => setCounts(c => ({ ...c, agents: n })), []);
  const setDemosCount = useCallback((n: number) => setCounts(c => ({ ...c, demos: n })), []);
  const setPartnersCount = useCallback((n: number) => setCounts(c => ({ ...c, partners: n })), []);

  // Prefetch counts for ALL tabs on mount so the badges and "X total pending"
  // subtitle are accurate regardless of which tab is currently rendered.
  // Listings no longer require approval, so they're excluded from this count.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [agentsRes, demosRes, partnersRes] = await Promise.all([
          supabase.from('agents').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
          (supabase.from('demo_requests' as any).select('id', { count: 'exact', head: true }).eq('status', 'pending')) as any,
          (supabase.from('partners').select('id', { count: 'exact', head: true }).eq('is_verified', false)) as any,
        ]);
        if (cancelled) return;
        setCounts({
          agents: agentsRes.count ?? 0,
          listings: 0,
          demos: demosRes.count ?? 0,
          partners: partnersRes.count ?? 0,
        });
      } catch (err) {
        console.error('[ApprovalsPage] preload counts failed', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const total = counts.agents + counts.demos + counts.partners;

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and action pending items across the platform — {total} total pending
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="agents">
            Agent Approvals<CountBadge count={counts.agents} />
          </TabsTrigger>
          <TabsTrigger value="demos">
            Demo Requests<CountBadge count={counts.demos} />
          </TabsTrigger>
          <TabsTrigger value="partners">
            Partners<CountBadge count={counts.partners} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-6">
          {tab === 'agents' && <AgentApprovalQueue onPendingCountChange={setAgentsCount} />}
          {tab === 'agents' && (
            <div className="mt-6">
              <UnconfirmedSignups />
            </div>
          )}
        </TabsContent>
        <TabsContent value="demos" className="mt-6">
          {tab === 'demos' && <DemosTab onCount={setDemosCount} />}
        </TabsContent>
        <TabsContent value="partners" className="mt-6">
          {tab === 'partners' && <PartnersTab onCount={setPartnersCount} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
