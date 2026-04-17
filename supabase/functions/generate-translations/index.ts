import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-pro";

let corsHeaders: Record<string, string> = getCorsHeaders(null);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callAI(systemPrompt: string, userPrompt: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const resp = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [],
      response_format: { type: "json_object" },
    }),
  });

  if (resp.status === 429) throw new Error("RATE_LIMITED");
  if (resp.status === 402) throw new Error("CREDITS_EXHAUSTED");
  if (!resp.ok) {
    const text = await resp.text();
    console.error("AI gateway error:", resp.status, text);
    throw new Error(`AI gateway returned ${resp.status}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in AI response");
  return JSON.parse(content);
}

async function handleListingTranslation(listingId: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: listing, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", listingId)
    .single();

  if (error || !listing) {
    return jsonResponse({ error: "Listing not found" }, 404);
  }

  const systemPrompt = `You are a multilingual real estate translation specialist for the Australian property market. You produce culturally sensitive, accurate translations. Return valid JSON only.`;

  const userPrompt = `Translate and analyse this Australian property listing. Return a single JSON object with two top-level keys: "translations" and "agent_insights".

LISTING DATA:
- Title: ${listing.title || "N/A"}
- Address: ${listing.address || "N/A"}, ${listing.suburb || ""} ${listing.state || ""} ${listing.postcode || ""}
- Description: ${listing.description || "No description"}
- Property Type: ${listing.property_type || "House"}
- Beds: ${listing.beds || 0}, Baths: ${listing.baths || 0}, Parking: ${listing.parking || 0}
- Price: ${listing.price ? `$${listing.price.toLocaleString()}` : "Contact agent"}
- Land Size: ${listing.land_size_sqm ? `${listing.land_size_sqm}sqm` : "N/A"}
- Features: ${listing.features ? JSON.stringify(listing.features) : "None listed"}
- Year Built: ${listing.year_built || "N/A"}

TRANSLATIONS — provide for each of these language keys: "zh_simplified", "zh_traditional", "vi"
Each language must contain:
- title: translated property title
- description: full translated description (natural, not word-for-word)
- summary: 1-2 sentence highlight summary
- cultural_highlights: array of strings noting culturally relevant features ONLY if genuinely applicable (e.g. feng shui orientation, school proximity, multigenerational layout, garden space). Never fabricate cultural relevance.

AGENT INSIGHTS — in English, under key "agent_insights":
- multicultural_appeal: string describing the property's appeal to multicultural buyers
- suggested_buyer_profiles: array of strings (e.g. "Young Mandarin-speaking professionals", "Vietnamese families seeking school catchments")
- key_selling_points_for_diverse_buyers: array of strings

Return ONLY valid JSON. No markdown, no code fences.`;

  const result = await callAI(systemPrompt, userPrompt);

  const { error: updateError } = await supabase
    .from("properties")
    .update({
      translations: result.translations,
      agent_insights: result.agent_insights,
      translation_status: "complete",
      translations_generated_at: new Date().toISOString(),
    })
    .eq("id", listingId);

  if (updateError) {
    console.error("DB update error:", updateError);
    return jsonResponse({ error: "Failed to save translations" }, 500);
  }

  return jsonResponse({
    success: true,
    listing_id: listingId,
    translations: result.translations,
    agent_insights: result.agent_insights,
  });
}

const LANGUAGE_LABELS: Record<string, string> = {
  "zh-CN": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)",
  "ja": "Japanese",
  "ko": "Korean",
};

async function handleTextTranslation(input: {
  title: string;
  description: string;
  bullets: string[];
  target_language: string;
}) {
  const langLabel = LANGUAGE_LABELS[input.target_language] || input.target_language;
  const systemPrompt = `You are a multilingual real estate translation specialist for the Australian property market. You produce culturally sensitive, natural translations (not word-for-word). Return valid JSON only.`;
  const userPrompt = `Translate the following Australian property listing fields into ${langLabel}.

ENGLISH TITLE: ${input.title || "(empty)"}
ENGLISH DESCRIPTION: ${input.description || "(empty)"}
${input.bullets.length > 0 ? `KEY BULLETS:\n${input.bullets.map((b) => `- ${b}`).join("\n")}` : ""}

Return JSON with exactly these keys:
- "title": translated title (concise, max 120 chars)
- "description": translated description (natural prose, preserve key features)

Return ONLY valid JSON. No markdown, no code fences.`;

  const result = await callAI(systemPrompt, userPrompt);
  return jsonResponse({
    title: result.title || "",
    description: result.description || "",
    target_language: input.target_language,
  });
}

async function handleSearchTranslation(searchQuery: string) {
  const systemPrompt = `You are a multilingual search query translator for an Australian real estate platform. Detect the input language, translate to English, and identify search intent. Return valid JSON only.`;

  const userPrompt = `Translate this property search query to English and analyse it:

"${searchQuery}"

Return JSON with:
- english_query: the query translated to natural English
- detected_language: ISO language code (e.g. "zh", "vi", "en", "ko", "ja", "ar")
- search_intent: object with optional keys: location, property_type, min_beds, max_price, features (array), other_criteria

Return ONLY valid JSON.`;

  const result = await callAI(systemPrompt, userPrompt);

  return jsonResponse({
    english_query: result.english_query,
    detected_language: result.detected_language,
    search_intent: result.search_intent,
  });
}

Deno.serve(async (req) => {
  corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Authentication check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { data: { user: caller }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !caller) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    // --- End authentication check ---

    const body = await req.json();

    if (body.type === "translate_search" && body.search_query) {
      // Any authenticated user can translate search queries
      return await handleSearchTranslation(body.search_query);
    }

    if (body.type === "translate_text" && body.target_language) {
      // Translate ad-hoc title/description text (used by the listing wizard before
      // a property has been persisted). No DB writes — returns translated fields.
      return await handleTextTranslation({
        title: typeof body.title === "string" ? body.title : "",
        description: typeof body.description === "string" ? body.description : "",
        bullets: Array.isArray(body.bullets) ? body.bullets : [],
        target_language: String(body.target_language),
      });
    }

    if (body.listing_id) {
      // --- Ownership / admin authorization check ---
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: ownedListing } = await supabaseAdmin
        .from("properties")
        .select("id, agents!inner(user_id)")
        .eq("id", body.listing_id)
        .eq("agents.user_id", caller.id)
        .maybeSingle();

      if (!ownedListing) {
        // Check for admin role as fallback
        const { data: adminRole } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", caller.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!adminRole) {
          return jsonResponse({ error: "You do not have permission to translate this listing" }, 403);
        }
      }
      // --- End authorization check ---

      return await handleListingTranslation(body.listing_id);
    }

    return jsonResponse({ error: "Invalid request. Provide listing_id or { type: 'translate_search', search_query: '...' }" }, 400);
  } catch (e) {
    console.error("generate-translations error:", e);

    if (e instanceof Error) {
      if (e.message === "RATE_LIMITED") {
        return jsonResponse({ error: "AI rate limit exceeded. Please try again shortly." }, 429);
      }
      if (e.message === "CREDITS_EXHAUSTED") {
        return jsonResponse({ error: "AI credits exhausted. Please add funds." }, 402);
      }
    }

    return jsonResponse(
      { error: e instanceof Error ? e.message : "Internal server error" },
      500
    );
  }
});
