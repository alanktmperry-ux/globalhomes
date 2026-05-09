// Shared audit log helper. Always uses the service role client and never throws.
import { createClient } from "npm:@supabase/supabase-js@2";

export type AuditEvent =
  | "signup_attempted"
  | "signup_blocked_disposable"
  | "signup_blocked_breached_password"
  | "signup_blocked_captcha"
  | "signup_succeeded"
  | "signup_verified"
  | "login_succeeded"
  | "login_failed"
  | "password_reset_requested"
  | "password_reset_completed"
  | "password_changed"
  | "role_granted"
  | "email_changed"
  | "email_bounced"
  | "email_complained"
  | "email_delivered"
  | "session_revoked";

let _admin: ReturnType<typeof createClient> | null = null;
function admin() {
  if (_admin) return _admin;
  _admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  return _admin;
}

export function clientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim() || null;
  return req.headers.get("cf-connecting-ip") || null;
}

export async function logAuth(opts: {
  event_type: AuditEvent;
  user_id?: string | null;
  email?: string | null;
  event_data?: Record<string, unknown>;
  ip?: string | null;
  user_agent?: string | null;
}): Promise<void> {
  try {
    const { error } = await admin().from("auth_audit_log").insert({
      user_id: opts.user_id ?? null,
      email: opts.email ? opts.email.toLowerCase() : null,
      event_type: opts.event_type,
      event_data: opts.event_data ?? {},
      ip: opts.ip ?? null,
      user_agent: opts.user_agent ?? null,
    });
    if (error) console.error("[audit] insert error:", error.message);
  } catch (e) {
    console.error("[audit] failed:", e);
  }
}
