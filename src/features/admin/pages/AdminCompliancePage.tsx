import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { FileDown, ShieldCheck, RefreshCw } from 'lucide-react';
import ExportCSVButton from '@/features/admin/components/ExportCSVButton';

interface PrivacyRequest {
  id: string;
  created_at: string;
  email: string;
  request_type: string;
  status: string;
  user_id: string | null;
  notes: string | null;
  fulfilled_at: string | null;
  export_url: string | null;
}

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  in_progress: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  completed: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-600 border-red-500/30',
};

function PrivacyRequestsPanel() {
  const [rows, setRows] = useState<PrivacyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('privacy_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
    setRows((data || []) as PrivacyRequest[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const act = async (id: string, action: 'fulfil_export' | 'fulfil_deletion' | 'reject') => {
    if (action === 'fulfil_deletion' && !confirm('Permanently delete this user and all their data? This cannot be undone.')) return;
    setBusy(id);
    try {
      const { data, error } = await supabase.functions.invoke('admin-process-privacy-request', {
        body: { request_id: id, action },
      });
      if (error) throw error;
      toast({ title: 'Done', description: action === 'fulfil_export' && data?.export_url ? 'Export ready — link in row.' : 'Request updated.' });
      await load();
    } catch (e) {
      toast({ title: 'Action failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Privacy requests</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Australian Privacy Act / GDPR data export, deletion, correction, and consent withdrawals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCSVButton
            filename={`privacy-requests-${format(new Date(), 'yyyy-MM-dd')}`}
            query={async () => rows}
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'created_at', label: 'Created', format: (v) => format(new Date(v), 'yyyy-MM-dd HH:mm') },
              { key: 'email', label: 'Email' },
              { key: 'request_type', label: 'Type' },
              { key: 'status', label: 'Status' },
              { key: 'user_id', label: 'User ID', format: (v) => v ?? '' },
              { key: 'fulfilled_at', label: 'Fulfilled at', format: (v) => v ?? '' },
            ]}
          />
          <Button size="sm" variant="ghost" onClick={() => void load()} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-muted-foreground">
                <th className="p-3 font-medium">Created</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No privacy requests yet.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-accent/40">
                  <td className="p-3 text-muted-foreground">{format(new Date(r.created_at), 'dd MMM yyyy HH:mm')}</td>
                  <td className="p-3 text-foreground">{r.email}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="capitalize">{r.request_type.replace('_', ' ')}</Badge>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_TONE[r.status] || ''}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {r.status === 'pending' || r.status === 'in_progress' ? (
                      <div className="flex flex-wrap gap-1.5">
                        {r.request_type === 'export' && (
                          <Button size="sm" variant="secondary" disabled={busy === r.id} onClick={() => act(r.id, 'fulfil_export')}>
                            Generate export
                          </Button>
                        )}
                        {r.request_type === 'deletion' && (
                          <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => act(r.id, 'fulfil_deletion')}>
                            Delete user
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => act(r.id, 'reject')}>
                          Reject
                        </Button>
                      </div>
                    ) : r.export_url ? (
                      <a href={r.export_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                        <FileDown className="h-3.5 w-3.5" /> Download export
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TrustAuditPanel() {
  const today = new Date().toISOString().slice(0, 10);
  const [state, setState] = useState('NSW');
  const [from, setFrom] = useState(today.slice(0, 7) + '-01');
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const url = `https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/export-trust-audit-report`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ state, from, to }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `trust-audit-${state}-${from}-to-${to}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(a.href);
      toast({ title: 'Audit report ready' });
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Trust account audit reports</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Generate state-specific trust account transaction reports (CSV) for accountant or regulator submission.
        </p>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 grid gap-4 sm:grid-cols-4">
        <div>
          <Label className="text-xs">State</Label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NSW">NSW</SelectItem>
              <SelectItem value="VIC">VIC</SelectItem>
              <SelectItem value="QLD">QLD</SelectItem>
              <SelectItem value="WA">WA</SelectItem>
              <SelectItem value="SA">SA</SelectItem>
              <SelectItem value="TAS">TAS</SelectItem>
              <SelectItem value="ACT">ACT</SelectItem>
              <SelectItem value="NT">NT</SelectItem>
              <SelectItem value="ALL">All states</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">From</Label>
          <Input className="mt-1" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input className="mt-1" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button onClick={generate} disabled={busy} className="w-full gap-2">
            <FileDown className="h-4 w-4" /> {busy ? 'Generating…' : 'Download CSV'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCompliancePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary mt-1" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compliance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Privacy Act requests and trust account audit exports.
          </p>
        </div>
      </div>
      <Tabs defaultValue="privacy">
        <TabsList>
          <TabsTrigger value="privacy">Privacy requests</TabsTrigger>
          <TabsTrigger value="trust">Trust audit</TabsTrigger>
        </TabsList>
        <TabsContent value="privacy" className="mt-4"><PrivacyRequestsPanel /></TabsContent>
        <TabsContent value="trust" className="mt-4"><TrustAuditPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
