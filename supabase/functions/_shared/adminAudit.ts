// Shared helper for writing to admin_audit_log from edge functions.
// Append-only — never throws.
import { createClient } from "npm:@supabase/supabase-js@2";

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

export interface AdminAuditEntry {
  actor_id: string | null;
  actor_email: string;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  target_summary?: string | null;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  notes?: string | null;
  request?: Request | null;
  request_id?: string | null;
}

export async function logAdminAction(entry: AdminAuditEntry): Promise<void> {
  try {
    const ip = entry.request ? clientIp(entry.request) : null;
    const ua = entry.request?.headers.get("user-agent") ?? null;
    const { error } = await admin().from("admin_audit_log").insert({
      actor_id: entry.actor_id,
      actor_email: entry.actor_email,
      action: entry.action,
      target_type: entry.target_type ?? null,
      target_id: entry.target_id ?? null,
      target_summary: entry.target_summary ?? null,
      before_state: entry.before_state ?? null,
      after_state: entry.after_state ?? null,
      notes: entry.notes ?? null,
      ip_address: ip,
      user_agent: ua,
      request_id: entry.request_id ?? null,
    });
    if (error) console.error("[admin-audit] insert error:", error.message);
  } catch (e) {
    console.error("[admin-audit] failed:", e);
  }
}
