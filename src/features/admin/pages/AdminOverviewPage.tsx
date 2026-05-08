import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PLAN_PRICE: Record<string, number> = {
  starter: 299,
  pro: 599,
  agency: 1199,
};

interface AgentRow {
  id: string;
  full_name: string | null;
  email: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  is_subscribed: boolean | null;
  created_at: string;
  payment_failed_at: string | null;
}

function StatCard({
  label,
  value,
  sublabel,
  color,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  color?: 'green' | 'blue' | 'red';
}) {
  const accent =
    color === 'green'
      ? 'border-l-emerald-500'
      : color === 'blue'
      ? 'border-l-blue-500'
      : color === 'red'
      ? 'border-l-red-500'
      : 'border-l-transparent';
  return (
    <div className={`rounded-xl border border-border bg-card p-5 border-l-4 ${accent}`}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [agents, setAgents] = useState<AgentRow[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('agents')
        .select(
          'id, full_name, email, subscription_plan, subscription_status, is_subscribed, created_at, payment_failed_at',
        );
      setAgents((data ?? []) as AgentRow[]);
    })();
  }, []);

  if (!agents) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const activeSubscribed = agents.filter(
    (a) => a.is_subscribed && a.subscription_status === 'active',
  );
  const onTrial = agents.filter((a) => !a.is_subscribed);
  const paymentFailed = agents.filter((a) => a.subscription_status === 'payment_failed');
  const locked = agents.filter((a) => a.subscription_status === 'locked');

  const currentMRR = activeSubscribed.reduce(
    (s, a) => s + (PLAN_PRICE[a.subscription_plan ?? 'starter'] ?? 299),
    0,
  );
  const projectedMRR = [...activeSubscribed, ...onTrial].reduce(
    (s, a) => s + (PLAN_PRICE[a.subscription_plan ?? 'starter'] ?? 299),
    0,
  );

  const soonExpiring = onTrial
    .map((a) => {
      const trialEnd = new Date(new Date(a.created_at).getTime() + 60 * 86400000);
      const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / 86400000);
      return { agent: a, daysLeft };
    })
    .filter((x) => x.daysLeft >= 0 && x.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const newThisWeek = agents.filter(
    (a) => (Date.now() - new Date(a.created_at).getTime()) / 86400000 <= 7,
  );

  const planCounts: Record<string, number> = { starter: 0, pro: 0, agency: 0 };
  agents.forEach((a) => {
    if (a.subscription_plan && a.subscription_plan in planCounts) {
      planCounts[a.subscription_plan]++;
    }
  });
  const plans = [
    { label: 'Starter', count: planCounts.starter, price: 299, color: 'bg-slate-400' },
    { label: 'Pro', count: planCounts.pro, price: 599, color: 'bg-blue-500' },
    { label: 'Agency', count: planCounts.agency, price: 1199, color: 'bg-purple-500' },
  ];

  // 30 day signup buckets
  const buckets: { date: Date; label: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    buckets.push({ date: d, label: d.toISOString().slice(0, 10), count: 0 });
  }
  agents.forEach((a) => {
    const ts = new Date(a.created_at);
    ts.setHours(0, 0, 0, 0);
    const b = buckets.find((x) => x.date.getTime() === ts.getTime());
    if (b) b.count++;
  });
  const maxBucket = Math.max(1, ...buckets.map((b) => b.count));

  const atRisk = paymentFailed.length + locked.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          MRR, trial pipeline & growth — derived from agent subscription data.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current MRR"
          value={`$${currentMRR.toLocaleString('en-AU')}`}
          sublabel={`${activeSubscribed.length} active subscriber${activeSubscribed.length === 1 ? '' : 's'}`}
          color="green"
        />
        <StatCard
          label="Projected MRR"
          value={`$${projectedMRR.toLocaleString('en-AU')}`}
          sublabel="If all trials convert"
          color="blue"
        />
        <StatCard
          label="Total agents"
          value={agents.length}
          sublabel={`${newThisWeek.length} new this week`}
        />
        <StatCard
          label="At risk"
          value={atRisk}
          sublabel="Payment failed or locked"
          color={atRisk > 0 ? 'red' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="font-semibold text-sm">Agents by plan</h3>
          {plans.map((plan) => (
            <div key={plan.label} className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {plan.label} (${plan.price}/mo)
                </span>
                <span>
                  {plan.count} agent{plan.count === 1 ? '' : 's'} · $
                  {(plan.count * plan.price).toLocaleString('en-AU')}/mo
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${plan.color} transition-all duration-500`}
                  style={{
                    width: agents.length ? `${(plan.count / agents.length) * 100}%` : '0%',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
          <h3 className="font-semibold text-sm text-amber-900">
            Trials expiring within 7 days ({soonExpiring.length})
          </h3>
          {soonExpiring.length === 0 && (
            <p className="text-xs text-amber-700">No trials expiring soon.</p>
          )}
          {soonExpiring.map(({ agent, daysLeft }) => (
            <div key={agent.id} className="flex items-center justify-between text-sm">
              <span className="text-amber-900 truncate">
                {agent.full_name || agent.email || agent.id}
              </span>
              <span className="text-amber-700 font-medium whitespace-nowrap ml-3">
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Agent signups (last 30 days)</h3>
          <span className="text-xs text-muted-foreground">
            {buckets.reduce((s, b) => s + b.count, 0)} total
          </span>
        </div>
        <div className="flex items-end gap-0.5 h-24">
          {buckets.map((b) => (
            <div
              key={b.label}
              title={`${b.label}: ${b.count} signup${b.count === 1 ? '' : 's'}`}
              className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-sm transition-colors"
              style={{ height: `${(b.count / maxBucket) * 100}%`, minHeight: '2px' }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{buckets[0].label}</span>
          <span>{buckets[buckets.length - 1].label}</span>
        </div>
      </div>
    </div>
  );
}
