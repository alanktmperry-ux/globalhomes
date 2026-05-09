import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Admin-only: requires authenticated admin user (or service_role bearer token)
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");

  // Allow either: (1) service_role bearer, or (2) authenticated admin user
  let authorized = false;
  if (token && token === SERVICE_ROLE) {
    authorized = true;
  } else if (token) {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData } = await anonClient.auth.getUser(token);
    if (userData?.user) {
      const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { data: roleRow } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (roleRow) authorized = true;
    }
  }

  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized — admin or service role required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Get up to 10 pending active listings
  const { data: pending, error: queryErr } = await supabase
    .from("properties")
    .select("id, suburb, title")
    .eq("is_active", true)
    .eq("translation_status", "pending")
    .limit(10);

  if (queryErr) {
    return new Response(JSON.stringify({ error: queryErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ id: string; suburb: string; status: string; error?: string }> = [];

  // Forward the caller's auth header to generate-translations (admin path works there)
  const forwardAuth = token === SERVICE_ROLE
    ? `Bearer ${SERVICE_ROLE}`
    : auth;

  for (const listing of (pending || [])) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-translations`, {
        method: "POST",
        headers: {
          "Authorization": forwardAuth,
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ listing_id: listing.id }),
      });
      if (resp.ok) {
        results.push({ id: listing.id, suburb: listing.suburb, status: "ok" });
      } else {
        const errBody = await resp.text();
        results.push({ id: listing.id, suburb: listing.suburb, status: "fail", error: errBody.slice(0, 200) });
      }
      await new Promise(r => setTimeout(r, 600));
    } catch (e) {
      results.push({ id: listing.id, suburb: listing.suburb, status: "exception", error: String(e).slice(0, 200) });
    }
  }

  const { count: remaining } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("translation_status", "pending");

  return new Response(JSON.stringify({
    processed: results.length,
    ok: results.filter(r => r.status === "ok").length,
    failed: results.filter(r => r.status !== "ok").length,
    remaining: remaining ?? 0,
    results,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
