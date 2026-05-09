// Resend webhook receiver. Verifies svix-style signature, updates email
// delivery status on profiles, writes auth_audit_log rows, and on
// complaints suppresses welcome emails.
import { createClient } from "npm:@supabase/supabase-js@2";
import { Webhook } from "npm:svix@1.40.0";
import { logAuth, clientIp } from "../_shared/audit.ts";

const SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET") || "";

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

interface ResendPayload {
  type: string;
  data?: {
    email_id?: string;
    to?: string[];
    from?: string;
    subject?: string;
    bounce?: { type?: string; subType?: string; diagnostic_code?: string; message?: string };
    [k: string]: unknown;
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  if (!SECRET) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET not configured");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500 });
  }

  const raw = await req.text();
  let payload: ResendPayload;
  try {
    const wh = new Webhook(SECRET);
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => (headers[k] = v));
    payload = wh.verify(raw, headers) as ResendPayload;
  } catch (e) {
    console.error("[resend-webhook] signature failed:", e);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
  }

  const type = payload.type || "";
  const data = payload.data || {};
  const recipient = (data.to?.[0] || "").toLowerCase();
  if (!recipient) {
    return new Response(JSON.stringify({ ok: true, skipped: "no_recipient" }), { status: 200 });
  }

  const sb = admin();
  let userId: string | null = null;
  try {
    // auth.users via admin listUsers email filter (cheap path: profiles join)
    const { data: prof } = await sb
      .from("profiles")
      .select("user_id")
      .ilike("email", recipient)
      .maybeSingle();
    userId = (prof as { user_id?: string } | null)?.user_id ?? null;
  } catch { /* fall through */ }

  const ip = clientIp(req);
  const ua = req.headers.get("user-agent");
  const now = new Date().toISOString();

  const updateStatus = async (status: "delivered" | "bounced" | "complained", reason?: string) => {
    if (!userId) return;
    try {
      await sb
        .from("profiles")
        .update({
          email_delivery_status: status,
          email_last_event_at: now,
          ...(reason ? { email_bounce_reason: reason } : {}),
        } as Record<string, unknown>)
        .eq("user_id", userId);
    } catch (e) {
      console.error("[resend-webhook] profile update failed", e);
    }
  };

  switch (type) {
    case "email.delivered":
      await updateStatus("delivered");
      await logAuth({
        event_type: "email_delivered",
        user_id: userId,
        email: recipient,
        event_data: { email_id: data.email_id, subject: data.subject },
        ip,
        user_agent: ua,
      });
      break;
    case "email.bounced": {
      const reason =
        data.bounce?.diagnostic_code ||
        data.bounce?.message ||
        `${data.bounce?.type ?? ""}/${data.bounce?.subType ?? ""}`;
      await updateStatus("bounced", reason);
      await logAuth({
        event_type: "email_bounced",
        user_id: userId,
        email: recipient,
        event_data: { email_id: data.email_id, bounce: data.bounce, subject: data.subject },
        ip,
        user_agent: ua,
      });
      break;
    }
    case "email.complained":
      await updateStatus("complained");
      if (userId) {
        try {
          await sb
            .from("unsubscribes")
            .upsert(
              { user_id: userId, email: recipient, category: "welcome" },
              { onConflict: "user_id,category" },
            );
        } catch (e) {
          console.error("[resend-webhook] unsubscribe upsert failed", e);
        }
      }
      await logAuth({
        event_type: "email_complained",
        user_id: userId,
        email: recipient,
        event_data: { email_id: data.email_id, subject: data.subject },
        ip,
        user_agent: ua,
      });
      break;
    default:
      // Unhandled types: still 200 so Resend doesn't retry.
      console.log("[resend-webhook] ignored event:", type);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
