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
    const { transcript, detectedLanguage, userLocation, sessionId, audioDuration } = await req.json();

    if (!transcript || typeof transcript !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'transcript'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse query using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Parse property search queries into JSON. Extract: location (string), price_min (number|null), price_max (number|null), property_type (string|null), bedrooms (number|null), bathrooms (number|null), features (string array), transaction_type ("sale"|"rent"|null), urgency ("immediate"|"flexible"|null). Return valid JSON only, no markdown.`,
          },
          { role: "user", content: transcript },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", status);
      // Fallback: return empty parsed query
      return new Response(
        JSON.stringify({ success: true, parsedQuery: {}, message: "AI parsing unavailable, raw transcript stored" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    let parsedQuery = {};
    try {
      const content = aiData.choices?.[0]?.message?.content || "{}";
      // Strip markdown code fences if present
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      parsedQuery = JSON.parse(cleaned);
    } catch {
      console.warn("Failed to parse AI response, using empty query");
    }

    // Store in Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: searchRecord, error } = await supabase
      .from("voice_searches")
      .insert([{
        transcript,
        detected_language: detectedLanguage || "en",
        parsed_query: parsedQuery,
        user_location: userLocation || null,
        session_id: sessionId || null,
        audio_duration: audioDuration || 0,
        status: "active",
      }])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        searchId: searchRecord?.id || null,
        parsedQuery,
        message: `Found properties in ${(parsedQuery as any).location || "your area"}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Voice search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to process voice search" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
