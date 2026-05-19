// Sprint 4: Auto-refund credits when seekers don't engage with an agent's pitch within 7 days.
// Refund criteria (per halo_response):
//   - unlocked_at <= now() - 7 days
//   - accepted IS NULL (not accepted)
//   - dismissed_by_seeker IS NOT TRUE
//   - outcome IS NULL (not yet finalised)
//   - no seeker reply in halo_messages
// Action: mark outcome='unresponsive', credit +1 to agent, log transaction (type='refund'), email agent.
import "../_shared/email-footer.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { translateEmailPayload, resolveRecipientLocale } from '../_shared/translateEmailPayload.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const APP_URL = Deno.env.get('APP_URL') ?? 'https://listhq.com.au';
const FROM = 'ListHQ <hello@listhq.com.au>';

async function sendEmail(resendKey: string, to: string, subject: string, html: string, userId?: string) {
  const recipientLocale = await resolveRecipientLocale({ userId, email: to });
  let translated;
  try {
    translated = await translateEmailPayload({ subject, body: html, isHtml: true, sourceLang: 'en' }, recipientLocale);
  } catch (e) {
    console.error('translate failed', e);
    translated = { subject, body: html, wasTranslated: false, sourceLang: 'en', targetLang: recipientLocale, cached: false };
  }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject: translated.subject, html: translated.body }),
  });
  if (!resp.ok) console.error('resend error', await resp.text());
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const result = { refunded: 0, skipped: 0, errors: 0 };

  try {
    const { data: stale } = await admin
      .from('halo_responses')
      .select('id, halo_id, agent_id, unlocked_at, accepted, dismissed_by_seeker, outcome')
      .lte('unlocked_at', sevenDaysAgo)
      .is('accepted', null)
      .is('outcome', null)
      .limit(500);

    for (const r of stale ?? []) {
      if (r.dismissed_by_seeker) { result.skipped++; continue; }

      // Skip if seeker has sent any message
      const { count: seekerMsgs } = await admin
        .from('halo_messages')
        .select('id', { count: 'exact', head: true })
        .eq('halo_response_id', r.id)
        .eq('sender_type', 'seeker');
      if ((seekerMsgs ?? 0) > 0) { result.skipped++; continue; }

      // Mark response as unresponsive
      const { error: upErr } = await admin
        .from('halo_responses')
        .update({ outcome: 'unresponsive' })
        .eq('id', r.id);
      if (upErr) { console.error('update failed', upErr); result.errors++; continue; }

      // Refund 1 credit
      const { data: balRow } = await admin
        .from('halo_credits')
        .select('balance')
        .eq('agent_id', r.agent_id)
        .maybeSingle();
      const newBalance = (balRow?.balance ?? 0) + 1;
      await admin
        .from('halo_credits')
        .upsert({ agent_id: r.agent_id, balance: newBalance, updated_at: new Date().toISOString() }, { onConflict: 'agent_id' });
      await admin.from('halo_credit_transactions').insert({
        agent_id: r.agent_id,
        amount: 1,
        type: 'refund',
        halo_id: r.halo_id,
        note: 'Auto-refund: seeker did not respond within 7 days',
      });

      // Notify agent
      if (resendKey) {
        const { data: u } = await admin.auth.admin.getUserById(r.agent_id);
        const email = u?.user?.email;
        if (email) {
          const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
            <h1 style="font-size:22px;margin:0 0 12px;">We've refunded 1 Halo credit</h1>
            <p style="font-size:15px;line-height:1.5;">A seeker you pitched 7 days ago hasn't responded, so we've returned the credit to your balance.</p>
            <p style="font-size:14px;line-height:1.6;color:#334155;">Your new balance: <strong>${newBalance}</strong> credits.</p>
            <p style="margin:24px 0;"><a href="${APP_URL}/dashboard/halo-board" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">View Halo Board →</a></p>
            <p style="font-size:12px;color:#64748b;margin-top:32px;">— The ListHQ team</p>
          </div>`;
          await sendEmail(resendKey, email, "We've refunded a Halo credit", html, r.agent_id);
        }
      }
      result.refunded++;
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
