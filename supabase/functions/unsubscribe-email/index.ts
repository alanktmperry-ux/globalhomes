// Unsubscribe edge function — validates token + records suppression.
// GET  ?email=&token=  → { valid, alreadyUnsubscribed }
// POST { email, token } → records unsubscribe (idempotent)
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { verifyUnsubscribeToken } from "../_shared/unsubscribe.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let email = "";
    let token = "";

    if (req.method === "GET") {
      const url = new URL(req.url);
      email = (url.searchParams.get("email") || "").trim().toLowerCase();
      token = url.searchParams.get("token") || "";
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      email = String(body.email || "").trim().toLowerCase();
      token = String(body.token || "");
    } else {
      return json({ error: "Method not allowed" }, 405);
    }

    if (!email || !token) return json({ error: "Missing email or token" }, 400);

    const valid = await verifyUnsubscribeToken(email, token);
    if (!valid) return json({ valid: false, error: "Invalid token" }, 400);

    const { data: existing } = await supabase
      .from("email_unsubscribes")
      .select("id, unsubscribed_at")
      .eq("email", email)
      .maybeSingle();

    if (req.method === "GET") {
      return json({
        valid: true,
        email,
        alreadyUnsubscribed: Boolean(existing),
      });
    }

    // POST — record unsubscribe (idempotent via UNIQUE constraint)
    if (!existing) {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("cf-connecting-ip") ||
        null;
      const userAgent = req.headers.get("user-agent") || null;
      const { error: insertErr } = await supabase
        .from("email_unsubscribes")
        .insert({
          email,
          source: "email_link",
          user_agent: userAgent,
          ip,
        });
      if (insertErr && !/duplicate key/i.test(insertErr.message)) {
        console.error("[unsubscribe-email] insert failed:", insertErr.message);
        return json({ error: "Could not record unsubscribe" }, 500);
      }
    }

    return json({ success: true, email });
  } catch (e: any) {
    console.error("unsubscribe-email error:", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
