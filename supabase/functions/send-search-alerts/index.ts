import "../_shared/email-footer.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'ListHQ Alerts <alerts@listhq.com.au>';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://globalhomes.lovable.app';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const mode: string = body.mode ?? 'instant';
    const propertyId: string | undefined = body.record?.id ?? body.property_id;

    if (mode === 'instant' && propertyId) {
      await handleNewListing(propertyId);
    } else if (mode === 'price_drop' && (body.record?.property_id || body.property_id)) {
      const pid = body.record?.property_id ?? body.property_id;
      await handlePriceDrop(pid, body.record?.old_price, body.record?.new_price, body.record?.change_pct);
    } else if (mode === 'daily' || mode === 'weekly') {
      await handleDigest(mode);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: any) {
    console.error('send-search-alerts error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function handleNewListing(propertyId: string) {
  const { data: prop } = await supabase
    .from('properties')
    .select('address, suburb, state, price, beds, baths, property_type, images, listing_mode')
    .eq('id', propertyId)
    .single();
  if (!prop) return;
  if (prop.listing_mode === 'off_market') return;

  const { data: matches } = await supabase.rpc('find_matching_saved_searches', {
    p_property_id: propertyId
  });

  const instantMatches = (matches ?? []).filter((m: any) => m.alert_frequency === 'instant');

  for (const match of instantMatches) {
    if (!match.buyer_email || !RESEND_KEY) continue;

    const priceStr = prop.price ? `$${Number(prop.price).toLocaleString()}` : 'Contact agent';
    const propUrl = `${APP_URL}/property/${propertyId}`;
    const imageUrl = prop.images?.[0] ?? '';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [match.buyer_email],
        subject: `🏡 New match for "${match.search_name}" — ${prop.suburb}, ${prop.state}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <p>Hi ${match.buyer_name?.split(' ')[0] ?? 'there'},</p>
            <p>A new property matching "<strong>${match.search_name}</strong>" just listed:</p>
            ${imageUrl ? `<img src="${imageUrl}" alt="" style="width:100%;border-radius:12px;margin:16px 0" />` : ''}
            <p style="font-size:20px;font-weight:bold">${priceStr}</p>
            <p>${prop.address}</p>
            <p style="color:#666">${prop.suburb}, ${prop.state}${prop.beds ? ` · ${prop.beds} bed` : ''}${prop.baths ? ` ${prop.baths} bath` : ''}</p>
            <a href="${propUrl}" style="display:inline-block;background:#1a1a1a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">View Property →</a>
            <p style="margin-top:24px;font-size:12px;color:#999">
              <a href="${APP_URL}/saved" style="color:#999">Manage alerts</a>
            </p>
          </div>
        `,
      }),
    });

    // Record send + increment badge
    await supabase.from('alert_sends').insert({
      saved_search_id: match.saved_search_id,
      property_id: propertyId,
      alert_type: 'new_match',
    } as any);

    // Increment match count
    const { data: searchData } = await supabase
      .from('saved_searches')
      .select('new_match_count')
      .eq('id', match.saved_search_id)
      .single();

    await supabase.from('saved_searches')
      .update({
        new_match_count: ((searchData as any)?.new_match_count ?? 0) + 1,
        last_alerted_at: new Date().toISOString(),
      } as any)
      .eq('id', match.saved_search_id);
  }
}

