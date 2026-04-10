import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { auction_id } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const RESEND = Deno.env.get('RESEND_API_KEY') ?? '';
    const FROM = Deno.env.get('EMAIL_FROM') ?? 'ListHQ <noreply@listhq.com.au>';

    const { data: auction } = await supabase
      .from('auctions')
      .select('*, properties(address, suburb, state)')
      .eq('id', auction_id)
      .single();

    if (!auction) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });

    const { data: registrations } = await supabase
      .from('auction_bidder_registrations')
      .select('email, full_name')
      .eq('auction_id', auction_id)
      .eq('is_approved', true);

    if (!registrations?.length || !RESEND) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const property = (auction as any).properties;
    const address = property ? `${property.address}, ${property.suburb} ${property.state}` : 'Property';

    const outcome = auction.status === 'sold'
      ? `<strong style="color:#2d6a4f">SOLD</strong> for $${Number(auction.sold_price).toLocaleString('en-AU')}`
      : `<strong style="color:#e63946">Passed In</strong> at $${Number(auction.passed_in_price || auction.last_bid_amount).toLocaleString('en-AU')}`;

    let sent = 0;
    for (const reg of registrations) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: [(reg as any).email],
          subject: `Auction Result — ${address}`,
          html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px">
            <h1 style="font-size:22px;margin-bottom:16px">Auction Result</h1>
            <p>Hi ${(reg as any).full_name},</p>
            <p>${address} has ${outcome}.</p>
            ${auction.status === 'passed_in' ? '<p>The property is now available for private negotiation. Contact the listing agent if you\'re interested.</p>' : ''}
            <p style="margin-top:24px;color:#6b7280;font-size:13px">Thank you for participating. View more properties at ListHQ.</p>
          </div>`,
        }),
      });
      sent++;
    }

    return new Response(JSON.stringify({ sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
