import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const STATE_MAP: Record<string, string> = {
  victoria: "VIC", "new south wales": "NSW", queensland: "QLD",
  "western australia": "WA", "south australia": "SA", tasmania: "TAS",
  "australian capital territory": "ACT", "northern territory": "NT",
  vic: "VIC", nsw: "NSW", qld: "QLD", wa: "WA",
  sa: "SA", tas: "TAS", act: "ACT", nt: "NT",
};

function normaliseState(raw: string): string {
  return STATE_MAP[raw.toLowerCase().trim()] ?? raw.toUpperCase().trim();
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  if (req.headers.get("Authorization") !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const apiKey = Deno.env.get("LOVABLE_API_KEY") || "";

    // ── 1. Get the triggering voice search ──────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const voiceSearchId = body.voice_search_id;

    if (!voiceSearchId) {
      return new Response(JSON.stringify({ error: "No voice_search_id provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: search, error: searchErr } = await supabase
      .from("voice_searches")
      .select("id, transcript, user_id")
      .eq("id", voiceSearchId)
      .single();

    if (searchErr || !search?.transcript?.trim()) {
      console.log("[Concierge] No transcript found for:", voiceSearchId);
      return new Response(JSON.stringify({ matched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transcript = search.transcript.trim();
    console.log("[Concierge] Processing:", transcript.slice(0, 80));

    // ── 2. Parse transcript with AI ─────────────────────────────────────────
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
                content: `Parse Australian property search queries into JSON only.
States as abbreviations: VIC, NSW, QLD, WA, SA, TAS, ACT, NT.
Suburb name only, no state appended.
Prices as integers (850000 not "850k").`,
              },
              {
                role: "user",
                content: `Parse: "${transcript}"
Return ONLY this JSON:
{"suburb":null,"state":null,"property_type":null,"price_min":null,"price_max":null,"bedrooms_min":null}`,
              },
            ],
            temperature: 0,
            max_tokens: 120,
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          let raw = aiData.choices?.[0]?.message?.content?.trim() ?? "";
          raw = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
          parsed = JSON.parse(raw);
        }
      } catch (e) {
        console.warn("[Concierge] AI parse failed:", e);
      }
    } else {
      console.warn("[Concierge] No API key available, skipping AI parse");
    }

    const wantedSuburb = (parsed.suburb ?? "").toLowerCase().trim();
    const wantedState = normaliseState(parsed.state ?? "");
    const wantedType = (parsed.property_type ?? "").toLowerCase();
    const wantedBeds = Number(parsed.bedrooms_min ?? 0);
    const wantedMaxPrice = Number(String(parsed.price_max ?? "0").replace(/\D/g, ""));
    const wantedMinPrice = Number(String(parsed.price_min ?? "0").replace(/\D/g, ""));

    console.log(`[Concierge] Parsed → suburb="${wantedSuburb}" state="${wantedState}" type="${wantedType}" maxPrice=${wantedMaxPrice}`);

    if (!wantedSuburb) {
      console.log("[Concierge] No suburb extracted — skipping");
      return new Response(JSON.stringify({ matched: 0, reason: "no_suburb" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Geocode the suburb for radius matching ────────────────────────────
    let searchLat: number | null = null;
    let searchLng: number | null = null;

    try {
      const geoQ = encodeURIComponent(
        [wantedSuburb, wantedState, "Australia"].filter(Boolean).join(", "),
      );
      const geoResp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${geoQ}&format=json&limit=1&countrycodes=au`,
        { headers: { "User-Agent": "ListHQ/1.0" } },
      );
      if (geoResp.ok) {
        const geoData = await geoResp.json();
        if (geoData[0]) {
          searchLat = parseFloat(geoData[0].lat);
          searchLng = parseFloat(geoData[0].lon);
          console.log(`[Concierge] Geocoded → lat=${searchLat} lng=${searchLng}`);
        }
      }
    } catch (e) {
      console.warn("[Concierge] Geocoding failed:", e);
    }

    // ── 4. Load active properties ────────────────────────────────────────────
    const { data: properties } = await supabase
      .from("properties")
      .select("id, suburb, state, price, property_type, beds, agent_id, lat, lng")
      .eq("is_active", true)
      .limit(1000);

    if (!properties?.length) {
      console.log("[Concierge] No active properties in database");
      return new Response(JSON.stringify({ matched: 0, reason: "no_properties" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 5. Score each property ───────────────────────────────────────────────
    const scored = properties
      .map((p: any) => {
        let score = 0;
        const pSuburb = (p.suburb ?? "").toLowerCase();
        const pState = normaliseState(p.state ?? "");
        let suburbMatched = false;

        // Suburb name match
        if (pSuburb && wantedSuburb && (pSuburb.includes(wantedSuburb) || wantedSuburb.includes(pSuburb))) {
          score += 40;
          suburbMatched = true;
        }

        // Radius match (only if name didn't match and we have coordinates)
        if (
          !suburbMatched &&
          searchLat != null && searchLng != null &&
          p.lat != null && p.lng != null
        ) {
          const km = haversineKm(searchLat, searchLng, Number(p.lat), Number(p.lng));
          if (km <= 5) {
            score += 30;
            suburbMatched = true;
            console.log(`[Concierge] Radius match: ${p.suburb} is ${km.toFixed(1)}km away`);
          } else if (km <= 10) {
            score += 15;
            suburbMatched = true;
          }
        }

        // State: bonus if match, disqualify only if no suburb match either
        if (wantedState) {
          if (pState === wantedState) score += 10;
          else if (!suburbMatched) return { p, score: 0 };
        }

        if (!suburbMatched) return { p, score: 0 };

        // Property type
        if (wantedType && p.property_type?.toLowerCase().includes(wantedType)) score += 20;

        // Bedrooms
        if (wantedBeds > 0 && p.beds) {
          if (p.beds === wantedBeds) score += 20;
          else if (Math.abs(p.beds - wantedBeds) === 1) score += 10;
        }

        // Price
        if (wantedMaxPrice > 0 && p.price) {
          if (p.price <= wantedMaxPrice) score += 15;
          else if (p.price <= wantedMaxPrice * 1.1) score += 5;
        }
        if (wantedMinPrice > 0 && p.price && p.price >= wantedMinPrice * 0.9) score += 5;

        return { p, score };
      })
      .filter((s: any) => s.score >= 25)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 10);

    if (!scored.length) {
      console.log(`[Concierge] No property matches for suburb="${wantedSuburb}"`);
      return new Response(JSON.stringify({ matched: 0, reason: "no_matches" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 6. Deduplicate agents ────────────────────────────────────────────────
    const agentIds = [...new Set(scored.map((s: any) => s.p.agent_id).filter(Boolean))] as string[];

    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentLeads } = await supabase
      .from("leads")
      .select("agent_id")
      .eq("source", "ai_buyer_concierge")
      .eq("message", transcript)
      .in("agent_id", agentIds)
      .gte("created_at", tenMinAgo);

    const alreadyNotified = new Set((recentLeads ?? []).map((l: any) => l.agent_id));
    const freshAgents = agentIds.filter((id) => !alreadyNotified.has(id));

    if (!freshAgents.length) {
      console.log("[Concierge] All agents already notified recently");
      return new Response(JSON.stringify({ matched: 0, reason: "deduped" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 7. Insert one lead per fresh agent ──────────────────────────────────
    let matchedCount = 0;

    for (const agentId of freshAgents) {
      const best = scored.find((s: any) => s.p.agent_id === agentId);
      if (!best) continue;

      const { error: insertErr } = await supabase.from("leads").insert({
        agent_id: agentId,
        property_id: String(best.p.id),
        user_id: search.user_id ?? null,
        user_name: search.user_id ? "Voice Searcher" : "Anonymous Searcher",
        user_email: search.user_id || `anon-${search.id}@listhq.local`,
        source: "ai_buyer_concierge",
        message: transcript,
        status: "new",
        read: false,
        score: Math.min(best.score, 100),
        urgency: best.score >= 70 ? "ready_to_buy" : best.score >= 40 ? "actively_searching" : "just_browsing",
        timeframe: best.score >= 70 ? "This week" : "1-3 months",
        preferred_contact: "call",
        budget_range: wantedMaxPrice > 0 ? `Up to $${wantedMaxPrice.toLocaleString()}` : null,
        search_context: {
          source: "ai_buyer_concierge",
          matched_suburb: wantedSuburb,
          matched_state: wantedState || null,
          price_min: wantedMinPrice || null,
          price_max: wantedMaxPrice || null,
          bedrooms_min: wantedBeds || null,
          property_type: wantedType || null,
          voice_search_id: voiceSearchId,
        },
      });

      if (!insertErr) {
        matchedCount++;
        console.log(`[Concierge] Lead created → agent=${agentId} suburb=${wantedSuburb} score=${best.score}`);

        // Mirror into crm_leads so agent sees voice search buyer in their CRM pipeline
        const crmPriority = best.score >= 70 ? "high" : best.score >= 40 ? "medium" : "low";
        await supabase.from("crm_leads").insert({
          agent_id: agentId,
          property_id: String(best.p.id),
          first_name: "Voice Searcher",
          stage: "new",
          priority: crmPriority,
          source: "portal",
          pre_approved: false,
          budget_min: wantedMinPrice || null,
          budget_max: wantedMaxPrice || null,
          notes: `Voice search: "${transcript.slice(0, 200)}"`,
          tags: ["voice-search"],
        });
      } else {
        console.error("[Concierge] Insert error:", insertErr.message);
      }
    }

    return new Response(
      JSON.stringify({ matched: matchedCount, agents: freshAgents.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[Concierge] Fatal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
