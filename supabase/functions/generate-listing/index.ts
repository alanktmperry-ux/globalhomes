import { getCorsHeaders } from "../_shared/cors.ts";

const TONE_PROMPTS: Record<string, string> = {
  standard:
    "Tone: professional, warm, and approachable. Highlight practical lifestyle benefits.",
  luxury:
    "Tone: premium, aspirational, and refined. Emphasise prestige, craftsmanship, and exclusivity.",
  family:
    "Tone: friendly, reassuring, and community-focused. Highlight family-friendly features like schools, parks, and safety.",
  investment:
    "Tone: analytical yet persuasive. Emphasise rental yield, capital growth potential, and investor appeal.",
  seller_outreach:
    "Tone: respectful, consultative, and compelling. You are writing a direct mail letter to a property owner who may be considering selling. Introduce yourself as a local agent, reference recent market activity in their suburb, and invite them for a no-obligation appraisal. Be personal, not salesy.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      propertyType,
      beds,
      baths,
      parking,
      suburb,
      state,
      price,
      features,
      tone,
      voiceTranscript,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const toneInstruction = TONE_PROMPTS[tone] || TONE_PROMPTS.standard;
    const featureList =
      features && features.length > 0 ? features.join(", ") : "not specified";

    const transcriptSection = voiceTranscript
      ? `\n\nThe agent recorded the following notes about this property — incorporate these details specifically:\n"${voiceTranscript}"`
      : '';

    const prompt = `Write a professional real estate listing description for a ${beds}-bedroom, ${baths}-bathroom ${propertyType} with ${parking} car spaces in ${suburb || "a premium suburb"}, ${state || "VIC"}, Australia. Price: ${price || "Contact Agent"}. Features: ${featureList}.${transcriptSection}\n${toneInstruction}\nWrite 3 paragraphs. Max 180 words. No bullet points. End with a compelling call to action.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
              content:
                "You are an expert Australian real estate copywriter. Write listing descriptions that are engaging, accurate, and compliant with Australian real estate advertising standards. Use Australian English spelling (e.g. colour, neighbours). Never make false claims.",
            },
            { role: "user", content: prompt },
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-listing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
