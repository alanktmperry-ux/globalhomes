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

    // 1. Fetch recent voice searches (last 7 days)
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

    // 2. Deduplicate — skip searches already processed as concierge leads
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("message, user_email")
      .filter("search_context->>source", "eq", "ai_buyer_concierge")
      .gte("created_at", sevenDaysAgo);

    const existingSet = new Set(
      (existingLeads || []).map((l: any) => `${(l.message || "").toLowerCase().trim().slice(0, 100)}|${l.user_email}`)
    );

    // 3. Fetch all active public listings with agents
    const { data: properties } = await supabase
      .from("properties")
      .select("id, title, address, suburb, state, price, property_type, beds, baths, agent_id, lat, lng")
      .eq("is_active", true)
      .eq("status", "public")
      .limit(1000);

    if (!properties || properties.length === 0) {
      return new Response(JSON.stringify({ matched: 0, message: "No active listings to match against" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Use AI to parse each search transcript
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    let matchedCount = 0;

    for (const search of searches) {
      const transcript = (search.transcript || "").trim();
      if (!transcript) continue;

      const key = `${transcript.toLowerCase().slice(0, 100)}|${search.user_id || ""}`;
      if (existingSet.has(key)) continue;

      // Parse transcript via AI
      let parsed: Record<string, any> = {};
      if (apiKey) {
        try {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "system",
                  content: `Parse Australian property search queries into JSON. Return ONLY valid JSON, no explanation. Prices as integers. States as abbreviations (VIC, NSW, QLD, WA, SA, TAS, ACT, NT).`,
                },
                {
                  role: "user",
                  content: `Parse: "${transcript}"\nReturn JSON: {"suburb":null,"state":null,"property_type":null,"price_min":null,"price_max":null,"bedrooms_min":null}`,
                },
              ],
              temperature: 0,
              max_tokens: 150,
            }),
          });

          if (aiResp.ok) {
            const aiData = await aiResp.json();
            let raw = aiData.choices?.[0]?.message?.content?.trim() ?? "";
            raw = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
            parsed = JSON.parse(raw);
          }
        } catch (e) {
          console.warn("AI parse failed for transcript, using fallback scoring:", e);
        }
      }

      // Also try the already-parsed query from voice_searches if available
      const existingParsed = (search.parsed_query || {}) as Record<string, any>;
      const userLoc = (search.user_location || {}) as Record<string, any>;

      const wantedSuburb = (parsed.suburb || existingParsed.location || existingParsed.suburb || userLoc.suburb || "").toLowerCase();
      const wantedType = (parsed.property_type || existingParsed.property_type || existingParsed.propertyType || "").toLowerCase();
      const wantedBeds = parseInt(parsed.bedrooms_min || existingParsed.bedrooms || existingParsed.beds || "0", 10);
      const wantedState = (parsed.state || existingParsed.state || "").toUpperCase();
      const wantedMaxPrice = parseInt(
        (parsed.price_max || existingParsed.max_price || existingParsed.budget || "0").toString().replace(/[^0-9]/g, ""),
        10
      );
      const wantedMinPrice = parseInt(
        (parsed.price_min || "0").toString().replace(/[^0-9]/g, ""),
        10
      );

      // Score each property
      const scored = properties
        .map((p: any) => {
          let score = 0;

          // Suburb match (strongest signal)
          if (wantedSuburb && p.suburb && p.suburb.toLowerCase().includes(wantedSuburb)) {
            score += 40;
          } else if (wantedSuburb && p.address && p.address.toLowerCase().includes(wantedSuburb)) {
            score += 25;
          } else if (wantedSuburb && p.state && p.state.toLowerCase().includes(wantedSuburb)) {
            score += 15;
          }

          // State match
          if (wantedState && p.state && p.state.toUpperCase() === wantedState) {
            score += 10;
          }

          // Property type match
          if (wantedType && p.property_type && p.property_type.toLowerCase().includes(wantedType)) {
            score += 20;
          }

          // Bedroom match
          if (wantedBeds > 0 && p.beds) {
            if (p.beds === wantedBeds) score += 20;
            else if (Math.abs(p.beds - wantedBeds) === 1) score += 10;
          }

          // Price match
          if (wantedMaxPrice > 0 && p.price) {
            if (p.price <= wantedMaxPrice) score += 15;
            else if (p.price <= wantedMaxPrice * 1.15) score += 5;
          }
          if (wantedMinPrice > 0 && p.price) {
            if (p.price >= wantedMinPrice) score += 5;
          }

          return { property: p, score };
        })
        .filter((s: any) => s.score >= 20) // Lower threshold to catch more matches
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5);

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
          urgency: match.score >= 70 ? "ready_to_buy" : match.score >= 40 ? "actively_searching" : "just_browsing",
          timeframe: match.score >= 70 ? "This week" : "1–3 months",
          preferred_contact: "call",
          budget_range: wantedMaxPrice > 0 ? `Up to $${wantedMaxPrice.toLocaleString()}` : null,
          search_context: {
            source: "ai_buyer_concierge",
            parsed_query: {
              location: wantedSuburb || userLoc.suburb || null,
              state: wantedState || null,
              budget: wantedMaxPrice > 0 ? `$${wantedMaxPrice.toLocaleString()}` : null,
              property_type: wantedType || null,
              bedrooms: wantedBeds > 0 ? String(wantedBeds) : null,
              features: existingParsed.features || [],
            },
            matchScore: match.score,
            voiceSearchId: search.id,
          },
        };

        const { error: insertErr } = await supabase.from("leads").insert(lead);
        if (!insertErr) {
          matchedCount++;
          existingSet.add(key);
          console.log(`Created lead for agent ${prop.agent_id} from query: "${transcript.slice(0, 50)}..." (score: ${match.score})`);
        } else {
          console.error("Lead insert error:", insertErr);
        }
      }

      if (scored.length === 0) {
        console.log(`No matches for query: "${transcript.slice(0, 80)}" (suburb="${wantedSuburb}", type="${wantedType}")`);
      }
    }

    return new Response(
      JSON.stringify({ matched: matchedCount, processed: searches.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("orchestrate-buyer-concierge error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
