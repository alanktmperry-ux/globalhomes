import "../_shared/email-footer.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const APP_URL = 'https://globalhomes.lovable.app';
const FROM = 'ListHQ <onboarding@resend.dev>';

const TIMEFRAME_LABELS: Record<string, string> = {
  ready_now: 'Ready now',
  '3_to_6_months': '3 to 6 months',
  '6_to_12_months': '6 to 12 months',
  exploring: 'Just exploring',
};

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

    // 4) Rent roll → Halo invite (lease ends in 88-92 days)
    const inviteResults = { rent_roll_invites: 0, suburb_digests: 0 };
    const minLeaseEnd = new Date(Date.now() + 88 * 86400000).toISOString().slice(0, 10);
    const maxLeaseEnd = new Date(Date.now() + 92 * 86400000).toISOString().slice(0, 10);
    const { data: leases } = await admin
      .from('tenancies')
      .select('id, tenant_name, tenant_email, lease_end, property_id')
      .eq('halo_invite_sent', false)
      .gte('lease_end', minLeaseEnd)
      .lte('lease_end', maxLeaseEnd);

    for (const t of leases ?? []) {
      if (!t.tenant_email) continue;
      let address = '';
      if (t.property_id) {
        const { data: prop } = await admin
          .from('properties')
          .select('address')
          .eq('id', t.property_id)
          .maybeSingle();
        address = prop?.address ?? '';
      }
      const leaseEndDate = new Date(t.lease_end).toLocaleDateString('en-AU');
      const name = t.tenant_name ?? 'there';
      if (resendKey) {
        await sendEmail(resendKey, t.tenant_email,
          'Your lease ends soon — what are you looking for next?',
          emailShell(
            `<h1 style="font-size:22px;margin:0 0 12px;">Hi ${name},</h1>` +
            `<p style="font-size:15px;line-height:1.5;">Your lease at <strong>${address || 'your current property'}</strong> ends on <strong>${leaseEndDate}</strong>.</p>` +
            `<p style="font-size:15px;line-height:1.5;">Whether you're looking to rent again or ready to buy, post a free Halo on ListHQ and let agents come to you with options.</p>` +
            `<p style="font-size:14px;line-height:1.6;color:#334155;">It takes 2 minutes and it's completely free.</p>` +
            btn(`${APP_URL}/halo/new?source_type=rent_roll`, 'Post my Halo →')
          )
        );
      }
      await admin.from('tenancies').update({ halo_invite_sent: true }).eq('id', t.id);
      inviteResults.rent_roll_invites++;
    }

    // 5) Suburb intelligence daily digest
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const { data: recentHalos } = await admin
      .from('halos')
      .select('id, intent, suburbs, budget_min, budget_max, timeframe, quality_score, created_at')
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString());

    if (recentHalos && recentHalos.length > 0) {
      // Get all distinct agent_ids from active properties
      const { data: agentRows } = await admin
        .from('properties')
        .select('agent_id, suburb')
        .eq('is_active', true)
        .not('agent_id', 'is', null);

      const agentSuburbs = new Map<string, Set<string>>();
      for (const r of agentRows ?? []) {
        if (!r.agent_id || !r.suburb) continue;
        if (!agentSuburbs.has(r.agent_id)) agentSuburbs.set(r.agent_id, new Set());
        agentSuburbs.get(r.agent_id)!.add(r.suburb);
      }

      for (const [agentId, suburbs] of agentSuburbs.entries()) {
        // Skip if digest already sent today
        const { data: alreadySent } = await admin
          .from('halo_suburb_digests')
          .select('id')
          .eq('agent_id', agentId)
          .gte('sent_at', todayStart.toISOString())
          .maybeSingle();
        if (alreadySent) continue;

        const matching = recentHalos.filter((h: any) =>
          (h.suburbs ?? []).some((s: string) => suburbs.has(s))
        );
        if (matching.length === 0) continue;

        const { data: agentUser } = await admin.auth.admin.getUserById(agentId);
        const agentEmail = agentUser?.user?.email;
        if (!agentEmail || !resendKey) continue;

        const items = matching.map((h: any) => {
          const sub = (h.suburbs ?? []).join(', ');
          const hasMin = h.budget_min != null && Number(h.budget_min) > 0;
          const hasMax = h.budget_max != null && Number(h.budget_max) > 0;
          const minStr = `$${Number(h.budget_min).toLocaleString('en-AU')}`;
          const maxStr = `$${Number(h.budget_max).toLocaleString('en-AU')}`;
          const budget = hasMin && hasMax ? `AUD ${minStr} – ${maxStr}`
            : hasMax ? `Up to AUD ${maxStr}`
            : hasMin ? `From AUD ${minStr}`
            : 'Budget not specified';
          const tf = TIMEFRAME_LABELS[h.timeframe] ?? h.timeframe;
          const q = h.quality_score != null ? ` · Quality: ${h.quality_score}/100` : '';
          return `<li style="margin:8px 0;"><strong>${h.intent === 'buy' ? 'Buy' : 'Rent'}</strong> · ${sub} · ${budget} · ${tf}${q}</li>`;
        }).join('');

        await sendEmail(resendKey, agentEmail,
          `${matching.length} new Halo${matching.length === 1 ? '' : 's'} in your listing suburbs today`,
          emailShell(
            `<h1 style="font-size:22px;margin:0 0 12px;">${matching.length} new Halo${matching.length === 1 ? '' : 's'} in your suburbs</h1>` +
            `<p style="font-size:15px;line-height:1.5;">You have ${matching.length} new Halo${matching.length === 1 ? '' : 's'} in suburbs where you have active listings.</p>` +
            `<ul style="font-size:14px;line-height:1.6;color:#334155;padding-left:18px;">${items}</ul>` +
            `<p style="font-size:14px;line-height:1.6;color:#334155;">Each Halo costs 1 credit to unlock.</p>` +
            btn(`${APP_URL}/dashboard/halo-board`, 'View Halo Board →')
          )
        );

        await admin.from('halo_suburb_digests').insert({
          agent_id: agentId,
          halo_count: matching.length,
        });
        inviteResults.suburb_digests++;
      }
    }

    return new Response(JSON.stringify({ ok: true, ...results, ...inviteResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});