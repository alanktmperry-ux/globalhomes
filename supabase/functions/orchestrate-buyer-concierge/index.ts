import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ParsedIntent = {
  suburb: string;
  state: string;
  property_type: string;
  price_min: number;
  price_max: number;
  bedrooms_min: number;
};

const STATE_MAP: Record<string, string> = {
  victoria: "VIC",
  "new south wales": "NSW",
  queensland: "QLD",
  "western australia": "WA",
  "south australia": "SA",
  tasmania: "TAS",
  "australian capital territory": "ACT",
  "northern territory": "NT",
  vic: "VIC",
  nsw: "NSW",
  qld: "QLD",
  wa: "WA",
  sa: "SA",
  tas: "TAS",
  act: "ACT",
  nt: "NT",
};

function normaliseState(raw: string): string {
  const key = raw.toLowerCase().trim();
  return STATE_MAP[key] || raw.toUpperCase().trim();
}

function sanitiseSuburb(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b(vic|nsw|qld|wa|sa|tas|act|nt)\b/g, "")
    .replace(/\b(victoria|new south wales|queensland|western australia|south australia|tasmania|australian capital territory|northern territory)\b/g, "")
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value: unknown): number {
  const cleaned = String(value ?? "0").replace(/[^0-9]/g, "");
  const parsed = Number.parseInt(cleaned || "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractSuburbFallback(transcript: string): Pick<ParsedIntent, "suburb" | "state"> {
  const inMatch = transcript.match(/\b(?:in|at|around|near)\s+([a-z\s-]+?)(?:\s+(?:victoria|vic|new south wales|nsw|queensland|qld|western australia|wa|south australia|sa|tasmania|tas|australian capital territory|act|northern territory|nt)\b|[\.,]|$)/i);
  const stateMatch = transcript.match(/\b(victoria|vic|new south wales|nsw|queensland|qld|western australia|wa|south australia|sa|tasmania|tas|australian capital territory|act|northern territory|nt)\b/i);

  return {
    suburb: inMatch?.[1]?.trim() ?? "",
    state: stateMatch?.[1] ? normaliseState(stateMatch[1]) : "",
  };
}

async function parseIntentWithAi(transcript: string, apiKey: string): Promise<Partial<ParsedIntent>> {
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
          content:
            "Parse Australian property search queries into strict JSON only. Use state abbreviations (VIC, NSW, QLD, WA, SA, TAS, ACT, NT). Return numeric prices as integers.",
        },
        {
          role: "user",
          content:
            `Parse: "${transcript}"\nReturn JSON: {"suburb":null,"state":null,"property_type":null,"price_min":null,"price_max":null,"bedrooms_min":null}`,
        },
      ],
      temperature: 0,
      max_tokens: 200,
    }),
  });

  if (!aiResp.ok) {
    const errorText = await aiResp.text();
    throw new Error(`AI parse failed (${aiResp.status}): ${errorText}`);
  }

  const aiData = await aiResp.json();
  let raw = aiData.choices?.[0]?.message?.content?.trim() ?? "";
  raw = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(raw);
}

