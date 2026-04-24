import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const FROM = Deno.env.get("EMAIL_FROM") || "ListHQ <noreply@listhq.com.au>";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateTempPassword(): string {
  return `GhDemo!${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}aA1`;
}

async function sendEmail(apiKey: string, intendedTo: string, subject: string, html: string) {
  console.log(`[email] Sending to: ${intendedTo} | Subject: ${subject}`);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [intendedTo], subject, html }),
  });
  const txt = await res.text();
  if (!res.ok) console.error(`[email] FAILED ${res.status}: ${txt}`);
  else console.log(`[email] SUCCESS: ${txt}`);
}

async function ensureDemoAuthUser(supabase: any, email: string, fullName?: string) {
  const normalizedEmail = email.trim().toLowerCase();

  // Use getUserByEmail instead of full-table scan (fix #6)
  const { data: userData, error: getUserErr } = await supabase.auth.admin.getUserByEmail(normalizedEmail);
  let authUser = getUserErr ? null : userData?.user || null;

  if (!authUser) {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: generateTempPassword(),
      email_confirm: true,
      user_metadata: {
        display_name: fullName || normalizedEmail,
        demo_access: true,
      },
    });
    if (createErr) throw createErr;
    authUser = created.user;
  }

  const { data: existingAgent, error: agentCheckErr } = await supabase
    .from("agents")
    .select("id")
    .eq("user_id", authUser.id)
    .maybeSingle();
  if (agentCheckErr) throw agentCheckErr;

  if (!existingAgent) {
    const { error: agentInsertErr } = await supabase.from("agents").insert({
      user_id: authUser.id,
      name: fullName || "Demo Agent",
      email: normalizedEmail,
      is_demo: true,
      is_subscribed: false,
      is_approved: true,
    });
    if (agentInsertErr) throw agentInsertErr;
  }

  const { error: roleUpsertErr } = await supabase
    .from("user_roles")
    .upsert({ user_id: authUser.id, role: "agent" }, { onConflict: "user_id,role" });
  if (roleUpsertErr) throw roleUpsertErr;

  return authUser;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const apiKey = Deno.env.get("RESEND_API_KEY");

    if (body.action === "submit") {
      if (!apiKey) {
        console.error("RESEND_API_KEY is not set!");
        return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: corsHeaders });
      }

      const { full_name, email, phone, agency_name, message } = body;
      if (!full_name || !email) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: corsHeaders });

      const code = generateCode();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: e } = await supabase.from("demo_requests").insert({
        full_name, email, phone: phone || null, agency_name: agency_name || null,
        message: message || null, demo_code: code, demo_code_expires_at: expiresAt,
        status: "approved",
      });
      if (e) throw e;

      await ensureDemoAuthUser(supabase, email, full_name);

      // Admin alert
      await sendEmail(apiKey, "admin@listhq.com.au", `New Demo Request — ${full_name}`, buildAdminEmail({ full_name, email, phone, agency_name, message }));
      // Send access code immediately to applicant
      const demoUrl = `https://listhq.com.au/agents/demo?email=${encodeURIComponent(email)}`;
      await sendEmail(apiKey, email, "Your ListHQ Access Code", buildAccessCodeEmail(full_name, email, code, demoUrl));
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    } else if (body.action === "send_code") {
      if (!apiKey) {
        console.error("RESEND_API_KEY is not set!");
        return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: corsHeaders });
      }

      const { request_id } = body;
      if (!request_id) return new Response(JSON.stringify({ error: "Missing request_id" }), { status: 400, headers: corsHeaders });

      const { data: r, error: fe } = await supabase.from("demo_requests").select("*").eq("id", request_id).single();
      if (fe || !r) throw fe || new Error("Not found");

      const code = r.demo_code || generateCode();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("demo_requests").update({ status: "approved", demo_code: code, demo_code_expires_at: expiresAt }).eq("id", request_id);

      await ensureDemoAuthUser(supabase, r.email, r.full_name);

      const demoUrl = `https://listhq.com.au/agents/demo?email=${encodeURIComponent(r.email)}`;
      await sendEmail(apiKey, r.email, "Your ListHQ Demo Access Code", buildAccessCodeEmail(r.full_name, r.email, code, demoUrl));
      return new Response(JSON.stringify({ success: true, code }), { headers: corsHeaders });

    } else if (body.action === "validate_code") {
      const { email, code } = body;
      if (!email || !code) {
        return new Response(JSON.stringify({ error: "Missing email or code" }), { status: 400, headers: corsHeaders });
      }

      const { data: demoReq, error: qErr } = await supabase
        .from("demo_requests")
        .select("id, email, full_name")
        .ilike("email", email.trim())
        .eq("demo_code", code.trim().toUpperCase())
        .eq("status", "approved")
        .gte("demo_code_expires_at", new Date().toISOString())
        .maybeSingle();

      if (qErr) throw qErr;
      if (!demoReq) {
        return new Response(JSON.stringify({ error: "Invalid or expired code. Please check your email or contact support@listhq.com.au" }), { status: 400, headers: corsHeaders });
      }

      await ensureDemoAuthUser(supabase, demoReq.email, demoReq.full_name);

      // Generate a short-lived session token server-side (fix #1 — no credentials sent to client)
      const demoEmail = "demo@listhq.com.au";
      const demoPassword = Deno.env.get("DEMO_ACCOUNT_PASSWORD") || crypto.randomUUID();

      // Look up demo user by email via listUsers (getUserByEmail removed in newer SDK)
      const { data: listData, error: demoGetErr } = await supabase.auth.admin.listUsers();
      let demoUser = demoGetErr ? null : (listData?.users?.find((u: { email?: string }) => u.email === demoEmail) || null);

      if (!demoUser) {
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: demoEmail,
          password: demoPassword,
          email_confirm: true,
          user_metadata: { display_name: "Demo User", demo_access: true },
        });
        if (createErr) throw createErr;
        demoUser = created.user;
      }

      // Ensure agent record exists for shared demo user
      const { data: existingAgent, error: agentCheckErr } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", demoUser.id)
        .maybeSingle();
      if (agentCheckErr) throw agentCheckErr;

      if (!existingAgent) {
        const { error: agentInsertErr } = await supabase.from("agents").insert({
          user_id: demoUser.id,
          name: "Demo Agent",
          email: demoEmail,
          is_demo: true,
          is_subscribed: false,
          is_approved: true,
        });
        if (agentInsertErr) throw agentInsertErr;
      }

      // Ensure agent role exists for shared demo user
      const { error: roleUpsertErr } = await supabase
        .from("user_roles")
        .upsert({ user_id: demoUser.id, role: "agent" }, { onConflict: "user_id,role" });
      if (roleUpsertErr) throw roleUpsertErr;

      // Generate a short-lived session token server-side (fix #1)
      const { data: sessionData, error: sessionErr } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: demoEmail,
      });

      // createSession is not available in current SDK — rely on magic-link fallback below
      const signInData: { session?: { access_token?: string; refresh_token?: string } } | null = null;
      let accessToken = signInData?.session?.access_token;
      let refreshToken = signInData?.session?.refresh_token;

      if (!accessToken) {
        // Generate a magic link OTP for the client to exchange
        const { data: otpData, error: otpErr } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: demoEmail,
        });
        if (otpErr) throw otpErr;

        return new Response(JSON.stringify({
          success: true,
          request_id: demoReq.id,
          magic_link_token: otpData?.properties?.hashed_token,
          demo_user_id: demoUser.id,
        }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify({
        success: true,
        request_id: demoReq.id,
        access_token: accessToken,
        refresh_token: refreshToken,
      }), { headers: corsHeaders });

    } else if (body.action === "ensure_auth_user") {
      const { email } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "Missing email" }), { status: 400, headers: corsHeaders });
      }

      const { data: demoReq, error: lookupError } = await supabase
        .from("demo_requests")
        .select("email, full_name")
        .ilike("email", email.trim())
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (!demoReq) {
        return new Response(JSON.stringify({ success: true, demo: false }), { headers: corsHeaders });
      }

      await ensureDemoAuthUser(supabase, demoReq.email, demoReq.full_name);
      return new Response(JSON.stringify({ success: true, demo: true }), { headers: corsHeaders });

    } else if (body.action === "redeem_code") {
      const { request_id } = body;
      if (!request_id) {
        return new Response(JSON.stringify({ error: "Missing request_id" }), { status: 400, headers: corsHeaders });
      }

      const { error: redeemErr } = await supabase
        .from("demo_requests")
        .update({ status: "redeemed" })
        .eq("id", request_id)
        .eq("status", "approved");

      if (redeemErr) throw redeemErr;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

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
      <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">ListHQ</div>
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
        <a href="https://listhq.lovable.app/admin" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Review in Admin Dashboard →</a>
      </div>
    </div>
    <div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">
      <div>© ListHQ · Melbourne, Australia</div>
    </div>
</div></body></html>`;
}

function buildConfirmationEmail(name: string, email: string) {
  return `<html><body><div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;">
    <div style="background:#0f172a;padding:24px 32px;text-align:center;">
      <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">ListHQ</div>
      <div style="color:#94a3b8;font-size:13px;margin-top:4px;">Demo Request Received</div>
    </div>
    <div style="padding:32px;">
      <div style="font-size:18px;font-weight:600;color:#0f172a;margin-bottom:12px;">Hi ${name},</div>
      <div style="color:#334155;font-size:14px;line-height:1.7;margin-bottom:20px;">Thank you for your interest in the ListHQ platform. We've received your demo request and our team will review it shortly.</div>
      <div style="background:#f1f5f9;padding:16px 20px;border-radius:8px;margin-bottom:20px;">
        <div style="font-weight:600;color:#0f172a;margin-bottom:6px;">What happens next?</div>
        <div style="color:#475569;font-size:14px;line-height:1.6;">Once approved, we'll send your unique access code to <strong>${email}</strong>. Use that code to log into your personalised demo dashboard.</div>
      </div>
      <div style="color:#64748b;font-size:13px;">If you have any questions in the meantime, reach us at <a href="mailto:support@listhq.com.au" style="color:#2563eb;text-decoration:none;">support@listhq.com.au</a></div>
    </div>
    <div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">
      <div>© ListHQ · Melbourne, Australia · You're receiving this because you requested a demo.</div>
    </div>
  </div>
</body></html>`;
}

function buildAccessCodeEmail(name: string, email: string, code: string, demoUrl: string) {
  return `<html><body>
<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:40px 20px;">
  <h2 style="color:#0f172a;">ListHQ</h2>
  <p>Hi ${name},</p>
  <p>Your access code is:</p>
  <div style="font-size:40px;font-weight:900;letter-spacing:8px;font-family:monospace;background:#f1f5f9;padding:24px;border-radius:8px;text-align:center;color:#0f172a;">${code}</div>
  <p style="color:#64748b;font-size:13px;">Valid for 7 days. Do not share.</p>
  <p><a href="${demoUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Log In to ListHQ →</a></p>
  <p style="color:#94a3b8;font-size:12px;">Questions? <a href="mailto:support@listhq.com.au" style="color:#2563eb;">support@listhq.com.au</a></p>
</div>
</body></html>`;
}
