import { useEffect, useMemo, useState } from 'react';
import { Search, TrendingUp, AlertTriangle, RefreshCw, Languages } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SearchRow {
  id: string;
  raw_query: string;
  detected_language: string | null;
  parsed_filters: any;
  confidence: number | null;
  result_count: number | null;
  halo_offered: boolean | null;
  halo_clicked: boolean | null;
  halo_posted: boolean | null;
  created_at: string;
}

interface FunnelTotals {
  total: number;
  zeroResults: number;
  offered: number;
  clicked: number;
  posted: number;
}

interface QueryAgg {
  query: string;
  count: number;
  avgResults: number;
  posted: number;
}

interface SuburbAgg {
  suburb: string;
  searches: number;
  avgResults: number;
  zeroResultRate: number;
}

interface LangAgg {
  language: string;
  count: number;
  posted: number;
}

const RANGES = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
] as const;

type RangeKey = typeof RANGES[number]['key'];

function pct(num: number, denom: number): string {
  if (!denom) return '—';
  return `${Math.round((num / denom) * 1000) / 10}%`;
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
  tone?: 'good' | 'warn' | 'bad';
}) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-700 dark:text-emerald-300'
      : tone === 'warn'
      ? 'text-amber-700 dark:text-amber-300'
      : tone === 'bad'
      ? 'text-destructive'
      : 'text-foreground';
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
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function SearchIntelligenceTab() {
  const [range, setRange] = useState<RangeKey>('30d');
  const [rows, setRows] = useState<SearchRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (r: RangeKey) => {
    setRefreshing(true);
    try {
      const days = RANGES.find((x) => x.key === r)?.days ?? 30;
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from('search_queries' as any)
        .select(
          'id, raw_query, detected_language, parsed_filters, confidence, result_count, halo_offered, halo_clicked, halo_posted, created_at',
        )
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      setRows((data ?? []) as unknown as SearchRow[]);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load search intelligence');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(range);
  }, [range]);

  const { funnel, topQueries, supplyGap, byLanguage, lowConfidence } = useMemo(() => {
    const safeRows = rows ?? [];
    const funnel: FunnelTotals = {
      total: safeRows.length,
      zeroResults: safeRows.filter((r) => (r.result_count ?? 0) === 0).length,
      offered: safeRows.filter((r) => r.halo_offered).length,
      clicked: safeRows.filter((r) => r.halo_clicked).length,
      posted: safeRows.filter((r) => r.halo_posted).length,
    };

    // Top queries (normalized lowercase)
    const qMap = new Map<string, { count: number; resultsSum: number; posted: number }>();
    safeRows.forEach((r) => {
      const key = (r.raw_query || '').trim().toLowerCase();
      if (!key) return;
      const cur = qMap.get(key) || { count: 0, resultsSum: 0, posted: 0 };
      cur.count += 1;
      cur.resultsSum += r.result_count ?? 0;
      if (r.halo_posted) cur.posted += 1;
      qMap.set(key, cur);
    });
    const topQueries: QueryAgg[] = Array.from(qMap.entries())
      .map(([query, v]) => ({
        query,
        count: v.count,
        avgResults: v.count ? Math.round((v.resultsSum / v.count) * 10) / 10 : 0,
        posted: v.posted,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Supply gap by suburb (parsed_filters.suburb)
    const sMap = new Map<string, { searches: number; resultsSum: number; zero: number }>();
    safeRows.forEach((r) => {
      const suburb = (r.parsed_filters?.suburb ?? '').toString().trim();
      if (!suburb) return;
      const cur = sMap.get(suburb) || { searches: 0, resultsSum: 0, zero: 0 };
      cur.searches += 1;
      cur.resultsSum += r.result_count ?? 0;
      if ((r.result_count ?? 0) === 0) cur.zero += 1;
      sMap.set(suburb, cur);
    });
    const supplyGap: SuburbAgg[] = Array.from(sMap.entries())
      .map(([suburb, v]) => ({
        suburb,
        searches: v.searches,
        avgResults: v.searches ? Math.round((v.resultsSum / v.searches) * 10) / 10 : 0,
        zeroResultRate: v.searches ? Math.round((v.zero / v.searches) * 1000) / 10 : 0,
      }))
      .filter((x) => x.searches >= 3) // signal threshold
      .sort((a, b) => b.zeroResultRate - a.zeroResultRate || b.searches - a.searches)
      .slice(0, 15);

    // By language
    const lMap = new Map<string, { count: number; posted: number }>();
    safeRows.forEach((r) => {
      const lang = (r.detected_language || 'unknown').toLowerCase();
      const cur = lMap.get(lang) || { count: 0, posted: 0 };
      cur.count += 1;
      if (r.halo_posted) cur.posted += 1;
      lMap.set(lang, cur);
    });
    const byLanguage: LangAgg[] = Array.from(lMap.entries())
      .map(([language, v]) => ({ language, count: v.count, posted: v.posted }))
      .sort((a, b) => b.count - a.count);

    // Low-confidence parses (recent samples)
    const lowConfidence = safeRows
      .filter((r) => (r.confidence ?? 1) < 0.5)
      .slice(0, 10);

    return { funnel, topQueries, supplyGap, byLanguage, lowConfidence };
  }, [rows]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <Search className="mx-auto mb-3 text-muted-foreground" size={28} />
        <p className="text-sm text-muted-foreground">
          No search queries logged in the last {RANGES.find((r) => r.key === range)?.label}.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${
                range === r.key ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Range + refresh */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                range === r.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-accent'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => fetchData(range)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Funnel KPIs */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-3">Search → Halo funnel</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KPI label="Total searches" value={funnel.total.toLocaleString()} icon={Search} />
          <KPI
            label="Zero results"
            value={funnel.zeroResults.toLocaleString()}
            sub={pct(funnel.zeroResults, funnel.total) + ' of searches'}
            tone={funnel.total && funnel.zeroResults / funnel.total > 0.3 ? 'warn' : undefined}
            icon={AlertTriangle}
          />
          <KPI
            label="Halo offered"
            value={funnel.offered.toLocaleString()}
            sub={pct(funnel.offered, funnel.zeroResults) + ' of zero-result'}
          />
          <KPI
            label="Halo clicked"
            value={funnel.clicked.toLocaleString()}
            sub={pct(funnel.clicked, funnel.offered) + ' click-through'}
          />
          <KPI
            label="Halo posted"
            value={funnel.posted.toLocaleString()}
            sub={pct(funnel.posted, funnel.clicked) + ' completion'}
            tone="good"
          />
        </div>
      </section>

      {/* Top queries */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-3">Top searched queries</h3>
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase tracking-wide">
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 font-medium">Query</th>
                <th className="px-4 py-2.5 font-medium text-right">Searches</th>
                <th className="px-4 py-2.5 font-medium text-right">Avg results</th>
                <th className="px-4 py-2.5 font-medium text-right">Halos posted</th>
              </tr>
            </thead>
            <tbody>
              {topQueries.map((q) => (
                <tr key={q.query} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2 text-foreground truncate max-w-[420px]">{q.query}</td>
                  <td className="px-4 py-2 text-right text-foreground">{q.count}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{q.avgResults}</td>
                  <td className="px-4 py-2 text-right text-foreground">{q.posted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Supply gap */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Supply gap — over-searched, under-supplied suburbs
          </h3>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Suburbs with ≥3 searches in the period, ranked by zero-result rate. Strong signal to recruit
          agents in these areas.
        </p>
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase tracking-wide">
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 font-medium">Suburb</th>
                <th className="px-4 py-2.5 font-medium text-right">Searches</th>
                <th className="px-4 py-2.5 font-medium text-right">Avg results</th>
                <th className="px-4 py-2.5 font-medium text-right">Zero-result rate</th>
              </tr>
            </thead>
            <tbody>
              {supplyGap.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground text-xs">
                    Not enough suburb-tagged searches yet.
                  </td>
                </tr>
              )}
              {supplyGap.map((s) => (
                <tr key={s.suburb} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2 text-foreground font-medium">{s.suburb}</td>
                  <td className="px-4 py-2 text-right text-foreground">{s.searches}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{s.avgResults}</td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${
                        s.zeroResultRate >= 70
                          ? 'bg-destructive/15 text-destructive'
                          : s.zeroResultRate >= 30
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {s.zeroResultRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Languages */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Languages size={14} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Searches by detected language</h3>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase tracking-wide">
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 font-medium">Language</th>
                <th className="px-4 py-2.5 font-medium text-right">Searches</th>
                <th className="px-4 py-2.5 font-medium text-right">Halos posted</th>
                <th className="px-4 py-2.5 font-medium text-right">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {byLanguage.map((l) => (
                <tr key={l.language} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2 text-foreground font-medium uppercase">{l.language}</td>
                  <td className="px-4 py-2 text-right text-foreground">{l.count}</td>
                  <td className="px-4 py-2 text-right text-foreground">{l.posted}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{pct(l.posted, l.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Low confidence parses */}
      {lowConfidence.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Recent low-confidence parses (&lt; 0.5)
          </h3>
          <p className="text-[11px] text-muted-foreground mb-3">
            Queries the LLM struggled with — useful for prompt-tuning or adding examples.
          </p>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {lowConfidence.map((r) => (
              <div key={r.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{r.raw_query}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(r.detected_language || 'unknown').toUpperCase()} ·{' '}
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="shrink-0 inline-block px-2 py-1 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  {Math.round((r.confidence ?? 0) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
