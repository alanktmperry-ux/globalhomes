import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

async function sendViaResend(to: string, subject: string, html: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    return { ok: false, reason: 'RESEND_API_KEY not set' };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ListHQ <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`Resend email failed [${res.status}]:`, errText);
    return { ok: false, reason: errText };
  }
  console.log(`Email sent to ${to}: ${subject}`);
  return { ok: true };
}

function buildExpiryWarningHtml(params: {
  agentName: string; address: string; suburb: string;
  boostTier: string; expiryDate: string; propertyId: string;
}) {
  const { agentName, address, suburb, boostTier, expiryDate, propertyId } = params;
  const tierLabel = boostTier === 'premier' ? 'Premier' : 'Featured';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="background:#0a1628;padding:20px 24px;text-align:center;">
      <div style="font-size:22px;font-weight:700;color:#ffffff;">ListHQ</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Boost Expiry Reminder</div>
    </div>
    <div style="padding:28px 24px;">
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:12px 16px;text-align:center;margin-bottom:24px;">
        <span style="font-size:14px;font-weight:600;color:#b45309;">⚡ Your ${tierLabel} boost expires in 5 days</span>
      </div>
      <p style="font-size:15px;color:#333;margin:0 0 16px;">Hi ${agentName},</p>
      <p style="font-size:15px;color:#333;margin:0 0 16px;">Your <strong>${tierLabel}</strong> boost for <strong>${address}, ${suburb}</strong> expires on <strong>${expiryDate}</strong>.</p>
      <p style="font-size:15px;color:#333;margin:0 0 24px;">After it expires, your listing will return to standard placement in search results and be removed from the featured grid on the homepage.</p>
      <div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;font-size:13px;color:#888;width:100px;">Property</td><td style="padding:6px 0;font-size:14px;color:#333;font-weight:500;">${address}</td></tr>
          <tr><td style="padding:6px 0;font-size:13px;color:#888;">Suburb</td><td style="padding:6px 0;font-size:14px;color:#333;">${suburb}</td></tr>
          <tr><td style="padding:6px 0;font-size:13px;color:#888;">Boost tier</td><td style="padding:6px 0;font-size:14px;color:#333;">${tierLabel}</td></tr>
          <tr><td style="padding:6px 0;font-size:13px;color:#888;">Expires</td><td style="padding:6px 0;font-size:14px;color:#b45309;font-weight:600;">${expiryDate}</td></tr>
        </table>
      </div>
      <p style="font-size:15px;color:#333;margin:0 0 24px;">To keep your listing in the featured grid, renew your boost from the Marketing tab.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="https://listhq.com.au/dashboard/listings/${propertyId}?tab=marketing" style="display:inline-block;background:#0a1628;color:#fff;font-size:14px;font-weight:600;padding:14px 36px;border-radius:10px;text-decoration:none;">Renew your boost</a>
      </div>
    </div>
    <div style="border-top:1px solid #eee;padding:16px 24px;text-align:center;">
      <p style="font-size:11px;color:#aaa;margin:0;">© ListHQ Pty Ltd · Melbourne, Victoria, Australia</p>
    </div>
  </div>
</div>
</body></html>`;
}

function buildExpiredHtml(params: {
  agentName: string; address: string; suburb: string;
  boostTier: string; propertyId: string;
}) {
  const { agentName, address, suburb, boostTier, propertyId } = params;
  const tierLabel = boostTier === 'premier' ? 'Premier' : 'Featured';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="background:#0a1628;padding:20px 24px;text-align:center;">
      <div style="font-size:22px;font-weight:700;color:#ffffff;">ListHQ</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Boost Ended</div>
    </div>
    <div style="padding:28px 24px;">
      <div style="background:#f0f0f0;border:1px solid #d4d4d8;border-radius:12px;padding:12px 16px;text-align:center;margin-bottom:24px;">
        <span style="font-size:14px;font-weight:600;color:#52525b;">Your ${tierLabel} boost has ended</span>
      </div>
      <p style="font-size:15px;color:#333;margin:0 0 16px;">Hi ${agentName},</p>
      <p style="font-size:15px;color:#333;margin:0 0 16px;">Your <strong>${tierLabel}</strong> boost for <strong>${address}, ${suburb}</strong> has expired. Your listing has been returned to standard placement in search results.</p>
      <p style="font-size:15px;color:#333;margin:0 0 24px;">Want to keep the momentum going? Request a new boost anytime from the Marketing tab.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="https://listhq.com.au/dashboard/listings/${propertyId}?tab=marketing" style="display:inline-block;background:#0a1628;color:#fff;font-size:14px;font-weight:600;padding:14px 36px;border-radius:10px;text-decoration:none;">Boost again</a>
      </div>
    </div>
    <div style="border-top:1px solid #eee;padding:16px 24px;text-align:center;">
      <p style="font-size:11px;color:#aaa;margin:0;">© ListHQ Pty Ltd · Melbourne, Victoria, Australia</p>
    </div>
  </div>
</div>
</body></html>`;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results = { warned: 0, expired: 0, errors: [] as string[] };

    // A — 5-day expiry warning
    const { data: expiring, error: expiringErr } = await supabase
      .from('properties')
      .select('id, address, suburb, boost_tier, featured_until, agent_id')
      .eq('is_featured', true)
      .eq('boost_expiry_warned', false)
      .gte('featured_until', new Date().toISOString())
      .lte('featured_until', new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString());

    if (expiringErr) {
      console.error('Error querying expiring boosts:', expiringErr);
    }

    for (const prop of (expiring || [])) {
      // Get agent details
      const { data: agent } = await supabase
        .from('agents')
        .select('email, name')
        .eq('id', prop.agent_id)
        .maybeSingle();

      if (agent?.email) {
        const expiryDate = new Date(prop.featured_until).toLocaleDateString('en-AU', {
          day: 'numeric', month: 'long', year: 'numeric',
        });

        const emailResult = await sendViaResend(
          agent.email,
          `Your Featured boost expires in 5 days — ${prop.address}`,
          buildExpiryWarningHtml({
            agentName: agent.name || 'Agent',
            address: prop.address,
            suburb: prop.suburb,
            boostTier: prop.boost_tier || 'featured',
            expiryDate,
            propertyId: prop.id,
          })
        );

        if (emailResult.ok) {
          // Mark as warned
          await supabase
            .from('properties')
            .update({ boost_expiry_warned: true } as any)
            .eq('id', prop.id);
          results.warned++;
        } else {
          results.errors.push(`Warn email failed for ${prop.id}: ${emailResult.reason}`);
        }
      }
    }

    // B — Auto-expire
    const { data: expired, error: expiredErr } = await supabase
      .from('properties')
      .select('id, address, suburb, boost_tier, agent_id')
      .eq('is_featured', true)
      .lt('featured_until', new Date().toISOString());

    if (expiredErr) {
      console.error('Error querying expired boosts:', expiredErr);
    }

    for (const prop of (expired || [])) {
      // Expire the boost
      await supabase
        .from('properties')
        .update({
          is_featured: false,
          boost_tier: null,
        } as any)
        .eq('id', prop.id);

      // Get agent details and send expired email
      const { data: agent } = await supabase
        .from('agents')
        .select('email, name')
        .eq('id', prop.agent_id)
        .maybeSingle();

      if (agent?.email) {
        await sendViaResend(
          agent.email,
          `Your Featured boost has ended — ${prop.address}`,
          buildExpiredHtml({
            agentName: agent.name || 'Agent',
            address: prop.address,
            suburb: prop.suburb,
            boostTier: prop.boost_tier || 'featured',
            propertyId: prop.id,
          })
        );
      }

      results.expired++;
    }

    // Send summary to support if any expired
    if (results.expired > 0) {
      await sendViaResend(
        'support@listhq.com.au',
        `⚡ ${results.expired} boost(s) expired today`,
        `<h2>Boost expiry summary</h2>
        <p><strong>${results.expired}</strong> listing boost(s) expired and were automatically deactivated.</p>
        <p><strong>${results.warned}</strong> listing(s) were sent 5-day expiry warnings.</p>
        <p>Time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</p>
        <hr/>
        <p>No action required — boosts have been deactivated automatically.</p>`
      );
    }

    console.log(`Boost expiry notifier complete: ${results.warned} warned, ${results.expired} expired`);

    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in boost-expiry-notifier:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
