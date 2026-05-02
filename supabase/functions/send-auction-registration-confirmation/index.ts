import "../_shared/email-footer.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { registration_id } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const RESEND = Deno.env.get('RESEND_API_KEY') ?? '';
    const FROM = Deno.env.get('EMAIL_FROM') ?? 'ListHQ <noreply@listhq.com.au>';

    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: reg } = await supabase
      .from('auction_bidder_registrations')
      .select('*')
      .eq('id', registration_id)
      .single();

    if (!reg) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });

    const { data: auction } = await supabase
      .from('auctions')
      .select('auction_date, auction_time, auction_timezone, auction_location, is_online, online_platform_url, property_id')
      .eq('id', reg.auction_id)
      .single();

    if (!auction) return new Response(JSON.stringify({ error: 'Auction not found' }), { status: 404, headers: corsHeaders });

    const { data: property } = await supabase
      .from('properties')
      .select('address, suburb, state, agent_id')
      .eq('id', auction.property_id)
      .single();

    const { data: agentRow } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
    if (!agentRow || !property || agentRow.id !== (property as any).agent_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const address = property ? `${property.address}, ${property.suburb} ${property.state}` : 'Property';
    const auctionDate = new Date(auction.auction_date).toLocaleDateString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    if (!RESEND) {
      return new Response(JSON.stringify({ success: true, note: 'No RESEND key' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [reg.email],
        subject: `Auction Registration Confirmed — ${address}`,
        html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px">
          <h1 style="font-size:22px;margin-bottom:16px">You're registered to bid</h1>
          <p>Hi ${reg.full_name},</p>
          <p>Your registration has been ${reg.is_approved ? 'approved' : 'received and pending approval'}.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">Property</td><td style="padding:8px;border-bottom:1px solid #eee">${address}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">Date</td><td style="padding:8px;border-bottom:1px solid #eee">${auctionDate} at ${String(auction.auction_time).slice(0, 5)}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">Location</td><td style="padding:8px;border-bottom:1px solid #eee">${auction.is_online ? 'Online' : auction.auction_location}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">Paddle</td><td style="padding:8px;border-bottom:1px solid #eee">#${reg.paddle_number}</td></tr>
          </table>
          <h3 style="font-size:15px;margin-top:24px">Important reminders:</h3>
          <ul style="padding-left:20px;line-height:1.8">
            <li>Bring your photo ID on the day</li>
            <li>Have your 10% deposit ready (bank cheque or approved bank transfer)</li>
            <li>Cooling-off period does NOT apply to auction purchases</li>
          </ul>
          <p style="margin-top:24px;color:#6b7280;font-size:13px">Questions? Contact the listing agent directly through ListHQ.</p>
        </div>`,
      }),
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});