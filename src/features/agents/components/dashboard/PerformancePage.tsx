import { useAgentPerformanceStats } from '@/features/agents/hooks/useAgentPerformanceStats';
import { useAuth } from '@/features/auth/AuthProvider';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Home, TrendingUp, MessageSquare, Clock, Star, Target, BarChart3, Award,
} from 'lucide-react';

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

export default function PerformancePage() {
  const { user } = useAuth();
  const { stats, loading, agentId } = useAgentPerformanceStats();

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-[1400px] space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
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

  const responseVariant = (stats?.response_rate ?? 0) >= 80
    ? 'success' as const
    : (stats?.response_rate ?? 0) >= 50
    ? 'warning' as const
    : 'danger' as const;

  const timeVariant = (stats?.avg_response_hours ?? 999) <= 2
    ? 'success' as const
    : (stats?.avg_response_hours ?? 999) <= 12
    ? 'warning' as const
    : 'danger' as const;

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Your Performance</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Stats updated on demand · Last calculated{' '}
          {stats?.calculated_at
            ? new Date(stats.calculated_at).toLocaleString('en-AU', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })
            : '—'}
        </p>
      </div>

      {/* Top KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Home size={18} />}
          label="Active listings"
          value={String(stats?.active_listings ?? 0)}
          sub={`${stats?.total_listings ?? 0} total`}
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Properties sold"
          value={String(stats?.sold_listings ?? 0)}
          sub={stats?.avg_days_to_sale
            ? `avg ${Math.round(stats.avg_days_to_sale)} days to sale`
            : 'last 24 months'}
          variant="success"
        />
        <StatCard
          icon={<MessageSquare size={18} />}
          label="Response rate"
          value={stats?.response_rate != null ? `${Math.round(stats.response_rate)}%` : '—'}
          sub="within 24 hours"
          variant={responseVariant}
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Avg reply time"
          value={formatResponseTime(stats?.avg_response_hours ?? null)}
          sub="median first response"
          variant={timeVariant}
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          icon={<Target size={18} />}
          label="Sale vs price guide"
          value={saleVsGuideLabel}
          sub="avg across sold listings"
          variant={(saleVsGuide ?? 0) >= 1 ? 'success' : 'warning'}
        />
        <StatCard
          icon={<Star size={18} />}
          label="Reviews"
          value={stats?.avg_rating != null ? `${stats.avg_rating.toFixed(1)} ★` : '—'}
          sub={`${stats?.review_count ?? 0} verified review${(stats?.review_count ?? 0) !== 1 ? 's' : ''}`}
        />
        <StatCard
          icon={<BarChart3 size={18} />}
          label="Total enquiries"
          value={String(stats?.total_enquiries ?? 0)}
          sub={`${stats?.responded_count ?? 0} responded within 24h`}
        />
      </div>

      {/* Response rate insight */}
      {stats?.response_rate != null && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${
          stats.response_rate >= 80
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : stats.response_rate >= 50
            ? 'bg-amber-500/5 border-amber-500/20'
            : 'bg-destructive/5 border-destructive/20'
        }`}>
          <Award size={20} className={
            stats.response_rate >= 80 ? 'text-emerald-600'
            : stats.response_rate >= 50 ? 'text-amber-600'
            : 'text-destructive'
          } />
          <div>
            <p className="text-sm font-medium text-foreground">
              {stats.response_rate >= 80
                ? 'Excellent response rate — keep it up'
                : stats.response_rate >= 50
                ? 'Good response rate — room to improve'
                : 'Low response rate — buyers are waiting'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You responded to {Math.round(stats.response_rate)}% of enquiries within 24 hours
              over the last 6 months.
              {stats.response_rate < 80
                ? ' Agents who respond within 2 hours receive 3x more inspection bookings.'
                : ' Buyers receive an instant confidence signal when agents respond quickly.'}
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!stats && !loading && (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <BarChart3 size={40} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No performance data yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Stats will appear once you have listings and enquiries
          </p>
        </div>
      )}
    </div>
  );
}
