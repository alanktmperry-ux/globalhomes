// One-off backfill: geocode any active public listing that is missing lat/lng.
// Uses GOOGLE_MAPS_API_KEY directly. Safe to re-run (idempotent — only updates rows
// where lat IS NULL OR lng IS NULL).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Row {
  id: string;
  address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
}

async function geocode(query: string, apiKey: string) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK" || !data.results?.length) return null;
  const loc = data.results[0].geometry?.location;
  if (!loc) return null;
  return { lat: loc.lat as number, lng: loc.lng as number };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_MAPS_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: rows, error } = await supabase
    .from("properties")
    .select("id,address,suburb,state,postcode,country")
    .eq("is_active", true)
    .or("lat.is.null,lng.is.null")
    .limit(500);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ id: string; ok: boolean; reason?: string }> = [];
  let updated = 0;

  for (const r of (rows ?? []) as Row[]) {
    const parts = [r.address, r.suburb, r.state, r.postcode, r.country ?? "Australia"]
      .filter((x) => x && String(x).trim().length > 0);
    if (parts.length === 0) {
      results.push({ id: r.id, ok: false, reason: "no_address_parts" });
      continue;
    }
    const query = parts.join(", ");
    try {
      const coords = await geocode(query, apiKey);
      if (!coords) {
        // Fallback: suburb-only centroid
        const fallback = [r.suburb, r.state, "Australia"].filter(Boolean).join(", ");
        const fb = fallback ? await geocode(fallback, apiKey) : null;
        if (!fb) {
          results.push({ id: r.id, ok: false, reason: "geocode_failed" });
          continue;
        }
        const { error: upErr } = await supabase
          .from("properties")
          .update({ lat: fb.lat, lng: fb.lng })
          .eq("id", r.id);
        if (upErr) {
          results.push({ id: r.id, ok: false, reason: upErr.message });
        } else {
          updated++;
          results.push({ id: r.id, ok: true, reason: "suburb_fallback" });
        }
        continue;
      }
      const { error: upErr } = await supabase
        .from("properties")
        .update({ lat: coords.lat, lng: coords.lng })
        .eq("id", r.id);
      if (upErr) {
        results.push({ id: r.id, ok: false, reason: upErr.message });
      } else {
        updated++;
        results.push({ id: r.id, ok: true });
      }
    } catch (e) {
      results.push({
        id: r.id,
        ok: false,
        reason: e instanceof Error ? e.message : "unknown",
      });
    }
    // Tiny delay to stay polite with Google's API
    await new Promise((r) => setTimeout(r, 60));
  }

  return new Response(
    JSON.stringify({ scanned: rows?.length ?? 0, updated, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
