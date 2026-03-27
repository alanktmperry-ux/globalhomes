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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch active listings
    const { data: properties, error: propErr } = await supabase
      .from("properties")
      .select("id, title, address, suburb, state, price, property_type, bedrooms, days_on_market, status, is_active, created_at, agent_id")
      .eq("is_active", true)
      .limit(500);

    if (propErr) throw propErr;
    if (!properties || properties.length === 0) {
      return new Response(JSON.stringify({ scored: 0, message: "No active properties" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate suburb-level stats for trend analysis
    const suburbStats: Record<string, { prices: number[]; count: number; totalDom: number }> = {};
    for (const p of properties) {
      const key = `${(p.suburb || "").toLowerCase()}|${(p.state || "").toLowerCase()}`;
      if (!suburbStats[key]) suburbStats[key] = { prices: [], count: 0, totalDom: 0 };
      suburbStats[key].count++;
      if (p.price) suburbStats[key].prices.push(p.price);
      if (p.days_on_market) suburbStats[key].totalDom += p.days_on_market;
    }

    // Calculate median DOM and price per suburb
    const suburbMedians: Record<string, { medianPrice: number; medianDom: number; count: number }> = {};
    for (const [key, stats] of Object.entries(suburbStats)) {
      const sortedPrices = stats.prices.sort((a, b) => a - b);
      const medianPrice = sortedPrices.length > 0
        ? sortedPrices[Math.floor(sortedPrices.length / 2)]
        : 0;
      const medianDom = stats.count > 0 ? Math.round(stats.totalDom / stats.count) : 30;
      suburbMedians[key] = { medianPrice, medianDom, count: stats.count };
    }

    // Fetch price change activities for properties
    const propertyIds = properties.map((p: any) => p.id);
    const { data: priceActivities } = await supabase
      .from("activities")
      .select("entity_id, action, metadata")
      .in("entity_id", propertyIds.slice(0, 200))
      .eq("entity_type", "property")
      .eq("action", "price_change");

    const priceChangeCount: Record<string, number> = {};
    for (const act of priceActivities || []) {
      if (act.entity_id) {
        priceChangeCount[act.entity_id] = (priceChangeCount[act.entity_id] || 0) + 1;
      }
    }

    let scoredCount = 0;
    const scores: any[] = [];

    for (const p of properties) {
      const suburbKey = `${(p.suburb || "").toLowerCase()}|${(p.state || "").toLowerCase()}`;
      const suburb = suburbMedians[suburbKey] || { medianPrice: 0, medianDom: 30, count: 0 };
      const dom = p.days_on_market || 0;
      const priceCuts = priceChangeCount[p.id] || 0;

      // Signal calculations
      const signals: Record<string, number> = {};
      let totalScore = 0;

      // 1. Days on Market signal (0-25 points)
      // Properties sitting significantly longer than suburb median
      if (suburb.medianDom > 0 && dom > 0) {
        const domRatio = dom / suburb.medianDom;
        if (domRatio >= 3) { signals.days_on_market = 25; totalScore += 25; }
        else if (domRatio >= 2) { signals.days_on_market = 18; totalScore += 18; }
        else if (domRatio >= 1.5) { signals.days_on_market = 10; totalScore += 10; }
        else { signals.days_on_market = 0; }
      } else {
        signals.days_on_market = 0;
      }

      // 2. Price Reductions signal (0-25 points)
      if (priceCuts >= 3) { signals.price_reductions = 25; totalScore += 25; }
      else if (priceCuts === 2) { signals.price_reductions = 18; totalScore += 18; }
      else if (priceCuts === 1) { signals.price_reductions = 10; totalScore += 10; }
      else { signals.price_reductions = 0; }

      // 3. Suburb Trend signal (0-20 points)
      // Negative suburb trend = more seller pressure
      if (suburb.count >= 5) {
        const inventoryPressure = suburb.count >= 20 ? 20 : suburb.count >= 10 ? 12 : 5;
        signals.suburb_trend = inventoryPressure;
        totalScore += inventoryPressure;
      } else {
        signals.suburb_trend = 0;
      }

      // 4. Status Churn signal (0-15 points)
      // Properties that have been relisted or had status changes
      const daysSinceListing = Math.floor(
        (Date.now() - new Date(p.created_at).getTime()) / 86400000
      );
      if (daysSinceListing > 180) { signals.status_churn = 15; totalScore += 15; }
      else if (daysSinceListing > 90) { signals.status_churn = 8; totalScore += 8; }
      else { signals.status_churn = 0; }

      // 5. Activity Gap signal (0-15 points)
      // No recent activity = stale listing = motivated seller
      if (dom > 60 && priceCuts === 0) { signals.activity_gap = 15; totalScore += 15; }
      else if (dom > 30 && priceCuts === 0) { signals.activity_gap = 8; totalScore += 8; }
      else { signals.activity_gap = 0; }

      // Only score properties with ≥50 total
      if (totalScore < 50) continue;

      // Generate summary text
      const summaryParts: string[] = [];
      if (signals.days_on_market > 0) {
        const ratio = suburb.medianDom > 0 ? (dom / suburb.medianDom).toFixed(1) : "?";
        summaryParts.push(`${ratio}x median days on market`);
      }
      if (signals.price_reductions > 0) {
        summaryParts.push(`${priceCuts} price reduction${priceCuts > 1 ? "s" : ""}`);
      }
      if (signals.suburb_trend > 0) {
        summaryParts.push(`${suburb.count} competing listings in suburb`);
      }
      if (signals.status_churn > 0) {
        summaryParts.push(`Listed ${daysSinceListing} days ago`);
      }
      if (signals.activity_gap > 0) {
        summaryParts.push(`No price activity for ${dom}+ days`);
      }

      const summary = summaryParts.length > 0
        ? `Seller signals detected: ${summaryParts.join(", ")}.`
        : "Multiple seller likelihood signals detected.";

      scores.push({
        property_id: p.id,
        score: Math.min(totalScore, 100),
        signals,
        summary,
        scored_at: new Date().toISOString(),
      });
    }

    // Upsert scores — delete old and insert new
    if (scores.length > 0) {
      const scoredPropertyIds = scores.map((s: any) => s.property_id);

      // Remove existing scores for these properties
      await supabase
        .from("seller_likelihood_scores")
        .delete()
        .in("property_id", scoredPropertyIds);

      // Insert new scores
      const { error: insertErr } = await supabase
        .from("seller_likelihood_scores")
        .insert(scores);

      if (insertErr) throw insertErr;
      scoredCount = scores.length;
    }

    return new Response(
      JSON.stringify({ scored: scoredCount, processed: properties.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("score-seller-likelihood error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
