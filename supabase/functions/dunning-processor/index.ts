// Daily dunning processor — escalates failed-payment agents through day1 → day3 → day7 → day14_suspended.
// Trigger: pg_cron (daily). Idempotent — safe to re-run.
// Auth: requires service-role JWT (called by cron) OR admin user (manual run from UI).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

const STAGE_ORDER = ['none', 'day1', 'day3', 'day7', 'day14_suspended'] as const;
type Stage = typeof STAGE_ORDER[number];

function nextStage(currentStage: Stage, daysSinceFailure: number): Stage | null {
  if (daysSinceFailure >= 14) return 'day14_suspended';
  if (daysSinceFailure >= 7) return 'day7';
  if (daysSinceFailure >= 3) return 'day3';
  if (daysSinceFailure >= 1) return 'day1';
  return null;
}

async function authorise(req: Request): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return { ok: false, status: 401, error: 'Unauthorized' };
  const token = authHeader.replace('Bearer ', '').trim();

  // Service-role key path (cron)
  if (token === SERVICE_ROLE) return { ok: true };

  // Admin-user path (manual run)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: userData } = await supabase.auth.getUser(token);
  if (!userData?.user) return { ok: false, status: 401, error: 'Unauthorized' };
  const { data: roleCheck } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .eq('role', 'admin')
    .maybeSingle();
  if (!roleCheck) return { ok: false, status: 403, error: 'Forbidden' };
  return { ok: true };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const auth = await authorise(req);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: agents, error } = await admin
      .from('agents')
      .select('id, name, email, payment_failed_at, dunning_stage, dunning_last_email_at, suspended_at')
      .not('payment_failed_at', 'is', null)
      .neq('dunning_stage', 'none');

    if (error) return json({ error: error.message }, 500);

    const now = Date.now();
    const results: any[] = [];

    for (const a of agents || []) {
      const failedAt = a.payment_failed_at ? new Date(a.payment_failed_at).getTime() : 0;
      const days = Math.floor((now - failedAt) / 86400000);
      const target = nextStage((a.dunning_stage || 'none') as Stage, days);
      if (!target) continue;

      const currentIdx = STAGE_ORDER.indexOf((a.dunning_stage || 'none') as Stage);
      const targetIdx = STAGE_ORDER.indexOf(target);
      if (targetIdx <= currentIdx) {
        results.push({ agent_id: a.id, action: 'noop', reason: 'already_at_or_past_target', stage: a.dunning_stage });
        continue;
      }

      // Advance the stage
      const updates: Record<string, unknown> = { dunning_stage: target };
      if (target === 'day14_suspended') {
        updates.suspended_at = new Date().toISOString();
        updates.is_subscribed = false;
        updates.subscription_status = 'suspended';
      }
      await admin.from('agents').update(updates).eq('id', a.id);

      await admin.from('dunning_events').insert({
        agent_id: a.id,
        event_type: target === 'day14_suspended' ? 'suspended' : 'manual_action',
        stage: target,
        details: { days_since_failure: days, prior_stage: a.dunning_stage },
      });

      // Send the recovery email for this stage
      try {
        const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-dunning-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SERVICE_ROLE}`,
          },
          body: JSON.stringify({ agent_id: a.id, stage: target }),
        });
        const emailJson = await emailRes.json().catch(() => ({}));
        results.push({ agent_id: a.id, action: 'advanced', from: a.dunning_stage, to: target, days, email: emailJson });
      } catch (e) {
        console.error('[dunning-processor] email send failed', e);
        results.push({ agent_id: a.id, action: 'advanced_email_failed', from: a.dunning_stage, to: target, days });
      }
    }

    return json({ ok: true, processed: results.length, results });
  } catch (err) {
    console.error('[dunning-processor] error', err);
    return json({ error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});
