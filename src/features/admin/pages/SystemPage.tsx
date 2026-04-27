import { useEffect, useRef, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Users,
  Home,
  Mail,
  CreditCard,
  ScrollText,
  UserSquare,
  Database as DatabaseIcon,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ─── Helpers ─────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function downloadCsv(rows: string[][], filename: string) {
  const content = rows
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function logAudit(action_type: string, metadata: Record<string, unknown>) {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    await (supabase as any).from('audit_log').insert({
      action_type,
      entity_type: 'system',
      user_id: userRes.user?.id,
      metadata: metadata as any,
    });
  } catch {
    /* noop */
  }
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

// ─── Layout primitives ───────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-stone-200 bg-white p-5 ${className}`}>{children}</div>
  );
}

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <div className="text-[15px] font-semibold text-stone-900">{title}</div>
      {sub && <div className="text-[12px] text-stone-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Tab 1: Health ───────────────────────────────────────────
type HealthService = { name: string; status: string; latency_ms?: number };
type HealthResult = { status?: string; services?: HealthService[] } | null;

function statusBadge(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'ok' || s === 'healthy' || s === 'up')
    return 'bg-emerald-100 text-emerald-700';
  if (s === 'degraded' || s === 'warning') return 'bg-amber-100 text-amber-700';
  if (s === 'down' || s === 'error' || s === 'fail') return 'bg-red-100 text-red-700';
  return 'bg-stone-100 text-stone-600';
}

function HealthTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<HealthResult>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: err } = await (supabase as any).functions.invoke('health-check');
      if (err) throw err;
      setResult(data || null);
    } catch {
      setError(true);
      setResult(null);
    } finally {
      setCheckedAt(new Date());
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overall = (result?.status || '').toLowerCase();
  const banner =
    overall === 'ok'
      ? { cls: 'bg-emerald-50 border-emerald-200 text-emerald-800', text: 'All systems operational' }
      : overall === 'degraded'
        ? { cls: 'bg-amber-50 border-amber-200 text-amber-800', text: 'Degraded performance' }
        : overall === 'down'
          ? { cls: 'bg-red-50 border-red-200 text-red-800', text: 'Service disruption detected' }
          : { cls: 'bg-stone-50 border-stone-200 text-stone-700', text: 'Status unknown' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-stone-500">
          {checkedAt ? `Last checked: ${timeAgo(checkedAt.toISOString())}` : '—'}
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error || !result ? (
        <Card className="bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-amber-900">Health check unavailable</div>
              <div className="text-[13px] text-amber-700 mt-1">
                Could not reach the health-check function.
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${banner.cls}`}>
            {banner.text}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(result.services || []).map((svc) => (
              <Card key={svc.name} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-stone-900">{svc.name}</div>
                  <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${statusBadge(svc.status)}`}>
                    {svc.status}
                  </span>
                </div>
                {typeof svc.latency_ms === 'number' && (
                  <div className="text-[12px] text-stone-500 mt-1.5 tabular-nums">
                    {svc.latency_ms} ms
                  </div>
                )}
              </Card>
            ))}
            {(!result.services || result.services.length === 0) && (
              <div className="text-sm text-stone-400">No service details returned.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab 2: Compliance ───────────────────────────────────────
type AuditRow = {
  action_type: string;
  description?: string | null;
  created_at: string;
  user_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
};

function ComplianceTab() {
  const [loading, setLoading] = useState(true);
  const [actionCounts, setActionCounts] = useState<{ action_type: string; count: number }[]>([]);
  const [recent, setRecent] = useState<AuditRow[]>([]);

  useEffect(() => {
    (async () => {
      const d7 = new Date(Date.now() - 7 * 86400000).toISOString();
      const [weekly, latest] = await Promise.all([
        (supabase as any)
          .from('audit_log')
          .select('action_type, created_at, user_id')
          .gte('created_at', d7)
          .limit(500),
        (supabase as any)
          .from('audit_log')
          .select('action_type, description, created_at, user_id, entity_type, entity_id')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const map = new Map<string, number>();
      for (const r of (weekly?.data ?? []) as AuditRow[]) {
        map.set(r.action_type, (map.get(r.action_type) || 0) + 1);
      }
      setActionCounts(
        Array.from(map.entries())
          .map(([action_type, count]) => ({ action_type, count }))
          .sort((a, b) => b.count - a.count),
      );
      setRecent(((latest?.data ?? []) as AuditRow[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <SectionHead title="Audit Log" sub="Action volume in the last 7 days" />
        {actionCounts.length === 0 ? (
          <div className="text-sm text-stone-400 py-4">No audit events in the last 7 days.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-stone-500 border-b border-stone-200">
                  <th className="py-2 pr-4 font-medium">Action type</th>
                  <th className="py-2 font-medium">Count (7d)</th>
                </tr>
              </thead>
              <tbody>
                {actionCounts.map((r) => (
                  <tr key={r.action_type} className="border-b border-stone-100">
                    <td className="py-2 pr-4 text-stone-800">{r.action_type}</td>
                    <td className="py-2 tabular-nums text-stone-600">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <SectionHead title="Recent Admin Actions" sub="Latest 20 entries" />
        {recent.length === 0 ? (
          <div className="text-sm text-stone-400 py-4">No recent actions.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-stone-500 border-b border-stone-200">
                  <th className="py-2 pr-4 font-medium">Action</th>
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 font-medium">Entity</th>
                  <th className="py-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r, i) => (
                  <tr key={i} className="border-b border-stone-100">
                    <td className="py-2 pr-4 text-stone-800">{r.action_type}</td>
                    <td className="py-2 pr-4 text-stone-600 max-w-[320px] truncate">{r.description || '—'}</td>
                    <td className="py-2 pr-4 text-stone-500 text-[12px]">
                      {r.entity_type || '—'}
                      {r.entity_id ? ` · ${String(r.entity_id).slice(0, 8)}` : ''}
                    </td>
                    <td className="py-2 text-stone-500 text-[12px]">{timeAgo(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <SectionHead title="Security Signals" sub="Posture checklist" />
        <ul className="space-y-2.5">
          {[
            { ok: true, label: 'OTP-only authentication (no passwords)' },
            { ok: true, label: 'Impersonation audit log enabled' },
            { ok: true, label: 'Admin actions logged to audit_log' },
            { ok: false, label: 'RLS policies', sub: 'Verify in Supabase dashboard' },
            { ok: false, label: 'Edge function CORS', sub: 'Review non-wildcard origins' },
            { ok: false, label: 'Google Maps API key', sub: 'Proxy all calls server-side' },
          ].map((it, i) => (
            <li key={i} className="flex items-start gap-2.5">
              {it.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              )}
              <div>
                <div className="text-sm text-stone-800">{it.label}</div>
                {it.sub && <div className="text-[12px] text-stone-400">{it.sub}</div>}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ─── Tab 3: Reports ──────────────────────────────────────────
type ReportDef = {
  key: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => Promise<{ rows: string[][]; count: number; filename: string }>;
};

function ReportsTab() {
  const [busy, setBusy] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const d30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const d90 = new Date(Date.now() - 90 * 86400000).toISOString();

  const reports: ReportDef[] = [
    {
      key: 'agents',
      title: 'All Agents',
      description: 'Full agent roster with plan and subscription state.',
      icon: Users,
      run: async () => {
        const { data } = await (supabase as any)
          .from('agents')
          .select('name, email, agency, is_subscribed, created_at, state, agent_subscriptions(plan_type)')
          .limit(1000);
        const rows = [['Name', 'Agency', 'Email', 'Plan', 'Subscribed', 'State', 'Joined']];
        for (const r of (data ?? []) as any[]) {
          const plan = Array.isArray(r.agent_subscriptions)
            ? r.agent_subscriptions[0]?.plan_type
            : r.agent_subscriptions?.plan_type;
          rows.push([
            fmt(r.name),
            fmt(r.agency),
            fmt(r.email),
            fmt(plan),
            r.is_subscribed ? 'Yes' : 'No',
            fmt(r.state),
            r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
          ]);
        }
        return { rows, count: rows.length - 1, filename: `listhq-agents-${today}.csv` };
      },
    },
    {
      key: 'listings',
      title: 'Active Listings',
      description: 'All currently active properties.',
      icon: Home,
      run: async () => {
        const { data } = await (supabase as any)
          .from('properties')
          .select('address, suburb, state, property_type, price, is_active, created_at')
          .eq('is_active', true)
          .limit(2000);
        const rows = [['Address', 'Suburb', 'State', 'Type', 'Price', 'Active', 'Listed']];
        for (const r of (data ?? []) as any[]) {
          rows.push([
            fmt(r.address),
            fmt(r.suburb),
            fmt(r.state),
            fmt(r.property_type),
            fmt(r.price),
            r.is_active ? 'Yes' : 'No',
            r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
          ]);
        }
        return { rows, count: rows.length - 1, filename: `listhq-listings-${today}.csv` };
      },
    },
    {
      key: 'leads',
      title: 'Leads (last 90 days)',
      description: 'Buyer enquiries from the last 90 days.',
      icon: Mail,
      run: async () => {
        const { data } = await (supabase as any)
          .from('leads')
          .select('buyer_name, buyer_email, buyer_phone, created_at')
          .gte('created_at', d90)
          .limit(2000);
        const rows = [['Name', 'Email', 'Phone', 'Submitted']];
        for (const r of (data ?? []) as any[]) {
          rows.push([
            fmt(r.buyer_name),
            fmt(r.buyer_email),
            fmt(r.buyer_phone),
            r.created_at ? new Date(r.created_at).toISOString() : '',
          ]);
        }
        return { rows, count: rows.length - 1, filename: `listhq-leads-${today}.csv` };
      },
    },
    {
      key: 'subscriptions',
      title: 'Subscriptions',
      description: 'Plan, trial, and active state per agent.',
      icon: CreditCard,
      run: async () => {
        const { data } = await (supabase as any)
          .from('agent_subscriptions')
          .select('agent_id, plan_type, is_active, trial_ends_at, created_at')
          .limit(1000);
        const rows = [['Agent ID', 'Plan', 'Active', 'Trial Ends', 'Created']];
        for (const r of (data ?? []) as any[]) {
          rows.push([
            fmt(r.agent_id),
            fmt(r.plan_type),
            r.is_active ? 'Yes' : 'No',
            r.trial_ends_at ? new Date(r.trial_ends_at).toISOString().slice(0, 10) : '',
            r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
          ]);
        }
        return { rows, count: rows.length - 1, filename: `listhq-subscriptions-${today}.csv` };
      },
    },
    {
      key: 'audit',
      title: 'Audit Log (last 30 days)',
      description: 'Admin & system actions captured for compliance.',
      icon: ScrollText,
      run: async () => {
        const { data } = await (supabase as any)
          .from('audit_log')
          .select('action_type, description, entity_type, entity_id, created_at, user_id')
          .gte('created_at', d30)
          .limit(2000);
        const rows = [['Action', 'Description', 'Entity Type', 'Entity ID', 'Time', 'User ID']];
        for (const r of (data ?? []) as any[]) {
          rows.push([
            fmt(r.action_type),
            fmt(r.description),
            fmt(r.entity_type),
            fmt(r.entity_id),
            r.created_at ? new Date(r.created_at).toISOString() : '',
            fmt(r.user_id),
          ]);
        }
        return { rows, count: rows.length - 1, filename: `listhq-audit-${today}.csv` };
      },
    },
    {
      key: 'buyers',
      title: 'Buyer Profiles',
      description: 'Registered buyers and budget bands.',
      icon: UserSquare,
      run: async () => {
        const { data } = await (supabase as any)
          .from('buyer_profiles')
          .select('user_id, budget_min, budget_max, created_at')
          .limit(1000);
        const rows = [['User ID', 'Budget Min', 'Budget Max', 'Joined']];
        for (const r of (data ?? []) as any[]) {
          rows.push([
            fmt(r.user_id),
            fmt(r.budget_min),
            fmt(r.budget_max),
            r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
          ]);
        }
        return { rows, count: rows.length - 1, filename: `listhq-buyers-${today}.csv` };
      },
    },
  ];

  const runReport = async (def: ReportDef) => {
    setBusy(def.key);
    try {
      const { rows, count, filename } = await def.run();
      downloadCsv(rows, filename);
      await logAudit('report_exported', { report: def.key, count });
      toast.success(`Exported ${count} rows`);
    } catch (e) {
      toast.error('Export failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {reports.map((r) => {
        const Icon = r.icon;
        const loading = busy === r.key;
        return (
          <Card key={r.key}>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-stone-100 p-2">
                <Icon className="h-4 w-4 text-stone-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-stone-900">{r.title}</div>
                <div className="text-[13px] text-stone-500 mt-0.5">{r.description}</div>
                <button
                  onClick={() => runReport(r)}
                  disabled={loading}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Export CSV
                </button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Tab 4: Database ─────────────────────────────────────────
const COUNTED_TABLES = [
  'agents',
  'properties',
  'leads',
  'profiles',
  'audit_log',
  'saved_properties',
  'buyer_profiles',
  'voice_searches',
  'support_tickets',
  'agent_subscriptions',
];

function DatabaseTab() {
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [migrations, setMigrations] = useState<{ version: string; inserted_at: string }[] | null>(null);
  const [migrationsError, setMigrationsError] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchCounts = async () => {
    setLoadingCounts(true);
    const results = await Promise.all(
      COUNTED_TABLES.map(async (t) => {
        try {
          const { count } = await (supabase as any).from(t).select('*', { count: 'exact', head: true });
          return [t, typeof count === 'number' ? count : null] as const;
        } catch {
          return [t, null] as const;
        }
      }),
    );
    const map: Record<string, number | null> = {};
    for (const [t, c] of results) map[t] = c;
    setCounts(map);
    setRefreshedAt(new Date());
    setLoadingCounts(false);
  };

  const fetchMigrations = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('schema_migrations')
        .select('version, inserted_at')
        .order('inserted_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setMigrations((data ?? []) as any);
    } catch {
      setMigrationsError(true);
    }
  };

  useEffect(() => {
    fetchCounts();
    fetchMigrations();
  }, []);

  const clearSessions = async () => {
    setClearing(true);
    try {
      const { error } = await (supabase as any).rpc('delete_expired_sessions');
      if (error) throw error;
      toast.success('Expired sessions cleared');
      await logAudit('maintenance_clear_sessions', {});
    } catch {
      toast.error('RPC not available — run manually in the Supabase dashboard');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[15px] font-semibold text-stone-900">Table Row Counts</div>
            <div className="text-[12px] text-stone-500 mt-0.5">
              {refreshedAt ? `Last refreshed: ${timeAgo(refreshedAt.toISOString())}` : '—'}
            </div>
          </div>
          <button
            onClick={fetchCounts}
            disabled={loadingCounts}
            className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingCounts ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {COUNTED_TABLES.map((t) => (
            <div key={t} className="rounded-xl border border-stone-200 px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-stone-700">{t}</div>
              <div className="text-sm font-semibold tabular-nums text-stone-900">
                {counts[t] === null || counts[t] === undefined ? '—' : counts[t]?.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHead title="Recent Migrations" sub="Latest 10 applied" />
        {migrationsError || !migrations ? (
          <div className="text-sm text-stone-400 py-2">Migration history unavailable.</div>
        ) : migrations.length === 0 ? (
          <div className="text-sm text-stone-400 py-2">No migrations recorded.</div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {migrations.map((m) => (
              <li key={m.version} className="flex items-center justify-between py-2 text-sm">
                <span className="font-mono text-stone-800">{m.version}</span>
                <span className="text-stone-500 text-[12px]">
                  {m.inserted_at ? new Date(m.inserted_at).toLocaleString() : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionHead title="Maintenance" sub="Safe administrative actions" />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={clearing}
              className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 text-stone-600" />
              Clear expired sessions
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear expired sessions?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all expired auth sessions. Continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={clearSessions}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
}

// ─── Page Shell ──────────────────────────────────────────────
export default function SystemPage() {
  const [tab, setTab] = useState<'health' | 'compliance' | 'reports' | 'database'>('health');
  const loaded = useRef<Record<string, boolean>>({ health: true });

  const handleChange = (val: string) => {
    const v = val as typeof tab;
    setTab(v);
    loaded.current[v] = true;
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
          <DatabaseIcon className="h-5 w-5 text-stone-500" />
          System
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Service health, compliance signals, exports and database utilities.
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleChange}>
        <TabsList>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="mt-4">
          <HealthTab />
        </TabsContent>
        <TabsContent value="compliance" className="mt-4">
          {loaded.current.compliance && <ComplianceTab />}
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          {loaded.current.reports && <ReportsTab />}
        </TabsContent>
        <TabsContent value="database" className="mt-4">
          {loaded.current.database && <DatabaseTab />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
