// Sends a dunning recovery email for a specific stage.
// Contract: POST { agent_id: string, stage: 'day1' | 'day3' | 'day7' | 'day14_suspended' }
// Caller: dunning-processor (service-role) or admin manual action.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { renderEmail, buildUnsubscribeToken } from '../_shared/email-frame.ts';

const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'ListHQ <hello@listhq.com.au>';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://listhq.com.au';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

type Stage = 'day1' | 'day3' | 'day7' | 'day14_suspended';

function content(stage: Stage, agentName: string) {
  const billingUrl = `${APP_URL}/dashboard/billing`;
  switch (stage) {
    case 'day1':
      return {
        subject: 'Payment failed — please update your card',
        hero: 'We couldn\'t process your subscription payment',
        body: `Hi ${agentName}, your most recent ListHQ subscription charge was declined by your bank. Your account and listings are still live — please update your card within the next few days to avoid any interruption.`,
        bullets: [
          'Most failures are due to expired or replaced cards',
          'Updating takes about 30 seconds',
          'We\'ll automatically retry the charge once your card is updated',
        ],
        cta: 'Update payment method',
      };
    case 'day3':
      return {
        subject: 'Reminder: payment still failing on your ListHQ account',
        hero: 'Your card is still being declined',
        body: `Hi ${agentName}, it\'s been 3 days since your subscription payment failed. Your listings are still visible to buyers, but we will need to take action soon if the payment isn\'t recovered.`,
        bullets: [
          'Day 7: a final reminder will go out',
          'Day 14: listings will be paused and the account suspended',
          'Restoring after suspension is instant once payment succeeds',
        ],
        cta: 'Update payment method',
      };
    case 'day7':
      return {
        subject: 'Final notice — listings will be paused in 7 days',
        hero: 'Final notice before suspension',
        body: `Hi ${agentName}, your subscription has been past due for 7 days. To prevent your listings being removed from public view and your team losing dashboard access, please update your card today.`,
        bullets: [
          'Suspension will trigger automatically on day 14',
          'All current listings, leads, and Halo matches stay safe — they just become hidden',
          'A single successful payment restores everything instantly',
        ],
        cta: 'Update payment method now',
      };
    case 'day14_suspended':
      return {
        subject: 'Your ListHQ account has been suspended',
        hero: 'Account suspended due to non-payment',
        body: `Hi ${agentName}, after 14 days of failed payment attempts your ListHQ account has been suspended. Your data is preserved — listings are hidden from buyers, dashboard access is read-only, and Halo matching is paused. Update your card to restore access immediately.`,
        bullets: [
          'All listings, leads, and historical data are preserved',
          'Restoration is automatic the moment a charge succeeds',
          'Need help? Reply to this email and we\'ll work it out',
        ],
        cta: 'Restore my account',
      };
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (!RESEND_KEY) return json({ ok: false, reason: 'resend_not_configured' });

    const { agent_id, stage } = await req.json().catch(() => ({}));
    if (!agent_id || !stage) return json({ error: 'Missing agent_id or stage' }, 400);
    if (!['day1', 'day3', 'day7', 'day14_suspended'].includes(stage)) {
      return json({ error: 'Invalid stage' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: agent } = await admin
      .from('agents')
      .select('id, name, email, user_id')
      .eq('id', agent_id)
      .maybeSingle();
    if (!agent || !agent.email) return json({ ok: false, reason: 'agent_not_found' });

    const c = content(stage as Stage, agent.name?.split(' ')[0] || 'there');
    const unsubToken = await buildUnsubscribeToken(agent.user_id || agent.id, 'billing');
    const unsubscribeLink = `${SUPABASE_URL}/functions/v1/unsubscribe?t=${unsubToken}`;
    const ctaLink = `${APP_URL}/dashboard/billing`;

    const rendered = renderEmail({
      subject: c.subject,
      hero: c.hero,
      body: c.body,
      bulletList: c.bullets,
      cta: c.cta,
      ctaLink,
      disclaimer: 'You\'re receiving this because your ListHQ subscription payment failed. Billing notices cannot be unsubscribed from while a payment is overdue.',
      unsubscribeLink,
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [agent.email],
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[send-dunning-email] Resend failed', errText);
      await admin.from('dunning_events').insert({
        agent_id: agent.id,
        event_type: 'email_sent',
        stage,
        details: { ok: false, error: errText },
      });
      return json({ ok: false, reason: 'send_failed', detail: errText }, 502);
    }

    await admin.from('agents').update({
      dunning_last_email_at: new Date().toISOString(),
    }).eq('id', agent.id);

    await admin.from('dunning_events').insert({
      agent_id: agent.id,
      event_type: 'email_sent',
      stage,
      details: { ok: true, recipient: agent.email },
    });

    return json({ ok: true });
  } catch (err) {
    console.error('[send-dunning-email] error', err);
    return json({ error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});
