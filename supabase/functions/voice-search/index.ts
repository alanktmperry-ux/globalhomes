import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { audio, mimeType, transcript: rawTranscript, detectedLanguage, userLocation, sessionId, audioDuration } = body;

    // ── Input validation ──
    if (audio && typeof audio === "string") {
      if (audio.length < 500) {
        return new Response(
          JSON.stringify({ error: "Audio too short — please speak for at least 1 second." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (audio.length > 7_000_000) {
        return new Response(
          JSON.stringify({ error: "Audio too large — maximum recording length is 15 seconds." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── Required auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId: string = user.id;

    let transcript = rawTranscript || "";
    let detected_language = detectedLanguage || "en";

    // ── Path A: audio blob → Deepgram Nova-3 STT ──
    if (audio && typeof audio === "string") {
      const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");
      if (!DEEPGRAM_API_KEY) {
        return new Response(
          JSON.stringify({ error: "DEEPGRAM_API_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Decode base64 to binary
      const binaryString = atob(audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const contentType = mimeType || "audio/webm";

      const dgResponse = await fetch(
        "https://api.deepgram.com/v1/listen?model=nova-3&detect_language=true&punctuate=true&smart_format=true",
        {
          method: "POST",
          headers: {
            Authorization: `Token ${DEEPGRAM_API_KEY}`,
            "Content-Type": contentType,
          },
          body: bytes,
        }
      );

      if (!dgResponse.ok) {
        const errText = await dgResponse.text();
        console.error("Deepgram error:", dgResponse.status, errText);
        return new Response(
          JSON.stringify({ error: `Deepgram transcription failed (${dgResponse.status})` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const dgData = await dgResponse.json();
      const channel = dgData.results?.channels?.[0];
      transcript = channel?.alternatives?.[0]?.transcript || "";
      detected_language = channel?.detected_language || "en";

      if (!transcript) {
        return new Response(
          JSON.stringify({ success: false, error: "No speech detected. Please try again." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── Path B: pre-made transcript (backward compat) ──
    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'transcript' or 'audio'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Parse query via Lovable AI (Gemini) ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let parsedQuery: Record<string, unknown> = {};

    if (LOVABLE_API_KEY) {
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
              content: `Parse Australian property search queries into JSON. Queries may be in English, Hinglish (Hindi-English mix), Hindi, Punjabi, Tamil, Bengali, Mandarin, Cantonese, Vietnamese, Korean, Arabic, or Japanese. Extract:
- location (string): Australian suburb or city name
- price_min (number|null): in AUD. Convert Indian denominations: 1 lakh = 100000, 1 crore = 10000000. Example: '80 lakh' = 8000000, '1.2 crore' = 12000000
- price_max (number|null): same conversion rules
- property_type (string|null): house, apartment, townhouse, unit, villa, etc. Map Indian terms: 'BHK' or 'bhk' refers to bedroom count, not a property type. 'flat' = apartment. 'society' = apartment complex. 'bungalow' = house. 'ghar' (Hindi) = house/home (no specific type). 'makaan' (Hindi/Urdu) = house.
- bedrooms (number|null): map '3 BHK' = 3 bedrooms, '2 BHK' = 2 bedrooms (BHK = Bedrooms, Hall, Kitchen — Indian convention). Also handle Hindi/Punjabi numerals if transcribed.
- bathrooms (number|null)
- features (string array): pool, garden, parking, garage, balcony, vastu-compliant, north-facing, east-facing, separate kitchen, etc.
- transaction_type ("sale"|"rent"|null): 'rent' or 'kiraya' (Hindi/Urdu) = rent. 'buy' or 'kharidna' (Hindi) = sale.
- urgency ("immediate"|"flexible"|null)

Examples:
- '3 BHK ghar in Tarneit under 80 lakh' → {location: 'Tarneit', bedrooms: 3, price_max: 8000000, property_type: 'house', transaction_type: 'sale'}
- '2 bedroom flat in Parramatta for rent under 600 per week' → {location: 'Parramatta', bedrooms: 2, price_max: 600, property_type: 'apartment', transaction_type: 'rent'}
- 'east-facing house in Wheelers Hill for 1.5 crore' → {location: 'Wheelers Hill', price_max: 15000000, property_type: 'house', features: ['east-facing'], transaction_type: 'sale'}

Return valid JSON only, no markdown, no code fences.`,
            },
            { role: "user", content: transcript },
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        try {
          const content = aiData.choices?.[0]?.message?.content || "{}";
          const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
          parsedQuery = JSON.parse(cleaned);
        } catch {
          console.warn("Failed to parse AI response, using empty query");
        }
      } else {
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
      }
    }

    // ── Store in Supabase ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: searchRecord, error } = await supabase
      .from("voice_searches")
      .insert([{
        transcript,
        detected_language,
        parsed_query: parsedQuery,
        user_location: userLocation || null,
        session_id: sessionId || null,
        audio_duration: audioDuration || 0,
        status: "active",
        user_id: userId,
      }])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
    }

    // Fire concierge in the background
    if (searchRecord?.id) {
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      fetch(`${supabaseUrl}/functions/v1/orchestrate-buyer-concierge`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voice_search_id: searchRecord.id,
          parsed_query: parsedQuery,
          user_location: userLocation || null,
        }),
      }).catch(() => {});
    }

    return new Response(
      JSON.stringify({
        success: true,
        searchId: searchRecord?.id || null,
        transcript,
        detected_language,
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
