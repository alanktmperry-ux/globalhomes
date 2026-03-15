import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, TrendingUp, Bookmark, Flame, ArrowUpRight, ArrowDownRight,
  BarChart3, Users, Home, LogOut, ChevronRight,
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SiteHeader } from '@/components/SiteHeader';

/* ── Types ──────────────────────────────────────────────────── */
interface ListingPerf {
  id: string;
  title: string;
  suburb: string;
  views: number;
  contactClicks: number;
  savedCount: number;
  status: string;
  imageUrl: string | null;
}

interface HotLead {
  userId: string;
  email: string;
  displayName: string;
  propertyTitle: string;
  propertyId: string;
  viewCount: number;
  savedAt: string;
}

interface DailyViews {
  date: string;
  views: number;
  inquiries: number;
}

/* ── Helpers ────────────────────────────────────────────────── */
const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });
const shortDate = (d: string) => {
  const dt = new Date(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
};

/* ── Component ──────────────────────────────────────────────── */
export default function AgentPerformanceDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [agentId, setAgentId] = useState<string | null>(null);
  const [listings, setListings] = useState<ListingPerf[]>([]);
  const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
  const [dailyData, setDailyData] = useState<DailyViews[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolve agent record
  useEffect(() => {
    if (!user) return;
    supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAgentId(data.id);
        else setLoading(false);
      });
  }, [user]);

  // Fetch all performance data
  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;

    async function fetchData() {
      setLoading(true);

      // 1. Agent's listings with saved counts
      const { data: props } = await supabase
        .from('properties')
        .select('id, title, suburb, views, contact_clicks, status, image_url')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (cancelled) return;

      const listingData: ListingPerf[] = [];
      if (props) {
        for (const p of props) {
          const { count } = await supabase
            .from('saved_properties')
            .select('id', { count: 'exact', head: true })
            .eq('property_id', p.id);

          listingData.push({
            id: p.id,
            title: p.title,
            suburb: p.suburb,
            views: p.views,
            contactClicks: p.contact_clicks,
            savedCount: count || 0,
            status: p.status,
            imageUrl: p.image_url,
          });
        }
      }
      if (cancelled) return;
      setListings(listingData);

      // 2. Daily views from lead_events (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: events } = await supabase
        .from('lead_events')
        .select('event_type, created_at')
        .eq('agent_id', agentId)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (cancelled) return;

      // Group by day
      const dayMap = new Map<string, { views: number; inquiries: number }>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dayMap.set(key, { views: 0, inquiries: 0 });
      }

      events?.forEach((e) => {
        const day = e.created_at.split('T')[0];
        const bucket = dayMap.get(day);
        if (bucket) {
          if (e.event_type === 'contact_click' || e.event_type === 'phone_click' || e.event_type === 'whatsapp_click' || e.event_type === 'email_click') {
            bucket.views++;
          }
          if (e.event_type === 'qualified_inquiry') {
            bucket.inquiries++;
          }
        }
      });

      setDailyData(
        Array.from(dayMap.entries()).map(([date, v]) => ({
          date,
          views: v.views,
          inquiries: v.inquiries,
        }))
      );

      // 3. Hot leads: users who saved an agent's property AND have 3+ lead events in last 24h
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const propertyIds = listingData.map((l) => l.id);
      if (propertyIds.length > 0) {
        const { data: saves } = await supabase
          .from('saved_properties')
          .select('user_id, property_id, created_at')
          .in('property_id', propertyIds);

        if (cancelled) return;

        // For each saved-property user, check their lead_events in last 24h
        const hotLeadCandidates: HotLead[] = [];
        const userPropertyPairs = new Map<string, { propertyId: string; savedAt: string }>();

        saves?.forEach((s) => {
          const key = `${s.user_id}__${s.property_id}`;
          if (!userPropertyPairs.has(key)) {
            userPropertyPairs.set(key, { propertyId: s.property_id, savedAt: s.created_at });
          }
        });

        for (const [key, { propertyId, savedAt }] of userPropertyPairs) {
          const userId = key.split('__')[0];

          const { count } = await supabase
            .from('lead_events')
            .select('id', { count: 'exact', head: true })
            .eq('property_id', propertyId)
            .eq('user_id', userId)
            .gte('created_at', oneDayAgo.toISOString());

          if (cancelled) return;
          if (count && count >= 3) {
            // Get profile info
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', userId)
              .maybeSingle();

            const listing = listingData.find((l) => l.id === propertyId);

            hotLeadCandidates.push({
              userId,
              email: '',
              displayName: profile?.display_name || 'Anonymous',
              propertyTitle: listing?.title || 'Unknown',
              propertyId,
              viewCount: count,
              savedAt,
            });
          }
        }
        setHotLeads(hotLeadCandidates);
      }

      // 4. Also fetch leads count for conversion
      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, [agentId]);

  /* ── Derived stats ──────────────────────────────────────────── */
  const totalViews7d = dailyData.reduce((s, d) => s + d.views, 0);
  const totalInquiries7d = dailyData.reduce((s, d) => s + d.inquiries, 0);
  const conversionRate = totalViews7d > 0 ? ((totalInquiries7d / totalViews7d) * 100).toFixed(1) : '0.0';
  const totalSaved = listings.reduce((s, l) => s + l.savedCount, 0);

  /* ── Auth guard ─────────────────────────────────────────────── */
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <Home className="w-12 h-12 text-muted-foreground" />
          <h1 className="text-xl font-display font-bold text-foreground">Agent Dashboard</h1>
          <p className="text-muted-foreground text-center max-w-md">
            Sign in to your agent account to view your listings performance, leads, and analytics.
          </p>
          <Button onClick={() => navigate('/agents/login')} className="gap-2">
            Sign in as Agent <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Performance Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Last 7 days · Real-time data</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="gap-2">
            Full Dashboard <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            icon={<Eye className="w-5 h-5" />}
            label="Engagement Events"
            value={loading ? '—' : totalViews7d.toLocaleString()}
            subtitle="Last 7 days"
            trend={totalViews7d > 0 ? 'up' : 'neutral'}
          />
          <KpiCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Inquiry Conversion"
            value={loading ? '—' : `${conversionRate}%`}
            subtitle="Events → inquiries"
            trend={Number(conversionRate) > 5 ? 'up' : 'neutral'}
          />
          <KpiCard
            icon={<Bookmark className="w-5 h-5" />}
            label="Properties Saved"
            value={loading ? '—' : totalSaved.toLocaleString()}
            subtitle="By seekers"
            trend={totalSaved > 0 ? 'up' : 'neutral'}
          />
          <KpiCard
            icon={<Flame className="w-5 h-5" />}
            label="Hot Leads"
            value={loading ? '—' : hotLeads.length.toString()}
            subtitle="High-intent buyers"
            trend={hotLeads.length > 0 ? 'up' : 'neutral'}
            accent
          />
        </div>

        {/* Chart + Hot Leads */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Daily Activity Chart */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Daily Activity (7 days)
            </h2>
            {loading ? (
              <Skeleton className="w-full h-[240px] rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="inqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent-foreground))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--accent-foreground))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={shortDate}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#viewsGrad)"
                    name="Engagement"
                  />
                  <Area
                    type="monotone"
                    dataKey="inquiries"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    fill="url(#inqGrad)"
                    name="Inquiries"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Hot Leads Panel */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Flame className="w-4 h-4 text-destructive" />
              Hot Leads
            </h2>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : hotLeads.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hot leads yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Users who save your property and view it 3+ times in 24h appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto">
                {hotLeads.map((lead, i) => (
                  <div
                    key={`${lead.userId}-${lead.propertyId}`}
                    className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/10"
                  >
                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <Flame className="w-4 h-4 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lead.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.propertyTitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {lead.viewCount} views
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">Saved {shortDate(lead.savedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Listings Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Home className="w-4 h-4 text-primary" />
              Active Listings Performance
            </h2>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12">
              <Home className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No active listings</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/pocket-listing')}>
                Create your first listing
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Property</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Views</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Inquiries</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saved</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Conv. Rate</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => {
                    const conv = listing.views > 0
                      ? ((listing.contactClicks / listing.views) * 100).toFixed(1)
                      : '0.0';
                    return (
                      <tr
                        key={listing.id}
                        className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => navigate(`/dashboard/listings/${listing.id}`)}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {listing.imageUrl && (
                              <img
                                src={listing.imageUrl}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{listing.title}</p>
                              <p className="text-xs text-muted-foreground">{listing.suburb}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-right px-4 py-3 font-mono text-foreground">{listing.views.toLocaleString()}</td>
                        <td className="text-right px-4 py-3 font-mono text-foreground">{listing.contactClicks}</td>
                        <td className="text-right px-4 py-3 font-mono text-foreground">{listing.savedCount}</td>
                        <td className="text-right px-4 py-3">
                          <span className={`font-mono ${Number(conv) > 5 ? 'text-primary' : 'text-muted-foreground'}`}>
                            {conv}%
                          </span>
                        </td>
                        <td className="text-center px-4 py-3">
                          <Badge
                            variant={listing.status === 'public' ? 'default' : 'secondary'}
                            className="text-[10px] capitalize"
                          >
                            {listing.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ── KPI Card ─────────────────────────────────────────────────── */
function KpiCard({
  icon, label, value, subtitle, trend, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  trend: 'up' | 'down' | 'neutral';
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'bg-destructive/5 border-destructive/20' : 'bg-card border-border'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
          {icon}
        </div>
        {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-primary" />}
        {trend === 'down' && <ArrowDownRight className="w-4 h-4 text-destructive" />}
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{subtitle}</p>
    </div>
  );
}
