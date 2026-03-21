import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DirectPayload {
  to: string;
  subject: string;
  html: string;
}

interface NotificationPayload {
  agent_id?: string;
  type: string;
  title: string;
  message: string;
  property_id?: string;
  lead_name?: string;
  lead_email?: string;
  lead_phone?: string;
  lead_message?: string;
  agent_name?: string;
  agent_agency?: string;
  agent_email?: string;
}

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json();

    // Direct send mode: { to, subject, html }
    if (payload.to && payload.subject && payload.html) {
      const p = payload as DirectPayload;
      const result = await sendViaResend(p.to, p.subject, p.html);
      return new Response(JSON.stringify({ success: result.ok, reason: result.reason }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Legacy notification mode
    const { type, title } = payload as NotificationPayload;
    if (!title || !type) {
      return new Response(JSON.stringify({ error: 'Missing title or type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine recipient email and HTML based on type
    let recipientEmail: string | null = null;
    let emailHtml = '';

    if (type === 'agent_welcome') {
      recipientEmail = payload.agent_email || null;
      emailHtml = buildWelcomeEmailHtml(payload.agent_name || 'Agent');
    } else if (type === 'admin_new_agent') {
      recipientEmail = Deno.env.get('ADMIN_EMAIL') || null;
      if (!recipientEmail) {
        console.log('ADMIN_EMAIL not configured — skipping admin notification');
        return new Response(JSON.stringify({ success: false, reason: 'ADMIN_EMAIL not set' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      emailHtml = buildAdminNewAgentHtml({
        agentName: payload.agent_name || 'Unknown',
        agentAgency: payload.agent_agency || 'Independent',
        agentEmail: payload.agent_email || 'N/A',
      });
    } else {
      // Existing lead/event notification flow
      if (!payload.agent_id) {
        return new Response(JSON.stringify({ error: 'Missing agent_id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('email, name')
        .eq('id', payload.agent_id)
        .maybeSingle();

      if (agentError || !agent?.email) {
        console.error('Could not find agent email:', agentError);
        return new Response(JSON.stringify({ error: 'Agent email not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      recipientEmail = agent.email;

      let propertyTitle = '';
      let propertyAddress = '';
      if (payload.property_id) {
        const { data: prop } = await supabase
          .from('properties')
          .select('title, address, suburb, state')
          .eq('id', payload.property_id)
          .maybeSingle();
        if (prop) {
          propertyTitle = prop.title;
          propertyAddress = `${prop.address}, ${prop.suburb}, ${prop.state}`;
        }
      }

      emailHtml = buildLeadEventEmailHtml({
        agentName: agent.name,
        type,
        title,
        message: payload.message || '',
        propertyTitle,
        propertyAddress,
        leadName: payload.lead_name,
        leadEmail: payload.lead_email,
        leadPhone: payload.lead_phone,
        leadMessage: payload.lead_message,
      });
    }

    if (!recipientEmail) {
      return new Response(JSON.stringify({ success: false, reason: 'No recipient email' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await sendViaResend(recipientEmail, title, emailHtml);
    return new Response(JSON.stringify({ success: result.ok, reason: result.reason }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-notification-email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ── Welcome email for new agent ──
function buildWelcomeEmailHtml(agentName: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:24px;font-weight:700;color:#1a1a2e;">ListHQ</div>
    <div style="font-size:12px;color:#888;margin-top:4px;">Agent Network</div>
  </div>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 16px;text-align:center;margin-bottom:24px;">
    <span style="font-size:14px;font-weight:600;color:#16a34a;">✅ Account Created</span>
  </div>
  <p style="font-size:15px;color:#333;margin:0 0 16px;">Hi ${agentName},</p>
  <p style="font-size:15px;color:#333;margin:0 0 16px;">Welcome to ListHQ! Your agent account has been created and is now <strong>pending review</strong>.</p>
  <p style="font-size:15px;color:#333;margin:0 0 16px;">Our team will verify your credentials and approve your account within <strong>24–48 hours</strong>. Once approved, you'll have full access to:</p>
  <ul style="font-size:14px;color:#555;line-height:1.8;margin:0 0 20px 20px;">
    <li>Voice-qualified buyer leads for your territory</li>
    <li>Pocket listing tools & off-market network</li>
    <li>Trust accounting & compliance dashboards</li>
    <li>Analytics and performance insights</li>
  </ul>
  <p style="font-size:15px;color:#333;margin:0 0 24px;">We'll email you as soon as your account is approved. In the meantime, feel free to explore the platform.</p>
  <div style="text-align:center;margin:28px 0;">
    <a href="https://listhq.lovable.app/agent-auth" style="display:inline-block;background:#16a34a;color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;">Sign In to Your Dashboard</a>
  </div>
  <div style="border-top:1px solid #eee;padding-top:20px;margin-top:32px;text-align:center;">
    <p style="font-size:11px;color:#aaa;margin:0;">Questions? Reply to this email or contact our support team.</p>
    <p style="font-size:11px;color:#aaa;margin:4px 0 0;">© ListHQ Pty Ltd · Melbourne, Victoria, Australia</p>
  </div>
</div>
</body></html>`;
}

// ── Admin alert: new agent registered ──
function buildAdminNewAgentHtml(params: { agentName: string; agentAgency: string; agentEmail: string }) {
  const { agentName, agentAgency, agentEmail } = params;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:24px;font-weight:700;color:#1a1a2e;">ListHQ</div>
    <div style="font-size:12px;color:#888;margin-top:4px;">Admin Alert</div>
  </div>
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:12px 16px;text-align:center;margin-bottom:24px;">
    <span style="font-size:14px;font-weight:600;color:#2563eb;">🆕 New Agent Registration</span>
  </div>
  <p style="font-size:15px;color:#333;margin:0 0 16px;">A new agent has registered and requires approval:</p>
  <div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:6px 0;font-size:13px;color:#888;width:80px;">Name</td><td style="padding:6px 0;font-size:14px;color:#333;font-weight:500;">${agentName}</td></tr>
      <tr><td style="padding:6px 0;font-size:13px;color:#888;">Agency</td><td style="padding:6px 0;font-size:14px;color:#333;">${agentAgency}</td></tr>
      <tr><td style="padding:6px 0;font-size:13px;color:#888;">Email</td><td style="padding:6px 0;font-size:14px;"><a href="mailto:${agentEmail}" style="color:#2563eb;text-decoration:none;">${agentEmail}</a></td></tr>
    </table>
  </div>
  <div style="text-align:center;margin:28px 0;">
    <a href="https://listhq.lovable.app/admin" style="display:inline-block;background:#2563eb;color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;">Review in Admin Dashboard</a>
  </div>
  <div style="border-top:1px solid #eee;padding-top:20px;margin-top:32px;text-align:center;">
    <p style="font-size:11px;color:#aaa;margin:0;">This is an automated notification from ListHQ.</p>
  </div>
</div>
</body></html>`;
}

// ── Existing lead/event email ──
function buildLeadEventEmailHtml(params: {
  agentName: string; type: string; title: string; message: string;
  propertyTitle: string; propertyAddress: string;
  leadName?: string; leadEmail?: string; leadPhone?: string; leadMessage?: string;
}) {
  const { agentName, type, title, message, propertyTitle, propertyAddress, leadName, leadEmail, leadPhone, leadMessage } = params;
  const isLead = type === 'lead';
  const accentColor = isLead ? '#3B82F6' : '#10B981';
  const typeLabel = isLead ? '🔔 New Lead Enquiry' : '👆 Contact Interaction';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:24px;font-weight:700;color:#1a1a2e;">ListHQ</div>
    <div style="font-size:12px;color:#888;margin-top:4px;">Agent Notification</div>
  </div>
  <div style="background:${accentColor}10;border:1px solid ${accentColor}30;border-radius:12px;padding:12px 16px;text-align:center;margin-bottom:24px;">
    <span style="font-size:14px;font-weight:600;color:${accentColor};">${typeLabel}</span>
  </div>
  <p style="font-size:15px;color:#333;margin:0 0 16px;">Hi ${agentName},</p>
  <p style="font-size:15px;color:#333;margin:0 0 24px;">${message}</p>
  ${propertyTitle ? `<div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;">
    <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Property</div>
    <div style="font-size:15px;font-weight:600;color:#1a1a2e;">${propertyTitle}</div>
    ${propertyAddress ? `<div style="font-size:13px;color:#666;margin-top:4px;">📍 ${propertyAddress}</div>` : ''}
  </div>` : ''}
  ${isLead && leadName ? `<div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin-bottom:24px;">
    <div style="font-size:11px;color:#3B82F6;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;font-weight:600;">Lead Details</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:4px 0;font-size:13px;color:#888;width:80px;">Name</td><td style="padding:4px 0;font-size:14px;color:#333;font-weight:500;">${leadName}</td></tr>
      ${leadEmail ? `<tr><td style="padding:4px 0;font-size:13px;color:#888;">Email</td><td style="padding:4px 0;font-size:14px;"><a href="mailto:${leadEmail}" style="color:#3B82F6;text-decoration:none;">${leadEmail}</a></td></tr>` : ''}
      ${leadPhone ? `<tr><td style="padding:4px 0;font-size:13px;color:#888;">Phone</td><td style="padding:4px 0;font-size:14px;"><a href="tel:${leadPhone}" style="color:#3B82F6;text-decoration:none;">${leadPhone}</a></td></tr>` : ''}
    </table>
    ${leadMessage ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #bfdbfe;">
      <div style="font-size:11px;color:#888;margin-bottom:4px;">Message</div>
      <div style="font-size:14px;color:#333;line-height:1.5;">"${leadMessage}"</div>
    </div>` : ''}
  </div>` : ''}
  <div style="text-align:center;margin:28px 0;">
    <a href="https://listhq.lovable.app/dashboard/leads" style="display:inline-block;background:${accentColor};color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;">View in Dashboard</a>
  </div>
  <div style="border-top:1px solid #eee;padding-top:20px;margin-top:32px;text-align:center;">
    <p style="font-size:11px;color:#aaa;margin:0;">You're receiving this because you're a registered agent on ListHQ.</p>
    <p style="font-size:11px;color:#aaa;margin:4px 0 0;">Manage notification preferences in your <a href="https://listhq.lovable.app/dashboard/settings" style="color:#888;">dashboard settings</a>.</p>
  </div>
</div>
</body></html>`;
}
