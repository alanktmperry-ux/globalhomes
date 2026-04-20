// AI buyer-to-listing matcher.
// Fetches a listing, casts a wide net of buyer_intent rows, and asks Lovable AI
// to score each buyer. Saves rows >= 50 into listing_buyer_matches.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SCORING_TOOL = {
  type: "function",
  function: {
    name: "score_buyer_match",
    description: "Score how well a buyer matches a listing.",
    parameters: {
      type: "object",
      properties: {
        match_score: { type: "integer", minimum: 0, maximum: 100 },
        reasoning: { type: "string" },
      },
      required: ["match_score", "reasoning"],
      additionalProperties: false,
    },
  },
};

async function scoreOne(
  apiKey: string,
  listing: any,
  buyer: any
): Promise<{ match_score: number; reasoning: string } | null> {
  const systemPrompt = `You are a real estate matching engine. Score how well this buyer matches this listing.

Listing:
- Suburb: ${listing.suburb ?? "?"}
- Price: A$${listing.price ?? "?"}
- Bedrooms: ${listing.beds ?? "?"}, Bathrooms: ${listing.baths ?? "?"}
- Type: ${listing.property_type ?? "?"}
- Description: ${(listing.description ?? "").slice(0, 500)}
- Features: ${(listing.features ?? []).join(", ")}

Buyer intent:
- Looking in: ${(buyer.suburbs ?? []).join(", ")}
- Budget: A$${buyer.min_price ?? "?"} - A$${buyer.max_price ?? "?"}
- Wants: ${buyer.bedrooms ?? "?"} bed, ${buyer.bathrooms ?? "?"} bath
- Property type: ${(buyer.property_types ?? []).join(", ")}
- Features wanted: ${(buyer.features ?? []).join(", ")}
- Lifestyle: ${(buyer.lifestyle_keywords ?? []).join(", ")}
- Summary: ${buyer.intent_summary ?? ""}
- Readiness score: ${buyer.readiness_score ?? 0}/100
- Search count: ${buyer.search_count ?? 1} times

Score above 60 = good match. Below 40 = poor match. Only scores above 50 are worth showing agents.
Provide a one-sentence reasoning.`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }],
        tools: [SCORING_TOOL],
        tool_choice: { type: "function", function: { name: "score_buyer_match" } },
      }),
    });
    if (!res.ok) {
      console.error("AI scoring error", res.status, await res.text());
      return null;
    }
    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return null;
    const parsed = JSON.parse(args);
    return {
      match_score: Math.max(0, Math.min(100, Number(parsed.match_score) || 0)),
      reasoning: String(parsed.reasoning ?? ""),
    };
  } catch (e) {
    console.error("scoreOne failed", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { listing_id } = await req.json();
    if (!listing_id || typeof listing_id !== "string") {
      return new Response(JSON.stringify({ error: "listing_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service-role for cross-table reads (buyer_intent is restricted to agents anyway)
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: listing, error: listingErr } = await admin
      .from("properties")
      .select("id, agent_id, suburb, state, price, beds, baths, property_type, description, features")
      .eq("id", listing_id)
      .maybeSingle();
    if (listingErr || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cast a wide net: active buyers (last 90 days) where any of the soft criteria match.
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    let q = admin
      .from("buyer_intent")
      .select("*")
      .gte("last_searched_at", ninetyDaysAgo)
      .limit(50);

    // Price filter (max_price >= listing price OR null)
    if (listing.price) {
      q = q.or(`max_price.gte.${listing.price},max_price.is.null`);
    }

    const { data: candidates, error: candErr } = await q;
    if (candErr) {
      console.error("candidate query error", candErr);
      return new Response(JSON.stringify({ error: "Failed to fetch candidates" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Soft filter in code: suburb overlap OR empty suburbs OR bedrooms match
    const listingSuburb = (listing.suburb ?? "").toLowerCase().trim();
    const filtered = (candidates ?? []).filter((b: any) => {
      const buyerSuburbs: string[] = (b.suburbs ?? []).map((s: string) => s.toLowerCase().trim());
      const suburbMatch =
        buyerSuburbs.length === 0 ||
        (listingSuburb && buyerSuburbs.some((s) => s.includes(listingSuburb) || listingSuburb.includes(s)));
      const bedsMatch = b.bedrooms != null && listing.beds != null && b.bedrooms === listing.beds;
      return suburbMatch || bedsMatch;
    });

    // Score in batches of 10 with 500ms delay between batches to avoid rate limits
    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 500;
    const scored: Array<{ buyer: any; match_score: number; reasoning: string } | null> = [];
    for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
      const batch = filtered.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (buyer: any) => {
          try {
            const score = await scoreOne(LOVABLE_API_KEY, listing, buyer);
            if (!score) {
              console.warn(`Score failed (null) for buyer_intent_id=${buyer.id}`);
              return null;
            }
            return { buyer, ...score };
          } catch (err) {
            console.error(`Score errored for buyer_intent_id=${buyer.id}`, err);
            return null;
          }
        })
      );
      scored.push(...results);
      if (i + BATCH_SIZE < filtered.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    const goodMatches = scored
      .filter((m): m is NonNullable<typeof m> => m !== null && m.match_score >= 50);

    // Replace previous matches for this listing
    await admin.from("listing_buyer_matches").delete().eq("listing_id", listing_id);

    if (goodMatches.length > 0) {
      const rows = goodMatches.map((m) => ({
        listing_id: listing.id,
        buyer_intent_id: m.buyer.id,
        buyer_id: m.buyer.buyer_id,
        agent_id: listing.agent_id,
        match_score: m.match_score,
        match_reasoning: m.reasoning,
        readiness_score: m.buyer.readiness_score ?? 0,
        status: "new",
      }));
      const { error: insErr } = await admin.from("listing_buyer_matches").insert(rows);
      if (insErr) console.error("match insert error", insErr);
    }

    return new Response(
      JSON.stringify({
        listing_id,
        candidates_considered: filtered.length,
        matches_created: goodMatches.length,
        top_matches: goodMatches
          .slice()
          .sort((a, b) => b.match_score - a.match_score)
          .slice(0, 5)
          .map((m) => ({ score: m.match_score, reasoning: m.reasoning })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("match-buyers-to-listing error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
