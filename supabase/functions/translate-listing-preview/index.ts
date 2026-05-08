import { getCorsHeaders } from "../_shared/cors.ts";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-pro";
const corsHeaders = getCorsHeaders(null);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: any;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }

  const title = (body.title || "").slice(0, 200);
  const description = (body.description || "").slice(0, 2000);
  if (!title && !description) return jsonResponse({ error: "Provide title or description" }, 400);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return jsonResponse({ error: "Not configured" }, 503);

  const systemPrompt = `You are a multilingual real estate translation specialist for the Australian property market. Return valid JSON only.`;
  const userPrompt = `Translate the following real estate listing into exactly these 10 languages and return a JSON object with these exact keys:
- zh_simplified (Simplified Chinese)
- zh_traditional (Traditional Chinese)
- vi (Vietnamese)
- ko (Korean)
- ar (Arabic)
- ja (Japanese)
- hi (Hindi)
- bn (Bengali)
- tl (Tagalog / Filipino)
- id (Indonesian)

Return ONLY valid JSON. Each key maps to an object with "title" and "description" fields.

Title: ${title}

Description: ${description}`;

  const resp = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) return jsonResponse({ error: "Translation failed" }, 502);
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return jsonResponse({ error: "No response from AI" }, 502);

  try {
    const translations = JSON.parse(content);
    return jsonResponse({ translations });
  } catch {
    return jsonResponse({ error: "Could not parse translations" }, 502);
  }
});
