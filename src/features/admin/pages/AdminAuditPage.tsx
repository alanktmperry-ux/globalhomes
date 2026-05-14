import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, Search, ShieldCheck, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AuditRow {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_email: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_summary: string | null;
  ip_address: string | null;
  user_agent: string | null;
  before_state: any;
  after_state: any;
  notes: string | null;
  request_id: string | null;
}

const PAGE_SIZE = 100;

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_audit_log' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);
    if (error) console.error('[audit] load failed', error);
    setRows((data as AuditRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const actions = useMemo(() => Array.from(new Set(rows.map((r) => r.action))).sort(), [rows]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (actionFilter && r.action !== actionFilter) return false;
      if (!ql) return true;
      return (
        r.actor_email?.toLowerCase().includes(ql) ||
        r.action.toLowerCase().includes(ql) ||
        r.target_summary?.toLowerCase().includes(ql) ||
        r.target_id?.toLowerCase().includes(ql) ||
        r.notes?.toLowerCase().includes(ql)
      );
    });
  }, [rows, q, actionFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Audit Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable record of admin and support actions. Append-only — entries cannot be edited or deleted.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search actor, action, target, notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <ScrollArea className="max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-semibold">When</th>
                <th className="px-3 py-2 font-semibold">Actor</th>
                <th className="px-3 py-2 font-semibold">Action</th>
                <th className="px-3 py-2 font-semibold">Target</th>
                <th className="px-3 py-2 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading audit entries…
                </td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No audit entries match.</td></tr>
              )}
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-border hover:bg-accent/40 cursor-pointer"
                  onClick={() => setSelected(r)}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    <span title={new Date(r.created_at).toLocaleString()}>
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </td>
                  <td className="px-3 py-2 truncate max-w-[180px]">{r.actor_email}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="font-mono text-[10px]">{r.action}</Badge>
                  </td>
                  <td className="px-3 py-2 truncate max-w-[280px]">
                    {r.target_summary || (r.target_id ? <span className="font-mono text-xs text-muted-foreground">{r.target_id}</span> : '—')}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.ip_address ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">{selected.action}</Badge>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <Field label="When" value={new Date(selected.created_at).toLocaleString()} />
                <Field label="Actor" value={`${selected.actor_email}${selected.actor_id ? ` (${selected.actor_id})` : ''}`} />
                <Field label="Target" value={selected.target_summary || '—'} />
                <Field label="Target type" value={selected.target_type || '—'} mono />
                <Field label="Target id" value={selected.target_id || '—'} mono />
                <Field label="IP" value={selected.ip_address || '—'} mono />
                <Field label="User agent" value={selected.user_agent || '—'} mono />
                <Field label="Request id" value={selected.request_id || '—'} mono />
                {selected.notes && <Field label="Notes" value={selected.notes} />}
                {selected.before_state && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1">Before</div>
                    <pre className="text-[11px] bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(selected.before_state, null, 2)}</pre>
                  </div>
                )}
                {selected.after_state && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1">After</div>
                    <pre className="text-[11px] bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(selected.after_state, null, 2)}</pre>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className={mono ? 'font-mono text-xs break-all' : 'text-sm break-words'}>{value}</div>
    </div>
  );
}
