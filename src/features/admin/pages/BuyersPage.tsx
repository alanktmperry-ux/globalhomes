import { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Trash2, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { callAdminFunction } from '@/features/admin/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Kpi = { label: string; value: number | string };

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <div className="text-[15px] font-semibold text-stone-900">{title}</div>
      {sub && <div className="text-[12px] text-stone-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function KpiChip({ label, value }: Kpi) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 min-w-[150px]">
      <div className="text-[11px] uppercase tracking-wide text-stone-500">{label}</div>
      <div className="text-xl font-semibold text-stone-900 mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-stone-200 bg-white p-5 ${className}`}>{children}</div>
  );
}

const PRICE_BUCKETS = [
  { label: 'Under $500k', max: 500_000 },
  { label: '$500k–$1M', max: 1_000_000 },
  { label: '$1M–$2M', max: 2_000_000 },
  { label: '$2M–$5M', max: 5_000_000 },
  { label: '$5M+', max: Infinity },
];

const URGENCY_LABELS: Record<string, string> = {
  asap: 'ASAP',
  '1-3_months': '1–3 months',
  '3-6_months': '3–6 months',
  '6+_months': '6+ months',
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  house: 'House',
  apartment: 'Apartment',
  townhouse: 'Townhouse',
  land: 'Land',
  rural: 'Rural',
  commercial: 'Commercial',
};

