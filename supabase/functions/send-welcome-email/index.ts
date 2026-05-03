import "../_shared/email-footer.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  brandShell,
  brandButton,
  brandFeatureList,
  BRAND,
} from '../_shared/email-brand.ts';

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

function sectionTitle(t: string) {
  return `<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};margin:24px 0 10px;font-weight:600;">${t}</div>`;
}

function buildAgentWelcome(p: { firstName: string; agencyName: string; appUrl: string }) {
  const intro = p.agencyName
    ? `<strong>${p.agencyName}</strong> is now live on Australia's multilingual property platform. Your 60-day free trial has started.`
    : `Your agency is now live on Australia's multilingual property platform. Your 60-day free trial has started.`;

  const inner = `
    <h1 style="font-size:24px;font-weight:600;color:${BRAND.navy};margin:0 0 12px;">Welcome, ${p.firstName}! 🎉</h1>
    <p style="font-size:14px;line-height:1.6;color:${BRAND.text};margin:0 0 8px;">${intro}</p>

    ${sectionTitle("What's included")}
    ${brandFeatureList([
      { icon: '🌏', label: 'AI multilingual listings — 20 languages' },
      { icon: '📊', label: 'Full trust accounting & rent roll' },
      { icon: '👥', label: 'CRM, pipeline & vendor dashboards' },
      { icon: '🏘️', label: 'Off-market network & buyer matching' },
    ])}

    ${sectionTitle('Get started in 3 steps')}
    <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
      <tr><td style="padding:10px 0;font-size:14px;color:${BRAND.text};">1. Add your first listing</td><td style="text-align:right;"><a href="${p.appUrl}/dashboard/listings/new" style="color:${BRAND.tealDark};text-decoration:none;font-size:13px;">Go →</a></td></tr>
      <tr><td style="padding:10px 0;font-size:14px;color:${BRAND.text};border-top:1px solid ${BRAND.bg};">2. Complete your agent profile</td><td style="text-align:right;border-top:1px solid ${BRAND.bg};"><a href="${p.appUrl}/dashboard/profile" style="color:${BRAND.tealDark};text-decoration:none;font-size:13px;">Go →</a></td></tr>
      <tr><td style="padding:10px 0;font-size:14px;color:${BRAND.text};border-top:1px solid ${BRAND.bg};">3. Import your contacts</td><td style="text-align:right;border-top:1px solid ${BRAND.bg};"><a href="${p.appUrl}/dashboard/contacts" style="color:${BRAND.tealDark};text-decoration:none;font-size:13px;">Go →</a></td></tr>
    </table>

    ${brandButton(`${p.appUrl}/dashboard`, 'Open your dashboard →')}

    <p style="font-size:12px;color:${BRAND.textMuted};text-align:center;margin:20px 0 0;">
      Questions? Reply to this email — we read every one.
    </p>
  `;
  return brandShell(inner, 'Agent Portal');
}

function buildBuyerWelcome(p: { firstName: string; appUrl: string }) {
  const inner = `
    <h1 style="font-size:24px;font-weight:600;color:${BRAND.navy};margin:0 0 12px;">You're in, ${p.firstName}! 🏡</h1>
    <p style="font-size:14px;line-height:1.6;color:${BRAND.text};margin:0 0 8px;">
      Search, save, and be alerted — in your language, in your currency. Every listing on ListHQ is available in 20 languages.
    </p>

    ${sectionTitle('What you can do')}
    ${brandFeatureList([
      { icon: '🔍', label: 'Search in Mandarin, Hindi, Arabic, Vietnamese + 17 more' },
      { icon: '🔔', label: 'Save searches — instant alerts when matches appear' },
      { icon: '💱', label: 'See prices in CNY, USD, INR, AED and 10 more currencies' },
      { icon: '💬', label: 'Connect with multilingual agents via WeChat, WhatsApp & LINE' },
    ])}

    ${brandButton(p.appUrl, 'Start your search →')}

    <div style="background:${BRAND.bg};border-radius:12px;padding:16px;margin:20px 0 0;">
      <p style="font-size:13px;color:${BRAND.text};margin:0;line-height:1.5;">
        💡 <strong>Tip:</strong> Set up a Halo buyer profile and get matched with off-market properties before they're listed publicly.
      </p>
    </div>

    <p style="font-size:12px;color:${BRAND.textMuted};text-align:center;margin:20px 0 0;">
      Questions? We're here at support@listhq.com.au
    </p>
  `;
  return brandShell(inner, 'Property Search');
}
