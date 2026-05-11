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
    <div
      className="bg-white rounded-[12px] p-6 mb-8 space-y-4"
      style={{ border: '1px solid #E5E7EB' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#0a0f1e]">Getting started</h3>
          <p className="text-sm font-light text-[#6B7280] mt-0.5">
            {completedCount} of {steps.length} steps complete
          </p>
        </div>
        <span className="text-sm font-semibold text-[#2563EB]">{pct}%</span>
      </div>

      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, background: '#2563EB' }}
        />
      </div>

      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              to={step.href}
              className={cn(
                'flex items-start gap-3 p-3 rounded-[10px] transition-colors hover:bg-[#F3F4F6]',
                step.done && 'opacity-70',
              )}
            >
              {step.done ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" style={{ color: '#34D399' }} />
              ) : (
                <span
                  className="h-[18px] w-[18px] rounded-full shrink-0 mt-0.5"
                  style={{ border: '2px solid #E5E7EB' }}
                />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn('text-sm font-medium text-[#0a0f1e]', step.done && 'line-through text-[#6B7280]')}
                >
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-xs mt-0.5 text-[#6B7280]">{step.description}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
