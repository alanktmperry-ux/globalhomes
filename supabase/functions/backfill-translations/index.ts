import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Background bulk backfill. Returns immediately after kicking off the batch;
// progress is observable via SQL on properties.translation_status.
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: pending, error: queryErr } = await supabase
    .from("properties")
    .select("id, suburb")
    .eq("is_active", true)
    .eq("translation_status", "pending")
    .limit(40);

  if (queryErr) {
    return new Response(JSON.stringify({ error: queryErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const batch = pending || [];

  // Run in the background so we can return immediately
  const work = (async () => {
    for (const listing of batch) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/generate-translations`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SERVICE_ROLE}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ listing_id: listing.id }),
        });
      } catch (e) {
        console.error("backfill listing failed", listing.id, e);
      }
      await new Promise(r => setTimeout(r, 200));
    }
  })();

  // @ts-ignore — EdgeRuntime is provided by Supabase
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(work);
  }

  return new Response(JSON.stringify({
    queued: batch.length,
    listing_ids: batch.map(l => l.id),
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
