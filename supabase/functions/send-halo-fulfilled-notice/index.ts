import "../_shared/email-footer.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const APP_URL = Deno.env.get('APP_URL') ?? 'https://listhq.com.au';
// NOTE: Falls back to onboarding@resend.dev until listhq.com.au DNS is verified in Resend.
const FROM = 'ListHQ <noreply@listhq.com.au>';

async function sendEmail(resendKey: string, to: string, subject: string, html: string) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!resp.ok) console.error('Resend error', await resp.text());
}

const fmt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-AU'));

const formatBudget = (min: number | null | undefined, max: number | null | undefined) => {
  const hasMin = min != null && Number(min) > 0;
  const hasMax = max != null && Number(max) > 0;
  if (hasMin && hasMax) return `AUD $${Number(min).toLocaleString('en-AU')} – $${Number(max).toLocaleString('en-AU')}`;
  if (hasMax) return `Up to AUD $${Number(max).toLocaleString('en-AU')}`;
  if (hasMin) return `From AUD $${Number(min).toLocaleString('en-AU')}`;
  return 'Budget not specified';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { halo_id } = await req.json();
    if (!halo_id) {
      return new Response(JSON.stringify({ error: 'Missing halo_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const resendKey = Deno.env.get('RESEND_API_KEY');

    const { data: halo } = await admin.from('halos').select('*').eq('id', halo_id).maybeSingle();
    if (!halo) {
      return new Response(JSON.stringify({ error: 'Halo not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (userRes.user.id !== (halo as any).seeker_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const intentLabel = halo.intent === 'buy' ? 'Buy' : 'Rent';
    const suburbsLabel = (halo.suburbs ?? []).join(', ') || '—';
    const budgetLabel = formatBudget(halo.budget_min, halo.budget_max);
    const summary = `${intentLabel} · ${suburbsLabel} · ${budgetLabel}`;

    // Notify seeker
    const { data: seekerUser } = await admin.auth.admin.getUserById(halo.seeker_id);
    const seekerEmail = seekerUser?.user?.email;
    if (seekerEmail && resendKey) {
      await sendEmail(resendKey, seekerEmail,
        'Congratulations — your Halo is marked as fulfilled',
        `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;"><h1 style="font-size:22px;margin:0 0 12px;">Congratulations!</h1><p style="font-size:15px;line-height:1.5;">Great news! We've notified the agents who responded. We hope you love your new property.</p><p style="margin:24px 0;"><a href="${APP_URL}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Visit ListHQ →</a></p></div>`);
    }

    // Notify each agent who unlocked
    const { data: responses } = await admin.from('halo_responses').select('agent_id').eq('halo_id', halo_id);
    const agentIds = Array.from(new Set((responses ?? []).map((r: any) => r.agent_id)));
    let notified = 0;
    for (const agentId of agentIds) {
      const { data: u } = await admin.auth.admin.getUserById(agentId);
      const email = u?.user?.email;
      if (!email || !resendKey) continue;
      await sendEmail(resendKey, email,
        'A Halo you responded to has been fulfilled',
        `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;"><h1 style="font-size:22px;margin:0 0 12px;">A Halo has been fulfilled</h1><p style="font-size:15px;line-height:1.5;">The seeker whose Halo you unlocked on ListHQ has found their property.</p><div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:20px 0;"><p style="margin:0;"><strong>Halo summary:</strong></p><p style="margin:8px 0 0;">${summary}</p></div><p style="font-size:14px;color:#64748b;">This Halo is now closed. Thank you for using ListHQ.</p></div>`);
      notified++;
    }

    return new Response(JSON.stringify({ ok: true, agents_notified: notified }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});