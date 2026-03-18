import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TEST MODE: Resend free tier only delivers to the account owner email.
// All emails are physically sent to TEST_TO but subject shows the real recipient.
// When domain is verified, remove TEST_TO and use the real `to` address.
const FROM = "onboarding@resend.dev";
const TEST_TO = "alanktmperry@gmail.com";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function sendEmail(apiKey: string, intendedTo: string, subject: string, html: string) {
  const recipient = TEST_TO;
  const testSubject = intendedTo === TEST_TO ? subject : `[→ ${intendedTo}] ${subject}`;
  console.log(`[email] Sending to: ${recipient} (intended: ${intendedTo}) | Subject: ${subject}`);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [recipient], subject: testSubject, html }),
  });
  const txt = await res.text();
  if (!res.ok) console.error(`[email] FAILED ${res.status}: ${txt}`);
  else console.log(`[email] SUCCESS: ${txt}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("RESEND_API_KEY is not set!");
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: corsHeaders });
    }

    if (body.action === "submit") {
      const { full_name, email, phone, agency_name, message } = body;
      if (!full_name || !email) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: corsHeaders });

      const code = generateCode();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: e } = await supabase.from("demo_requests").insert({
        full_name, email, phone: phone || null, agency_name: agency_name || null,
        message: message || null, demo_code: code, demo_code_expires_at: expiresAt,
      });
      if (e) throw e;

      // Admin alert
      await sendEmail(apiKey, "sales@everythingeco.com.au", `New Demo Request — ${full_name}`, buildAdminEmail({ full_name, email, phone, agency_name, message }));
      // Applicant confirmation
      await sendEmail(apiKey, email, "We've received your Global Homes demo request", buildConfirmationEmail(full_name, email));
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    } else if (body.action === "send_code") {
      const { request_id } = body;
      if (!request_id) return new Response(JSON.stringify({ error: "Missing request_id" }), { status: 400, headers: corsHeaders });

      const { data: r, error: fe } = await supabase.from("demo_requests").select("*").eq("id", request_id).single();
      if (fe || !r) throw fe || new Error("Not found");

      const code = r.demo_code || generateCode();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("demo_requests").update({ status: "approved", demo_code: code, demo_code_expires_at: expiresAt }).eq("id", request_id);

      const demoUrl = `https://globalhomes.lovable.app/agents/demo?email=${encodeURIComponent(r.email)}`;
      await sendEmail(apiKey, r.email, "Your Global Homes Demo Access Code", buildAccessCodeEmail(r.full_name, r.email, code, demoUrl));
      return new Response(JSON.stringify({ success: true, code }), { headers: corsHeaders });

    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
    }
  } catch (err: any) {
    console.error("handle-demo-request error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

function buildAdminEmail(p: { full_name: string; email: string; phone?: string; agency_name?: string; message?: string }) {
  return `<html><body><div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;">
    <div style="background:#0f172a;padding:24px 32px;text-align:center;">
      <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Global Homes</div>
      <div style="color:#94a3b8;font-size:13px;margin-top:4px;">Admin Notification</div>
    </div>
    <div style="padding:32px;">
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:6px;margin-bottom:24px;">
        <strong style="color:#92400e;">⏳ New demo request — action required</strong>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${p.message ? `<tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;width:100px;">Message</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${p.message}</td></tr>` : ""}
        <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;width:100px;">Name</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;">${p.full_name}</td></tr>
        <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;">Agency</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${p.agency_name || "—"}</td></tr>
        <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;">Email</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${p.email}</td></tr>
        <tr><td style="padding:10px 12px;color:#64748b;">Phone</td><td style="padding:10px 12px;">${p.phone || "—"}</td></tr>
      </table>
      <div style="text-align:center;margin-top:28px;">
        <a href="https://globalhomes.lovable.app/admin" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Review in Admin Dashboard →</a>
      </div>
    </div>
    <div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">
      <div>© Global Homes · Melbourne, Australia</div>
    </div>
</div></body></html>`;
}

function buildConfirmationEmail(name: string, email: string) {
  return `<html><body><div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;">
    <div style="background:#0f172a;padding:24px 32px;text-align:center;">
      <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Global Homes</div>
      <div style="color:#94a3b8;font-size:13px;margin-top:4px;">Demo Request Received</div>
    </div>
    <div style="padding:32px;">
      <div style="font-size:18px;font-weight:600;color:#0f172a;margin-bottom:12px;">Hi ${name},</div>
      <div style="color:#334155;font-size:14px;line-height:1.7;margin-bottom:20px;">Thank you for your interest in the Global Homes platform. We've received your demo request and our team will review it shortly.</div>
      <div style="background:#f1f5f9;padding:16px 20px;border-radius:8px;margin-bottom:20px;">
        <div style="font-weight:600;color:#0f172a;margin-bottom:6px;">What happens next?</div>
        <div style="color:#475569;font-size:14px;line-height:1.6;">Once approved, we'll send your unique access code to <strong>${email}</strong>. Use that code to log into your personalised demo dashboard.</div>
      </div>
      <div style="color:#64748b;font-size:13px;">If you have any questions in the meantime, reach us at <a href="mailto:sales@everythingeco.com.au" style="color:#2563eb;text-decoration:none;">sales@everythingeco.com.au</a></div>
    </div>
    <div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">
      <div>© Global Homes · Melbourne, Australia · You're receiving this because you requested a demo.</div>
    </div>
  </div>
</body></html>`;
}

function buildAccessCodeEmail(name: string, email: string, code: string, demoUrl: string) {
  return `<html><body><div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;">
    <div style="background:#0f172a;padding:24px 32px;text-align:center;">
      <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Global Homes</div>
      <div style="color:#94a3b8;font-size:13px;margin-top:4px;">Demo Access Approved</div>
    </div>
    <div style="padding:32px;">
      <div style="background:#dcfce7;border-left:4px solid #22c55e;padding:12px 16px;border-radius:6px;margin-bottom:24px;">
        <strong style="color:#166534;">✅ Your demo request has been approved</strong>
      </div>
      <div style="font-size:16px;color:#0f172a;margin-bottom:16px;">Hi ${name},</div>
      <div style="color:#334155;font-size:14px;line-height:1.7;margin-bottom:24px;">Great news — you've been approved for a Global Homes agent demo. Use your personal access code below to log in and explore the full platform.</div>
      <div style="background:#0f172a;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <div style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Your Access Code</div>
        <div style="color:#fff;font-size:32px;font-weight:700;letter-spacing:4px;font-family:monospace;">${code}</div>
        <div style="color:#64748b;font-size:11px;margin-top:8px;">Valid for 7 days · Do not share this code</div>
      </div>
      <div style="background:#f1f5f9;padding:16px 20px;border-radius:8px;margin-bottom:24px;">
        <div style="font-weight:600;color:#0f172a;margin-bottom:8px;">How to access your demo:</div>
        <div style="color:#475569;font-size:14px;line-height:1.8;">
          <div>1. Click the button below — your email is pre-filled automatically</div>
          <div>2. Enter your access code: <strong>${code}</strong></div>
          <div>3. Click <strong>Access My Demo</strong> — you're in!</div>
        </div>
      </div>
      <div style="text-align:center;margin-bottom:16px;">
        <a href="${demoUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Access My Demo →</a>
      </div>
      <div style="text-align:center;color:#94a3b8;font-size:12px;">Button not working? <a href="${demoUrl}" style="color:#2563eb;text-decoration:none;">${demoUrl}</a></div>
    </div>
    <div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">
      <div>Questions? <a href="mailto:sales@everythingeco.com.au" style="color:#2563eb;text-decoration:none;">sales@everythingeco.com.au</a> · © Global Homes · Melbourne, Australia</div>
    </div>
  </div>
</div></body></html>`;
}
