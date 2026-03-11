import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NotificationPayload {
  agent_id: string;
  type: string;
  title: string;
  message: string;
  property_id?: string;
  lead_name?: string;
  lead_email?: string;
  lead_phone?: string;
  lead_message?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload: NotificationPayload = await req.json();
    const { agent_id, type, title, message, property_id, lead_name, lead_email, lead_phone, lead_message } = payload;

    if (!agent_id || !title) {
      return new Response(JSON.stringify({ error: 'Missing agent_id or title' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get agent's email
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('email, name')
      .eq('id', agent_id)
      .maybeSingle();

    if (agentError || !agent?.email) {
      console.error('Could not find agent email:', agentError);
      return new Response(JSON.stringify({ error: 'Agent email not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get property details if available
    let propertyTitle = '';
    let propertyAddress = '';
    if (property_id) {
      const { data: prop } = await supabase
        .from('properties')
        .select('title, address, suburb, state')
        .eq('id', property_id)
        .maybeSingle();
      if (prop) {
        propertyTitle = prop.title;
        propertyAddress = `${prop.address}, ${prop.suburb}, ${prop.state}`;
      }
    }

    // Build email HTML
    const emailHtml = buildEmailHtml({
      agentName: agent.name,
      type,
      title,
      message,
      propertyTitle,
      propertyAddress,
      leadName: lead_name,
      leadEmail: lead_email,
      leadPhone: lead_phone,
      leadMessage: lead_message,
    });

    // Try to send email via Lovable transactional email
    // This will work once the email domain is configured
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.log('LOVABLE_API_KEY not set — email not sent, notification logged only');
      return new Response(JSON.stringify({ 
        success: false, 
        reason: 'Email domain not configured yet. Notification saved in-app.' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send transactional email
    const emailResponse = await fetch('https://api.lovable.dev/v1/email/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: agent.email,
        subject: title,
        html: emailHtml,
        purpose: 'transactional',
      }),
    });

    if (!emailResponse.ok) {
      const errBody = await emailResponse.text();
      console.error(`Email send failed [${emailResponse.status}]:`, errBody);
      return new Response(JSON.stringify({ 
        success: false, 
        reason: 'Email delivery failed. Domain may not be configured yet.',
        details: errBody,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Email notification sent to ${agent.email}: ${title}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-notification-email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildEmailHtml(params: {
  agentName: string;
  type: string;
  title: string;
  message: string;
  propertyTitle: string;
  propertyAddress: string;
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;
  leadMessage?: string;
}) {
  const { agentName, type, title, message, propertyTitle, propertyAddress, leadName, leadEmail, leadPhone, leadMessage } = params;
  
  const isLead = type === 'lead';
  const accentColor = isLead ? '#3B82F6' : '#10B981';
  const typeLabel = isLead ? '🔔 New Lead Enquiry' : '👆 Contact Interaction';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:24px;font-weight:700;color:#1a1a2e;">Global Homes</div>
      <div style="font-size:12px;color:#888;margin-top:4px;">Agent Notification</div>
    </div>

    <!-- Badge -->
    <div style="background:${accentColor}10;border:1px solid ${accentColor}30;border-radius:12px;padding:12px 16px;text-align:center;margin-bottom:24px;">
      <span style="font-size:14px;font-weight:600;color:${accentColor};">${typeLabel}</span>
    </div>

    <!-- Greeting -->
    <p style="font-size:15px;color:#333;margin:0 0 16px;">Hi ${agentName},</p>
    <p style="font-size:15px;color:#333;margin:0 0 24px;">${message}</p>

    ${propertyTitle ? `
    <!-- Property Card -->
    <div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;">
      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Property</div>
      <div style="font-size:15px;font-weight:600;color:#1a1a2e;">${propertyTitle}</div>
      ${propertyAddress ? `<div style="font-size:13px;color:#666;margin-top:4px;">📍 ${propertyAddress}</div>` : ''}
    </div>
    ` : ''}

    ${isLead && leadName ? `
    <!-- Lead Details -->
    <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin-bottom:24px;">
      <div style="font-size:11px;color:#3B82F6;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;font-weight:600;">Lead Details</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:4px 0;font-size:13px;color:#888;width:80px;">Name</td><td style="padding:4px 0;font-size:14px;color:#333;font-weight:500;">${leadName}</td></tr>
        ${leadEmail ? `<tr><td style="padding:4px 0;font-size:13px;color:#888;">Email</td><td style="padding:4px 0;font-size:14px;"><a href="mailto:${leadEmail}" style="color:#3B82F6;text-decoration:none;">${leadEmail}</a></td></tr>` : ''}
        ${leadPhone ? `<tr><td style="padding:4px 0;font-size:13px;color:#888;">Phone</td><td style="padding:4px 0;font-size:14px;"><a href="tel:${leadPhone}" style="color:#3B82F6;text-decoration:none;">${leadPhone}</a></td></tr>` : ''}
      </table>
      ${leadMessage ? `
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #bfdbfe;">
        <div style="font-size:11px;color:#888;margin-bottom:4px;">Message</div>
        <div style="font-size:14px;color:#333;line-height:1.5;">"${leadMessage}"</div>
      </div>
      ` : ''}
    </div>
    ` : ''}

    <!-- CTA -->
    <div style="text-align:center;margin:28px 0;">
      <a href="https://world-property-pulse.lovable.app/dashboard/leads" style="display:inline-block;background:${accentColor};color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;">View in Dashboard</a>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #eee;padding-top:20px;margin-top:32px;text-align:center;">
      <p style="font-size:11px;color:#aaa;margin:0;">You're receiving this because you're a registered agent on World Property Pulse.</p>
      <p style="font-size:11px;color:#aaa;margin:4px 0 0;">Manage notification preferences in your <a href="https://world-property-pulse.lovable.app/dashboard/settings" style="color:#888;">dashboard settings</a>.</p>
    </div>
  </div>
</body>
</html>`;
}
