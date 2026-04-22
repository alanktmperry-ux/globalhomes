// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  TrendingUp, Users, Search, MapPin, RefreshCw,
  ArrowRight, Globe, Zap, Building2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

interface FunnelStage {
  name: string;
  value: number;
  pct: number;
  color: string;
  conversion: string | null;
}

interface WeekPoint {
  label: string;
  signups: number;
  conversions: number;
  searches: number;
}

interface StateRow {
  state: string;
  listings: number;
  agents: number;
  pct: number;
}

interface SourceRow {
  source: string;
  count: number;
  converted: number;
  conversionRate: number;
}

const FUNNEL_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#22c55e'];

const STATE_ORDER = ['VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

function KPI({
  label, value, sub, icon: Icon, color = 'text-primary',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg bg-secondary flex items-center justify-center ${color}`}>
          <Icon size={15} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && (
        <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
      )}
    </div>
  );
}

function FunnelStep({ stage, isLast }: { stage: FunnelStage; isLast: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-card border border-border rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-foreground">{stage.name}</p>
          <span className="text-sm font-bold text-foreground">{stage.value.toLocaleString()}</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${stage.pct}%`, background: stage.color }} />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground">{stage.pct}% of top</span>
          {stage.conversion && (
            <span className="text-[10px] font-medium text-primary">{stage.conversion} step rate</span>
          )}
        </div>
      </div>
      {!isLast && <ArrowRight size={14} className="text-muted-foreground shrink-0" />}
    </div>
  );
}

