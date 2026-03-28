import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let lat: number | undefined;
    let lng: number | undefined;
    let radius_km = 100;
    let listing_type: 'sale' | 'rent' | undefined;

    try {
      const body = await req.json();
      lat = body.lat;
      lng = body.lng;
      if (body.radius_km) radius_km = body.radius_km;
      if (body.listing_type === 'rent' || body.listing_type === 'sale') {
        listing_type = body.listing_type;
      }
    } catch {
      // No body or invalid JSON — proceed without location
    }

    const now = new Date().toISOString();
    let featured: any[] = [];

    if (lat !== undefined && lng !== undefined) {
      // Query with haversine distance filter
      const { data, error } = await supabase.rpc("nearby_featured_properties", {
        _lat: lat,
        _lng: lng,
        _radius_km: radius_km,
        _limit: 6,
      });

      // If RPC doesn't exist, fall back to manual query
      if (error) {
        let fallbackQuery = supabase
          .from("properties")
          .select(
            "id, title, address, suburb, state, price_formatted, beds, baths, parking, image_url, images, lat, lng, boost_tier, featured_until, agent_id, listing_type"
          )
          .eq("is_featured", true)
          .eq("is_active", true)
          .gt("featured_until", now)
          .order("featured_until", { ascending: true })
          .limit(50);

        if (listing_type === 'rent') {
          fallbackQuery = fallbackQuery.eq('listing_type', 'rent');
        } else if (listing_type === 'sale') {
          fallbackQuery = fallbackQuery.or('listing_type.eq.sale,listing_type.is.null');
        }

        const { data: fallbackData } = await fallbackQuery;

        // Filter by distance client-side
        if (fallbackData) {
          featured = fallbackData
            .filter((p: any) => {
              if (!p.lat || !p.lng) return false;
              const R = 6371;
              const dLat = ((p.lat - lat!) * Math.PI) / 180;
              const dLng = ((p.lng - lng!) * Math.PI) / 180;
              const a =
                Math.sin(dLat / 2) ** 2 +
                Math.cos((lat! * Math.PI) / 180) *
                  Math.cos((p.lat * Math.PI) / 180) *
                  Math.sin(dLng / 2) ** 2;
              const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              return dist <= radius_km;
            })
            .slice(0, 6);
        }
      } else {
        featured = (data || []).slice(0, 6);
      }
    }

    // If fewer than 6, top up nationally
    if (featured.length < 6) {
      const existingIds = featured.map((p: any) => p.id);
      let nationalQuery = supabase
        .from("properties")
        .select(
          "id, title, address, suburb, state, price_formatted, beds, baths, parking, image_url, images, lat, lng, boost_tier, featured_until, agent_id, listing_type"
        )
        .eq("is_featured", true)
        .eq("is_active", true)
        .gt("featured_until", now)
        .order("featured_until", { ascending: true })
        .limit(6);

      if (listing_type === 'rent') {
        nationalQuery = nationalQuery.eq('listing_type', 'rent');
      } else if (listing_type === 'sale') {
        nationalQuery = nationalQuery.or('listing_type.eq.sale,listing_type.is.null');
      }

      const { data: national } = await nationalQuery;

      if (national) {
        for (const p of national) {
          if (featured.length >= 6) break;
          if (!existingIds.includes(p.id)) {
            featured.push(p);
          }
        }
      }
    }

    // Sort: Premier first, then Featured, randomised within each tier
    featured.sort((a: any, b: any) => {
      const tierA = a.boost_tier === 'premier' ? 0 : 1;
      const tierB = b.boost_tier === 'premier' ? 0 : 1;
      if (tierA !== tierB) return tierA - tierB;
      return Math.random() - 0.5;
    });

    if (featured.length === 0) {
      return new Response(
        JSON.stringify({ featured: [], fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ featured, fallback: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-featured-listings error:", err);
    return new Response(
      JSON.stringify({ featured: [], fallback: true, error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