async function handlePriceDrop(
  propertyId: string, oldPrice?: number, newPrice?: number, changePct?: number
) {
  if (!oldPrice || !newPrice || !RESEND_KEY) return;

  const { data: watchers } = await supabase
    .from('saved_properties')
    .select('user_id, saved_price')
    .eq('property_id', propertyId);

  const { data: prop } = await supabase
    .from('properties')
    .select('address, suburb, state, images')
    .eq('id', propertyId).single();

  for (const watcher of watchers ?? []) {
    if (watcher.saved_price && newPrice >= Number(watcher.saved_price)) continue;

    // Get email from auth
    const { data: userData } = await supabase.auth.admin.getUserById(watcher.user_id);
    const email = userData?.user?.email;
    if (!email) continue;

    // Dedup
    const { data: alreadySent } = await supabase.from('alert_sends')
      .select('id')
      .eq('property_id', propertyId)
      .eq('alert_type', 'price_drop')
      .gte('sent_at', new Date(Date.now() - 86400000).toISOString())
      .maybeSingle();
    if (alreadySent) continue;

    const drop = oldPrice - newPrice;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [email],
        subject: `📉 Price drop: ${prop?.address} — now $${newPrice.toLocaleString()}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <p>A property on your watchlist just had its price reduced:</p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:16px 0">
              <p style="color:#16a34a;font-weight:bold;font-size:12px">PRICE DROP — ↓ $${drop.toLocaleString()} (${Math.abs(changePct ?? 0)}%)</p>
              <p style="font-size:24px;font-weight:bold">$${newPrice.toLocaleString()}</p>
              <p style="color:#999;text-decoration:line-through">was $${oldPrice.toLocaleString()}</p>
              <p>${prop?.address}</p>
              <p style="color:#666">${prop?.suburb}, ${prop?.state}</p>
            </div>
            <a href="${APP_URL}/property/${propertyId}" style="display:inline-block;background:#1a1a1a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">View Property →</a>
          </div>
        `,
      }),
    });

    await supabase.from('alert_sends').insert({
      property_id: propertyId,
      alert_type: 'price_drop',
    } as any);
  }
}

async function handleDigest(mode: 'daily' | 'weekly') {
  const cutoff = mode === 'daily'
    ? new Date(Date.now() - 86400000).toISOString()
    : new Date(Date.now() - 7 * 86400000).toISOString();

  const { data: searches } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('alert_frequency', mode)
    .or(`last_alerted_at.is.null,last_alerted_at.lt.${cutoff}`);

  for (const search of searches ?? []) {
    const { data: userData } = await supabase.auth.admin.getUserById((search as any).user_id);
    const email = userData?.user?.email;
    if (!email || !RESEND_KEY) continue;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', (search as any).user_id)
      .single();

    // Find recent matching properties
    let q = supabase
      .from('properties')
      .select('id,address,suburb,state,price,beds,property_type,images')
      .gte('created_at', cutoff)
      .eq('is_active', true)
      .limit(6);

    const suburbs = (search as any).suburbs;
    if (suburbs?.length) q = q.in('suburb', suburbs);

    const { data: recentProps } = await q;

    const matches = (recentProps ?? []).filter((p: any) =>
      (!(search as any).min_price || p.price >= (search as any).min_price) &&
      (!(search as any).max_price || p.price <= (search as any).max_price) &&
      (!(search as any).min_bedrooms || p.beds >= (search as any).min_bedrooms)
    );

    if (!matches.length) continue;

    const listingRows = matches.map((p: any) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee">
          <strong>${p.address}</strong><br/>
          <span style="color:#666;font-size:12px">${p.suburb}, ${p.state}${p.beds ? ` · ${p.beds} bed` : ''}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:bold">
          ${p.price ? `$${Number(p.price).toLocaleString()}` : 'POA'}
        </td>
      </tr>
    `).join('');

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [email],
        subject: `🏡 ${matches.length} new propert${matches.length > 1 ? 'ies' : 'y'} for "${(search as any).name}"`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <p>Hi ${(profile as any)?.full_name?.split(' ')[0] ?? 'there'},</p>
            <p>Here's your ${mode} digest for "<strong>${(search as any).name}</strong>":</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">${listingRows}</table>
            <a href="${APP_URL}/" style="display:inline-block;background:#1a1a1a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">View All Matches →</a>
            <p style="margin-top:24px;font-size:12px;color:#999">
              <a href="${APP_URL}/saved" style="color:#999">Change alert frequency or unsubscribe</a>
            </p>
          </div>
        `,
      }),
    });

    await supabase.from('saved_searches')
      .update({ last_alerted_at: new Date().toISOString() } as any)
      .eq('id', (search as any).id);
  }
}