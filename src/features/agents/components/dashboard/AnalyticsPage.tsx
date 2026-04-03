import { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, DollarSign, Clock, Search, Loader2, Eye, MousePointerClick } from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { format, subMonths, startOfMonth } from 'date-fns';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

const AnalyticsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [voiceSearches, setVoiceSearches] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!agent) { setLoading(false); return; }

      const sixMonthsAgo = subMonths(new Date(), 6).toISOString();

      const [listingsRes, leadsRes, voiceRes] = await Promise.all([
        supabase
          .from('properties')
          .select('id, title, suburb, views, contact_clicks, created_at, status, listing_type, price')
          .eq('agent_id', agent.id)
          .gte('created_at', sixMonthsAgo),
        supabase
          .from('leads')
          .select('id, score, timeframe, buying_purpose, created_at, property_id, search_context')
          .eq('agent_id', agent.id)
          .gte('created_at', sixMonthsAgo),
        supabase
          .from('voice_searches')
          .select('id, transcript, parsed_query, created_at')
          .gte('created_at', sixMonthsAgo)
          .limit(200),
      ]);

      setListings(listingsRes.data || []);
      setLeads(leadsRes.data || []);
      setVoiceSearches(voiceRes.data || []);
    } catch (err) {
      console.warn('[Analytics] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived stats ──────────────────────────────────────────
  const totalViews = useMemo(() => listings.reduce((s, l) => s + (l.views || 0), 0), [listings]);
  const totalClicks = useMemo(() => listings.reduce((s, l) => s + (l.contact_clicks || 0), 0), [listings]);
  const avgScore = useMemo(() => {
    const scored = leads.filter(l => l.score > 0);
    return scored.length > 0 ? Math.round(scored.reduce((s, l) => s + l.score, 0) / scored.length) : 0;
  }, [leads]);
  const conversionRate = useMemo(() => {
    return totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0';
  }, [totalViews, totalClicks]);

  // ── Monthly views chart data ───────────────────────────────
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; views: number; clicks: number; leads: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMM');
      months[key] = { month: label, views: 0, clicks: 0, leads: 0 };
    }
    listings.forEach(l => {
      const key = l.created_at?.slice(0, 7);
      if (key && months[key]) {
        months[key].views += l.views || 0;
        months[key].clicks += l.contact_clicks || 0;
      }
    });
    leads.forEach(l => {
      const key = l.created_at?.slice(0, 7);
      if (key && months[key]) months[key].leads += 1;
    });
    return Object.values(months);
  }, [listings, leads]);

  // ── Top keywords from voice searches ───────────────────────
  const topKeywords = useMemo(() => {
    const counts: Record<string, number> = {};
    voiceSearches.forEach(vs => {
      const words = (vs.transcript || '').toLowerCase().split(/\s+/);
      const stopWords = new Set(['a', 'an', 'the', 'in', 'for', 'and', 'or', 'with', 'to', 'of', 'i', 'am', 'is', 'are', 'looking', 'want', 'need', 'find', 'me', 'my', 'near', 'around', 'about']);
      words.filter((w: string) => w.length > 2 && !stopWords.has(w)).forEach((w: string) => {
        counts[w] = (counts[w] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([keyword, count]) => ({ keyword, searches: count }));
  }, [voiceSearches]);

  // ── Listings performance table ─────────────────────────────
  const topListings = useMemo(() => {
    return [...listings]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 6);
  }, [listings]);

  if (loading) {
    return (
      <div>
        <DashboardHeader title="Analytics" subtitle="Performance metrics & market insights" />
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader title="Analytics" subtitle="Performance metrics & market insights" />

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl">
        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: <Eye size={16} />, label: 'Total Views', value: totalViews.toLocaleString(), sub: `across ${listings.length} listings`, color: 'text-primary' },
            { icon: <MousePointerClick size={16} />, label: 'Contact Clicks', value: totalClicks.toLocaleString(), sub: `${conversionRate}% conversion`, color: 'text-success' },
            { icon: <TrendingUp size={16} />, label: 'Avg Lead Score', value: `${avgScore}`, sub: `from ${leads.length} leads`, color: 'text-primary' },
            { icon: <Search size={16} />, label: 'Voice Searches', value: voiceSearches.length.toLocaleString(), sub: 'last 6 months', color: 'text-primary' },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <span className={s.color}>{s.icon}</span>
                <span className="text-[10px]">{s.label}</span>
              </div>
              <p className="font-display text-2xl font-extrabold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Monthly performance */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-display text-sm font-bold mb-4">Monthly Performance</h3>
            {monthlyData.some(m => m.views > 0 || m.clicks > 0) ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="views" name="Views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="clicks" name="Clicks" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="leads" name="Leads" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                No performance data yet — views and clicks will appear as your listings get traffic.
              </div>
            )}
          </div>

          {/* Voice search keywords */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-display text-sm font-bold mb-3">Top Voice Search Keywords</h3>
            {topKeywords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left p-2">#</th>
                      <th className="text-left p-2">Keyword</th>
                      <th className="text-right p-2">Mentions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topKeywords.map((k, i) => (
                      <tr key={k.keyword} className="border-b border-border last:border-0">
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2 font-medium capitalize">{k.keyword}</td>
                        <td className="p-2 text-right font-semibold">{k.searches}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No voice search data yet.
              </div>
            )}
          </div>
        </div>

        {/* Top listings */}
        {topListings.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-display text-sm font-bold mb-3">Top Performing Listings</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left p-2">Property</th>
                    <th className="text-center p-2">Views</th>
                    <th className="text-center p-2">Clicks</th>
                    <th className="text-right p-2">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {topListings.map((l) => (
                    <tr key={l.id} className="border-b border-border last:border-0">
                      <td className="p-2 font-medium max-w-[200px] truncate">{l.title || l.suburb}</td>
                      <td className="p-2 text-center">{(l.views || 0).toLocaleString()}</td>
                      <td className="p-2 text-center">{(l.contact_clicks || 0).toLocaleString()}</td>
                      <td className="p-2 text-right">{AUD.format(l.price || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
