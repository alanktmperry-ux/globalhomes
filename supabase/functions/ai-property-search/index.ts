// AI-powered property search edge function
// Extracts buyer intent via Lovable AI, queries properties, and persists buyer_intent + activity event.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a property search assistant for an Australian real estate platform.
Extract structured search intent from the buyer's query.
- If a price like "800k" is mentioned, treat as 800000. "1.2 million" = 1200000.
- If suburb is unclear but a region is mentioned (e.g. "inner north Melbourne"), list the most common suburbs in that area.
- property_types must be from: house, apartment, townhouse, unit, land, rural.
- intent_summary is a one-sentence description of what this buyer wants.`;

const intentTool = {
  type: "function",
  function: {
    name: "extract_intent",
    description: "Extract structured property-search intent from a buyer's natural-language query.",
    parameters: {
      type: "object",
      properties: {
        suburbs: { type: "array", items: { type: "string" } },
        min_price: { type: ["integer", "null"] },
        max_price: { type: ["integer", "null"] },
        bedrooms: { type: ["integer", "null"] },
        bathrooms: { type: ["integer", "null"] },
        property_types: { type: "array", items: { type: "string" } },
        features: { type: "array", items: { type: "string" } },
        lifestyle_keywords: { type: "array", items: { type: "string" } },
        intent_summary: { type: "string" },
      },
      required: [
        "suburbs",
        "min_price",
        "max_price",
        "bedrooms",
        "bathrooms",
        "property_types",
        "features",
        "lifestyle_keywords",
        "intent_summary",
      ],
      additionalProperties: false,
    },
  },
};

const PROPERTIES_WITH_AGENTS =
  "*, agents(name, agency, phone, email, avatar_url, is_subscribed, verification_badge_level, specialization, years_experience, rating, review_count)";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, session_id, buyer_id } = await req.json();

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!session_id || typeof session_id !== "string") {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // 1. Extract intent via Lovable AI (tool calling)
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: query },
        ],
        tools: [intentTool],
        tool_choice: { type: "function", function: { name: "extract_intent" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let intent: any = {
      suburbs: [],
      min_price: null,
      max_price: null,
      bedrooms: null,
      bathrooms: null,
      property_types: [],
      features: [],
      lifestyle_keywords: [],
      intent_summary: "",
    };
    try {
      if (toolCall?.function?.arguments) {
        intent = { ...intent, ...JSON.parse(toolCall.function.arguments) };
      }
    } catch (e) {
      console.error("Failed to parse intent JSON", e);
    }

    // 2. Query properties using extracted filters
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let q = supabase
      .from("properties")
      .select(PROPERTIES_WITH_AGENTS)
      .eq("is_active", true)
      .not("listing_type", "eq", "rent")
      .order("created_at", { ascending: false })
      .limit(60);

    if (Array.isArray(intent.suburbs) && intent.suburbs.length > 0) {
      const orFilter = intent.suburbs
        .slice(0, 20)
        .map((s: string) => `suburb.ilike.%${s.replace(/[%,]/g, "")}%`)
        .join(",");
      if (orFilter) q = q.or(orFilter);
    }
    if (intent.min_price) q = q.gte("price", intent.min_price);
    if (intent.max_price) q = q.lte("price", intent.max_price);
    if (intent.bedrooms) q = q.gte("beds", intent.bedrooms);
    if (intent.bathrooms) q = q.gte("baths", intent.bathrooms);
    if (Array.isArray(intent.property_types) && intent.property_types.length > 0) {
      const ptFilter = intent.property_types
        .map((p: string) => `property_type.ilike.%${p.replace(/[%,]/g, "")}%`)
        .join(",");
      if (ptFilter) q = q.or(ptFilter);
    }

    const { data: properties, error: propErr } = await q;
    if (propErr) {
      console.error("Property query error", propErr);
    }

    // 3. Upsert buyer_intent (find existing by buyer_id or session_id)
    let existingId: string | null = null;
    try {
      const lookup = supabase.from("buyer_intent").select("id, search_count").limit(1);
      const { data: existing } = buyer_id
        ? await lookup.eq("buyer_id", buyer_id).maybeSingle()
        : await lookup.eq("session_id", session_id).is("buyer_id", null).maybeSingle();
      if (existing) existingId = existing.id;

      const intentRow = {
        buyer_id: buyer_id ?? null,
        session_id,
        raw_query: query,
        suburbs: intent.suburbs ?? [],
        min_price: intent.min_price,
        max_price: intent.max_price,
        bedrooms: intent.bedrooms,
        bathrooms: intent.bathrooms,
        property_types: intent.property_types ?? [],
        features: intent.features ?? [],
        lifestyle_keywords: intent.lifestyle_keywords ?? [],
        intent_summary: intent.intent_summary ?? "",
        last_searched_at: new Date().toISOString(),
      };

      if (existingId) {
        await supabase
          .from("buyer_intent")
          .update({ ...intentRow, search_count: (existing!.search_count ?? 1) + 1 })
          .eq("id", existingId);
      } else {
        await supabase.from("buyer_intent").insert(intentRow);
      }
    } catch (e) {
      console.error("buyer_intent upsert failed", e);
    }

    // 4. Insert activity event
    try {
      await supabase.from("buyer_activity_events").insert({
        buyer_id: buyer_id ?? null,
        event_type: "search",
        metadata: { query, intent_summary: intent.intent_summary, session_id },
      });
    } catch (e) {
      console.error("activity insert failed", e);
    }

    return new Response(
      JSON.stringify({
        properties: properties ?? [],
        intent,
        total: properties?.length ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-property-search error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
