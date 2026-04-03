import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Brain, Mic, Users, ShoppingBag, FileText, TrendingUp, TrendingDown,
  Minus, Loader2, Sparkles, BarChart3, DollarSign, Target, ArrowUpRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

type DateRange = '7d' | '30d' | '90d';

interface TrendValue {
  current: number;
  previous: number;
}

function calcTrend(t: TrendValue): { direction: 'up' | 'down' | 'stable'; pct: number } {
  if (t.previous === 0) return { direction: t.current > 0 ? 'up' : 'stable', pct: 0 };
  const pct = Math.round(((t.current - t.previous) / t.previous) * 100);
  return { direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'stable', pct: Math.abs(pct) };
}

function dateAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

const AIInsights = () => {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>('30d');

  const [voiceSearches, setVoiceSearches] = useState<TrendValue>({ current: 0, previous: 0 });
  const [conciergeLeads, setConciergeLeads] = useState<TrendValue>({ current: 0, previous: 0 });
  const [topSuburbs, setTopSuburbs] = useState<{ suburb: string; count: number }[]>([]);
  const [topLanguages, setTopLanguages] = useState<{ lang: string; count: number }[]>([]);

  const [sellerScores, setSellerScores] = useState({ total: 0, high: 0, med: 0, low: 0, avgScore: 0 });

  const [offers, setOffers] = useState<TrendValue>({ current: 0, previous: 0 });
  const [offerStatuses, setOfferStatuses] = useState<{ status: string; count: number }[]>([]);

  const [marketplace, setMarketplace] = useState({
    totalAvailable: 0,
    purchased: { current: 0, previous: 0 } as TrendValue,
    revenue: 0,
    activeAgents: 0,
  });

  const rangeDays = range === '7d' ? 7 : range === '30d' ? 30 : 90;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const currentStart = dateAgo(rangeDays);
    const previousStart = dateAgo(rangeDays * 2);
    const currentEnd = new Date().toISOString();
    const previousEnd = currentStart;

    const [
      vsCurrent, vsPrev,
      leadsCurrent, leadsPrev,
      vsSuburbs, vsLangs,
      scoresAll,
      offersCurrent, offersPrev, offersStatusData,
      mpAvailable, mpCurrent, mpPrev, mpRevenue, mpAgents,
    ] = await Promise.all([
      // Voice searches
      supabase.from('voice_searches').select('id', { count: 'exact', head: true }).gte('created_at', currentStart),
      supabase.from('voice_searches').select('id', { count: 'exact', head: true }).gte('created_at', previousStart).lt('created_at', previousEnd),
      // Concierge leads (source = ai_buyer_concierge or all leads as proxy)
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', currentStart),
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', previousStart).lt('created_at', previousEnd),
      // Top suburbs from voice search parsed_query
      supabase.from('voice_searches').select('parsed_query').gte('created_at', currentStart).limit(500),
      // Top languages
      supabase.from('voice_searches').select('detected_language').gte('created_at', currentStart).limit(500),
      // Seller likelihood scores (all current)
      supabase.from('seller_likelihood_scores' as any).select('score'),
      // Offers
      supabase.from('offers').select('id', { count: 'exact', head: true }).gte('created_at', currentStart),
      supabase.from('offers').select('id', { count: 'exact', head: true }).gte('created_at', previousStart).lt('created_at', previousEnd),
      supabase.from('offers').select('status').gte('created_at', currentStart),
      // Marketplace
      supabase.from('consumer_profiles').select('id', { count: 'exact', head: true }).eq('is_purchasable', true).is('purchased_by', null),
      supabase.from('consumer_profiles').select('id', { count: 'exact', head: true }).not('purchased_by', 'is', null).gte('purchased_at', currentStart),
      supabase.from('consumer_profiles').select('id', { count: 'exact', head: true }).not('purchased_by', 'is', null).gte('purchased_at', previousStart).lt('purchased_at', previousEnd),
      supabase.from('consumer_profiles').select('purchase_price').not('purchased_by', 'is', null).gte('purchased_at', currentStart),
      supabase.from('consumer_profiles').select('purchased_by').not('purchased_by', 'is', null).gte('purchased_at', currentStart),
    ]);

    setVoiceSearches({ current: vsCurrent.count || 0, previous: vsPrev.count || 0 });
    setConciergeLeads({ current: leadsCurrent.count || 0, previous: leadsPrev.count || 0 });

    // Extract suburbs from parsed_query JSON
    const suburbMap = new Map<string, number>();
    (vsSuburbs.data || []).forEach((row: any) => {
      const pq = row.parsed_query;
      if (pq && typeof pq === 'object') {
        const suburb = (pq as any).suburb || (pq as any).location;
        if (suburb && typeof suburb === 'string') {
          suburbMap.set(suburb, (suburbMap.get(suburb) || 0) + 1);
        }
      }
    });
    setTopSuburbs(
      Array.from(suburbMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([suburb, count]) => ({ suburb, count }))
    );

    // Languages
    const langMap = new Map<string, number>();
    const langLabels: Record<string, string> = {
      en: 'English', zh: 'Mandarin', ar: 'Arabic', hi: 'Hindi', vi: 'Vietnamese',
      ko: 'Korean', ja: 'Japanese', es: 'Spanish', fr: 'French', it: 'Italian',
    };
    (vsLangs.data || []).forEach((row: any) => {
      const lang = row.detected_language || 'en';
      langMap.set(lang, (langMap.get(lang) || 0) + 1);
    });
    setTopLanguages(
      Array.from(langMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l, count]) => ({ lang: langLabels[l] || l.toUpperCase(), count }))
    );

    // Seller scores
    const allScores = ((scoresAll.data || []) as unknown as { score: number }[]);
    const high = allScores.filter(s => s.score >= 70).length;
    const med = allScores.filter(s => s.score >= 40 && s.score < 70).length;
    const low = allScores.filter(s => s.score < 40).length;
    const avg = allScores.length > 0 ? Math.round(allScores.reduce((s, r) => s + r.score, 0) / allScores.length) : 0;
    setSellerScores({ total: allScores.length, high, med, low, avgScore: avg });

    // Offers
    setOffers({ current: offersCurrent.count || 0, previous: offersPrev.count || 0 });
    const statusMap = new Map<string, number>();
    (offersStatusData.data || []).forEach((r: any) => {
      const s = r.status || 'draft';
      statusMap.set(s, (statusMap.get(s) || 0) + 1);
    });
    setOfferStatuses(Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })));

    // Marketplace
    const rev = (mpRevenue.data || []).reduce((sum: number, r: any) => sum + (r.purchase_price || 0), 0);
    const uniqueAgents = new Set((mpAgents.data || []).map((r: any) => r.purchased_by)).size;
    setMarketplace({
      totalAvailable: mpAvailable.count || 0,
      purchased: { current: mpCurrent.count || 0, previous: mpPrev.count || 0 },
      revenue: rev,
      activeAgents: uniqueAgents,
    });

    setLoading(false);
  }, [rangeDays]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const TrendBadge = ({ trend }: { trend: { direction: string; pct: number } }) => {
    if (trend.direction === 'stable') return <Badge variant="secondary" className="text-xs gap-1"><Minus size={10} /> Stable</Badge>;
    if (trend.direction === 'up') return <Badge className="text-xs gap-1 bg-green-500/10 text-green-700 border-green-500/20"><TrendingUp size={10} /> +{trend.pct}%</Badge>;
    return <Badge className="text-xs gap-1 bg-destructive/10 text-destructive border-destructive/20"><TrendingDown size={10} /> -{trend.pct}%</Badge>;
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  const vsT = calcTrend(voiceSearches);
  const clT = calcTrend(conciergeLeads);
  const ofT = calcTrend(offers);
  const mpT = calcTrend(marketplace.purchased);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain className="text-primary" size={22} />
          <div>
            <h2 className="text-xl font-bold text-foreground">AI Insights</h2>
            <p className="text-sm text-muted-foreground">Real-time performance across all 4 AI builds</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {(['7d', '30d', '90d'] as DateRange[]).map(r => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? 'default' : 'outline'}
              className="text-xs h-8"
              onClick={() => setRange(r)}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* ── BUILD 1: Buyer Concierge ── */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles size={18} className="text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Build 1 — AI Buyer Concierge</CardTitle>
              <CardDescription className="text-xs">Voice search volume and lead generation</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricBox icon={Mic} label="Voice Searches" value={voiceSearches.current} trend={vsT} />
            <MetricBox icon={Users} label="Leads Generated" value={conciergeLeads.current} trend={clT} />
            <MetricBox icon={Target} label="Conversion" value={voiceSearches.current > 0 ? `${Math.round((conciergeLeads.current / voiceSearches.current) * 100)}%` : '—'} />
            <MetricBox icon={BarChart3} label="Languages" value={topLanguages.length} />
          </div>
          {topSuburbs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Top searched suburbs</p>
              <div className="flex flex-wrap gap-1.5">
                {topSuburbs.map(({ suburb, count }) => (
                  <Badge key={suburb} variant="secondary" className="text-xs">{suburb} · {count}</Badge>
                ))}
              </div>
            </div>
          )}
          {topLanguages.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Top languages</p>
              <div className="flex flex-wrap gap-1.5">
                {topLanguages.map(({ lang, count }) => (
                  <Badge key={lang} variant="outline" className="text-xs">{lang} · {count}</Badge>
                ))}
              </div>
            </div>
          )}
          {voiceSearches.current === 0 && conciergeLeads.current === 0 && (
            <p className="text-xs text-muted-foreground/70 text-center py-2">No voice search activity in this period.</p>
          )}
        </CardContent>
      </Card>

      {/* ── BUILD 2: Seller Likelihood Scores ── */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp size={18} className="text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Build 2 — Seller Likelihood Scores</CardTitle>
              <CardDescription className="text-xs">Score distribution across all scored properties</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <MetricBox icon={BarChart3} label="Total Scored" value={sellerScores.total} />
            <MetricBox icon={ArrowUpRight} label="Avg Score" value={sellerScores.avgScore} />
            <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-green-700">{sellerScores.high}</p>
              <p className="text-xs text-muted-foreground">High (70+)</p>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-amber-700">{sellerScores.med}</p>
              <p className="text-xs text-muted-foreground">Medium (40–69)</p>
            </div>
            <div className="bg-muted/50 border border-border rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-muted-foreground">{sellerScores.low}</p>
              <p className="text-xs text-muted-foreground">Low (0–39)</p>
            </div>
          </div>
          {sellerScores.total > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Distribution</p>
              <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                {sellerScores.high > 0 && (
                  <div className="bg-green-500 transition-all" style={{ width: `${(sellerScores.high / sellerScores.total) * 100}%` }} />
                )}
                {sellerScores.med > 0 && (
                  <div className="bg-amber-500 transition-all" style={{ width: `${(sellerScores.med / sellerScores.total) * 100}%` }} />
                )}
                {sellerScores.low > 0 && (
                  <div className="bg-muted-foreground/30 transition-all" style={{ width: `${(sellerScores.low / sellerScores.total) * 100}%` }} />
                )}
              </div>
            </div>
          )}
          {sellerScores.total === 0 && (
            <p className="text-xs text-muted-foreground/70 text-center py-2">No seller scores calculated yet. The scoring job runs weekly on Sundays.</p>
          )}
        </CardContent>
      </Card>

      {/* ── BUILD 3: AI Offer Generator ── */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText size={18} className="text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Build 3 — AI Offer Generator</CardTitle>
              <CardDescription className="text-xs">Offer creation and outcome tracking</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetricBox icon={FileText} label="Offers Generated" value={offers.current} trend={ofT} />
            <MetricBox icon={Target} label="Sent" value={offerStatuses.find(s => s.status === 'sent')?.count || 0} />
            <MetricBox icon={ArrowUpRight} label="Accepted" value={offerStatuses.find(s => s.status === 'accepted')?.count || 0} />
          </div>
          {offerStatuses.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Status breakdown</p>
              <div className="flex flex-wrap gap-1.5">
                {offerStatuses.map(({ status, count }) => (
                  <Badge key={status} variant="outline" className="text-xs capitalize">{status} · {count}</Badge>
                ))}
              </div>
            </div>
          )}
          {offers.current === 0 && (
            <p className="text-xs text-muted-foreground/70 text-center py-2">No offers generated in this period.</p>
          )}
        </CardContent>
      </Card>

      {/* ── BUILD 4: Lead Marketplace ── */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingBag size={18} className="text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Build 4 — Lead Marketplace</CardTitle>
              <CardDescription className="text-xs">Lead inventory, purchases, and revenue</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricBox icon={Users} label="Available Leads" value={marketplace.totalAvailable} />
            <MetricBox icon={ShoppingBag} label="Purchased" value={marketplace.purchased.current} trend={mpT} />
            <MetricBox icon={DollarSign} label="Revenue" value={`$${marketplace.revenue.toLocaleString()}`} />
            <MetricBox icon={Users} label="Active Agents" value={marketplace.activeAgents} />
          </div>
          {marketplace.purchased.current === 0 && marketplace.totalAvailable === 0 && (
            <p className="text-xs text-muted-foreground/70 text-center py-2">No marketplace activity in this period.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* ── Reusable metric box ── */
function MetricBox({ icon: Icon, label, value, trend }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  trend?: { direction: string; pct: number };
}) {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;
  const trendColor = trend?.direction === 'up' ? 'text-green-600' : trend?.direction === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={14} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground truncate">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {trend && trend.pct > 0 && (
        <div className={`flex items-center gap-1 mt-0.5 ${trendColor}`}>
          <TrendIcon size={12} />
          <span className="text-xs font-medium">{trend.direction === 'down' ? '-' : '+'}{trend.pct}%</span>
        </div>
      )}
    </motion.div>
  );
}

export default AIInsights;