function buildIntent(
  transcript: string,
  parsed: Partial<ParsedIntent>,
  existingParsed: Record<string, unknown>,
  userLoc: Record<string, unknown>,
): ParsedIntent {
  const fallback = extractSuburbFallback(transcript);

  const suburb = sanitiseSuburb(
    String(
      parsed.suburb ||
        existingParsed.location ||
        existingParsed.suburb ||
        userLoc.suburb ||
        fallback.suburb ||
        "",
    ),
  );

  const state = normaliseState(
    String(parsed.state || existingParsed.state || userLoc.state || fallback.state || ""),
  );

  return {
    suburb,
    state,
    property_type: String(parsed.property_type || existingParsed.property_type || existingParsed.propertyType || "")
      .toLowerCase()
      .trim(),
    price_min: parseNumber(parsed.price_min),
    price_max: parseNumber(parsed.price_max || existingParsed.max_price || existingParsed.budget),
    bedrooms_min: parseNumber(parsed.bedrooms_min || existingParsed.bedrooms || existingParsed.beds),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1) Fetch recent voice searches (last 7 days)
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

    // 2) Fetch active public properties
    const { data: properties } = await supabase
      .from("properties")
      .select("id, title, address, suburb, state, price, property_type, beds, baths, agent_id, lat, lng")
      .eq("is_active", true)
      .limit(1000);

    if (!properties || properties.length === 0) {
      return new Response(JSON.stringify({ matched: 0, message: "No active listings to match against" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("OPENAI_API_KEY") || "";
    let matchedCount = 0;
    let skippedCount = 0;

    for (const search of searches) {
      const transcript = (search.transcript || "").trim();
      if (!transcript) continue;

      let parsed: Partial<ParsedIntent> = {};
      if (apiKey) {
        try {
          parsed = await parseIntentWithAi(transcript, apiKey);
        } catch (e) {
          console.warn("AI parse failed, fallback parsing used:", e);
        }
      } else {
        console.warn("No AI key available, fallback parsing used");
      }

      const existingParsed = (search.parsed_query || {}) as Record<string, unknown>;
      const userLoc = (search.user_location || {}) as Record<string, unknown>;
      const intent = buildIntent(transcript, parsed, existingParsed, userLoc);

      console.log("[Concierge] Parsed intent:", JSON.stringify(intent));

      if (!intent.suburb) {
        console.log(`[Concierge] No suburb extracted — skipping lead creation: "${transcript.slice(0, 80)}"`);
        skippedCount++;
        continue;
      }

      // 3) Score properties
      const scored = properties
        .map((p: Record<string, unknown>) => {
          let score = 0;
          const pSuburb = sanitiseSuburb(String(p.suburb || ""));
          const pState = normaliseState(String(p.state || ""));
          const pAddress = String(p.address || "").toLowerCase();

          let suburbMatched = false;
          if (pSuburb && (pSuburb.includes(intent.suburb) || intent.suburb.includes(pSuburb))) {
            score += 40;
            suburbMatched = true;
          } else if (intent.suburb && pAddress.includes(intent.suburb)) {
            score += 25;
            suburbMatched = true;
          }

          if (intent.state) {
            if (pState === intent.state) {
              score += 40;
              score += 10;
            } else if (!suburbMatched) {
              return { property: p, score: 0 };
            }
          }

          if (
            intent.property_type &&
            String(p.property_type || "")
              .toLowerCase()
              .includes(intent.property_type)
          ) {
            score += 20;
          }

          const beds = Number(p.beds || 0);
          if (intent.bedrooms_min > 0 && beds > 0) {
            if (beds === intent.bedrooms_min) score += 20;
            else if (Math.abs(beds - intent.bedrooms_min) === 1) score += 10;
          }

          const price = Number(p.price || 0);
          if (intent.price_max > 0 && price > 0) {
            if (price <= intent.price_max) score += 15;
            else if (price <= intent.price_max * 1.1) score += 5;
          }
          if (intent.price_min > 0 && price > 0 && price >= intent.price_min * 0.9) {
            score += 5;
          }

          return { property: p, score };
        })
        .filter((s) => s.score >= 30)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (scored.length === 0) {
        console.log(
          `No matches for query: "${transcript.slice(0, 80)}" (suburb="${intent.suburb}", state="${intent.state}", type="${intent.property_type}")`,
        );
        skippedCount++;
        continue;
      }

      const agentIds = [
        ...new Set(
          scored
            .map((s) => String(s.property.agent_id || ""))
            .filter(Boolean),
        ),
      ];

      // 4) Deduplicate recent leads by agent + query + suburb
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: recentLeads } = await supabase
        .from("leads")
        .select("agent_id")
        .eq("message", transcript)
        .filter("search_context->>source", "eq", "ai_buyer_concierge")
        .filter("search_context->parsed_query->>location", "eq", intent.suburb)
        .in("agent_id", agentIds)
        .gte("created_at", tenMinutesAgo);

      const alreadyNotified = new Set((recentLeads ?? []).map((l: { agent_id: string }) => l.agent_id));
      const dedupedAgentIds = agentIds.filter((id: string) => !alreadyNotified.has(id));

      if (dedupedAgentIds.length === 0) {
        skippedCount++;
        console.log(`All ${agentIds.length} matching agents already notified recently for: "${transcript.slice(0, 50)}"`);
        continue;
      }

      // 5) Insert one lead per agent (schema-compatible)
      for (const agentId of dedupedAgentIds) {
        const bestMatch = scored.find((s) => String(s.property.agent_id || "") === agentId);
        if (!bestMatch) continue;

        const prop = bestMatch.property as { id?: string };
        const lead = {
          agent_id: agentId,
          property_id: String(prop.id || ""),
          user_name: search.user_id ? "Voice Searcher" : "Anonymous Searcher",
          user_email: search.user_id || `anon-${search.id}@listhq.local`,
          user_id: search.user_id || null,
          message: transcript,
          score: Math.min(bestMatch.score, 100),
          status: "new",
          urgency: bestMatch.score >= 70 ? "ready_to_buy" : bestMatch.score >= 40 ? "actively_searching" : "just_browsing",
          timeframe: bestMatch.score >= 70 ? "This week" : "1-3 months",
          preferred_contact: "call",
          budget_range: intent.price_max > 0 ? `Up to $${intent.price_max.toLocaleString()}` : null,
          search_context: {
            source: "ai_buyer_concierge",
            parsed_query: {
              location: intent.suburb || null,
              state: intent.state || null,
              budget: intent.price_max > 0 ? `$${intent.price_max.toLocaleString()}` : null,
              property_type: intent.property_type || null,
              bedrooms: intent.bedrooms_min > 0 ? String(intent.bedrooms_min) : null,
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
          console.error("Lead insert error:", insertErr.message);
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
