import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// One-shot bulk backfill. Idempotent — only processes listings where
// translation_status = 'pending'. Safe to leave open: only effect is
// generating missing translations.
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: pending, error: queryErr } = await supabase
    .from("properties")
    .select("id, suburb, title")
    .eq("is_active", true)
    .eq("translation_status", "pending")
    .limit(2);

  if (queryErr) {
    return new Response(JSON.stringify({ error: queryErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ id: string; suburb: string; status: string; error?: string }> = [];

  for (const listing of (pending || [])) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-translations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SERVICE_ROLE}`,
          "Content-Type": "application/json",
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
