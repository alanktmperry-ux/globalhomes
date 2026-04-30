import "../_shared/email-footer.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { token, vendor_email, property_id } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const APP_URL = Deno.env.get('APP_URL') ?? 'https://listhq.com.au';
    const RESEND = Deno.env.get('RESEND_API_KEY') ?? '';
    const FROM = Deno.env.get('EMAIL_FROM') ?? 'ListHQ <reports@listhq.com.au>';

    const { data: tokenRow } = await supabase
      .from('vendor_report_tokens')
      .select('vendor_name, agent_id, expires_at')
      .eq('token', token)
      .single();

    const { data: prop } = await supabase
      .from('properties')
      .select('address, suburb, state, cover_image_url')
      .eq('id', property_id)
      .single();

    const { data: agent } = await supabase
      .from('agents')
      .select('name, avatar_url, phone')
      .eq('id', tokenRow?.agent_id)
      .single();

    const reportUrl = `${APP_URL}/vendor-report/${token}`;
    const vendorName = tokenRow?.vendor_name ?? 'there';
    const expiryDate = new Date(tokenRow?.expires_at ?? '').toLocaleDateString('en-AU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    if (!RESEND) {
      return new Response(JSON.stringify({ error: 'No RESEND_API_KEY configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [vendor_email],
        subject: `Your property performance report — ${prop?.address}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <h2 style="color:#1a1a2e;margin-bottom:8px;">ListHQ Vendor Report</h2>
            <p style="color:#555;font-size:16px;line-height:1.5;">
              Hi ${vendorName}, your listing performance report is ready.
            </p>
            ${prop?.cover_image_url ? `<img src="${prop.cover_image_url}" alt="" style="width:100%;border-radius:12px;margin:16px 0;" />` : ''}
            <p style="font-size:18px;font-weight:bold;color:#1a1a2e;">${prop?.address}, ${prop?.suburb} ${prop?.state}</p>
            <p style="color:#555;font-size:14px;line-height:1.6;">
              Your agent ${agent?.name} has shared a live performance dashboard for your listing.
              Click below to see your views, enquiries, open home attendance, and how you compare to
              similar properties in ${prop?.suburb}.
            </p>
            <a href="${reportUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
              View My Report →
            </a>
            <p style="color:#999;font-size:12px;margin-top:16px;">
              This link expires on ${expiryDate}. Do not share it publicly.
            </p>
            ${agent ? `
              <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />
              <div style="display:flex;align-items:center;gap:12px;">
                ${agent.avatar_url ? `<img src="${agent.avatar_url}" alt="" style="width:40px;height:40px;border-radius:50%;" />` : ''}
                <div>
                  <p style="margin:0;font-weight:600;color:#1a1a2e;">${agent.name}</p>
                  <p style="margin:0;color:#999;font-size:13px;">${agent.phone ?? ''}</p>
                </div>
              </div>
            ` : ''}
          </div>
        `,
      }),
    });

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('send-vendor-report-link error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});