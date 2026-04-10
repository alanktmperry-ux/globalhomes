import { createClient } from "npm:@supabase/supabase-js@2";
import booleanPointInPolygon from "npm:@turf/boolean-point-in-polygon@7";
import { point } from "npm:@turf/helpers@7";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { property_id, lat, lng } = await req.json();
    if (!property_id || !lat || !lng) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find schools within 3km
    const { data: nearbySchools, error: rpcError } = await supabase.rpc("schools_within_km", {
      p_lat: lat,
      p_lng: lng,
      p_km: 3.0,
    });

    if (rpcError || !nearbySchools?.length) {
      return new Response(JSON.stringify({ inserted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const propertyPoint = point([lng, lat]);
    const rows = [];

    for (const school of nearbySchools) {
      const { data: catchment } = await supabase
        .from("school_catchments")
        .select("geojson")
        .eq("school_id", school.id)
        .maybeSingle();

      let inCatchment = false;
      if (catchment?.geojson) {
        try {
          inCatchment = booleanPointInPolygon(propertyPoint, catchment.geojson as any);
        } catch {
          inCatchment = false;
        }
      }

      rows.push({
        property_id,
        school_id: school.id,
        distance_km: parseFloat(school.distance_km.toFixed(2)),
        in_catchment: inCatchment,
      });
    }

    const { error: upsertError } = await supabase
      .from("property_schools")
      .upsert(rows, { onConflict: "property_id,school_id" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
    }

    return new Response(JSON.stringify({ inserted: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("compute-property-schools error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
