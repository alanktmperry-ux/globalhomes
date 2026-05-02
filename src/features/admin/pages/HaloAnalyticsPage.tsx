import { useEffect, useMemo, useState } from 'react';
import { Loader2, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

type RangeKey = 'week' | 'month' | '3months' | 'all';

const RANGE_LABEL: Record<RangeKey, string> = {
  week: 'This week',
  month: 'This month',
  '3months': 'Last 3 months',
  all: 'All time',
};

function startOfRange(range: RangeKey): Date | null {
  const now = new Date();
  if (range === 'all') return null;
  if (range === 'week') {
    const d = new Date(now);
    const day = d.getDay();
    const diff = (day + 6) % 7; // Monday-start
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (range === '3months') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    return d;
  }
  return null;
}

interface HaloRow {
  id: string;
  seeker_id: string;
  intent: string;
  suburbs: string[];
  budget_min: number | null;
  budget_max: number;
  status: string;
  quality_score: number | null;
  created_at: string;
}

interface ResponseRow {
  halo_id: string;
  agent_id: string;
  unlocked_at: string;
}

interface TxRow {
  amount: number;
  type: string;
  created_at: string;
}

const fmtMoney = (n: number | null | undefined) =>
  n == null ? '—' : `$${n.toLocaleString('en-AU')}`;

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function HaloAnalyticsPage() {
  const [range, setRange] = useState<RangeKey>('month');
  const [loading, setLoading] = useState(true);

  const [halos, setHalos] = useState<HaloRow[]>([]);
  const [allHalos, setAllHalos] = useState<HaloRow[]>([]); // for 12-week chart
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [emailMap, setEmailMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const since = startOfRange(range);
        const sinceIso = since?.toISOString();

        // 12-week window for chart (always last 12 weeks regardless of filter)
        const twelveWeeksAgo = new Date();
        twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7);

        const halosQ = supabase.from('halos').select('*').neq('status', 'deleted');
        if (sinceIso) halosQ.gte('created_at', sinceIso);

        const [halosRes, allHalosRes, respRes, txRes] = await Promise.all([
          halosQ,
          supabase.from('halos').select('id, created_at, status')
            .neq('status', 'deleted').gte('created_at', twelveWeeksAgo.toISOString()),
          supabase.from('halo_responses').select('halo_id, agent_id, unlocked_at'),
          supabase.from('halo_credit_transactions').select('amount, type, created_at')
            .eq('type', 'spend'),
        ]);

        const haloRows = (halosRes.data ?? []) as HaloRow[];
        setHalos(haloRows);
        setAllHalos((allHalosRes.data ?? []) as any);

        const haloIds = new Set(haloRows.map((h) => h.id));
        const allRespRows = (respRes.data ?? []) as ResponseRow[];
        // filter responses by range using unlocked_at
        const filteredResps = sinceIso
          ? allRespRows.filter((r) => r.unlocked_at >= sinceIso)
          : allRespRows;
        setResponses(filteredResps);

        const txRows = (txRes.data ?? []) as TxRow[];
        setTxs(sinceIso ? txRows.filter((t) => t.created_at >= sinceIso) : txRows);

        // Resolve emails for last-20 table
        try {
          const { callAdminFunction } = await import('@/features/admin/lib/adminApi');
          const res = await callAdminFunction('list_users');
          const map = new Map<string, string>();
          (res?.users ?? []).forEach((u: any) => { if (u.email) map.set(u.id, u.email); });
          setEmailMap(map);
        } catch (e) {
          if (import.meta.env.DEV) console.warn('[HaloAnalytics] could not load emails', e);
        }

        // Keep haloIds variable used (lint)
        void haloIds;
      } catch (e) {
        if (import.meta.env.DEV) console.error('[HaloAnalytics]', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [range]);

  // ── Derived metrics ────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalPosted = halos.length;
    const activeNow = halos.filter((h) => h.status === 'active').length;
    const fulfilled = halos.filter((h) => h.status === 'fulfilled').length;
    const expired = halos.filter((h) => h.status === 'expired').length;

    const respondedHaloIds = new Set(responses.map((r) => r.halo_id));
    const haloIdsInRange = new Set(halos.map((h) => h.id));
    const expiredZero = halos.filter(
      (h) => h.status === 'expired' && !respondedHaloIds.has(h.id),
    ).length;

    const unlocksInRange = responses.filter((r) => haloIdsInRange.has(r.halo_id)).length;
    // Total unlocks (all responses in range, regardless of halo creation date)
    const totalUnlocks = responses.length;

    const uniqueSeekers = new Set(halos.map((h) => h.seeker_id)).size;
    const uniqueAgents = new Set(responses.map((r) => r.agent_id)).size;

    const scored = halos.filter((h) => h.quality_score != null);
    const avgQuality = scored.length
      ? Math.round(scored.reduce((s, h) => s + (h.quality_score ?? 0), 0) / scored.length)
      : 0;

    const haloWithResp = halos.filter((h) => respondedHaloIds.has(h.id)).length;

    return {
      totalPosted, activeNow, fulfilled, expiredZero, totalUnlocks,
      uniqueSeekers, uniqueAgents, avgQuality, haloWithResp, expired,
      unlocksInRange,
    };
  }, [halos, responses]);

  // ── 12-week chart ──────────────────────────────────────────────────────
  // Bug Fix 3: Build the last 12 weekly buckets dynamically from "now" — no
  // hardcoded dates. Each bucket starts on Monday 00:00 local time. The final
  // bucket is always the current week, so halos posted today land in it.
  const chartData = useMemo(() => {
    const buckets: { week: string; count: number; ts: number; isCurrent: boolean }[] = [];
    const now = new Date();
    // Snap "now" back to this week's Monday (local time)
    const thisMonday = new Date(now);
    const dow = thisMonday.getDay(); // 0 = Sun … 6 = Sat
    thisMonday.setDate(thisMonday.getDate() - ((dow + 6) % 7));
    thisMonday.setHours(0, 0, 0, 0);

    for (let i = 11; i >= 0; i--) {
      const start = new Date(thisMonday);
      start.setDate(start.getDate() - i * 7);
      buckets.push({
        week: start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }),
        count: 0,
        ts: start.getTime(),
        isCurrent: i === 0,
      });
    }
    allHalos.forEach((h) => {
      const t = new Date(h.created_at).getTime();
      // find latest bucket whose ts <= t
      for (let i = buckets.length - 1; i >= 0; i--) {
        if (buckets[i].ts <= t) { buckets[i].count += 1; break; }
      }
    });
    return buckets;
  }, [allHalos]);

  // ── Top suburbs ────────────────────────────────────────────────────────
  const topSuburbs = useMemo(() => {
    const counts = new Map<string, number>();
    halos.forEach((h) => (h.suburbs ?? []).forEach((s) => {
      const k = s.trim();
      if (!k) return;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [halos]);

  // ── Recent halos ───────────────────────────────────────────────────────
  const recent = useMemo(() => {
    return [...halos]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 20);
  }, [halos]);

  const responsesByHalo = useMemo(() => {
    const m = new Map<string, number>();
    responses.forEach((r) => m.set(r.halo_id, (m.get(r.halo_id) ?? 0) + 1));
    return m;
  }, [responses]);

  const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '0%');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="text-primary" /> Halo Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Growth, conversion and seeker activity for the Halo programme.
          </p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(RANGE_LABEL) as RangeKey[]).map((k) => (
              <SelectItem key={k} value={k}>{RANGE_LABEL[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Halos posted" value={metrics.totalPosted} />
        <StatCard label="Active right now" value={metrics.activeNow} hint="status = active (in range)" />
        <StatCard label="Fulfilled" value={metrics.fulfilled} />
        <StatCard label="Expired w/ 0 responses" value={metrics.expiredZero} />
        <StatCard label="Total agent unlocks" value={metrics.totalUnlocks} hint="credits spent" />
        <StatCard label="Unique seekers" value={metrics.uniqueSeekers} />
        <StatCard label="Unique agents responded" value={metrics.uniqueAgents} />
        <StatCard label="Avg quality score" value={metrics.avgQuality || '—'} />
      </div>

      {/* Growth chart */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Halos posted per week</h2>
            <span className="text-xs text-muted-foreground">Last 12 weeks</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={48}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(label, payload) => {
                    const p = payload?.[0]?.payload as { isCurrent?: boolean } | undefined;
                    return `Week of ${label}${p?.isCurrent ? ' (this week)' : ''}`;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload, index } = props;
                    const isCurrent = payload?.isCurrent;
                    return (
                      <circle
                        key={`dot-${index}`}
                        cx={cx}
                        cy={cy}
                        r={isCurrent ? 5 : 3}
                        fill={isCurrent ? 'hsl(var(--primary))' : 'hsl(var(--background))'}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                      />
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Funnel + Top suburbs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">Conversion funnel</h2>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>Halos posted</TableCell>
                  <TableCell className="text-right font-semibold">{metrics.totalPosted}</TableCell>
                  <TableCell className="text-right text-muted-foreground w-16">100%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>With ≥ 1 agent response</TableCell>
                  <TableCell className="text-right font-semibold">{metrics.haloWithResp}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {pct(metrics.haloWithResp, metrics.totalPosted)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Fulfilled</TableCell>
                  <TableCell className="text-right font-semibold">{metrics.fulfilled}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {pct(metrics.fulfilled, metrics.totalPosted)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Expired with 0 responses</TableCell>
                  <TableCell className="text-right font-semibold">{metrics.expiredZero}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {pct(metrics.expiredZero, metrics.totalPosted)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">Top 10 suburbs</h2>
            {topSuburbs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data in this range.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Suburb</TableHead>
                    <TableHead className="text-right">Halos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSuburbs.map(([s, c]) => (
                    <TableRow key={s}>
                      <TableCell>{s}</TableCell>
                      <TableCell className="text-right font-semibold">{c}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent halos */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold mb-3">Recent Halos (last 20)</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seeker</TableHead>
                  <TableHead>Suburbs</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead className="text-right">Quality</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Responses</TableHead>
                  <TableHead>Posted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs">{emailMap.get(h.seeker_id) ?? '—'}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {(h.suburbs ?? []).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {fmtMoney(h.budget_min)} – {fmtMoney(h.budget_max)}
                    </TableCell>
                    <TableCell className="text-xs capitalize">{h.intent}</TableCell>
                    <TableCell className="text-right text-xs">
                      {h.quality_score ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {h.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold">
                      {responsesByHalo.get(h.id) ?? 0}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(h.created_at).toLocaleDateString('en-AU', {
                        day: 'numeric', month: 'short', year: '2-digit',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
                {recent.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">
                      No Halos in this range.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
