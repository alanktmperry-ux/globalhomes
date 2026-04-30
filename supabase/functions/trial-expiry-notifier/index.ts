import "../_shared/email-footer.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'ListHQ <hello@listhq.com.au>';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://app.listhq.com.au';

const TRIAL_DAYS = 60;

// Warning thresholds in days remaining (day 45 = 15 left, day 53 = 7 left, day 60 = 0 left)
const THRESHOLDS = [
  { daysRemaining: 15, subject: '15 days left on your ListHQ trial', urgency: 'low' },
  { daysRemaining: 7,  subject: '⏰ 7 days left — upgrade to keep your listings live', urgency: 'medium' },
  { daysRemaining: 0,  subject: '🚨 Your ListHQ trial ends today', urgency: 'high' },
];

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const now = new Date();
    let totalSent = 0;

    for (const threshold of THRESHOLDS) {
      const targetEnd = new Date(now.getTime() + threshold.daysRemaining * 86400000);
      const windowStart = new Date(targetEnd.getTime() - 12 * 3600000).toISOString();
      const windowEnd   = new Date(targetEnd.getTime() + 12 * 3600000).toISOString();

      const trialStartFrom = new Date(
        new Date(windowStart).getTime() - TRIAL_DAYS * 86400000
      ).toISOString();
      const trialStartTo = new Date(
        new Date(windowEnd).getTime() - TRIAL_DAYS * 86400000
      ).toISOString();

      const { data: agents } = await supabase
        .from('agents')
        .select('id, name, email, created_at, agency')
        .eq('is_subscribed', false)
        .gte('created_at', trialStartFrom)
        .lte('created_at', trialStartTo);

      for (const agent of agents ?? []) {
        if (!agent.email || !RESEND_KEY) continue;

        const { data: alreadySent } = await (supabase as any)
          .from('email_log')
          .select('id')
          .eq('recipient_email', agent.email)
          .eq('template', `trial_expiry_${threshold.daysRemaining}d`)
          .maybeSingle();
        if (alreadySent) continue;

        const trialEnd = new Date(
          new Date(agent.created_at).getTime() + TRIAL_DAYS * 86400000
        );
        const daysLeft = Math.max(0, Math.ceil(
          (trialEnd.getTime() - now.getTime()) / 86400000
        ));

        const agentName = agent.name?.split(' ')[0] ?? 'there';
        const html = buildTrialExpiryEmail({
          agentName,
          agencyName: agent.agency ?? '',
          daysLeft,
          trialEndDate: trialEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
          urgency: threshold.urgency as 'low' | 'medium' | 'high',
          upgradeUrl: `${APP_URL}/dashboard/billing`,
        });

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: [agent.email],
            subject: threshold.subject,
            html,
          }),
        });

        if (res.ok) {
          totalSent++;
          await (supabase as any).from('email_log').insert({
            recipient_email: agent.email,
            recipient_id: agent.id,
            template: `trial_expiry_${threshold.daysRemaining}d`,
            subject: threshold.subject,
            sent_at: now.toISOString(),
          });
        } else {
          console.error(`Email failed for ${agent.email}:`, await res.text());
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: totalSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('trial-expiry-notifier error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

function buildTrialExpiryEmail(params: {
  agentName: string;
  agencyName: string;
  daysLeft: number;
  trialEndDate: string;
  urgency: 'low' | 'medium' | 'high';
  upgradeUrl: string;
}) {
  const { agentName, agencyName, daysLeft, trialEndDate, urgency, upgradeUrl } = params;

  const bannerColor = urgency === 'high' ? '#dc2626' : urgency === 'medium' ? '#d97706' : '#2563eb';
  const bannerBg   = urgency === 'high' ? '#fef2f2' : urgency === 'medium' ? '#fffbeb' : '#eff6ff';
  const bannerBorder = urgency === 'high' ? '#fecaca' : urgency === 'medium' ? '#fde68a' : '#bfdbfe';
  const daysText = daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1c1917;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:20px;font-weight:600;color:#1c1917;">ListHQ</div>
    </div>

    <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;padding:32px;">
      <div style="background:${bannerBg};border:1px solid ${bannerBorder};border-radius:8px;padding:12px 16px;margin-bottom:24px;">
        <div style="color:${bannerColor};font-size:14px;font-weight:600;">
          Your free trial ends ${daysText} — ${trialEndDate}
        </div>
      </div>

      <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;">Hi ${agentName},</h1>

      <p style="font-size:15px;line-height:1.6;color:#44403c;margin:0 0 16px;">
        Your 60-day free trial of ListHQ${agencyName ? ` for ${agencyName}` : ''} ends ${daysText}.
        After that, your listings will be paused and you'll lose access to your CRM, pipeline, and trust accounting tools.
      </p>

      <div style="background:#fafaf9;border-radius:8px;padding:20px;margin:24px 0;">
        <div style="font-size:14px;font-weight:600;color:#1c1917;margin-bottom:12px;">What you keep with a paid plan:</div>
        <ul style="margin:0;padding-left:20px;color:#44403c;font-size:14px;line-height:1.8;">
          <li>All your listings stay live</li>
          <li>CRM contacts and pipeline history</li>
          <li>Trust accounting records</li>
          <li>Buyer enquiries and leads</li>
        </ul>
      </div>

      <div style="text-align:center;margin:28px 0 16px;">
        <a href="${upgradeUrl}" style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">
          Upgrade now →
        </a>
      </div>

      <p style="text-align:center;font-size:13px;color:#78716c;margin:0;">
        Solo plan from $299/month · No lock-in contract
      </p>
    </div>

    <div style="text-align:center;font-size:12px;color:#a8a29e;margin-top:24px;">
      © ListHQ Pty Ltd · Melbourne, Australia ·
      <a href="${APP_URL}/dashboard/billing" style="color:#a8a29e;">Manage subscription</a>
    </div>
  </div>
</body>
</html>`;
}