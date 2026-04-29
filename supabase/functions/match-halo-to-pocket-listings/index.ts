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
const FINANCE_LABELS: Record<string, string> = {
  pre_approved: 'Pre-approved',
  arranging: 'Arranging finance',
  cash_buyer: 'Cash buyer',
  not_started: 'Not started',
};

function emailShell(body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">${body}<p style="font-size:12px;color:#64748b;margin-top:32px;">— The ListHQ team</p></div>`;
}
function btn(href: string, label: string) {
  return `<p style="margin:24px 0;"><a href="${href}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">${label}</a></p>`;
}

async function sendEmail(resendKey: string, to: string, subject: string, html: string) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!resp.ok) console.error('Resend error', await resp.text());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { halo_id } = await req.json();
    if (!halo_id) {
      return new Response(JSON.stringify({ error: 'halo_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const resendKey = Deno.env.get('RESEND_API_KEY');

    const { data: halo, error: hErr } = await admin
      .from('halos')
      .select('*')
      .eq('id', halo_id)
      .maybeSingle();
    if (hErr || !halo) {
      return new Response(JSON.stringify({ error: 'halo not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const suburbs: string[] = (halo.suburbs ?? []).filter(Boolean);
    if (suburbs.length === 0) {
      return new Response(JSON.stringify({ ok: true, matches: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find pocket listings: properties with listing_mode = 'pocket' (active), suburb in halo suburbs,
    // price within budget range, property type matches.
    const minPrice = halo.budget_min ?? 0;
    const maxPrice = halo.budget_max ?? Number.MAX_SAFE_INTEGER;

    const { data: pocketListings, error: pErr } = await admin
      .from('properties')
      .select('id, agent_id, suburb, price, property_type, address')
      .eq('listing_mode', 'pocket')
      .in('suburb', suburbs)
      .gte('price', minPrice)
      .lte('price', maxPrice);
    if (pErr) throw pErr;

    const haloPropTypes: string[] = (halo.property_types ?? []).map((t: string) => t.toLowerCase());
    const acceptsAny = haloPropTypes.length === 0 || haloPropTypes.includes('any');

    let matched = 0;
    for (const pl of pocketListings ?? []) {
      if (!acceptsAny) {
        const t = (pl.property_type ?? '').toLowerCase();
        if (!haloPropTypes.includes(t)) continue;
      }

      // Insert match (unique on halo_id, pocket_listing_id)
      const { error: insErr } = await admin.from('halo_pocket_matches').insert({
        halo_id: halo.id,
        pocket_listing_id: pl.id,
        agent_id: pl.agent_id,
      });
      if (insErr && insErr.code !== '23505') {
        console.error('insert match error', insErr);
        continue;
      }
      if (insErr && insErr.code === '23505') continue; // dedupe — don't notify

      // Look up agent email
      if (resendKey && pl.agent_id) {
        const { data: u } = await admin.auth.admin.getUserById(pl.agent_id);
        const email = u?.user?.email;
        if (email) {
          const budget = `AUD $${Number(halo.budget_max ?? 0).toLocaleString('en-AU')}`;
          const tf = TIMEFRAME_LABELS[halo.timeframe] ?? halo.timeframe;
          const fin = FINANCE_LABELS[halo.finance_status] ?? halo.finance_status;
          const types = (halo.property_types ?? []).join(', ') || 'Any';
          await sendEmail(resendKey, email,
            'Private match — your pocket listing matches a new Halo',
            emailShell(
              `<h1 style="font-size:22px;margin:0 0 12px;">Private match in ${pl.suburb}</h1>` +
              `<p style="font-size:15px;line-height:1.5;">A new Halo was just posted that matches your pocket listing in <strong>${pl.suburb}</strong>.</p>` +
              `<p style="font-size:14px;line-height:1.6;color:#334155;">Seeker is looking for: <strong>${halo.intent}</strong> · ${types} · ${budget}<br/>Timeframe: ${tf}<br/>Finance: ${fin}</p>` +
              `<p style="font-size:14px;line-height:1.6;color:#334155;">You have a head start — respond before other agents see it.</p>` +
              btn(`${APP_URL}/dashboard/halo-board`, 'View Halo Board →')
            )
          );
        }
      }
      matched++;
    }

    return new Response(JSON.stringify({ ok: true, matches: matched }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
