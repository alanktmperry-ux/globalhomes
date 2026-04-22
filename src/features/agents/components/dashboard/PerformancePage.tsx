// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { useAgentPerformanceStats } from '@/features/agents/hooks/useAgentPerformanceStats';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTeamAgents } from '@/features/agents/hooks/useTeamAgents';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Home, TrendingUp, MessageSquare, Clock, Star, Target, BarChart3, Award, Users,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function formatResponseTime(hours: number | null) {
  if (!hours) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)} days`;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function StatCard({ icon, label, value, sub, variant = 'default' }: StatCardProps) {
  const bg = variant === 'success' ? 'bg-emerald-500/10 border-emerald-500/20'
    : variant === 'warning' ? 'bg-amber-500/10 border-amber-500/20'
    : variant === 'danger' ? 'bg-destructive/10 border-destructive/20'
    : 'bg-card border-border';
  const iconColor = variant === 'success' ? 'text-emerald-600'
    : variant === 'warning' ? 'text-amber-600'
    : variant === 'danger' ? 'text-destructive'
    : 'text-primary';

  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-background/60 ${iconColor}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function TeamPerformanceView() {
  const { agencyId } = useAuth();
  const { agents, loading } = useTeamAgents();
  const [enquiryCounts, setEnquiryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!agencyId || agents.length === 0) return;
    const fetchEnquiries = async () => {
      const { data } = await supabase
        .from('contacts')
        .select('assigned_agent_id, source')
        .eq('agency_id', agencyId);
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(c => {
          if (c.assigned_agent_id && c.source === 'enquiry') {
            counts[c.assigned_agent_id] = (counts[c.assigned_agent_id] || 0) + 1;
          }
        });
        setEnquiryCounts(counts);
      }
    };
    fetchEnquiries();
  }, [agencyId, agents]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    );
  }

  const contactData = agents.map(a => ({ name: a.name.split(' ')[0], contacts: a.contact_count }));
  const listingData = agents.map(a => ({ name: a.name.split(' ')[0], listings: a.active_listings }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4">Contacts per Agent</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={contactData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip />
              <Bar dataKey="contacts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4">Active Listings per Agent</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={listingData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip />
              <Bar dataKey="listings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-3 px-4 font-medium">Agent</th>
              <th className="text-center py-3 px-4 font-medium">Enquiries Received</th>
              <th className="text-center py-3 px-4 font-medium">Avg Days to Offer</th>
              <th className="text-center py-3 px-4 font-medium">Conversion Rate</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(a => (
              <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-3 px-4 font-medium">{a.name}</td>
                <td className="py-3 px-4 text-center">{enquiryCounts[a.id] || 0}</td>
                <td className="py-3 px-4 text-center text-muted-foreground">Coming soon</td>
                <td className="py-3 px-4 text-center text-muted-foreground">Coming soon</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const { user, isPrincipal, isAdmin } = useAuth();
  const { stats, loading, agentId } = useAgentPerformanceStats();
  const [viewMode, setViewMode] = useState<'my' | 'team'>('my');

  const showTeamToggle = isPrincipal || isAdmin;

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-[1400px] space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const saleVsGuide = stats?.avg_sale_vs_guide;
  const saleVsGuideLabel = saleVsGuide
    ? saleVsGuide >= 1
      ? `${((saleVsGuide - 1) * 100).toFixed(1)}% above guide`
      : `${((1 - saleVsGuide) * 100).toFixed(1)}% below guide`
    : '—';

  const responseVariant = (stats?.response_rate ?? 0) >= 80 ? 'success' as const
    : (stats?.response_rate ?? 0) >= 50 ? 'warning' as const : 'danger' as const;
  const timeVariant = (stats?.avg_response_hours ?? 999) <= 2 ? 'success' as const
    : (stats?.avg_response_hours ?? 999) <= 12 ? 'warning' as const : 'danger' as const;

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {viewMode === 'team' ? 'Team Performance' : 'Your Performance'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {viewMode === 'my' && stats?.calculated_at
              ? `Last calculated ${new Date(stats.calculated_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
              : 'Overview of team metrics'}
          </p>
        </div>
        {showTeamToggle && (
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <Button size="sm" variant={viewMode === 'my' ? 'secondary' : 'ghost'} onClick={() => setViewMode('my')} className="h-7 px-3 text-xs">
              My performance
            </Button>
            <Button size="sm" variant={viewMode === 'team' ? 'secondary' : 'ghost'} onClick={() => setViewMode('team')} className="h-7 px-3 text-xs gap-1">
              <Users size={12} /> Team performance
            </Button>
          </div>
        )}
      </div>

      {viewMode === 'team' && showTeamToggle ? (
        <TeamPerformanceView />
      ) : (
        <>
          {/* Top KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={<Home size={18} />} label="Active listings" value={String(stats?.active_listings ?? 0)} sub={`${stats?.total_listings ?? 0} total`} />
            <StatCard icon={<TrendingUp size={18} />} label="Properties sold" value={String(stats?.sold_listings ?? 0)}
              sub={stats?.avg_days_to_sale ? `avg ${Math.round(stats.avg_days_to_sale)} days to sale` : 'last 24 months'} variant="success" />
            <StatCard icon={<MessageSquare size={18} />} label="Response rate" value={stats?.response_rate != null ? `${Math.round(stats.response_rate)}%` : '—'}
              sub="within 24 hours" variant={responseVariant} />
            <StatCard icon={<Clock size={18} />} label="Avg reply time" value={formatResponseTime(stats?.avg_response_hours ?? null)}
              sub="median first response" variant={timeVariant} />
          </div>

          {/* Second row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={<Target size={18} />} label="Sale vs price guide" value={saleVsGuideLabel}
              sub="avg across sold listings" variant={(saleVsGuide ?? 0) >= 1 ? 'success' : 'warning'} />
            <StatCard icon={<Star size={18} />} label="Reviews"
              value={stats?.avg_rating != null ? `${stats.avg_rating.toFixed(1)} ★` : '—'}
              sub={`${stats?.review_count ?? 0} verified review${(stats?.review_count ?? 0) !== 1 ? 's' : ''}`} />
            <StatCard icon={<BarChart3 size={18} />} label="Total enquiries" value={String(stats?.total_enquiries ?? 0)}
              sub={`${stats?.responded_count ?? 0} responded within 24h`} />
          </div>

          {/* Response rate insight */}
          {stats?.response_rate != null && (
            <div className={`rounded-xl border p-4 flex items-start gap-3 ${
              stats.response_rate >= 80 ? 'bg-emerald-500/5 border-emerald-500/20'
              : stats.response_rate >= 50 ? 'bg-amber-500/5 border-amber-500/20'
              : 'bg-destructive/5 border-destructive/20'
            }`}>
              <Award size={20} className={stats.response_rate >= 80 ? 'text-emerald-600' : stats.response_rate >= 50 ? 'text-amber-600' : 'text-destructive'} />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {stats.response_rate >= 80 ? 'Excellent response rate — keep it up'
                    : stats.response_rate >= 50 ? 'Good response rate — room to improve'
                    : 'Low response rate — buyers are waiting'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You responded to {Math.round(stats.response_rate)}% of enquiries within 24 hours over the last 6 months.
                  {stats.response_rate < 80 ? ' Agents who respond within 2 hours receive 3x more inspection bookings.' : ' Buyers receive an instant confidence signal when agents respond quickly.'}
                </p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!stats && !loading && (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <BarChart3 size={40} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No performance data yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Stats will appear once you have listings and enquiries</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
