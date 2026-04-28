import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { buildAuditMeta } from '@/shared/lib/auditLog';

type TabKey = 'listings' | 'demos' | 'partners';

interface ListingRow {
  id: string;
  address: string | null;
  suburb: string | null;
  state: string | null;
  property_type: string | null;
  price: number | null;
  agent_id: string | null;
  images: string[] | null;
  created_at: string;
  agents: { name: string | null; email: string | null; agency: string | null } | null;
}

interface DemoRow {
  id: string;
  name: string;
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

function fmtPrice(n: number | null) {
  if (!n) return '—';
  return `$${n.toLocaleString()}`;
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

// ─────────────────────────────────────────────────────
// Tab 1 — Listings
// ─────────────────────────────────────────────────────

function ListingsTab({ onCount }: { onCount: (n: number) => void }) {
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, address, suburb, state, property_type, price, agent_id, images, created_at, agents!inner(name, email, agency)')
        .eq('is_active', false)
        .neq('moderation_status', 'rejected')
        .not('status', 'eq', 'archived')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const list = (data ?? []) as unknown as ListingRow[];
      setRows(list);
      onCount(list.length);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [onCount]);

  useEffect(() => { load(); }, [load]);

  const approve = async (row: ListingRow) => {
    setBusyId(row.id);
    try {
      const { error } = await (supabase.from('properties') as any).update({ is_active: true, moderation_status: 'approved' }).eq('id', row.id);
      if (error) throw error;
      await logAudit('listing_approved', 'property', row.id, { address: row.address });
      toast.success('Listing approved');
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

  const reject = async (row: ListingRow) => {
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }
    setBusyId(row.id);
    try {
      const { error } = await (supabase.from('properties') as any)
        .update({ is_active: false, moderation_status: 'rejected' })
        .eq('id', row.id);
      if (error) throw error;
      await logAudit('listing_rejected', 'property', row.id, { reason: rejectReason.trim(), address: row.address });
      toast.success('Listing rejected');
      setRows(prev => {
        const next = prev.filter(r => r.id !== row.id);
        onCount(next.length);
        return next;
      });
      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  if (rows.length === 0) return <EmptyState message="No listings pending review" />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Address</th>
            <th className="text-left px-4 py-3 font-medium">Agent</th>
            <th className="text-left px-4 py-3 font-medium">Agency</th>
            <th className="text-left px-4 py-3 font-medium">Type</th>
            <th className="text-left px-4 py-3 font-medium">Price</th>
            <th className="text-left px-4 py-3 font-medium">Submitted</th>
            <th className="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const thumb = Array.isArray(row.images) && row.images.length > 0 ? row.images[0] : null;
            const isRejecting = rejectingId === row.id;
            return (
              <>
                <tr key={row.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{row.address || '—'}</p>
                        <p className="text-xs text-muted-foreground">{[row.suburb, row.state].filter(Boolean).join(', ')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">{row.agents?.name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.agents?.agency || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{row.property_type || '—'}</td>
                  <td className="px-4 py-3 text-foreground">{fmtPrice(row.price)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(row.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" disabled={busyId === row.id} onClick={() => approve(row)} title="Approve">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busyId === row.id} onClick={() => { setRejectingId(isRejecting ? null : row.id); setRejectReason(''); }} title="Reject">
                        <XCircle size={16} className="text-destructive" />
                      </Button>
                      <a href={`/listing/${row.id}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground p-2">
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </td>
                </tr>
                {isRejecting && (
                  <tr key={`${row.id}-reject`} className="border-t border-border bg-muted/30">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <textarea
                          autoFocus
                          maxLength={200}
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Reason for rejection (max 200 chars)"
                          className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-background min-h-[60px] resize-none"
                        />
                        <div className="flex flex-col gap-2">
                          <Button size="sm" variant="destructive" disabled={busyId === row.id} onClick={() => reject(row)}>
                            Confirm reject
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(''); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

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
        .select('id, name, email, agency_name, phone, message, created_at, status')
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
      await logAudit(accept ? 'demo_accepted' : 'demo_declined', 'demo_request', row.id, { name: row.name, email: row.email });
      if (accept) toast.success(`Demo accepted — follow up with ${row.name}`);
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
      const { data, error } = await (supabase.from('partner_applications' as any) as any)
        .select('id, business_name, contact_name, email, phone, partner_type, abn, message, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        // Table may not exist yet — silently suppress
        setRows([]);
        onCount(0);
        return;
      }
      const list = (data ?? []) as PartnerRow[];
      setRows(list);
      onCount(list.length);
    } catch {
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
      const newStatus = approve ? 'approved' : 'rejected';
      const { error } = await (supabase.from('partner_applications' as any) as any)
        .update({ status: newStatus })
        .eq('id', row.id);
      if (error) throw error;
      await logAudit(approve ? 'partner_approved' : 'partner_rejected', 'partner_application', row.id, { business: row.business_name });
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
  const [tab, setTab] = useState<TabKey>('listings');
  const [counts, setCounts] = useState<{ listings: number; demos: number; partners: number }>({
    listings: 0, demos: 0, partners: 0,
  });

  const setListingsCount = useCallback((n: number) => setCounts(c => ({ ...c, listings: n })), []);
  const setDemosCount = useCallback((n: number) => setCounts(c => ({ ...c, demos: n })), []);
  const setPartnersCount = useCallback((n: number) => setCounts(c => ({ ...c, partners: n })), []);

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and action pending items across the platform
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="listings">
            Listings<CountBadge count={counts.listings} />
          </TabsTrigger>
          <TabsTrigger value="demos">
            Demo Requests<CountBadge count={counts.demos} />
          </TabsTrigger>
          <TabsTrigger value="partners">
            Partners<CountBadge count={counts.partners} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-6">
          {tab === 'listings' && <ListingsTab onCount={setListingsCount} />}
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
