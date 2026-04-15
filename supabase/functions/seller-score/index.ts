import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await anonClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify agent or admin role
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: roles } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const userRoles = (roles || []).map((r: { role: string }) => r.role);
  if (!userRoles.includes("agent") && !userRoles.includes("admin")) {
    return new Response(JSON.stringify({ error: "Forbidden — agent role required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { data: properties, error: fetchError } = await adminClient
      .from("properties")
      .select("id, suburb, state, beds, price, views, created_at, updated_at, listing_type, address")
      .or("listing_type.eq.off_market,status.eq.off_market")
      .order("created_at", { ascending: false })
      .limit(500);

    if (fetchError) throw fetchError;

    const now = Date.now();

    const scored = (properties || []).map((p: any) => {
      const createdAt = new Date(p.created_at).getTime();
      const updatedAt = new Date(p.updated_at).getTime();
      const ageMonths = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24 * 30.44));
      const daysSinceUpdate = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));
      const views = p.views || 0;

      // Age score (max 40)
      let ageScore = 5;
      if (ageMonths >= 60) ageScore = 40;
      else if (ageMonths >= 36) ageScore = 30;
      else if (ageMonths >= 12) ageScore = 20;

      // View score (max 30)
      let viewScore = 0;
      if (views >= 100) viewScore = 30;
      else if (views >= 50) viewScore = 20;
      else if (views >= 10) viewScore = 10;

      // Recency score (max 30) — stale = higher score
      let recencyScore = 0;
      if (daysSinceUpdate >= 180) recencyScore = 30;
      else if (daysSinceUpdate >= 30) recencyScore = 10;
      // Within 30 days = 0 (owner is active)

      const score = ageScore + viewScore + recencyScore;

      return {
        property_id: p.id,
        address: p.address,
        suburb: p.suburb,
        state: p.state,
        bedrooms: p.beds,
        price: p.price,
        views,
        score,
        age_months: ageMonths,
        days_since_update: daysSinceUpdate,
      };
    });

    scored.sort((a: any, b: any) => b.score - a.score);

    return new Response(JSON.stringify(scored), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seller-score error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
