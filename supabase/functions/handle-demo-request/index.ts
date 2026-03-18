import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body; // 'submit' | 'send_code'

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "submit") {
      // Save demo request, generate code, send admin + confirmation emails
      const { full_name, email, phone, agency_name, message } = body;
      if (!full_name || !email) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const code = generateCode();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { error: insertErr } = await supabase.from("demo_requests").insert({
        full_name,
        email,
        phone: phone || null,
        agency_name: agency_name || null,
        message: message || null,
        demo_code: code,
        demo_code_expires_at: expiresAt,
      });
      if (insertErr) throw insertErr;

      // Send admin notification email
      await sendEmail(resendApiKey, {
        to: "sales@everythingeco.com.au",
        subject: "New Demo Request — Global Homes",
        html: buildAdminEmailHtml({ full_name, agency_name, email, phone, message }),
      });

      // Send confirmation email to applicant
      await sendEmail(resendApiKey, {
        to: email,
        subject: "Your Global Homes Demo Request",
        html: buildConfirmationEmailHtml(full_name),
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "send_code") {
      // Admin approves → generate/send code to applicant
      const { request_id } = body;
      if (!request_id) {
        return new Response(JSON.stringify({ error: "Missing request_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch the request
      const { data: req_data, error: fetchErr } = await supabase
        .from("demo_requests")
        .select("*")
        .eq("id", request_id)
        .single();
      if (fetchErr || !req_data) throw fetchErr || new Error("Request not found");

      // Generate code if not already present
      let code = req_data.demo_code;
      if (!code) {
        code = generateCode();
      }
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Update the request
      const { error: updateErr } = await supabase
        .from("demo_requests")
        .update({
          status: "approved",
          demo_code: code,
          demo_code_expires_at: expiresAt,
        })
        .eq("id", request_id);
      if (updateErr) throw updateErr;

      // Send access code email
      const siteUrl = "https://globalhomes.lovable.app";
      await sendEmail(resendApiKey, {
        to: req_data.email,
        subject: "Your Global Homes Demo Access Code",
        html: buildAccessCodeEmailHtml({
          name: req_data.full_name,
          code,
          siteUrl,
        }),
      });

      return new Response(JSON.stringify({ success: true, code }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err: any) {
    console.error("handle-demo-request error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendEmail(apiKey: string, params: { to: string; subject: string; html: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: 'Global Homes <onboarding@resend.dev>',
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`Resend email failed [${res.status}]:`, errText);
  }
}

function buildAdminEmailHtml(p: { full_name: string; agency_name?: string; email: string; phone?: string; message?: string }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:22px;font-weight:700;color:#1a1a2e;">Global Homes</div>
      <div style="font-size:11px;color:#888;margin-top:2px;text-transform:uppercase;letter-spacing:1px;">New Demo Request</div>
    </div>
    <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:10px;padding:12px;text-align:center;margin-bottom:20px;">
      <span style="font-size:14px;font-weight:600;color:#92400e;">⏳ Pending Review</span>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 0;font-size:13px;color:#888;width:80px;">Name</td><td style="padding:8px 0;font-size:14px;color:#333;font-weight:600;">${p.full_name}</td></tr>
      <tr><td style="padding:8px 0;font-size:13px;color:#888;">Agency</td><td style="padding:8px 0;font-size:14px;color:#333;">${p.agency_name || '—'}</td></tr>
      <tr><td style="padding:8px 0;font-size:13px;color:#888;">Email</td><td style="padding:8px 0;font-size:14px;"><a href="mailto:${p.email}" style="color:#2563eb;">${p.email}</a></td></tr>
      <tr><td style="padding:8px 0;font-size:13px;color:#888;">Phone</td><td style="padding:8px 0;font-size:14px;color:#333;">${p.phone || '—'}</td></tr>
      ${p.message ? `<tr><td style="padding:8px 0;font-size:13px;color:#888;vertical-align:top;">Message</td><td style="padding:8px 0;font-size:14px;color:#333;">${p.message}</td></tr>` : ''}
    </table>
    <div style="text-align:center;margin-top:24px;">
      <a href="https://globalhomes.lovable.app/admin" style="display:inline-block;background:#2563eb;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">Review in Admin</a>
    </div>
  </div>
</div>
</body></html>`;
}

function buildConfirmationEmailHtml(name: string) {
  const siteUrl = "https://globalhomes.lovable.app";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:22px;font-weight:700;color:#1a1a2e;">Global Homes</div>
    </div>
    <p style="font-size:15px;color:#333;margin:0 0 16px;">Hi ${name},</p>
    <p style="font-size:15px;color:#333;margin:0 0 16px;">Thank you for your interest in Global Homes. We've received your demo request and will be in touch with you shortly.</p>
    <p style="font-size:15px;color:#333;margin:0 0 16px;">Click the button below to confirm your email and create your account password:</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${siteUrl}/agents/demo" style="display:inline-block;background:#2563eb;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">Create Your Account →</a>
    </div>
    <p style="font-size:13px;color:#888;margin:16px 0 0;">By clicking the link above you're confirming this email address is correct. You'll be able to set your password and get started once your demo is approved.</p>
    <div style="border-top:1px solid #eee;padding-top:16px;margin-top:24px;text-align:center;">
      <p style="font-size:11px;color:#aaa;margin:0;">Questions? Contact us at sales@everythingeco.com.au</p>
      <p style="font-size:11px;color:#aaa;margin:4px 0 0;">© Global Homes · Melbourne, Australia</p>
    </div>
  </div>
</div>
</body></html>`;
}

function buildAccessCodeEmailHtml(p: { name: string; code: string; siteUrl: string }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:22px;font-weight:700;color:#1a1a2e;">Global Homes</div>
      <div style="font-size:11px;color:#888;margin-top:2px;text-transform:uppercase;letter-spacing:1px;">Demo Access</div>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;text-align:center;margin-bottom:20px;">
      <span style="font-size:14px;font-weight:600;color:#16a34a;">✅ Your Demo Has Been Approved</span>
    </div>
    <p style="font-size:15px;color:#333;margin:0 0 16px;">Hi ${p.name},</p>
    <p style="font-size:15px;color:#333;margin:0 0 20px;">Great news! Your demo request has been approved. Use the access code below to explore the full Global Homes agent platform.</p>
    <div style="background:#f8f9fa;border:2px dashed #d1d5db;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Your Access Code</div>
      <div style="font-size:32px;font-weight:800;letter-spacing:4px;color:#1a1a2e;font-family:monospace;">${p.code}</div>
      <div style="font-size:12px;color:#888;margin-top:8px;">Valid for 7 days</div>
    </div>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;margin-bottom:24px;">
      <div style="font-size:13px;font-weight:600;color:#1e40af;margin-bottom:8px;">How to access your demo:</div>
      <ol style="font-size:13px;color:#333;margin:0;padding-left:20px;line-height:1.8;">
        <li>Go to <a href="${p.siteUrl}/agents/demo" style="color:#2563eb;font-weight:500;">${p.siteUrl}/agents/demo</a></li>
        <li>Enter your email address</li>
        <li>Enter the access code above</li>
        <li>Click Submit to access the demo dashboard</li>
      </ol>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${p.siteUrl}/agents/demo" style="display:inline-block;background:#16a34a;color:#fff;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">Access Demo Now →</a>
    </div>
    <div style="border-top:1px solid #eee;padding-top:16px;margin-top:24px;text-align:center;">
      <p style="font-size:11px;color:#aaa;margin:0;">Questions? Contact us at sales@everythingeco.com.au</p>
      <p style="font-size:11px;color:#aaa;margin:4px 0 0;">© Global Homes · Melbourne, Australia</p>
    </div>
  </div>
</div>
</body></html>`;
}
