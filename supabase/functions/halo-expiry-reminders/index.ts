import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const APP_URL = 'https://globalhomes.lovable.app';
const FROM = 'ListHQ <onboarding@resend.dev>';

async function sendEmail(resendKey: string, to: string, subject: string, html: string) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!resp.ok) console.error('Resend error', await resp.text());
}

function emailShell(body: string): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">${body}<p style="font-size: 12px; color: #64748b; margin-top: 32px;">— The ListHQ team</p></div>`;
}

function btn(href: string, label: string) {
  return `<p style="margin: 24px 0;"><a href="${href}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">${label}</a></p>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const results = { reminded: 0, expired: 0, no_response_alerts: 0 };

  try {
    // 1) 14-day reminder
    const { data: dueReminder } = await admin
      .from('halos')
      .select('*')
      .eq('status', 'active')
      .eq('expiry_reminder_sent', false)
      .gte('expires_at', new Date().toISOString())
      .lte('expires_at', new Date(Date.now() + 14 * 86400000).toISOString());

    for (const h of dueReminder ?? []) {
      const { data: u } = await admin.auth.admin.getUserById(h.seeker_id);
      const email = u?.user?.email;
      if (email && resendKey) {
        const date = new Date(h.expires_at).toLocaleDateString('en-AU');
        await sendEmail(resendKey, email,
          'Your Halo expires in 14 days — renew to stay visible',
          emailShell(`<h1 style="font-size:22px;margin:0 0 12px;">Your Halo expires soon</h1><p style="font-size:15px;line-height:1.5;">Your Halo on ListHQ expires on <strong>${date}</strong>. Renew it from your dashboard to stay visible to agents.</p>${btn(`${APP_URL}/dashboard/my-halos`, 'Manage my Halo →')}`));
      }
      await admin.from('halos').update({ expiry_reminder_sent: true }).eq('id', h.id);
      results.reminded++;
    }

    // 2) Expiry processing
    const { data: toExpire } = await admin
      .from('halos')
      .select('*')
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

    for (const h of toExpire ?? []) {
      await admin.from('halos').update({ status: 'expired' }).eq('id', h.id);
      const { data: u } = await admin.auth.admin.getUserById(h.seeker_id);
      const email = u?.user?.email;
      if (email && resendKey) {
        const date = new Date(h.expires_at).toLocaleDateString('en-AU');
        await sendEmail(resendKey, email,
          'Your Halo has expired',
          emailShell(`<h1 style="font-size:22px;margin:0 0 12px;">Your Halo has expired</h1><p style="font-size:15px;line-height:1.5;">Your Halo expired on <strong>${date}</strong>. Repost from your dashboard to get back in front of agents.</p>${btn(`${APP_URL}/dashboard/my-halos`, 'Repost my Halo →')}`));
      }
      results.expired++;
    }

    // 3) No-response alert (>7 days, no halo_responses)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: stale } = await admin
      .from('halos')
      .select('*')
      .eq('status', 'active')
      .eq('no_response_alert_sent', false)
      .lt('created_at', sevenDaysAgo);

    for (const h of stale ?? []) {
      const { count } = await admin
        .from('halo_responses')
        .select('id', { count: 'exact', head: true })
        .eq('halo_id', h.id);
      if ((count ?? 0) > 0) continue;

      const { data: u } = await admin.auth.admin.getUserById(h.seeker_id);
      const email = u?.user?.email;
      if (email && resendKey) {
        await sendEmail(resendKey, email,
          "Your Halo hasn't had any agent responses yet",
          emailShell(`<h1 style="font-size:22px;margin:0 0 12px;">Let's get more agents seeing your Halo</h1><p style="font-size:15px;line-height:1.5;">Your Halo has been live for 7 days with no agent responses yet.</p><p style="font-size:15px;line-height:1.5;"><strong>Here are some tips to attract more agents:</strong></p><ul style="font-size:14px;line-height:1.6;color:#334155;"><li>Add more suburbs — wider search area = more visibility</li><li>Widen your budget range if possible</li><li>Add a description — agents respond more to detailed Halos</li><li>Make sure your finance status is up to date</li></ul>${btn(`${APP_URL}/dashboard/my-halos`, 'Update my Halo →')}`));
      }
      await admin.from('halos').update({ no_response_alert_sent: true }).eq('id', h.id);
      results.no_response_alerts++;
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
