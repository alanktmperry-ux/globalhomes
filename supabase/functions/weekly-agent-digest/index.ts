// Weekly performance digest for agents.
// Scheduled via pg_cron — Mondays 8am AEST (Sun 22:00 UTC).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const APP_URL = Deno.env.get('APP_URL') ?? 'https://listhq.com.au';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'ListHQ <noreply@listhq.com.au>';

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping send to', to);
    return { ok: false };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });
  return { ok: res.ok, status: res.status };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function renderHtml(opts: {
  firstName: string;
  views: number;
  enquiries: number;
  matches: number;
  listings: { address: string }[];
  hasActivity: boolean;
  unsubscribeUrl: string;
}) {
  const { firstName, views, enquiries, matches, listings, hasActivity, unsubscribeUrl } = opts;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f8fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="padding:28px 32px 0;">
          <div style="font-weight:700;font-size:20px;color:#0f172a;">ListHQ</div>
          <div style="font-size:13px;color:#64748b;margin-top:4px;">Weekly performance summary</div>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;">
          <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Hi ${escapeHtml(firstName)},</h1>
          <p style="margin:0;font-size:15px;line-height:1.5;color:#334155;">
            ${hasActivity
              ? `Here's how your listings performed in the last 7 days.`
              : `Your listings are live. Here's a quick summary of where things stand.`}
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="background:#f1f5f9;border-radius:12px;padding:18px 8px;width:33%;">
                <div style="font-size:28px;font-weight:700;color:#0f172a;">${views}</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px;">Listing views</div>
              </td>
              <td width="8"></td>
              <td align="center" style="background:#f1f5f9;border-radius:12px;padding:18px 8px;width:33%;">
                <div style="font-size:28px;font-weight:700;color:#0f172a;">${enquiries}</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px;">New enquiries</div>
              </td>
              <td width="8"></td>
              <td align="center" style="background:#f1f5f9;border-radius:12px;padding:18px 8px;width:33%;">
                <div style="font-size:28px;font-weight:700;color:#0f172a;">${matches}</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px;">Buyer matches</div>
              </td>
            </tr>
          </table>
        </td></tr>
        ${listings.length ? `
        <tr><td style="padding:8px 32px 16px;">
          <h2 style="margin:0 0 10px;font-size:14px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;">Your live listings</h2>
          ${listings.map(l => `<div style="padding:10px 12px;background:#f8fafc;border-radius:8px;margin-bottom:6px;font-size:14px;color:#0f172a;">${escapeHtml(l.address ?? 'Address on enquiry')}</div>`).join('')}
        </td></tr>` : ''}
        <tr><td align="center" style="padding:16px 32px 28px;">
          <a href="${APP_URL}/dashboard" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;">Open dashboard →</a>
        </td></tr>
        <tr><td style="padding:18px 32px 28px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.5;">
            You're receiving this because you have an active ListHQ account.
            <a href="${APP_URL}/dashboard/profile" style="color:#64748b;">Manage notifications</a> ·
            <a href="${unsubscribeUrl}" style="color:#64748b;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Auth: allow either cron secret OR an authenticated admin user (manual trigger)
  const cronSecret = Deno.env.get("CRON_SECRET");
  const xCron = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization");

  let authorized = false;
  if (cronSecret && xCron === cronSecret) {
    authorized = true;
  } else if (authHeader) {
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (userData?.user) {
      const { data: roleRow } = await userClient.rpc('has_role', {
        _user_id: userData.user.id,
        _role: 'admin',
      });
      if (roleRow === true) authorized = true;
    }
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const weekAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();

  const { data: agents, error: agentsErr } = await supabase
    .from('agents')
    .select('id, full_name, email')
    .eq('is_approved', true);

  if (agentsErr) {
    return new Response(JSON.stringify({ error: agentsErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!agents?.length) {
    return new Response(JSON.stringify({ sent: 0 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const emails = agents.map((a) => a.email).filter(Boolean) as string[];
  const { data: unsubs } = await supabase
    .from('email_unsubscribes')
    .select('email')
    .in('email', emails);
  const unsubSet = new Set((unsubs ?? []).map((u) => u.email));

  let sent = 0;
  let skipped = 0;

  for (const agent of agents) {
    if (!agent.email || unsubSet.has(agent.email)) { skipped++; continue; }

    const { data: agentProps } = await supabase
      .from('properties')
      .select('id, address, status')
      .eq('agent_id', agent.id);

    const propIds = (agentProps ?? []).map((p) => p.id);
    const liveListings = (agentProps ?? [])
      .filter((p) => p.status === 'published')
      .slice(0, 5)
      .map((p) => ({ address: p.address ?? 'Address on enquiry' }));

    let views = 0;
    if (propIds.length) {
      const { count } = await supabase
        .from('lead_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'view')
        .gte('created_at', weekAgo)
        .in('property_id', propIds);
      views = count ?? 0;
    }

    const { count: enquiriesCount } = await supabase
      .from('enquiries')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agent.id)
      .gte('created_at', weekAgo);

    const { count: matchesCount } = await supabase
      .from('listing_buyer_matches')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agent.id)
      .gte('created_at', weekAgo);

    const enquiries = enquiriesCount ?? 0;
    const matches = matchesCount ?? 0;
    const hasActivity = views + enquiries + matches > 0;

    if (!hasActivity && !liveListings.length) { skipped++; continue; }

    const firstName = agent.full_name?.split(' ')[0] ?? 'there';
    const unsubscribeUrl = `${APP_URL}/unsubscribe?email=${encodeURIComponent(agent.email)}`;
    const html = renderHtml({
      firstName,
      views,
      enquiries,
      matches,
      listings: liveListings,
      hasActivity,
      unsubscribeUrl,
    });

    const result = await sendEmail(
      agent.email,
      `Your ListHQ week: ${views} views, ${enquiries} enquiries`,
      html,
    );
    if (result.ok) sent++; else skipped++;
  }

  return new Response(JSON.stringify({ sent, skipped, total: agents.length }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
