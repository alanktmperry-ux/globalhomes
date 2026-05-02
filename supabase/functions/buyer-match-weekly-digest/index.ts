// Weekly digest of new buyer matches for each agent.
// Scheduled via pg_cron — Mondays 8am AEST (Sun 22:00 UTC).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = Deno.env.get('APP_URL') ?? 'https://listhq.com.au';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'ListHQ <noreply@listhq.com.au>';

interface MatchRow {
  id: string;
  agent_id: string;
  buyer_intent_id: string;
  match_score: number | null;
  readiness_score: number | null;
  listing_id: string;
}

interface IntentRow {
  id: string;
  suburbs: string[] | null;
  bedrooms: number | null;
  max_price: number | null;
  intent_summary: string | null;
}

const fmtAUD = (n: number | null | undefined) => {
  if (!n) return '';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
};

const summarise = (i: IntentRow | undefined) => {
  if (!i) return 'Active buyer';
  const parts: string[] = [];
  if (i.bedrooms) parts.push(`${i.bedrooms} bed`);
  if (i.suburbs?.[0]) parts.push(i.suburbs[0]);
  if (i.max_price) parts.push(`under ${fmtAUD(i.max_price)}`);
  return parts.join(' · ') || (i.intent_summary?.slice(0, 80) ?? 'Active buyer');
};

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all new matches in last 7 days
  const { data: matches, error: mErr } = await supabase
    .from('listing_buyer_matches')
    .select('id,agent_id,buyer_intent_id,match_score,readiness_score,listing_id,created_at')
    .gte('created_at', sinceIso)
    .neq('status', 'archived');

  if (mErr) {
    console.error('Failed to fetch matches:', mErr);
    return new Response(JSON.stringify({ error: mErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const byAgent = new Map<string, MatchRow[]>();
  for (const m of (matches || []) as MatchRow[]) {
    if (!byAgent.has(m.agent_id)) byAgent.set(m.agent_id, []);
    byAgent.get(m.agent_id)!.push(m);
  }

  const agentIds = [...byAgent.keys()];
  if (agentIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'No new matches' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: agents } = await supabase
    .from('agents').select('id,name,email').in('id', agentIds);
  const agentMap = new Map((agents || []).map((a: any) => [a.id, a]));

  const intentIds = [...new Set((matches || []).map((m: any) => m.buyer_intent_id))];
  const { data: intents } = await supabase
    .from('buyer_intent')
    .select('id,suburbs,bedrooms,max_price,intent_summary')
    .in('id', intentIds);
  const intentMap = new Map<string, IntentRow>(((intents || []) as IntentRow[]).map(i => [i.id, i]));

  let sent = 0;
  for (const [agentId, agentMatches] of byAgent) {
    const agent: any = agentMap.get(agentId);
    if (!agent?.email) continue;

    const top3 = [...agentMatches]
      .sort((a, b) => (b.readiness_score || 0) - (a.readiness_score || 0))
      .slice(0, 3);

    const rowsHtml = top3.map(m => {
      const i = intentMap.get(m.buyer_intent_id);
      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
          <div style="font-weight:600;color:#0f172a;">${summarise(i)}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">
            Match ${m.match_score ?? '—'} · Readiness ${m.readiness_score ?? 0}
          </div>
        </td>
      </tr>`;
    }).join('');

    const html = `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
    <h1 style="font-size:20px;color:#0f172a;margin:0 0 8px;">Hi ${agent.name?.split(' ')[0] || 'there'},</h1>
    <p style="color:#475569;font-size:14px;line-height:1.5;margin:0 0 24px;">
      You had <strong>${agentMatches.length} new matched buyer${agentMatches.length === 1 ? '' : 's'}</strong> this week.
      Here are your top 3 by readiness:
    </p>
    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${rowsHtml}</table>
    <div style="text-align:center;margin-top:32px;">
      <a href="${APP_URL}/dashboard/concierge"
         style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;
                padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
        View your matched buyers →
      </a>
    </div>
    <p style="font-size:11px;color:#94a3b8;margin-top:32px;text-align:center;">
      ListHQ Buyer Concierge · Sent weekly
    </p>
  </div>
</body></html>`;

    const r = await sendEmail(agent.email, `${agentMatches.length} new matched buyer${agentMatches.length === 1 ? '' : 's'} this week`, html);
    if (r.ok) sent++;
  }

  return new Response(JSON.stringify({ sent, agents: agentIds.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