export default function BuyersPage() {
  const [loading, setLoading] = useState(true);
  const [totalBuyers, setTotalBuyers] = useState(0);
  const [growthData, setGrowthData] = useState<{ week: string; count: number }[]>([]);
  const [suburbDemand, setSuburbDemand] = useState<{ suburb: string; count: number }[]>([]);
  const [budgetData, setBudgetData] = useState<{ label: string; count: number }[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<{ type: string; count: number }[]>([]);
  const [urgency, setUrgency] = useState<{ key: string; count: number }[]>([]);
  const [searchCount, setSearchCount] = useState(0);
  const [enquiryCount, setEnquiryCount] = useState(0);
  const [savesCount, setSavesCount] = useState(0);
  const [activeBriefs, setActiveBriefs] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = Date.now();
      const d30 = new Date(now - 30 * 86400000).toISOString();
      const twelveWeeksAgo = new Date(now - 84 * 86400000).toISOString();

      const safe = async <T,>(p: Promise<{ data: T | null; count?: number | null }>): Promise<{ data: T; count: number }> => {
        try {
          const r = await p;
          return { data: (r.data ?? ([] as unknown as T)), count: r.count ?? 0 };
        } catch {
          return { data: ([] as unknown as T), count: 0 };
        }
      };

      const [
        buyersTotal,
        newBuyers,
        voiceSearches,
        activityEvents,
        savedProps,
        leads,
        briefs,
      ] = await Promise.all([
        safe<unknown[]>((supabase as any).from('buyer_profiles').select('id', { count: 'exact', head: true })),
        safe<{ created_at: string }[]>((supabase as any).from('buyer_profiles').select('created_at').gte('created_at', twelveWeeksAgo)),
        safe<{ parsed_query: any; created_at: string }[]>((supabase as any).from('voice_searches').select('parsed_query, created_at').gte('created_at', d30).limit(500)),
        safe<{ event_type: string; created_at: string; metadata: any }[]>((supabase as any).from('buyer_activity_events').select('event_type, created_at, metadata').gte('created_at', d30).limit(1000)),
        safe<{ property_id: string; created_at: string }[]>((supabase as any).from('saved_properties').select('property_id, created_at').gte('saved_at', d30).limit(500)),
        safe<{ id: string; created_at: string }[]>((supabase as any).from('leads').select('id, created_at').gte('created_at', d30)),
        safe<{ suburbs: any; min_price: number | null; max_price: number | null; property_type: string | null; urgency: string | null }[]>(
          (supabase as any).from('buyer_briefs').select('suburbs, min_price, max_price, property_type, urgency').eq('is_active', true).limit(200)
        ),
      ]);

      if (cancelled) return;

      // Total buyers
      setTotalBuyers(buyersTotal.count || 0);

      // Growth chart: 12 weekly buckets
      const buckets: { week: string; count: number; start: number; end: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const end = now - i * 7 * 86400000;
        const start = end - 7 * 86400000;
        const d = new Date(end);
        const label = d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' });
        buckets.push({ week: label, count: 0, start, end });
      }
      for (const row of newBuyers.data) {
        const t = new Date(row.created_at).getTime();
        const b = buckets.find((x) => t >= x.start && t < x.end);
        if (b) b.count += 1;
      }
      setGrowthData(buckets.map(({ week, count }) => ({ week, count })));

      // KPIs
      const searches = activityEvents.data.filter((e) => e.event_type === 'search').length + voiceSearches.data.length;
      setSearchCount(searches);
      setEnquiryCount(leads.data.length);
      setSavesCount(savedProps.data.length);
      setActiveBriefs(briefs.data.length);

      // Suburb demand
      const suburbMap = new Map<string, number>();
      const addSuburb = (s: unknown) => {
        if (typeof s !== 'string') return;
        const key = s.trim();
        if (!key) return;
        suburbMap.set(key, (suburbMap.get(key) || 0) + 1);
      };
      for (const v of voiceSearches.data) {
        const pq = v.parsed_query || {};
        addSuburb(pq.suburb);
        addSuburb(pq.location);
      }
      for (const b of briefs.data) {
        const list = Array.isArray(b.suburbs) ? b.suburbs : [];
        for (const s of list) addSuburb(s);
      }
      const topSuburbs = Array.from(suburbMap.entries())
        .map(([suburb, count]) => ({ suburb, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setSuburbDemand(topSuburbs);

      // Budget distribution
      const budgetCounts = PRICE_BUCKETS.map((b) => ({ label: b.label, count: 0 }));
      for (const b of briefs.data) {
        const max = typeof b.max_price === 'number' ? b.max_price : null;
        if (max === null) continue;
        const idx = PRICE_BUCKETS.findIndex((x) => max < x.max);
        if (idx >= 0) budgetCounts[idx].count += 1;
        else budgetCounts[budgetCounts.length - 1].count += 1;
      }
      setBudgetData(budgetCounts);

      // Property type
      const typeMap = new Map<string, number>();
      for (const b of briefs.data) {
        const t = (b.property_type || '').toString().toLowerCase().trim();
        if (!t) continue;
        typeMap.set(t, (typeMap.get(t) || 0) + 1);
      }
      setPropertyTypes(Array.from(typeMap.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count));

      // Urgency
      const urgMap = new Map<string, number>();
      for (const b of briefs.data) {
        const u = (b.urgency || '').toString().trim();
        if (!u) continue;
        urgMap.set(u, (urgMap.get(u) || 0) + 1);
      }
      setUrgency(Array.from(urgMap.entries()).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count));

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }

  const maxSuburb = suburbDemand[0]?.count || 1;
  const totalBudgetPoints = budgetData.reduce((s, b) => s + b.count, 0);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Buyers</h1>
        <p className="text-sm text-stone-500 mt-1">
          Demand analytics — what buyers are searching, saving, and enquiring about.
        </p>
      </div>

      {/* Section 1 — KPI strip */}
      <div className="flex flex-wrap gap-3">
        <KpiChip label="Total buyers" value={totalBuyers.toLocaleString()} />
        <KpiChip label="Searches (30d)" value={searchCount.toLocaleString()} />
        <KpiChip label="Enquiries (30d)" value={enquiryCount.toLocaleString()} />
        <KpiChip label="Saves (30d)" value={savesCount.toLocaleString()} />
        <KpiChip label="Active buyer briefs" value={activeBriefs.toLocaleString()} />
      </div>

      {/* Section 2 — Buyer growth */}
      <Card>
        <SectionHead title="Buyer Growth" sub="New registrations per week" />
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={growthData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f5f5f4' }} contentStyle={{ borderRadius: 8, border: '1px solid #e7e5e4', fontSize: 12 }} />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Sections 3 + 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionHead title="Top Suburbs (30 days)" sub="Most searched and briefed locations" />
          {suburbDemand.length === 0 ? (
            <div className="text-sm text-stone-400 py-8 text-center">Not enough data yet</div>
          ) : (
            <div className="space-y-2">
              {suburbDemand.map(({ suburb, count }) => {
                const pct = (count / maxSuburb) * 100;
                return (
                  <div key={suburb} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-stone-700 truncate">{suburb}</div>
                    <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-10 text-right text-sm tabular-nums text-stone-600">{count}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <SectionHead title="Budget Distribution" sub="Buyer briefs by max budget" />
          {totalBudgetPoints < 5 ? (
            <div className="text-sm text-stone-400 py-8 text-center">Not enough buyer briefs yet</div>
          ) : (
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={budgetData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f5f5f4' }} contentStyle={{ borderRadius: 8, border: '1px solid #e7e5e4', fontSize: 12 }} />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Sections 5 + 6 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionHead title="Property Type Demand" sub="What buyers are looking for" />
          {propertyTypes.length === 0 ? (
            <div className="text-sm text-stone-400 py-6 text-center">No data yet</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {propertyTypes.map(({ type, count }) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-sm text-stone-700"
                >
                  {PROPERTY_TYPE_LABELS[type] || type}
                  <span className="text-xs font-semibold text-stone-900 tabular-nums">{count}</span>
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionHead title="Buyer Urgency" sub="Purchase timeline from active buyer briefs" />
          {urgency.length === 0 ? (
            <div className="text-sm text-stone-400 py-6 text-center">No data yet</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {urgency.map(({ key, count }) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-sm text-stone-700"
                >
                  {URGENCY_LABELS[key] || key}
                  <span className="text-xs font-semibold text-stone-900 tabular-nums">{count}</span>
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
