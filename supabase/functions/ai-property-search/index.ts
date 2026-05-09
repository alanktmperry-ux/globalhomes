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
  "*, agents(id, name, agency, avatar_url, is_subscribed, verification_badge_level, specialization, years_experience, rating, review_count)";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Public endpoint — rate-limit by IP to prevent abuse
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('cf-connecting-ip')
      || 'unknown';
    const nowMinuteBucket = Math.floor(Date.now() / 60000);
    const nowDayBucket = Math.floor(Date.now() / 86400000);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { count: minuteCount } = await supabaseAdmin
      .from('api_usage_events')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'ai_property_search')
      .eq('metadata->>ip', ip)
      .gte('created_at', new Date(nowMinuteBucket * 60000).toISOString());
    if ((minuteCount ?? 0) >= 20) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded — please try again shortly" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count: dayCount } = await supabaseAdmin
      .from('api_usage_events')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'ai_property_search')
      .eq('metadata->>ip', ip)
      .gte('created_at', new Date(nowDayBucket * 86400000).toISOString());
    if ((dayCount ?? 0) >= 300) {
      return new Response(JSON.stringify({ error: "Daily search limit reached — please sign in to continue" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { query, session_id, buyer_id } = body;
    const listingTypeFilter = body.listing_type === 'rent' ? 'rent' : null;

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

    // 2. Query properties using extracted filters (reuse supabaseAdmin)
    const supabase = supabaseAdmin;

    let q = supabase
      .from("properties")
      .select(PROPERTIES_WITH_AGENTS)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(60);

    if (listingTypeFilter === 'rent') {
      q = q.eq('listing_type', 'rent');
    } else {
      q = q.not('listing_type', 'eq', 'rent');
    }

    // Build a single OR group for (suburb matches OR property_type matches),
    // which is then ANDed with price/bedroom filters by PostgREST.
    const orParts: string[] = [];
    if (Array.isArray(intent.suburbs) && intent.suburbs.length > 0) {
      for (const s of intent.suburbs.slice(0, 20)) {
        const clean = String(s).replace(/[%,()]/g, "");
        if (clean) orParts.push(`suburb.ilike.%${clean}%`);
      }
    }
    if (Array.isArray(intent.property_types) && intent.property_types.length > 0) {
      for (const p of intent.property_types) {
        const clean = String(p).replace(/[%,()]/g, "");
        if (clean) orParts.push(`property_type.ilike.%${clean}%`);
      }
    }
    if (orParts.length > 0) q = q.or(orParts.join(","));
    if (intent.min_price) q = q.gte("price", intent.min_price);
    if (intent.max_price) q = q.lte("price", intent.max_price);
    if (intent.bedrooms) q = q.gte("beds", intent.bedrooms);
    if (intent.bathrooms) q = q.gte("baths", intent.bathrooms);

    // Build FTS terms from features + lifestyle_keywords (soft-boost, not hard filter)
    const ftsTerms: string[] = [];
    if (Array.isArray(intent.features)) {
      for (const f of intent.features.slice(0, 10)) {
        const clean = String(f).replace(/[^\w\s-]/g, '').trim();
        if (clean && clean.length > 1) ftsTerms.push(clean);
      }
    }
    if (Array.isArray(intent.lifestyle_keywords)) {
      for (const l of intent.lifestyle_keywords.slice(0, 5)) {
        const clean = String(l).replace(/[^\w\s-]/g, '').trim();
        if (clean && clean.length > 1) ftsTerms.push(clean);
      }
    }

    // Phase 0 strategy: run a primary FTS-boosted query AND a fallback query in parallel.
    // Merge results so feature-matched listings appear first, but the user always sees results.
    let { data: primary, error: primaryErr } = await q;
    if (primaryErr) console.error('Primary query error', primaryErr);

    let ftsBoosted: any[] = [];
    if (ftsTerms.length > 0 && (primary?.length ?? 0) > 0) {
      const ftsQuery = ftsTerms.map(t => t.split(/\s+/).join(' & ')).join(' | ');
      const ftsIds = primary!.map((p: any) => p.id);
      const { data: ftsData, error: ftsErr } = await supabase
        .from('properties')
        .select(PROPERTIES_WITH_AGENTS)
        .in('id', ftsIds)
        .textSearch('description_search_vector', ftsQuery, { type: 'websearch' });
      if (!ftsErr && ftsData) {
        ftsBoosted = ftsData;
      } else if (ftsErr) {
        console.error('FTS boost query error', ftsErr);
      }
    }

    // Merge: FTS-matched first, then remaining primary results
    const ftsIdSet = new Set(ftsBoosted.map(p => p.id));
    const remaining = (primary ?? []).filter((p: any) => !ftsIdSet.has(p.id));
    let properties: any[] = [...ftsBoosted, ...remaining];
    console.log(
      "properties result:",
      JSON.stringify({
        count: properties.length,
        fts_boosted: ftsBoosted.length,
        fts_terms: ftsTerms,
        suburbs_extracted: intent.suburbs,
        property_types_extracted: intent.property_types,
        or_filter: orParts.join(","),
      })
    );

    // Fallback: if the strict query returned nothing, retry without suburb/property_type
    // so the user still sees listings within their price + bedroom range.
    if ((!properties || properties.length === 0) && orParts.length > 0) {
      console.log("Primary query empty — retrying without suburb/property_type filters");
      let fallback = supabase
        .from("properties")
        .select(PROPERTIES_WITH_AGENTS)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(60);
      if (listingTypeFilter === 'rent') {
        fallback = fallback.eq('listing_type', 'rent');
      } else {
        fallback = fallback.not('listing_type', 'eq', 'rent');
      }
      if (intent.min_price) fallback = fallback.gte("price", intent.min_price);
      if (intent.max_price) fallback = fallback.lte("price", intent.max_price);
      if (intent.bedrooms) fallback = fallback.gte("beds", intent.bedrooms);
      if (intent.bathrooms) fallback = fallback.gte("baths", intent.bathrooms);
      const { data: fbData, error: fbErr } = await fallback;
      if (fbErr) console.error("Fallback query error", fbErr);
      if (fbData && fbData.length > 0) properties = fbData;
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
