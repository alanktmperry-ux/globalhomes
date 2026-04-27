import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'ListHQ <hello@listhq.com.au>';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://app.listhq.com.au';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { type, user_id, name, email, agency } = await req.json();

    if (!email || !RESEND_KEY) {
      return new Response(
        JSON.stringify({ ok: false, reason: 'missing email or key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (type !== 'agent' && type !== 'buyer') {
      return new Response(JSON.stringify({ ok: false, reason: 'invalid type' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Dedup
    const { data: alreadySent } = await supabase
      .from('email_log')
      .select('id')
      .eq('recipient_email', email)
      .eq('template', `welcome_${type}`)
      .maybeSingle();
    if (alreadySent) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const firstName = (name || '').toString().split(' ')[0] || 'there';
    const html =
      type === 'agent'
        ? buildAgentWelcome({ firstName, agencyName: agency || '', appUrl: APP_URL })
        : buildBuyerWelcome({ firstName, appUrl: APP_URL });

    const subject =
      type === 'agent'
        ? `Welcome to ListHQ, ${firstName} — your 60-day trial has started`
        : `Welcome to ListHQ, ${firstName} — start your property search`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: [email], subject, html }),
    });

    if (res.ok) {
      await supabase.from('email_log').insert({
        recipient_email: email,
        recipient_id: user_id || null,
        template: `welcome_${type}`,
        subject,
        sent_at: new Date().toISOString(),
      } as any);
    } else {
      console.error('Resend send failed:', await res.text());
    }

    return new Response(JSON.stringify({ ok: res.ok }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('send-welcome-email error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

function buildAgentWelcome(p: { firstName: string; agencyName: string; appUrl: string }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1917;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:22px;font-weight:600;margin:0;color:#0f172a;">ListHQ</h1>
        <p style="font-size:13px;color:#78716c;margin:4px 0 0;">Australia's next-generation property platform</p>
      </div>
      <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px;">
        <h2 style="font-size:22px;font-weight:600;margin:0 0 12px;color:#0f172a;">Welcome, ${p.firstName}! 🎉</h2>
        <p style="font-size:14px;line-height:1.6;color:#44403c;margin:0 0 20px;">
          Your 60-day free trial has started${p.agencyName ? ` for <strong>${p.agencyName}</strong>` : ''}. Here's what you can do right now:
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:10px 0;font-size:14px;color:#1c1917;">1. Add your first listing</td><td style="text-align:right;"><a href="${p.appUrl}/dashboard/listings/new" style="color:#2563eb;text-decoration:none;font-size:13px;">Go →</a></td></tr>
          <tr><td style="padding:10px 0;font-size:14px;color:#1c1917;border-top:1px solid #f5f5f4;">2. Set up trust accounting</td><td style="text-align:right;border-top:1px solid #f5f5f4;"><a href="${p.appUrl}/dashboard/trust" style="color:#2563eb;text-decoration:none;font-size:13px;">Go →</a></td></tr>
          <tr><td style="padding:10px 0;font-size:14px;color:#1c1917;border-top:1px solid #f5f5f4;">3. Import your contacts</td><td style="text-align:right;border-top:1px solid #f5f5f4;"><a href="${p.appUrl}/dashboard/contacts" style="color:#2563eb;text-decoration:none;font-size:13px;">Go →</a></td></tr>
        </table>
        <div style="text-align:center;margin:28px 0 12px;">
          <a href="${p.appUrl}/dashboard" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:12px 24px;border-radius:10px;">Open your dashboard →</a>
        </div>
        <p style="font-size:12px;color:#78716c;text-align:center;margin:16px 0 0;">Questions? Reply to this email — we read every one.</p>
      </div>
      <p style="font-size:11px;color:#a8a29e;text-align:center;margin-top:20px;">© ListHQ Pty Ltd · Melbourne, Australia</p>
    </div>
  </body>
</html>`;
}

function buildBuyerWelcome(p: { firstName: string; appUrl: string }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1917;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:22px;font-weight:600;margin:0;color:#0f172a;">ListHQ</h1>
      </div>
      <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px;">
        <h2 style="font-size:22px;font-weight:600;margin:0 0 12px;color:#0f172a;">You're in, ${p.firstName}! 🏡</h2>
        <p style="font-size:14px;line-height:1.6;color:#44403c;margin:0 0 20px;">
          Your ListHQ account is ready. Start searching — we'll alert you the moment a property matching your preferences hits the market.
        </p>
        <div style="text-align:center;margin:24px 0 12px;">
          <a href="${p.appUrl}/" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:12px 24px;border-radius:10px;">Start searching →</a>
        </div>
        <p style="font-size:12px;color:#78716c;text-align:center;margin:16px 0 0;">Save searches to get instant alerts. Save properties to track price drops.</p>
      </div>
      <p style="font-size:11px;color:#a8a29e;text-align:center;margin-top:20px;">© ListHQ Pty Ltd · Melbourne, Australia</p>
    </div>
  </body>
</html>`;
}
