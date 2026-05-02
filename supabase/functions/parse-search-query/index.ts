import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { query, listing_mode } = await req.json();

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No query provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedQuery = query.trim().slice(0, 300);

    // ── STEP 1: Use Lovable AI to extract structured intent ──
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a real estate search query parser for an Australian property platform.
Extract structured search intent from natural language queries.
Always return valid JSON with no extra text. If a field is not mentioned, use null.
Price values must be in AUD as integers (e.g. "1 million" = 1000000, "1.3 million" = 1300000, "850k" = 850000).
Property types: house, apartment, unit, townhouse, land, rural, commercial.
Australian states: NSW, VIC, QLD, WA, SA, TAS, ACT, NT.
Bedrooms and bathrooms should be integers. "at least 3 bedrooms" → bedrooms_min=3, bedrooms_max=null.
listing_type should be "sale" or "rent" based on context. If not mentioned, use null.`;

    const userPrompt = `Parse this Australian property search query into structured JSON:
"${trimmedQuery}"

Return ONLY this JSON structure:
{
  "property_type": string or null,
  "suburb": string or null,
  "state": string or null,
  "postcode": string or null,
  "price_min": integer or null,
  "price_max": integer or null,
  "bedrooms_min": integer or null,
  "bedrooms_max": integer or null,
  "bathrooms_min": integer or null,
  "listing_type": "sale" or "rent" or null,
  "keywords": []
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
        max_tokens: 300,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI gateway error:", status, await aiResponse.text());
      // Fall through with empty parsed intent
    }

    let parsed: Record<string, unknown> = {};
    if (aiResponse.ok) {
      try {
        const aiData = await aiResponse.json();
        let raw = aiData.choices?.[0]?.message?.content?.trim() ?? "";
        // Strip markdown code fences if present
        raw = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
        parsed = JSON.parse(raw);
      } catch (e) {
        console.warn("Failed to parse AI response, using fallback:", e);
      }
    }

    // Apply listing_mode from frontend if AI didn't detect one
    if (listing_mode && !parsed.listing_type) {
      parsed.listing_type = listing_mode;
    }

    // ── STEP 2: Query properties table with structured filters ──
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let qb = supabase
      .from("properties")
      .select(`
        id, title, address, suburb, state, country,
        price, price_formatted, listing_type, property_type,
        beds, baths, parking, sqm,
        description, images, image_url, features,
        is_featured, boost_tier, featured_until,
        lat, lng, listed_date,
        agent_id,
        agents!inner ( id, name, agency, avatar_url, is_subscribed, verification_badge_level, specialization, years_experience, rating, review_count )
      `)
      .eq("is_active", true)
      .eq("status", "public")
      .limit(30);

    if (parsed.listing_type) {
      qb = qb.eq("listing_type", parsed.listing_type as string);
    }
    if (parsed.property_type) {
      qb = qb.ilike("property_type", `%${parsed.property_type}%`);
    }
    if (parsed.suburb) {
      qb = qb.ilike("suburb", `%${parsed.suburb}%`);
    }
    if (parsed.state) {
      qb = qb.ilike("state", `%${parsed.state}%`);
    }
    if (parsed.price_min) {
      qb = qb.gte("price", parsed.price_min as number);
    }
    if (parsed.price_max) {
      qb = qb.lte("price", parsed.price_max as number);
    }
    if (parsed.bedrooms_min) {
      qb = qb.gte("beds", parsed.bedrooms_min as number);
    }
    if (parsed.bedrooms_max) {
      qb = qb.lte("beds", parsed.bedrooms_max as number);
    }
    if (parsed.bathrooms_min) {
      qb = qb.gte("baths", parsed.bathrooms_min as number);
    }

    // Prefer featured listings first
    qb = qb.order("is_featured", { ascending: false }).order("created_at", { ascending: false });

    const { data: listings, error } = await qb;

    let finalListings = listings ?? [];

    // Fallback: if suburb filter yielded 0 results, try address ILIKE
    if (finalListings.length === 0 && parsed.suburb) {
      let fb = supabase
        .from("properties")
        .select(`
        id, title, address, suburb, state, country,
        price, price_formatted, listing_type, property_type,
        beds, baths, parking, sqm,
        description, images, image_url, features,
        is_featured, boost_tier, featured_until,
        lat, lng, listed_date,
        agent_id,
        agents!inner ( id, name, agency, avatar_url, is_subscribed, verification_badge_level, specialization, years_experience, rating, review_count )
      `)
      .eq("is_active", true)
      .eq("status", "public")
      .ilike("address", `%${parsed.suburb}%`)
        .limit(30);

      if (parsed.price_min) fb = fb.gte("price", parsed.price_min as number);
      if (parsed.price_max) fb = fb.lte("price", parsed.price_max as number);
      if (parsed.property_type) fb = fb.ilike("property_type", `%${parsed.property_type}%`);
      if (parsed.listing_type) fb = fb.eq("listing_type", parsed.listing_type as string);

      const { data: fallback } = await fb;
      finalListings = fallback ?? [];
    }

    if (error) console.error("DB query error:", error);

    return new Response(
      JSON.stringify({
        listings: finalListings,
        parsed_intent: parsed,
        result_count: finalListings.length,
        original_query: trimmedQuery,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("parse-search-query error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
