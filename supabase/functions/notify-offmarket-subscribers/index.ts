import "../_shared/email-footer.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
  const APP_URL    = Deno.env.get('APP_URL') ?? 'https://listhq.com.au';
  const FROM_EMAIL = Deno.env.get('EMAIL_FROM') ?? 'ListHQ Off-Market <offmarket@listhq.com.au>';

  try {
    const body = await req.json();
    const record = body.record ?? body;
    const propertyId: string = record.id;

    if (!propertyId) return new Response('No property ID', { status: 400 });

    if (!['off_market', 'eoi'].includes(record.listing_mode ?? '')) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: prop } = await supabase
      .from('properties')
      .select('address, suburb, state, beds, baths, property_type, eoi_guide_price, eoi_close_date, listing_mode, cover_image_url, address_hidden')
      .eq('id', propertyId)
      .single();

    if (!prop) return new Response('Property not found', { status: 404 });

    const { data: subs } = await supabase
      .from('offmarket_subscriptions')
      .select('id, buyer_id, suburb, state, min_price, max_price, min_bedrooms, property_types')
      .eq('suburb', prop.suburb)
      .eq('state', prop.state);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let notified = 0;
    for (const sub of subs) {
      if (sub.min_price && prop.eoi_guide_price && prop.eoi_guide_price < sub.min_price) continue;
      if (sub.max_price && prop.eoi_guide_price && prop.eoi_guide_price > sub.max_price) continue;
      if (sub.min_bedrooms && prop.beds && prop.beds < sub.min_bedrooms) continue;
      if (sub.property_types?.length && !sub.property_types.includes(prop.property_type)) continue;

      const { data: userData } = await supabase.auth.admin.getUserById(sub.buyer_id);
      const email = userData?.user?.email;
      if (!email || !RESEND_KEY) continue;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', sub.buyer_id)
        .maybeSingle();

      const firstName = (profile as any)?.full_name?.split(' ')[0] ?? 'there';
      const isEOI     = prop.listing_mode === 'eoi';
      const address   = prop.address_hidden
        ? `${prop.suburb}, ${prop.state}`
        : `${prop.address}, ${prop.suburb} ${prop.state}`;
      const guidePrice = prop.eoi_guide_price
        ? `$${Number(prop.eoi_guide_price).toLocaleString()}`
        : 'Price on application';
      const closeDate = prop.eoi_close_date
        ? new Date(prop.eoi_close_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;
      const propUrl = `${APP_URL}/property/${propertyId}`;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject: `🔒 New off-market property in ${prop.suburb}, ${prop.state}`,
          html: `
            <div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif">
              <div style="background:#1a1a2e;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0">
                Off-Market Exclusive
              </div>
              <p style="padding:0 24px">Hi ${firstName}, a new off-market property matches your alert</p>
              ${prop.cover_image_url ? `<img src="${prop.cover_image_url}" style="width:100%;max-height:250px;object-fit:cover" />` : ''}
              <div style="padding:16px 24px">
                <h2 style="margin:0">${address}</h2>
                <p style="color:#666">
                  ${prop.beds ? `${prop.beds} bed` : ''} ${prop.baths ? `· ${prop.baths} bath` : ''} · ${prop.property_type ?? ''}
                </p>
                <p style="font-size:20px;font-weight:bold">${guidePrice}</p>
                ${isEOI ? `
                  <p style="background:#fef3c7;padding:8px 12px;border-radius:6px;color:#92400e">
                    ${closeDate ? `EOI closes ${closeDate}` : 'Expression of Interest — submit your offer now'}
                  </p>
                ` : ''}
              </div>
              <a href="${propUrl}" style="display:block;text-align:center;background:#1a1a2e;color:#fff;padding:14px;margin:0 24px 24px;border-radius:8px;text-decoration:none;font-weight:600">
                ${isEOI ? 'Submit Expression of Interest →' : 'View Property →'}
              </a>
              <p style="padding:0 24px 24px;font-size:12px;color:#999">
                You received this because you subscribed to off-market alerts for
                ${prop.suburb}, ${prop.state}.
                <a href="${APP_URL}/dashboard/alerts">Manage alerts</a>
              </p>
            </div>
          `,
        }),
      });

      notified++;
    }

    return new Response(JSON.stringify({ notified }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('notify-offmarket-subscribers error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});