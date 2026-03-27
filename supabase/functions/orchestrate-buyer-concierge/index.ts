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

    // 1. Fetch recent voice searches not yet matched (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: searches, error: searchErr } = await supabase
      .from("voice_searches")
      .select("*")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(200);

    if (searchErr) throw searchErr;
    if (!searches || searches.length === 0) {
      return new Response(JSON.stringify({ matched: 0, message: "No recent voice searches to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check which searches already have concierge leads (avoid duplicates)
    const transcriptHashes = searches.map((s: any) => (s.transcript || "").toLowerCase().trim().slice(0, 100));
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("message, user_email")
      .filter("search_context->>source", "eq", "ai_buyer_concierge")
      .gte("created_at", sevenDaysAgo);

    const existingSet = new Set(
      (existingLeads || []).map((l: any) => `${(l.message || "").toLowerCase().trim().slice(0, 100)}|${l.user_email}`)
    );

    // 3. Fetch all active listings with agents
    const { data: properties } = await supabase
      .from("properties")
      .select("id, title, address, suburb, state, price, property_type, bedrooms, bathrooms, agent_id, lat, lng")
      .eq("is_active", true)
      .eq("status", "public")
      .limit(1000);

    if (!properties || properties.length === 0) {
      return new Response(JSON.stringify({ matched: 0, message: "No active listings to match against" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let matchedCount = 0;

    for (const search of searches) {
      const transcript = (search.transcript || "").trim();
      if (!transcript) continue;

      const parsed = (search.parsed_query || {}) as Record<string, any>;
      const userLoc = (search.user_location || {}) as Record<string, any>;
      const key = `${transcript.toLowerCase().slice(0, 100)}|${search.user_id || ""}`;

      if (existingSet.has(key)) continue;

      // Extract search criteria
      const wantedSuburb = (parsed.location || parsed.suburb || userLoc.suburb || "").toLowerCase();
      const wantedType = (parsed.property_type || parsed.propertyType || "").toLowerCase();
      const wantedBeds = parseInt(parsed.bedrooms || parsed.beds || "0", 10);
      const wantedMaxPrice = parseInt(
        (parsed.max_price || parsed.budget || "0").toString().replace(/[^0-9]/g, ""),
        10
      );

      // Score each property against the search
      const scored = properties
        .map((p: any) => {
          let score = 0;

          // Suburb match (strongest signal)
          if (wantedSuburb && p.suburb && p.suburb.toLowerCase().includes(wantedSuburb)) {
            score += 40;
          } else if (wantedSuburb && p.state && p.state.toLowerCase().includes(wantedSuburb)) {
            score += 15;
          }

          // Property type match
          if (wantedType && p.property_type && p.property_type.toLowerCase().includes(wantedType)) {
            score += 20;
          }

          // Bedroom match
          if (wantedBeds > 0 && p.bedrooms) {
            if (p.bedrooms === wantedBeds) score += 20;
            else if (Math.abs(p.bedrooms - wantedBeds) === 1) score += 10;
          }

          // Price match
          if (wantedMaxPrice > 0 && p.price) {
            if (p.price <= wantedMaxPrice) score += 20;
            else if (p.price <= wantedMaxPrice * 1.1) score += 10;
          }

          return { property: p, score };
        })
        .filter((s: any) => s.score >= 30)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 3);

      // Create leads for top matches
      for (const match of scored) {
        const prop = match.property;
        if (!prop.agent_id) continue;

        const lead = {
          agent_id: prop.agent_id,
          property_id: prop.id,
          user_name: search.user_id ? "Voice Searcher" : "Anonymous Searcher",
          user_email: search.user_id || `anon-${search.id}@listhq.local`,
          user_id: search.user_id || null,
          message: transcript,
          score: Math.min(match.score, 100),
          status: "new",
          urgency: match.score >= 70 ? "ready_to_buy" : match.score >= 40 ? "active" : "just_browsing",
          timeframe: match.score >= 70 ? "This week" : "1–3 months",
          preferred_contact: "call",
          budget_range: wantedMaxPrice > 0 ? `Up to $${wantedMaxPrice.toLocaleString()}` : null,
          search_context: {
            source: "ai_buyer_concierge",
            parsed_query: {
              location: wantedSuburb || userLoc.suburb || null,
              budget: wantedMaxPrice > 0 ? `$${wantedMaxPrice.toLocaleString()}` : null,
              property_type: wantedType || null,
              bedrooms: wantedBeds > 0 ? String(wantedBeds) : null,
              features: parsed.features || [],
            },
            matchScore: match.score,
            voiceSearchId: search.id,
          },
        };

        const { error: insertErr } = await supabase.from("leads").insert(lead);
        if (!insertErr) {
          matchedCount++;
          existingSet.add(key);
        }
      }
    }

    return new Response(
      JSON.stringify({ matched: matchedCount, processed: searches.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("orchestrate-buyer-concierge error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
