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

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Pitch A/B Performance
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/pitch-templates">Manage templates</Link>
          </Button>
        </div>
        {ab.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No pitch templates yet. <Link to="/dashboard/pitch-templates" className="text-blue-600 hover:underline">Create at least 2</Link> to start A/B testing your pitches.
            </CardContent>
          </Card>
        ) : (() => {
          const MIN_SENDS = 30;
          const LEAD_PP = 5;
          const eligible = [...ab].filter((r) => Number(r.sends) >= MIN_SENDS)
            .sort((a, b) => Number(b.accept_rate) - Number(a.accept_rate));
          const winnerId = eligible.length >= 2 && (Number(eligible[0].accept_rate) - Number(eligible[1].accept_rate) >= LEAD_PP)
            ? eligible[0].template_id
            : null;
          return (
            <>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="text-left p-3">Template</th>
                          <th className="text-right p-3">Sends</th>
                          <th className="text-right p-3">Accepts</th>
                          <th className="text-right p-3">Dismissed</th>
                          <th className="text-right p-3">Accept rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {ab.map((row) => (
                          <tr key={row.template_id} className={winnerId === row.template_id ? 'bg-emerald-50/60' : ''}>
                            <td className="p-3 font-medium">
                              <span className="inline-flex items-center gap-2">
                                {row.label}
                                {winnerId === row.template_id && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600 text-white">
                                    🏆 Winning
                                  </span>
                                )}
                                {Number(row.sends) < MIN_SENDS && Number(row.sends) > 0 && (
                                  <span className="text-[10px] text-muted-foreground font-normal">
                                    needs {MIN_SENDS - Number(row.sends)} more sends
                                  </span>
                                )}
                              </span>
                              {!row.is_active && <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>}
                            </td>
                            <td className="p-3 text-right">{row.sends}</td>
                            <td className="p-3 text-right text-emerald-700">{row.accepts}</td>
                            <td className="p-3 text-right text-muted-foreground">{row.dismissals}</td>
                            <td className="p-3 text-right font-semibold">{row.accept_rate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              <p className="text-xs text-muted-foreground">
                A template is flagged <strong>Winning</strong> once it has ≥{MIN_SENDS} sends and leads the next-best by ≥{LEAD_PP} percentage points.
              </p>
            </>
          );
        })()}
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Refund rate is the share of unlocks where credits were automatically returned (e.g. the seeker didn't respond within the SLA).
      </p>
    </div>
  );
}
