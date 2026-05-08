import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';
import { CheckCircle2, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
}

export function useOnboardingSteps() {
  const { agent } = useCurrentAgent();
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agent) return;
    let cancelled = false;

    (async () => {
      const agentId = agent.id;

      // Fetch full agent profile fields
      const { data: full } = await supabase
        .from('agents')
        .select('name, license_number, bio, service_areas, subscription_plan')
        .eq('id', agentId)
        .maybeSingle();

      const profileDone = !!(
        (full as any)?.name &&
        (full as any)?.license_number &&
        (full as any)?.bio &&
        ((full as any)?.service_areas?.length ?? 0) > 0
      );

      const { count: listingCount } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agentId);
      const listingDone = (listingCount ?? 0) > 0;

      let multilingualDone = false;
      if (listingDone) {
        const { data: listings } = await supabase
          .from('properties')
          .select('translations')
          .eq('agent_id', agentId)
          .not('translations', 'is', null)
          .limit(1);
        multilingualDone = (listings ?? []).some(
          (l: any) => l.translations && Object.keys(l.translations).length > 0,
        );
      }

      const { count: contactCount } = await (supabase as any)
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agentId);
      const crmDone = (contactCount ?? 0) > 0;

      const plan = (full as any)?.subscription_plan ?? 'starter';
      const needsTrust = plan === 'pro' || plan === 'agency';
      let trustDone = !needsTrust;
      if (needsTrust) {
        const { count: trustCount } = await supabase
          .from('trust_receipts')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', agentId);
        trustDone = (trustCount ?? 0) > 0;
      }

      const built: Step[] = [
        {
          id: 'profile',
          label: 'Complete your profile',
          description: 'Add your name, licence, bio and suburbs',
          href: '/dashboard/profile',
          done: profileDone,
        },
        {
          id: 'listing',
          label: 'Add your first listing',
          description: 'Then generate a multilingual version in 60 seconds',
          href: '/dashboard/listings/new',
          done: listingDone && multilingualDone,
        },
        {
          id: 'crm',
          label: 'Import your contacts',
          description: 'Add clients to your CRM',
          href: '/dashboard/crm',
          done: crmDone,
        },
        ...(needsTrust
          ? [
              {
                id: 'trust',
                label: 'Set up trust accounting',
                description: 'Record your first receipt or payment',
                href: '/dashboard/trust',
                done: trustDone,
              },
            ]
          : []),
      ];

      if (!cancelled) {
        setSteps(built);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [agent]);

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = steps.length > 0 && completedCount === steps.length;

  return { steps, loading, completedCount, allDone };
}

export function AgentOnboardingProgress() {
  const { steps, loading, completedCount, allDone } = useOnboardingSteps();

  if (loading || allDone || steps.length === 0) return null;

  const pct = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Getting started</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedCount} of {steps.length} steps complete
          </p>
        </div>
        <span className="text-sm font-semibold text-primary">{pct}%</span>
      </div>

      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              to={step.href}
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-accent/40 transition-colors',
                step.done && 'opacity-60',
              )}
            >
              {step.done ? (
                <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 shrink-0" />
              ) : (
                <Circle size={18} className="text-muted-foreground mt-0.5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-sm font-medium text-foreground',
                    step.done && 'line-through',
                  )}
                >
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
