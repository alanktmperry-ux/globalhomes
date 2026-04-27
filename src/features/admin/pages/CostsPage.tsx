import { useEffect, useMemo, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Crown,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { callAdminFunction } from '@/features/admin/lib/adminApi';
import { toast } from 'sonner';

const SERVICES = ['deepgram', 'gemini', 'resend', 'google_maps', 'supabase'] as const;
type Service = (typeof SERVICES)[number];

const SERVICE_LABEL: Record<Service, string> = {
  deepgram: 'Voice (Deepgram/Whisper)',
  gemini: 'AI (Gemini)',
  resend: 'Email (Resend)',
  google_maps: 'Google Maps',
  supabase: 'Lovable Cloud (base)',
};

const SERVICE_COLOR: Record<Service, string> = {
  deepgram: 'hsl(199 89% 48%)',
  gemini: 'hsl(265 85% 60%)',
  resend: 'hsl(142 71% 45%)',
  google_maps: 'hsl(38 92% 50%)',
  supabase: 'hsl(160 84% 39%)',
};

// Editable in code — no UI yet.
const BURN_THRESHOLDS: { service: Service; dailyAud: number }[] = [
  { service: 'deepgram', dailyAud: 5 },
  { service: 'gemini', dailyAud: 10 },
  { service: 'resend', dailyAud: 2 },
  { service: 'google_maps', dailyAud: 8 },
];

const SUPABASE_MONTHLY_BASE = 39;

interface UsageRow {
  service: string;
  cost_estimate: number;
  user_id: string | null;
  created_at: string;
}

interface ServiceTotals {
  service: Service;
  thisMonth: number;
  lastMonth: number;
  pctChange: number | null;
  dailyAvg: number;
  projected: number;
  todaySpend: number;
}

interface TopUser {
  user_id: string;
  email: string;
  total: number;
}

interface CostData {
  thisMonthTotal: number;
  lastMonthTotal: number;
  dailyRunRate: number;
  projectedMonthEnd: number;
  vsLastMonthPct: number | null;
  mostExpensive: Service | null;
  perService: ServiceTotals[];
  daily: { date: string; [k: string]: number | string }[];
  topUsers: TopUser[];
  alerts: { service: Service; spent: number; threshold: number }[];
  fetchedAt: string;
}

function fmtMoney(n: number) {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(2)}k`;
  return `$${n.toFixed(2)}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfPrevMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function KPI({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: any;
  tone?: 'up' | 'down' | 'flat';
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        {Icon && (
          <div className="text-primary">
            <Icon size={16} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          {tone === 'up' && <TrendingUp size={12} className="text-destructive" />}
          {tone === 'down' && <TrendingDown size={12} className="text-emerald-500" />}
          {sub}
        </p>
      )}
    </div>
  );
}

export default function CostsPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async () => {
    setRefreshing(true);
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const prevMonthStart = startOfPrevMonth(now);
      const last30 = new Date(now.getTime() - 30 * 86400000);

      // Pull all events from start of last month onwards.
      const { data: rows, error } = await supabase
        .from('api_usage_events' as any)
        .select('service, cost_estimate, user_id, created_at')
        .gte('created_at', prevMonthStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(50000);

      if (error) throw error;
      const events = (rows || []) as unknown as UsageRow[];

      // Bucket by service & month
      const thisMonthByService = new Map<Service, number>();
      const lastMonthByService = new Map<Service, number>();
      const todayByService = new Map<Service, number>();
      const userTotal30d = new Map<string, number>();
      const dailyMap = new Map<string, Record<Service, number>>();

      // Pre-seed last 30 days
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const k = dayKey(d);
        const empty = {
          deepgram: 0,
          gemini: 0,
          resend: 0,
          google_maps: 0,
          supabase: 0,
        } as Record<Service, number>;
        dailyMap.set(k, empty);
      }

      const todayKeyStr = dayKey(now);

      events.forEach((e) => {
        const svc = e.service as Service;
        if (!SERVICES.includes(svc)) return;
        const cost = Number(e.cost_estimate || 0);
        const created = new Date(e.created_at);

        if (created >= monthStart) {
          thisMonthByService.set(svc, (thisMonthByService.get(svc) || 0) + cost);
        } else if (created >= prevMonthStart) {
          lastMonthByService.set(svc, (lastMonthByService.get(svc) || 0) + cost);
        }

        if (created >= last30) {
          const k = dayKey(created);
          const bucket = dailyMap.get(k);
          if (bucket) bucket[svc] = (bucket[svc] || 0) + cost;
        }

        if (k_isToday(created, now)) {
          todayByService.set(svc, (todayByService.get(svc) || 0) + cost);
        }

        if (e.user_id && created >= last30) {
          userTotal30d.set(e.user_id, (userTotal30d.get(e.user_id) || 0) + cost);
        }
      });

      // Add Supabase base cost (pro-rated this month)
      const dim = daysInMonth(now);
      const dom = now.getDate();
      const supaThisMonth = (SUPABASE_MONTHLY_BASE / dim) * dom;
      const prevDim = daysInMonth(prevMonthStart);
      const supaLastMonth = SUPABASE_MONTHLY_BASE; // full prior month
      thisMonthByService.set('supabase', supaThisMonth);
      lastMonthByService.set('supabase', supaLastMonth);
      // distribute supabase per day for chart
      dailyMap.forEach((bucket) => {
        bucket.supabase = SUPABASE_MONTHLY_BASE / dim;
      });

      const thisMonthTotal = SERVICES.reduce(
        (s, svc) => s + (thisMonthByService.get(svc) || 0),
        0,
      );
      const lastMonthTotal = SERVICES.reduce(
        (s, svc) => s + (lastMonthByService.get(svc) || 0),
        0,
      );
      const dailyRunRate = dom > 0 ? thisMonthTotal / dom : 0;
      const projectedMonthEnd = dailyRunRate * dim;
      const vsLastMonthPct =
        lastMonthTotal > 0
          ? Math.round(((projectedMonthEnd - lastMonthTotal) / lastMonthTotal) * 1000) / 10
          : null;

      const perService: ServiceTotals[] = SERVICES.map((svc) => {
        const tm = thisMonthByService.get(svc) || 0;
        const lm = lastMonthByService.get(svc) || 0;
        const pctChange = lm > 0 ? Math.round(((tm - lm) / lm) * 1000) / 10 : null;
        const dailyAvg = dom > 0 ? tm / dom : 0;
        const projected = dailyAvg * dim;
        return {
          service: svc,
          thisMonth: tm,
          lastMonth: lm,
          pctChange,
          dailyAvg,
          projected,
          todaySpend: todayByService.get(svc) || 0,
        };
      });

      // Most expensive (this month, excluding supabase base)
      const mostExpensive =
        perService
          .filter((s) => s.service !== 'supabase')
          .sort((a, b) => b.thisMonth - a.thisMonth)[0]?.service ?? null;

      // Daily chart data
      const daily = Array.from(dailyMap.entries()).map(([date, bucket]) => ({
        date: date.slice(5), // MM-DD
        ...bucket,
      }));

      // Top users — resolve emails
      const topUserIds = Array.from(userTotal30d.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      let emailMap = new Map<string, string>();
      try {
        const j = await callAdminFunction('list_users');
        const users: any[] = j?.users || [];
        users.forEach((u) => emailMap.set(u.id, u.email));
      } catch {
        /* ignore */
      }
      const topUsers: TopUser[] = topUserIds.map(([user_id, total]) => ({
        user_id,
        email: emailMap.get(user_id) || user_id.slice(0, 8) + '…',
        total,
      }));

      // Alerts
      const alerts = BURN_THRESHOLDS.filter((t) => {
        const spent = todayByService.get(t.service) || 0;
        return spent > t.dailyAud;
      }).map((t) => ({
        service: t.service,
        spent: todayByService.get(t.service) || 0,
        threshold: t.dailyAud,
      }));

      setData({
        thisMonthTotal,
        lastMonthTotal,
        dailyRunRate,
        projectedMonthEnd,
        vsLastMonthPct,
        mostExpensive,
        perService,
        daily,
        topUsers,
        alerts,
        fetchedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load cost data');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const id = window.setInterval(fetchAll, 5 * 60 * 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedPerService = useMemo(() => {
    if (!data) return [];
    return [...data.perService].sort((a, b) => b.thisMonth - a.thisMonth);
  }, [data]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4 md:p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Costs</h1>
          <p className="text-sm text-muted-foreground">
            External API spend — refreshes every 5 minutes.
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Burn alerts */}
      {data.alerts.length > 0 && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-destructive">Burn alert</p>
            <ul className="mt-1 space-y-0.5 text-foreground">
              {data.alerts.map((a) => (
                <li key={a.service}>
                  {SERVICE_LABEL[a.service]} spent {fmtMoney(a.spent)} today (threshold{' '}
                  {fmtMoney(a.threshold)})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI
          label="This month"
          value={fmtMoney(data.thisMonthTotal)}
          icon={DollarSign}
          sub={`vs ${fmtMoney(data.lastMonthTotal)} last`}
        />
        <KPI
          label="Daily run-rate"
          value={fmtMoney(data.dailyRunRate)}
          icon={Activity}
          sub="rolling avg this month"
        />
        <KPI
          label="Projected month-end"
          value={fmtMoney(data.projectedMonthEnd)}
          icon={TrendingUp}
        />
        <KPI
          label="vs Last month"
          value={data.vsLastMonthPct == null ? '—' : `${data.vsLastMonthPct}%`}
          icon={data.vsLastMonthPct != null && data.vsLastMonthPct > 0 ? TrendingUp : TrendingDown}
          tone={
            data.vsLastMonthPct != null && data.vsLastMonthPct > 0
              ? 'up'
              : data.vsLastMonthPct != null
              ? 'down'
              : 'flat'
          }
          sub="projected vs prior month"
        />
        <KPI
          label="Most expensive"
          value={data.mostExpensive ? SERVICE_LABEL[data.mostExpensive].split(' ')[0] : '—'}
          icon={Crown}
          sub={data.mostExpensive ? SERVICE_LABEL[data.mostExpensive] : undefined}
        />
      </section>

      {/* Per-service breakdown */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">Per-service breakdown</h2>
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase tracking-wide">
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 font-medium">Service</th>
                <th className="px-4 py-2.5 font-medium text-right">This month</th>
                <th className="px-4 py-2.5 font-medium text-right">Last month</th>
                <th className="px-4 py-2.5 font-medium text-right">Δ</th>
                <th className="px-4 py-2.5 font-medium text-right">Daily avg</th>
                <th className="px-4 py-2.5 font-medium text-right">Projected</th>
              </tr>
            </thead>
            <tbody>
              {sortedPerService.map((row) => {
                const hot = row.pctChange != null && row.pctChange > 50;
                return (
                  <tr
                    key={row.service}
                    className={`border-b border-border/50 last:border-0 ${
                      hot ? 'bg-destructive/5' : ''
                    }`}
                  >
                    <td className="px-4 py-2 font-medium text-foreground flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ background: SERVICE_COLOR[row.service] }}
                      />
                      {SERVICE_LABEL[row.service]}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-foreground">
                      {fmtMoney(row.thisMonth)}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {fmtMoney(row.lastMonth)}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-medium ${
                        row.pctChange == null
                          ? 'text-muted-foreground'
                          : hot
                          ? 'text-destructive'
                          : row.pctChange < 0
                          ? 'text-emerald-600'
                          : 'text-foreground'
                      }`}
                    >
                      {row.pctChange == null ? '—' : `${row.pctChange}%`}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {fmtMoney(row.dailyAvg)}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-foreground">
                      {fmtMoney(row.projected)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Daily stacked chart */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">Daily spend (last 30 days)</h2>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(v) => `$${Number(v).toFixed(1)}`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: any, name: string) => [
                    fmtMoney(Number(v)),
                    SERVICE_LABEL[name as Service] || name,
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(v) => SERVICE_LABEL[v as Service] || v}
                />
                {SERVICES.map((svc) => (
                  <Area
                    key={svc}
                    type="monotone"
                    dataKey={svc}
                    stackId="1"
                    stroke={SERVICE_COLOR[svc]}
                    fill={SERVICE_COLOR[svc]}
                    fillOpacity={0.7}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Top users */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Top 10 users by spend (30d)
        </h2>
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase tracking-wide">
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium text-right">Spend (30d)</th>
              </tr>
            </thead>
            <tbody>
              {data.topUsers.map((u) => (
                <tr key={u.user_id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2 text-foreground truncate max-w-[420px]">{u.email}</td>
                  <td className="px-4 py-2 text-right font-semibold text-foreground">
                    {fmtMoney(u.total)}
                  </td>
                </tr>
              ))}
              {data.topUsers.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                    No per-user usage logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Burn thresholds list */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">Burn alert thresholds</h2>
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2 text-sm">
          {BURN_THRESHOLDS.map((t) => {
            const spent =
              data.perService.find((s) => s.service === t.service)?.todaySpend ?? 0;
            const breached = spent > t.dailyAud;
            return (
              <div
                key={t.service}
                className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0"
              >
                <span className="text-foreground">
                  {SERVICE_LABEL[t.service]} &gt; {fmtMoney(t.dailyAud)} / day
                </span>
                <span
                  className={`text-xs font-semibold ${
                    breached ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  Today: {fmtMoney(spent)}
                </span>
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground pt-2">
            Edit thresholds in <code>BURN_THRESHOLDS</code> at the top of this file.
          </p>
        </div>
      </section>

      <p className="text-[11px] text-muted-foreground text-right">
        Updated {new Date(data.fetchedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}

function k_isToday(d: Date, now: Date) {
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
