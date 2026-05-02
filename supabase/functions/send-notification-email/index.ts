import "../_shared/email-footer.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logApiUsage, costFor } from "../_shared/usageLog.ts";

interface DirectPayload {
  to: string;
  subject: string;
  html: string;
}

interface NotificationPayload {
  agent_id?: string;
  type: string;
  title?: string;
  message?: string;
  property_id?: string;
  lead_name?: string;
  lead_email?: string;
  lead_phone?: string;
  lead_message?: string;
  agent_name?: string;
  agent_agency?: string;
  agent_email?: string;
  recipient_email?: string;
  recipient_name?: string;
  property_address?: string;
  amount_owed?: string;
  agent_phone?: string;
  document_name?: string;
  signing_link?: string;
  match_count?: number;
  suburb?: string;
  search_link?: string;
  inspection_type?: string;
  conducted_date?: string;
  report_link?: string;
  scheduled_date?: string;
  lease_end_date?: string;
  days_remaining?: string;
  notice_days?: number;
  tenant_name?: string;
  dispute_notes?: string;
}

function appendUnsubscribeFooter(html: string, recipientEmail: string): string {
  const safeEmail = encodeURIComponent(recipientEmail);
  const footer = `<p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;">You're receiving this because you're registered on ListHQ.<br><a href="https://listhq.com.au/unsubscribe?email=${safeEmail}" style="color:#9ca3af;">Unsubscribe</a></p>`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${footer}</body>`);
  }
  return html + footer;
}

async function sendViaResend(to: string, subject: string, html: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    return { ok: false, reason: 'RESEND_API_KEY not set' };
  }
  const from = Deno.env.get("EMAIL_FROM") || "ListHQ <noreply@listhq.com.au>";
  const htmlWithFooter = appendUnsubscribeFooter(html, to);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html: htmlWithFooter,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`Resend email failed [${res.status}]:`, errText);
    return { ok: false, reason: errText };
  }
  console.log(`Email sent to ${to}: ${subject}`);
  await logApiUsage({
    service: "resend",
    action: "email_sent",
    units: 1,
    cost_estimate: costFor.resend(),
    metadata: { subject },
  });
  return { ok: true };
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

    const payload = await req.json();

    // Direct send mode: { to, subject, html }
    if (payload.to && payload.subject && payload.html) {
      // ── Auth check: require service_role key OR a valid admin/agent JWT ──
      const authHeader = req.headers.get('Authorization') ?? '';
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      let authorized = false;
      if (bearer && bearer === serviceRoleKey) {
        authorized = true;
      } else if (bearer) {
        const authClient = createClient(
          supabaseUrl,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { global: { headers: { Authorization: `Bearer ${bearer}` } } }
        );
        const { data: userData } = await authClient.auth.getUser();
        if (userData?.user) {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userData.user.id);
          const roleList = (roles ?? []).map((r: any) => r.role);
          if (roleList.includes('admin') || roleList.includes('agent')) {
            authorized = true;
          }
        }
      }
      if (!authorized) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const p = payload as DirectPayload;
      const result = await sendViaResend(p.to, p.subject, p.html);
      return new Response(JSON.stringify({ success: result.ok, reason: result.reason }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Legacy notification mode
    const { type, title } = payload as NotificationPayload;
    if (!type) {
      return new Response(JSON.stringify({ error: 'Missing type' }), {
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

    } else if (type === 'new_message') {
      recipientEmail = payload.recipient_email || null;
      const subject = payload.title || 'You have a new message';
      if (recipientEmail) await sendViaResend(recipientEmail, subject, buildNewMessageHtml({ recipientName: payload.lead_name || payload.recipient_name || 'there' }));
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (type === 'agent_lead') {
      recipientEmail = payload.recipient_email || null;
      const subject = payload.title || `New enquiry from ${payload.lead_name || 'a buyer'}`;
      if (recipientEmail) await sendViaResend(recipientEmail, subject, buildAgentLeadHtml({ agentName: payload.recipient_name || payload.agent_name || 'Agent', buyerName: payload.lead_name, buyerEmail: payload.lead_email, buyerPhone: payload.lead_phone, buyerMessage: payload.lead_message || payload.message, propertyAddress: payload.property_address }));
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (type === 'arrears_chase') {
      recipientEmail = payload.recipient_email || null;
      const subject = payload.title || 'Rent Payment Overdue — Action Required';
      if (recipientEmail) await sendViaResend(recipientEmail, subject, buildArrearsHtml({ tenantName: payload.recipient_name || 'Tenant', propertyAddress: payload.property_address, amountOwed: payload.amount_owed, agentName: payload.agent_name, agentPhone: payload.agent_phone }));
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (type === 'signature_request') {
      recipientEmail = payload.recipient_email || null;
      const subject = payload.title || `Signature Required: ${payload.document_name || 'Document'}`;
      if (recipientEmail) await sendViaResend(recipientEmail, subject, buildSignatureRequestHtml({ recipientName: payload.recipient_name || 'there', documentName: payload.document_name, signingLink: payload.signing_link, agentName: payload.agent_name }));
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (type === 'search_alert') {
      recipientEmail = payload.recipient_email || null;
      const subject = payload.title || `New listings matching your search`;
      if (recipientEmail) await sendViaResend(recipientEmail, subject, buildSearchAlertHtml({ recipientName: payload.recipient_name || 'there', matchCount: payload.match_count || 1, suburb: payload.suburb, searchLink: payload.search_link }));
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (type === 'inspection_report') {
      recipientEmail = payload.recipient_email || null;
      const subject = payload.title || `Inspection Report — ${payload.property_address || 'Your Property'}`;
      if (recipientEmail) await sendViaResend(recipientEmail, subject, buildInspectionReportHtml({ recipientName: payload.recipient_name || 'Owner', propertyAddress: payload.property_address, inspectionType: payload.inspection_type, conductedDate: payload.conducted_date, reportLink: payload.report_link, agentName: payload.agent_name, agentPhone: payload.agent_phone }));
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (type === 'inspection_notice') {
      recipientEmail = payload.recipient_email || null;
      const tenantName = payload.tenant_name || payload.recipient_name || 'Tenant';
      const typeLabel = payload.inspection_type === 'entry' ? 'Entry/Move-in' : payload.inspection_type === 'exit' ? 'Exit/Move-out' : 'Routine';
      const subject = payload.title || `Inspection Notice — ${payload.property_address || 'Your Rental'}`;
      if (recipientEmail) await sendViaResend(recipientEmail, subject, buildInspectionNoticeHtml({ tenantName, propertyAddress: payload.property_address, inspectionType: typeLabel, scheduledDate: payload.scheduled_date, agentName: payload.agent_name || 'Your Property Manager', agentPhone: payload.agent_phone, noticeDays: payload.notice_days || 7 }));
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (type === 'lease_expiry') {
      recipientEmail = payload.recipient_email || null;
      const subject = payload.title || `Lease Expiry Notice — ${payload.property_address || 'Your Rental'}`;
      if (recipientEmail) await sendViaResend(recipientEmail, subject, buildLeaseExpiryHtml({ tenantName: payload.recipient_name || 'Tenant', propertyAddress: payload.property_address, leaseEndDate: payload.lease_end_date, daysRemaining: payload.days_remaining, agentName: payload.agent_name, agentPhone: payload.agent_phone }));
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (type === 'tenant_dispute') {
      recipientEmail = payload.recipient_email || null;
      const propAddr = payload.property_address || 'your managed property';
      const inspLabel = payload.inspection_type || 'entry';
      const subject = payload.title || `Tenant disputed ${inspLabel} condition report — ${propAddr}`;
      const safeNotes = (payload.dispute_notes || '').replace(/[<>]/g, (c) => c === '<' ? '&lt;' : '&gt;');
      const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f7f9;padding:24px;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:28px;border:1px solid #e5e7eb;">
  <h1 style="font-size:18px;color:#b91c1c;margin:0 0 12px;">Tenant has disputed an inspection report</h1>
  <p style="font-size:14px;color:#374151;margin:0 0 8px;">Hi ${payload.recipient_name || 'Property Manager'},</p>
  <p style="font-size:14px;color:#374151;margin:0 0 16px;">A tenant has raised concerns about the <strong>${inspLabel}</strong> condition report for <strong>${propAddr}</strong>.</p>
  <div style="background:#fef2f2;border-left:3px solid #b91c1c;padding:12px 14px;margin:0 0 18px;font-size:13px;color:#7f1d1d;white-space:pre-wrap;">${safeNotes || '(No notes provided)'}</div>
  ${payload.report_link ? `<p style="margin:0 0 8px;"><a href="${payload.report_link}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:14px;">View report</a></p>` : ''}
  <p style="font-size:12px;color:#6b7280;margin:24px 0 0;">You can mark the dispute as resolved from the Routine Inspections → Disputes tab in your dashboard.</p>
</div></body></html>`;
      if (recipientEmail) await sendViaResend(recipientEmail, subject, html);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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
        title: title || '',
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

    const result = await sendViaResend(recipientEmail, title || 'ListHQ Notification', emailHtml);
    return new Response(JSON.stringify({ success: result.ok, reason: result.reason }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-notification-email:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
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
    <a href="https://listhq.lovable.app/agents/login" style="display:inline-block;background:#16a34a;color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;">Sign In to Your Dashboard</a>
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

// ── New message notification ──
function buildNewMessageHtml(params: { recipientName: string }) {
  const { recipientName } = params;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:24px;font-weight:700;color:#1a1a2e;">ListHQ</div>
    <div style="font-size:12px;color:#888;margin-top:4px;">Notification</div>
  </div>
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:12px 16px;text-align:center;margin-bottom:24px;">
    <span style="font-size:14px;font-weight:600;color:#2563eb;">💬 New Message</span>
  </div>
  <p style="font-size:15px;color:#333;margin:0 0 16px;">Hi ${recipientName},</p>
  <p style="font-size:15px;color:#333;margin:0 0 24px;">You have a new message on ListHQ. Log in to read and reply.</p>
  <div style="text-align:center;margin:28px 0;">
    <a href="https://listhq.com.au/messages" style="display:inline-block;background:#2563eb;color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;">Go to Messages</a>
  </div>
  <div style="border-top:1px solid #eee;padding-top:20px;margin-top:32px;text-align:center;">
    <p style="font-size:11px;color:#aaa;margin:0;">© ListHQ Pty Ltd · Melbourne, Victoria, Australia</p>
  </div>
</div>
</body></html>`;
}

// ── Agent lead enquiry notification ──
function buildAgentLeadHtml(params: { agentName: string; buyerName?: string; buyerEmail?: string; buyerPhone?: string; buyerMessage?: string; propertyAddress?: string }) {
  const { agentName, buyerName, buyerEmail, buyerPhone, buyerMessage, propertyAddress } = params;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:24px;font-weight:700;color:#1a1a2e;">ListHQ</div>
    <div style="font-size:12px;color:#888;margin-top:4px;">Agent Notification</div>
  </div>
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:12px 16px;text-align:center;margin-bottom:24px;">
    <span style="font-size:14px;font-weight:600;color:#3B82F6;">🔔 New Buyer Enquiry</span>
  </div>
  <p style="font-size:15px;color:#333;margin:0 0 16px;">Hi ${agentName},</p>
  <p style="font-size:15px;color:#333;margin:0 0 20px;">You've received a new buyer enquiry${propertyAddress ? ` for <strong>${propertyAddress}</strong>` : ''}.</p>
  ${buyerName ? `<div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;">
    <div style="font-size:11px;color:#3B82F6;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;font-weight:600;">Buyer Details</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:4px 0;font-size:13px;color:#888;width:80px;">Name</td><td style="padding:4px 0;font-size:14px;color:#333;font-weight:500;">${buyerName}</td></tr>
      ${buyerEmail ? `<tr><td style="padding:4px 0;font-size:13px;color:#888;">Email</td><td style="padding:4px 0;font-size:14px;"><a href="mailto:${buyerEmail}" style="color:#3B82F6;text-decoration:none;">${buyerEmail}</a></td></tr>` : ''}
      ${buyerPhone ? `<tr><td style="padding:4px 0;font-size:13px;color:#888;">Phone</td><td style="padding:4px 0;font-size:14px;"><a href="tel:${buyerPhone}" style="color:#3B82F6;text-decoration:none;">${buyerPhone}</a></td></tr>` : ''}
    </table>
    ${buyerMessage ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb;">
      <div style="font-size:11px;color:#888;margin-bottom:4px;">Message</div>
      <div style="font-size:14px;color:#333;line-height:1.5;">"${buyerMessage}"</div>
    </div>` : ''}
  </div>` : ''}
  <div style="text-align:center;margin:28px 0;">
    <a href="https://listhq.com.au/dashboard/leads" style="display:inline-block;background:#3B82F6;color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;">View in Dashboard</a>
  </div>
  <div style="border-top:1px solid #eee;padding-top:20px;margin-top:32px;text-align:center;">
    <p style="font-size:11px;color:#aaa;margin:0;">You're receiving this because you're a registered agent on ListHQ.</p>
  </div>
</div>
</body></html>`;
}

// ── Arrears chase email ──
function buildArrearsHtml(params: { tenantName: string; propertyAddress?: string; amountOwed?: string; agentName?: string; agentPhone?: string }) {
  const { tenantName, propertyAddress, amountOwed, agentName, agentPhone } = params;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:24px;font-weight:700;color:#1a1a2e;">ListHQ</div>
    <div style="font-size:12px;color:#888;margin-top:4px;">Rental Notice</div>
  </div>
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:12px 16px;text-align:center;margin-bottom:24px;">
    <span style="font-size:14px;font-weight:600;color:#dc2626;">⚠️ Rent Payment Overdue</span>
  </div>
  <p style="font-size:15px;color:#333;margin:0 0 16px;">Dear ${tenantName},</p>
  <p style="font-size:15px;color:#333;margin:0 0 16px;">Our records indicate that your rent payment is currently overdue${propertyAddress ? ` for the property at <strong>${propertyAddress}</strong>` : ''}.</p>
  ${amountOwed ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;">
    <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Amount Owing</div>
    <div style="font-size:28px;font-weight:700;color:#dc2626;">$${amountOwed}</div>
  </div>` : ''}
  <p style="font-size:15px;color:#333;margin:0 0 16px;">Please arrange payment at your earliest convenience. If you have already made this payment, please disregard this notice.</p>
  <p style="font-size:15px;color:#333;margin:0 0 24px;">If you are experiencing difficulties, please contact your property manager to discuss your options.</p>
  ${agentName || agentPhone ? `<div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;">
    <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Your Property Manager</div>
    ${agentName ? `<div style="font-size:14px;color:#333;font-weight:500;">${agentName}</div>` : ''}
    ${agentPhone ? `<div style="font-size:14px;margin-top:4px;"><a href="tel:${agentPhone}" style="color:#3B82F6;text-decoration:none;">${agentPhone}</a></div>` : ''}
  </div>` : ''}
  <div style="border-top:1px solid #eee;padding-top:20px;margin-top:32px;text-align:center;">
    <p style="font-size:11px;color:#aaa;margin:0;">This is an automated notice from ListHQ on behalf of your property manager.</p>
    <p style="font-size:11px;color:#aaa;margin:4px 0 0;">© ListHQ Pty Ltd · Melbourne, Victoria, Australia</p>
  </div>
</div>
</body></html>`;
}

// ── Signature request email ──
function buildSignatureRequestHtml(params: { recipientName: string; documentName?: string; signingLink?: string; agentName?: string }) {
  const { recipientName, documentName, signingLink, agentName } = params;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:24px;font-weight:700;color:#1a1a2e;">ListHQ</div>
    <div style="font-size:12px;color:#888;margin-top:4px;">e-Signature</div>
  </div>
  <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:12px 16px;text-align:center;margin-bottom:24px;">
    <span style="font-size:14px;font-weight:600;color:#ca8a04;">✍️ Signature Required</span>
  </div>
  <p style="font-size:15px;color:#333;margin:0 0 16px;">Hi ${recipientName},</p>
  <p style="font-size:15px;color:#333;margin:0 0 16px;">You have been requested to sign the following document:</p>
  ${documentName ? `<div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;">
    <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Document</div>
    <div style="font-size:16px;font-weight:600;color:#1a1a2e;">${documentName}</div>
  </div>` : ''}
  <p style="font-size:13px;color:#555;margin:0 0 20px;line-height:1.5;">This is a legally binding electronic signature request under the <em>Electronic Transactions Act 1999</em> (Cth). By signing, you agree that your electronic signature carries the same legal weight as a handwritten signature.</p>
  ${signingLink ? `<div style="text-align:center;margin:28px 0;">
    <a href="${signingLink}" style="display:inline-block;background:#ca8a04;color:#fff;font-size:14px;font-weight:600;padding:14px 40px;border-radius:10px;text-decoration:none;">Sign Document</a>
  </div>` : ''}
  ${agentName ? `<p style="font-size:14px;color:#555;margin:0 0 16px;">Sent by: <strong>${agentName}</strong></p>` : ''}
  <div style="border-top:1px solid #eee;padding-top:20px;margin-top:32px;text-align:center;">
    <p style="font-size:11px;color:#aaa;margin:0;">If you did not expect this request, please ignore this email.</p>
    <p style="font-size:11px;color:#aaa;margin:4px 0 0;">© ListHQ Pty Ltd · Melbourne, Victoria, Australia</p>
  </div>
</div>
</body></html>`;
}

// ── Search alert email ──
function buildSearchAlertHtml(params: { recipientName: string; matchCount: number; suburb?: string; searchLink?: string }) {
  const { recipientName, matchCount, suburb, searchLink } = params;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:24px;font-weight:700;color:#1a1a2e;">ListHQ</div>
    <div style="font-size:12px;color:#888;margin-top:4px;">Property Alerts</div>
  </div>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 16px;text-align:center;margin-bottom:24px;">
    <span style="font-size:14px;font-weight:600;color:#16a34a;">🏠 New Listings Found</span>
  </div>
  <p style="font-size:15px;color:#333;margin:0 0 16px;">Hi ${recipientName},</p>
  <p style="font-size:15px;color:#333;margin:0 0 24px;">We found <strong>${matchCount}</strong> new${suburb ? ` ${suburb}` : ''} listing${matchCount !== 1 ? 's' : ''} matching your saved search.</p>
  ${searchLink ? `<div style="text-align:center;margin:28px 0;">
    <a href="${searchLink}" style="display:inline-block;background:#16a34a;color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;">View Listings</a>
  </div>` : ''}
  <div style="border-top:1px solid #eee;padding-top:20px;margin-top:32px;text-align:center;">
    <p style="font-size:11px;color:#aaa;margin:0;">You're receiving this because you have a saved search on ListHQ.</p>
    <p style="font-size:11px;color:#aaa;margin:4px 0 0;">© ListHQ Pty Ltd · Melbourne, Victoria, Australia</p>
  </div>
</div>
</body></html>`;
}

// ── Inspection report notification ──
function buildInspectionReportHtml(params: { recipientName: string; propertyAddress?: string; inspectionType?: string; conductedDate?: string; reportLink?: string; agentName?: string; agentPhone?: string }) {
  const { recipientName, propertyAddress, inspectionType, conductedDate, reportLink, agentName, agentPhone } = params;
  const typeLabel = inspectionType ? inspectionType.charAt(0).toUpperCase() + inspectionType.slice(1) : 'Property';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:24px;font-weight:700;color:#1a1a2e;">ListHQ</div>
    <div style="font-size:12px;color:#888;margin-top:4px;">Condition Report</div>
  </div>
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:12px 16px;text-align:center;margin-bottom:24px;">
    <span style="font-size:14px;font-weight:600;color:#2563eb;">📋 ${typeLabel} Condition Report Ready</span>
  </div>
  <p style="font-size:15px;color:#333;margin:0 0 16px;">Dear ${recipientName},</p>
  <p style="font-size:15px;color:#333;margin:0 0 20px;">The ${typeLabel.toLowerCase()} condition report for your property is now available for review.</p>
  ${propertyAddress ? `<div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;">
    <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Property</div>
    <div style="font-size:15px;font-weight:600;color:#1a1a2e;">📍 ${propertyAddress}</div>
    ${conductedDate ? `<div style="font-size:13px;color:#666;margin-top:6px;">Conducted: ${conductedDate}</div>` : ''}
  </div>` : ''}
  ${reportLink ? `<div style="text-align:center;margin:28px 0;">
    <a href="${reportLink}" style="display:inline-block;background:#2563eb;color:#fff;font-size:14px;font-weight:600;padding:14px 40px;border-radius:10px;text-decoration:none;">View Full Report</a>
  </div>` : ''}
  ${agentName || agentPhone ? `<div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;">
    <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Your Property Manager</div>
    ${agentName ? `<div style="font-size:14px;color:#333;font-weight:500;">${agentName}</div>` : ''}
    ${agentPhone ? `<div style="font-size:14px;margin-top:4px;"><a href="tel:${agentPhone}" style="color:#3B82F6;text-decoration:none;">${agentPhone}</a></div>` : ''}
  </div>` : ''}
  <div style="border-top:1px solid #eee;padding-top:20px;margin-top:32px;text-align:center;">
    <p style="font-size:11px;color:#aaa;margin:0;">This report was generated by ListHQ on behalf of your property manager.</p>
    <p style="font-size:11px;color:#aaa;margin:4px 0 0;">© ListHQ Pty Ltd · Melbourne, Victoria, Australia</p>
  </div>
</div>
</body></html>`;
}

// ── Inspection notice to tenant ──
function buildInspectionNoticeHtml(params: { tenantName: string; propertyAddress?: string; inspectionType?: string; scheduledDate?: string; agentName?: string; agentPhone?: string; noticeDays?: number }) {
  const { tenantName, propertyAddress, inspectionType, scheduledDate, agentName, agentPhone, noticeDays = 7 } = params;
  const typeLabel = inspectionType || 'Property';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:24px;font-weight:700;color:#1a1a2e;">ListHQ</div>
    <div style="font-size:12px;color:#888;margin-top:4px;">Property Management</div>
  </div>
  <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:12px 16px;text-align:center;margin-bottom:24px;">
    <span style="font-size:14px;font-weight:600;color:#ca8a04;">🏠 Inspection Notice — ${noticeDays} Days Notice</span>
  </div>
  <p style="font-size:15px;color:#333;margin:0 0 16px;">Dear ${tenantName},</p>
  <p style="font-size:15px;color:#333;margin:0 0 16px;">This is formal notice that a <strong>${typeLabel} Inspection</strong> has been scheduled for your property.</p>
  <div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:6px 0;font-size:13px;color:#888;width:120px;">Property</td><td style="padding:6px 0;font-size:14px;color:#333;font-weight:500;">${propertyAddress || 'Your rental property'}</td></tr>
      <tr><td style="padding:6px 0;font-size:13px;color:#888;">Inspection Type</td><td style="padding:6px 0;font-size:14px;color:#333;">${typeLabel} Inspection</td></tr>
      ${scheduledDate ? `<tr><td style="padding:6px 0;font-size:13px;color:#888;">Scheduled Date</td><td style="padding:6px 0;font-size:14px;color:#333;font-weight:600;">${scheduledDate}</td></tr>` : ''}
      ${agentName ? `<tr><td style="padding:6px 0;font-size:13px;color:#888;">Property Manager</td><td style="padding:6px 0;font-size:14px;color:#333;">${agentName}</td></tr>` : ''}
    </table>
  </div>
  <p style="font-size:15px;color:#333;margin:0 0 16px;">You are not required to be present during the inspection, however you are welcome to be there. Please ensure reasonable access is provided.</p>
  <p style="font-size:15px;color:#333;margin:0 0 24px;">If this date is inconvenient, please contact your property manager as soon as possible to arrange an alternative time.</p>
  ${agentPhone ? `<div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;">
    <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Contact</div>
    ${agentName ? `<div style="font-size:14px;color:#333;font-weight:500;">${agentName}</div>` : ''}
    <div style="font-size:14px;margin-top:4px;"><a href="tel:${agentPhone}" style="color:#3B82F6;text-decoration:none;">${agentPhone}</a></div>
  </div>` : ''}
  <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:24px;">
    <p style="font-size:12px;color:#92400e;margin:0;">This is an official inspection notice issued under the Residential Tenancies Act.</p>
  </div>
  <div style="border-top:1px solid #eee;padding-top:20px;margin-top:32px;text-align:center;">
    <p style="font-size:11px;color:#aaa;margin:0;">© ListHQ Pty Ltd · Property Management Platform</p>
  </div>
</div>
</body></html>`;
}

function buildLeaseExpiryHtml({ tenantName, propertyAddress, leaseEndDate, daysRemaining, agentName, agentPhone }: { tenantName: string; propertyAddress?: string; leaseEndDate?: string; daysRemaining?: string; agentName?: string; agentPhone?: string }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 32px 24px;text-align:center;">
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;">Lease Expiry Notice</h1>
    <p style="margin:8px 0 0;font-size:13px;color:#94a3b8;">Action may be required</p>
  </div>
  <div style="padding:32px;">
    <p style="font-size:15px;color:#333;margin:0 0 16px;">Dear ${tenantName},</p>
    <p style="font-size:15px;color:#333;margin:0 0 16px;">This is a formal notice regarding your lease for the property at:</p>
    ${propertyAddress ? `<div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;">
      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Property</div>
      <div style="font-size:16px;font-weight:600;color:#1a1a2e;">${propertyAddress}</div>
    </div>` : ''}
    <div style="display:flex;gap:12px;margin-bottom:24px;">
      ${leaseEndDate ? `<div style="flex:1;background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:11px;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Lease Expires</div>
        <div style="font-size:18px;font-weight:700;color:#92400e;">${leaseEndDate}</div>
      </div>` : ''}
      ${daysRemaining ? `<div style="flex:1;background:#fee2e2;border:1px solid #fecaca;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:11px;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Days Remaining</div>
        <div style="font-size:18px;font-weight:700;color:#991b1b;">${daysRemaining}</div>
      </div>` : ''}
    </div>
    <p style="font-size:15px;color:#333;margin:0 0 16px;">We encourage you to contact your property manager at your earliest convenience to discuss renewal options and ensure a smooth transition.</p>
    ${agentName || agentPhone ? `<div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;">
      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Your Property Manager</div>
      ${agentName ? `<div style="font-size:14px;color:#333;font-weight:500;">${agentName}</div>` : ''}
      ${agentPhone ? `<div style="font-size:14px;margin-top:4px;"><a href="tel:${agentPhone}" style="color:#3B82F6;text-decoration:none;">${agentPhone}</a></div>` : ''}
    </div>` : ''}
    <div style="border-top:1px solid #eee;padding-top:20px;margin-top:32px;text-align:center;">
      <p style="font-size:11px;color:#aaa;margin:0;">This notice is sent on behalf of your property manager via ListHQ.</p>
      <p style="font-size:11px;color:#aaa;margin:4px 0 0;">© ListHQ Pty Ltd · Melbourne, Victoria, Australia</p>
    </div>
  </div>
</div>
</body></html>`;
}