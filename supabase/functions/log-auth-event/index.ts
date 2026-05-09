// Internal endpoint used by the SPA to log a small set of auth events
// (e.g. signup_verified) where the only authoritative actor is the client.
// Authenticated callers only. Rate-limited to 10 events per user per minute.
import { createClient } from "npm:@supabase/supabase-js@2";
import { logAuth, clientIp, type AuditEvent } from "../_shared/audit.ts";

const ALLOWED_ORIGINS = [
  "https://listhq.com.au",
  "https://www.listhq.com.au",
  "https://listhq.lovable.app",
];

function cors(origin: string | null): Record<string, string> {
  let allow = "https://listhq.com.au";
  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin)) allow = origin;
    else if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/i.test(origin)) allow = origin;
    else if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i.test(origin)) allow = origin;
  }
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const ALLOWED_EVENTS: AuditEvent[] = [
  "signup_verified",
  "login_succeeded",
  "login_failed",
  "password_reset_requested",
  "password_reset_completed",
  "password_changed",
  "session_revoked",
];

// In-memory rate limit (best-effort, per isolate). 10 events / 60s / user.
const buckets = new Map<string, number[]>();
function rateLimit(userId: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (buckets.get(userId) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    buckets.set(userId, arr);
    return false;
  }
  arr.push(now);
  buckets.set(userId, arr);
  return true;
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: claims, error } = await sb.auth.getClaims(auth.slice(7));
  if (error || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
  const userId = claims.claims.sub as string;
  const email = (claims.claims as Record<string, unknown>).email as string | undefined;

  if (!rateLimit(userId)) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  let body: { event_type?: string; event_data?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad_json" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const evt = body.event_type as AuditEvent | undefined;
  if (!evt || !ALLOWED_EVENTS.includes(evt)) {
    return new Response(JSON.stringify({ error: "invalid_event_type" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  await logAuth({
    event_type: evt,
    user_id: userId,
    email: email ?? null,
    event_data: body.event_data ?? {},
    ip: clientIp(req),
    user_agent: req.headers.get("user-agent"),
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...headers, "Content-Type": "application/json" },
  });
});
