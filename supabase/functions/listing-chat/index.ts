import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const MAX_USER_MESSAGES = 20;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { listing_id, messages, session_id } = body as {
      listing_id?: string;
      messages?: ChatMessage[];
      session_id?: string | null;
    };

    if (!listing_id || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing listing_id or messages" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cap to prevent abuse
    const userMessageCount = messages.filter((m) => m.role === "user").length;
    if (userMessageCount > MAX_USER_MESSAGES) {
      return new Response(
        JSON.stringify({ error: "Message limit reached", limit_reached: true }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch listing
    const { data: property, error: propErr } = await supabase
      .from("properties")
      .select(
        "id, title, address, suburb, state, price, beds, baths, parking, land_size, property_type, description, features, school_zone_top, school_zone_name, inspection_times, agent_id"
      )
      .eq("id", listing_id)
      .maybeSingle();

    if (propErr || !property) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch agent name
    let agentName = "the listing agent";
    if (property.agent_id) {
      const { data: agent } = await supabase
        .from("agents")
        .select("name")
        .eq("id", property.agent_id)
        .maybeSingle();
      if (agent?.name) agentName = agent.name;
    }

    const featuresStr = Array.isArray(property.features)
      ? (property.features as unknown[]).join(", ")
      : property.features
        ? String(property.features)
        : "Not specified";

    const inspectionsStr = Array.isArray(property.inspection_times) && property.inspection_times.length > 0
      ? (property.inspection_times as Array<Record<string, string>>)
          .map((s) => `${s.date} ${s.start}-${s.end}`)
          .join("; ")
      : "Not specified — contact the agent";

    const schoolZoneStr = property.school_zone_top
      ? property.school_zone_name || "Top-ranked school catchment (confirmed by agent)"
      : "Not specified";

    const priceStr = property.price
      ? `AUD ${Number(property.price).toLocaleString("en-AU")}`
      : "Price on application";

    const systemPrompt = `You are a helpful property assistant for ListHQ, an Australian real estate platform.

You can only answer questions based on the property information provided below.

Always reply in the same language the buyer used to ask their question.

If a question cannot be answered from the property data, say: "I don't have that information — I'd recommend contacting the agent directly." (translated into their language)

Never guess, estimate, or make up property details.

Keep answers concise — 1 to 3 sentences maximum.

PROPERTY DATA:
Address: ${property.address || "Not specified"}${property.suburb ? `, ${property.suburb}` : ""}${property.state ? ` ${property.state}` : ""}
Price: ${priceStr}
Bedrooms: ${property.beds ?? "Not specified"}
Bathrooms: ${property.baths ?? "Not specified"}
Parking: ${property.parking ?? "Not specified"}
Land size: ${property.land_size ?? "Not specified"}
Property type: ${property.property_type || "Not specified"}
Description: ${property.description || "Not specified"}
Features: ${featuresStr}
School zone: ${schoolZoneStr}
Open home times: ${inspectionsStr}
Agent name: ${agentName}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitise client-supplied messages: only role/content, only user/assistant
    const cleanMessages: ChatMessage[] = messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...cleanMessages],
        max_completion_tokens: 500,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached, please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const reply: string =
      aiData.choices?.[0]?.message?.content ||
      "I don't have that information — I'd recommend contacting the agent directly.";

    // Persist session
    const fullMessages = [...cleanMessages, { role: "assistant", content: reply }];
    let resolvedSessionId = session_id || null;

    try {
      if (resolvedSessionId) {
        await supabase
          .from("listing_chat_sessions")
          .update({ messages: fullMessages, updated_at: new Date().toISOString() })
          .eq("id", resolvedSessionId);
      } else {
        const { data: inserted } = await supabase
          .from("listing_chat_sessions")
          .insert({ listing_id, messages: fullMessages })
          .select("id")
          .maybeSingle();
        resolvedSessionId = inserted?.id ?? null;
      }
    } catch (logErr) {
      console.error("Session log error (non-fatal):", logErr);
    }

    return new Response(
      JSON.stringify({ reply, session_id: resolvedSessionId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("listing-chat error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