export default function GrowthFunnel() {
  const [loading, setLoading] = useState(true);
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<WeekPoint[]>([]);
  const [stateBreakdown, setStateBreakdown] = useState<StateRow[]>([]);
  const [sourceBreakdown, setSourceBreakdown] = useState<SourceRow[]>([]);
  const [kpis, setKpis] = useState({
    totalVisitorSearches: 0,
    searchToSignup: 0,
    trialToConversion: 0,
    avgTimeToConvert: 0,
    weeklySignups: 0,
    weeklyConversions: 0,
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();

      const [agentsRes, subsRes, searchesRes, propsRes, profilesRes] = await Promise.all([
        supabase.from('agents').select('id, created_at, is_subscribed, lead_source'),
        supabase.from('agent_subscriptions').select('agent_id, subscription_start, plan_type'),
        supabase.from('voice_searches').select('id, created_at, detected_language').order('created_at', { ascending: false }).limit(5000),
        supabase.from('properties').select('id, state, created_at, agent_id').eq('is_active', true),
        supabase.from('profiles').select('user_id, created_at'),
      ]);

      const agents = agentsRes.data || [];
      const searches = searchesRes.data || [];
      const properties = propsRes.data || [];
      const profiles = profilesRes.data || [];
      const subs = subsRes.data || [];

      const totalSearches = searches.length;
      const totalProfiles = profiles.length;
      const totalAgents = agents.length;
      const paidAgents = agents.filter(a => a.is_subscribed).length;

      const agentsWithListings = new Set(
        (properties || []).map((p: any) => p.agent_id).filter(Boolean)
      );
      const listedAgentCount = agents.filter(a => agentsWithListings.has(a.id)).length;

      const stages: FunnelStage[] = [
        {
          name: 'Total voice searches',
          value: totalSearches,
          pct: 100,
          color: FUNNEL_COLORS[0],
          conversion: null,
        },
        {
          name: 'Registered users',
          value: totalProfiles,
          pct: totalSearches > 0 ? Math.round((totalProfiles / totalSearches) * 100) : 0,
          color: FUNNEL_COLORS[1],
          conversion: totalSearches > 0 ? `${Math.round((totalProfiles / totalSearches) * 100)}%` : '—',
        },
        {
          name: 'Agent trial signups',
          value: totalAgents,
          pct: totalSearches > 0 ? Math.round((totalAgents / totalSearches) * 100) : 0,
          color: FUNNEL_COLORS[2],
          conversion: totalProfiles > 0 ? `${Math.round((totalAgents / totalProfiles) * 100)}%` : '—',
        },
        {
          name: 'Agents with listings',
          value: listedAgentCount,
          pct: totalSearches > 0 ? Math.round((listedAgentCount / totalSearches) * 100) : 0,
          color: FUNNEL_COLORS[3],
          conversion: totalAgents > 0 ? `${Math.round((listedAgentCount / totalAgents) * 100)}%` : '—',
        },
        {
          name: 'Converted to paid',
          value: paidAgents,
          pct: totalSearches > 0 ? Math.round((paidAgents / totalSearches) * 100) : 0,
          color: FUNNEL_COLORS[4],
          conversion: listedAgentCount > 0 ? `${Math.round((paidAgents / listedAgentCount) * 100)}%` : '—',
        },
      ];
      setFunnelStages(stages);

      // Weekly trend
      const trend: WeekPoint[] = [];
      for (let i = 11; i >= 0; i--) {
        const wStart = new Date(now.getTime() - (i + 1) * 7 * 86400000);
        const wEnd = new Date(now.getTime() - i * 7 * 86400000);
        const label = wStart.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' });
        trend.push({
          label,
          signups: agents.filter(a => {
            const d = new Date(a.created_at);
            return d >= wStart && d < wEnd;
          }).length,
          conversions: subs.filter(s => {
            if (!s.subscription_start) return false;
            const d = new Date(s.subscription_start);
            return d >= wStart && d < wEnd;
          }).length,
          searches: searches.filter(s => {
            const d = new Date(s.created_at);
            return d >= wStart && d < wEnd;
          }).length,
        });
      }
      setWeeklyTrend(trend);

      // State breakdown
      const statePropCount = new Map<string, number>();
      const agentStateMap = new Map<string, string>();
      properties.forEach((p: any) => {
        if (p.state) statePropCount.set(p.state, (statePropCount.get(p.state) || 0) + 1);
        if (p.state && p.agent_id) agentStateMap.set(p.agent_id, p.state);
      });

      const stateAgentCount = new Map<string, number>();
      agents.forEach(a => {
        const st = agentStateMap.get(a.id);
        if (st) stateAgentCount.set(st, (stateAgentCount.get(st) || 0) + 1);
      });

      const totalProps = properties.length;
      const stateRows: StateRow[] = STATE_ORDER
        .filter(s => statePropCount.has(s))
        .map(s => ({
          state: s,
          listings: statePropCount.get(s) || 0,
          agents: stateAgentCount.get(s) || 0,
          pct: totalProps > 0 ? Math.round(((statePropCount.get(s) || 0) / totalProps) * 100) : 0,
        }))
        .sort((a, b) => b.listings - a.listings);
      setStateBreakdown(stateRows);

      // Source breakdown
      const sourceMap = new Map<string, { count: number; converted: number }>();
      agents.forEach(a => {
        const src = a.lead_source || 'organic';
        const cur = sourceMap.get(src) || { count: 0, converted: 0 };
        cur.count++;
        if (a.is_subscribed) cur.converted++;
        sourceMap.set(src, cur);
      });
      const sourceRows: SourceRow[] = Array.from(sourceMap.entries())
        .map(([source, v]) => ({
          source,
          count: v.count,
          converted: v.converted,
          conversionRate: v.count > 0 ? Math.round((v.converted / v.count) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);
      setSourceBreakdown(sourceRows);

      // KPIs
      const weeklySignups = agents.filter(a => new Date(a.created_at) >= new Date(d7)).length;
      const weeklyConversions = subs.filter(s => s.subscription_start && new Date(s.subscription_start) >= new Date(d7)).length;

      const convertedWithDates = agents.filter(a => {
        if (!a.is_subscribed) return false;
        const sub = subs.find(s => s.agent_id === a.id);
        return sub?.subscription_start;
      });
      const avgDays = convertedWithDates.length > 0
        ? Math.round(
            convertedWithDates.reduce((sum, a) => {
              const sub = subs.find(s => s.agent_id === a.id);
              if (!sub?.subscription_start) return sum;
              return sum + Math.floor((new Date(sub.subscription_start).getTime() - new Date(a.created_at).getTime()) / 86400000);
            }, 0) / convertedWithDates.length
          )
        : 0;

      setKpis({
        totalVisitorSearches: totalSearches,
        searchToSignup: totalSearches > 0 ? Math.round((totalAgents / totalSearches) * 100) : 0,
        trialToConversion: totalAgents > 0 ? Math.round((paidAgents / totalAgents) * 100) : 0,
        avgTimeToConvert: avgDays,
        weeklySignups,
        weeklyConversions,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Growth & Acquisition Funnel</h2>
          <p className="text-xs text-muted-foreground mt-0.5">From first search to paid agent — visualise where you win and where you lose</p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border">
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Search → Agent" value={`${kpis.searchToSignup}%`} icon={Search} color={kpis.searchToSignup > 5 ? 'text-emerald-500' : 'text-amber-500'} sub="Searches converting to agents" />
        <KPI label="Trial → Paid" value={`${kpis.trialToConversion}%`} icon={Zap} color={kpis.trialToConversion > 20 ? 'text-emerald-500' : kpis.trialToConversion > 10 ? 'text-amber-500' : 'text-destructive'} sub="Trial agents converting" />
        <KPI label="Avg Time to Convert" value={kpis.avgTimeToConvert > 0 ? `${kpis.avgTimeToConvert}d` : '—'} icon={TrendingUp} sub="Trial start to first payment" />
        <KPI label="Voice Searches" value={kpis.totalVisitorSearches.toLocaleString()} icon={Globe} sub="Total platform searches" />
      </div>

      {/* Weekly snapshot */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{kpis.weeklySignups}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">New agent signups this week</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{kpis.weeklyConversions}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Trial → paid conversions this week</p>
        </div>
      </div>

      {/* Funnel */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-bold text-foreground mb-4">Acquisition Funnel</h3>
        <div className="space-y-3">
          {funnelStages.map((stage, i) => (
            <FunnelStep key={stage.name} stage={stage} isLast={i === funnelStages.length - 1} />
          ))}
        </div>
      </div>

      {/* Weekly trend chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-bold text-foreground mb-4">12-Week Signup & Conversion Trend</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={weeklyTrend}>
            <defs>
              <linearGradient id="gSignups" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gConversions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Area type="monotone" dataKey="signups" stroke="#8b5cf6" fill="url(#gSignups)" name="Signups" />
            <Area type="monotone" dataKey="conversions" stroke="#22c55e" fill="url(#gConversions)" name="Conversions" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* State + Source breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* State */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={14} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">Listings by State</h3>
          </div>
          {stateBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No listing data yet</p>
          ) : (
            <div className="space-y-2">
              {stateBreakdown.map(s => (
                <div key={s.state} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{s.state}</span>
                    <span className="text-[10px] text-muted-foreground">{s.listings} listings · {s.agents} agents</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Source */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">Lead Sources</h3>
          </div>
          {sourceBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No source data yet</p>
          ) : (
            <div className="space-y-2.5">
              {sourceBreakdown.map(s => (
                <div key={s.source} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-foreground capitalize">{s.source}</span>
                      <span className="text-[10px] text-muted-foreground">{s.count} agents</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${sourceBreakdown[0].count > 0 ? Math.round((s.count / sourceBreakdown[0].count) * 100) : 0}%`,
                        background: '#6366f1',
                      }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0 w-12">
                    <p className={`text-xs font-bold ${s.conversionRate >= 20 ? 'text-emerald-500' : s.conversionRate >= 10 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {s.conversionRate}%
                    </p>
                    <p className="text-[9px] text-muted-foreground">conv.</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Coverage gaps */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={14} className="text-primary" />
          <h3 className="text-sm font-bold text-foreground">Coverage Gaps</h3>
          <span className="text-[10px] text-muted-foreground">— States with no listings yet</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATE_ORDER.filter(s => !stateBreakdown.find(r => r.state === s)).map(s => (
            <span key={s} className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 text-xs font-medium">{s} — no listings</span>
          ))}
          {STATE_ORDER.every(s => stateBreakdown.find(r => r.state === s)) && (
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-medium">All states covered ✓</span>
          )}
        </div>
      </div>
    </div>
  );
}
