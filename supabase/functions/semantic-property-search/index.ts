// Semantic property search — embeds the buyer's natural-language query via
// Lovable AI Gateway, then returns property IDs ranked by cosine similarity.
// Public function (no JWT required) so the homepage search bar can call it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { query, limit = 20, min_similarity = 0.55 } = await req.json();

    if (typeof query !== "string" || query.trim().length < 3) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Embed the query
    const embedRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/text-embedding-3-small",
        input: query.trim().slice(0, 2000),
      }),
    });

    if (!embedRes.ok) {
      const body = await embedRes.text();
      console.error("[semantic-property-search] embed failed:", embedRes.status, body);
      if (embedRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited", matches: [] }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (embedRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted", matches: [] }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Embedding failed", matches: [] }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const embedJson = await embedRes.json();
    const embedding = embedJson?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) {
      return new Response(JSON.stringify({ error: "Bad embedding response", matches: [] }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase.rpc("match_properties_semantic", {
      query_embedding: embedding,
      match_count: Math.min(Math.max(limit, 1), 50),
      min_similarity,
    });

    if (error) {
      console.error("[semantic-property-search] RPC error:", error);
      return new Response(JSON.stringify({ error: error.message, matches: [] }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ matches: data ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[semantic-property-search] unhandled:", e);
    return new Response(JSON.stringify({ error: "Internal error", matches: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
