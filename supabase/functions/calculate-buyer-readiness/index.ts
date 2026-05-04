// Calculates a 0-100 buyer readiness score from recent activity events
// and updates buyer_intent.readiness_score for that buyer.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // JWT verification
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader ?? "" } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { buyer_id } = await req.json();
    if (!buyer_id || typeof buyer_id !== "string") {
      return new Response(JSON.stringify({ error: "buyer_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: caller must be the buyer themselves OR an agent
    if (buyer_id !== user.id) {
      const { data: agentRow } = await userClient
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!agentRow) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: events, error: evErr } = await admin
      .from("buyer_activity_events")
      .select("event_type, listing_id, metadata, created_at")
      .eq("buyer_id", buyer_id)
      .gte("created_at", sixtyDaysAgo);

    if (evErr) {
      console.error("event fetch error", evErr);
      return new Response(JSON.stringify({ error: "Failed to fetch events" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let score = 0;
    const e = events ?? [];

    // +5 per search (cap 30)
    const searches = e.filter((x) => x.event_type === "search").length;
    score += Math.min(30, searches * 5);

    // +15 mortgage calc, +10 stamp duty
    if (e.some((x) => x.event_type === "mortgage_calculator")) score += 15;
    if (e.some((x) => x.event_type === "stamp_duty_calculator")) score += 10;

    // +8 per saved listing (cap 24)
    const saved = e.filter((x) => x.event_type === "save_listing").length;
    score += Math.min(24, saved * 8);

    // +20 if search count > 5 in last 14 days
    const recentSearches = e.filter(
      (x) => x.event_type === "search" && x.created_at >= fourteenDaysAgo
    ).length;
    if (recentSearches > 5) score += 20;

    // +15 if suburbs narrowed (compare current vs ~14 days ago snapshot via buyer_intent history)
    // Approximation: pull current intent and compare suburb count vs older searches' metadata
    const { data: intent } = await admin
      .from("buyer_intent")
      .select("suburbs, last_searched_at")
      .eq("buyer_id", buyer_id)
      .order("last_searched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (intent?.suburbs && Array.isArray(intent.suburbs)) {
      const currentCount = intent.suburbs.length;
      // Look at older search-event metadata for an earlier suburb count
      const olderSearch = e
        .filter(
          (x) =>
            x.event_type === "search" &&
            x.created_at < fourteenDaysAgo &&
            x.metadata &&
            typeof x.metadata === "object"
        )
        .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))[0];
      // We don't store suburb arrays in event metadata, so use a proxy:
      // if the buyer has many searches AND a small current suburb list, treat as narrowing.
      if (olderSearch && currentCount > 0 && currentCount <= 2 && searches >= 3) {
        score += 15;
      }
    }

    // +10 if any listing revisited 3+ times
    const visitCounts = new Map<string, number>();
    for (const ev of e) {
      if (ev.event_type === "revisit_listing" && ev.listing_id) {
        visitCounts.set(ev.listing_id, (visitCounts.get(ev.listing_id) ?? 0) + 1);
      }
    }
    if ([...visitCounts.values()].some((n) => n >= 3)) score += 10;

    score = Math.max(0, Math.min(100, score));

    // Update all buyer_intent rows for this buyer
    const { error: updErr } = await admin
      .from("buyer_intent")
      .update({ readiness_score: score })
      .eq("buyer_id", buyer_id);
    if (updErr) console.error("readiness update error", updErr);

    return new Response(
      JSON.stringify({ buyer_id, readiness_score: score, events_considered: e.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("calculate-buyer-readiness error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
