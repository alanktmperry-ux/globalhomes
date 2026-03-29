import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATE_MAP: Record<string, string> = {
  'victoria': 'VIC', 'new south wales': 'NSW', 'queensland': 'QLD',
  'western australia': 'WA', 'south australia': 'SA', 'tasmania': 'TAS',
  'australian capital territory': 'ACT', 'northern territory': 'NT',
  'vic': 'VIC', 'nsw': 'NSW', 'qld': 'QLD',
  'wa': 'WA', 'sa': 'SA', 'tas': 'TAS', 'act': 'ACT', 'nt': 'NT',
};

function normaliseState(raw: string): string {
  const key = raw.toLowerCase().trim();
  return STATE_MAP[key] || raw.toUpperCase().trim();
}

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

    // 2. Fetch all active public listings with agents
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

    // 3. Parse each search transcript and match to agents
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    let matchedCount = 0;
    let skippedCount = 0;

    for (const search of searches) {
      const transcript = (search.transcript || "").trim();
      if (!transcript) continue;

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
                  content: `Parse Australian property search queries into JSON. Return ONLY valid JSON, no explanation. Prices as integers. States as abbreviations (VIC, NSW, QLD, WA, SA, TAS, ACT, NT). Suburbs should be the suburb name only (e.g. "Doncaster" not "Doncaster VIC").`,
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
          console.warn("AI parse failed for transcript, using fallback:", e);
        }
      }

      const existingParsed = (search.parsed_query || {}) as Record<string, any>;
      const userLoc = (search.user_location || {}) as Record<string, any>;

      const wantedSuburb = (parsed.suburb || existingParsed.location || existingParsed.suburb || userLoc.suburb || "").toLowerCase().trim();
      const wantedType = (parsed.property_type || existingParsed.property_type || existingParsed.propertyType || "").toLowerCase();
      const wantedBeds = parseInt(parsed.bedrooms_min || existingParsed.bedrooms || existingParsed.beds || "0", 10);
      const wantedState = normaliseState(parsed.state || existingParsed.state || "");
      const wantedMaxPrice = parseInt(
        (parsed.price_max || existingParsed.max_price || existingParsed.budget || "0").toString().replace(/[^0-9]/g, ""),
        10
      );
      const wantedMinPrice = parseInt(
        (parsed.price_min || "0").toString().replace(/[^0-9]/g, ""),
        10
      );

      // Debug: log parsed intent for diagnosis
      console.log(`[Concierge] Parsed intent: suburb="${wantedSuburb}", state="${wantedState}", type="${wantedType}", beds=${wantedBeds}, maxPrice=${wantedMaxPrice}`);

      // STRICT: Require suburb to be present — state alone is too broad
      if (!wantedSuburb) {
        console.log(`[Concierge] No suburb extracted — skipping lead creation: "${transcript.slice(0, 80)}"`);
        continue;
      }

      // Score each property — require suburb match for lead creation
      const scored = properties
        .map((p: any) => {
          let score = 0;
          const pSuburb = (p.suburb || "").toLowerCase();
          const pState = normaliseState(p.state || "");
          const pAddress = (p.address || "").toLowerCase();

          // Suburb match (strongest signal — required for tight matching)
          let suburbMatched = false;
          if (wantedSuburb) {
            if (pSuburb.includes(wantedSuburb) || wantedSuburb.includes(pSuburb)) {
              score += 40;
              suburbMatched = true;
            } else if (pAddress.includes(wantedSuburb)) {
              score += 25;
              suburbMatched = true;
            }
          }

          // State match — boosts score; mismatch only disqualifies if suburb also didn't match
          if (wantedState) {
            if (pState === wantedState) {
              score += 10;
            } else if (!suburbMatched) {
              // State mismatch AND no suburb match = definitely wrong agent, disqualify
              return { property: p, score: 0 };
            }
            // If suburb matched but state is wrong format/missing, we still allow it
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

          // Price match (10% buffer)
          if (wantedMaxPrice > 0 && p.price) {
            if (p.price <= wantedMaxPrice) score += 15;
            else if (p.price <= wantedMaxPrice * 1.10) score += 5;
          }
          if (wantedMinPrice > 0 && p.price) {
            if (p.price >= wantedMinPrice * 0.90) score += 5;
          }

          return { property: p, score };
        })
        .filter((s: any) => s.score >= 30) // Raised threshold: need suburb match + at least one other signal
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 3); // Max 3 properties per search

      if (scored.length === 0) {
        console.log(`No matches for query: "${transcript.slice(0, 80)}" (suburb="${wantedSuburb}", state="${wantedState}", type="${wantedType}")`);
        continue;
      }

      // Deduplicate: collect unique agent IDs from scored properties
      const agentIds = [...new Set(scored.map((s: any) => s.property.agent_id).filter(Boolean))];

      // Check for recently created leads for these agents with the same message (10 min window)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: recentLeads } = await supabase
        .from("leads")
        .select("agent_id")
        .eq("message", transcript)
        .filter("search_context->>source", "eq", "ai_buyer_concierge")
        .in("agent_id", agentIds)
        .gte("created_at", tenMinutesAgo);

      const alreadyNotified = new Set((recentLeads ?? []).map((l: any) => l.agent_id));
      const dedupedAgentIds = agentIds.filter((id: string) => !alreadyNotified.has(id));

      if (dedupedAgentIds.length === 0) {
        skippedCount++;
        console.log(`All ${agentIds.length} matching agents already notified recently for: "${transcript.slice(0, 50)}"`);
        continue;
      }

      // Insert ONE lead per deduped agent (pick the best-scoring property for that agent)
      for (const agentId of dedupedAgentIds) {
        const bestMatch = scored.find((s: any) => s.property.agent_id === agentId);
        if (!bestMatch) continue;

        const prop = bestMatch.property;
        const lead = {
          agent_id: agentId,
          property_id: prop.id,
          user_name: search.user_id ? "Voice Searcher" : "Anonymous Searcher",
          user_email: search.user_id || `anon-${search.id}@listhq.local`,
          user_id: search.user_id || null,
          message: transcript,
          score: Math.min(bestMatch.score, 100),
          status: "new",
          urgency: bestMatch.score >= 70 ? "ready_to_buy" : bestMatch.score >= 40 ? "actively_searching" : "just_browsing",
          timeframe: bestMatch.score >= 70 ? "This week" : "1–3 months",
          preferred_contact: "call",
          budget_range: wantedMaxPrice > 0 ? `Up to $${wantedMaxPrice.toLocaleString()}` : null,
          search_context: {
            source: "ai_buyer_concierge",
            parsed_query: {
              location: wantedSuburb || null,
              state: wantedState || null,
              budget: wantedMaxPrice > 0 ? `$${wantedMaxPrice.toLocaleString()}` : null,
              property_type: wantedType || null,
              bedrooms: wantedBeds > 0 ? String(wantedBeds) : null,
              features: existingParsed.features || [],
            },
            matchScore: bestMatch.score,
            voiceSearchId: search.id,
          },
        };

        const { error: insertErr } = await supabase.from("leads").insert(lead);
        if (!insertErr) {
          matchedCount++;
          console.log(`Created lead for agent ${agentId} from query: "${transcript.slice(0, 50)}..." (score: ${bestMatch.score})`);
        } else {
          console.error("Lead insert error:", insertErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ matched: matchedCount, processed: searches.length, skipped: skippedCount }),
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
