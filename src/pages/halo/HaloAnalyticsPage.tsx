import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Loader2, Sparkles, TrendingUp, Coins, RotateCcw, Clock, CheckCircle2, FlaskConical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface Metrics {
  unlocks: number;
  pitched: number;
  accepted: number;
  accept_rate: number;
  credits_spent: number;
  refunds: number;
  credits_refunded: number;
  refund_rate: number;
  avg_hours_to_accept: number;
}

function StatCard({
  icon: Icon, label, value, hint, accent = 'text-primary',
}: { icon: any; label: string; value: string; hint?: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <Icon className={`h-4 w-4 ${accent}`} />
        </div>
        <p className="text-3xl font-bold mt-2">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

interface AbRow {
  template_id: string;
  label: string;
  is_active: boolean;
  sends: number;
  accepts: number;
  dismissals: number;
  accept_rate: number;
}

export default function HaloAnalyticsPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [ab, setAb] = useState<AbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [m, a] = await Promise.all([
          supabase.rpc('get_agent_halo_analytics', { _agent_id: user.id }),
          supabase.rpc('get_agent_pitch_ab_stats', { _agent_id: user.id }),
        ]);
        if (m.error) throw m.error;
        setMetrics(m.data as unknown as Metrics);
        if (!a.error) setAb((a.data as unknown as AbRow[]) || []);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">Could not load analytics: {error ?? 'no data'}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Helmet>
        <title>My Halo Analytics | ListHQ</title>
        <meta name="description" content="Track your Halo Board performance — unlocks, pitches, acceptance rate, credits spent and refunds." />
      </Helmet>

      <header>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          My Halo Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your personal performance across the Halo Board.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <StatCard
          icon={Sparkles}
          label="Halos Unlocked"
          value={String(metrics.unlocks)}
          hint="Buyers you contacted"
        />
        <StatCard
          icon={TrendingUp}
          label="Pitches Sent"
          value={String(metrics.pitched)}
        />
        <StatCard
          icon={CheckCircle2}
          label="Accepted"
          value={String(metrics.accepted)}
          accent="text-emerald-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Accept Rate"
          value={`${metrics.accept_rate}%`}
          hint={`${metrics.accepted} of ${metrics.pitched} pitches`}
          accent="text-emerald-600"
        />
        <StatCard
          icon={Coins}
          label="Credits Spent"
          value={String(metrics.credits_spent)}
        />
        <StatCard
          icon={RotateCcw}
          label="Auto-Refunds"
          value={`${metrics.refunds}`}
          hint={`${metrics.credits_refunded} credits returned · ${metrics.refund_rate}% rate`}
          accent="text-amber-600"
        />
      </section>

      <section>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Avg Time to Acceptance
              </p>
              <p className="text-xl font-semibold">
                {metrics.avg_hours_to_accept > 0
                  ? `${metrics.avg_hours_to_accept} hours`
                  : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground">
        Refund rate is the share of unlocks where credits were automatically returned (e.g. the seeker didn't respond within the SLA).
      </p>
    </div>
  );
}
