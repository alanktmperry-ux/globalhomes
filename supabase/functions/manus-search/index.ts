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
    const { query, language } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'query' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const manusApiKey = Deno.env.get("MANUS_API_KEY");
    if (!manusApiKey) {
      return new Response(
        JSON.stringify({ error: "MANUS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the goal prompt for Manus
    const goal = `Search real estate websites for properties matching this query: "${query}". ${
      language && language !== "en" ? `The query is in ${language}.` : ""
    } Return a JSON array of properties with these fields: title, address, suburb, state, country, price (number), priceFormatted (string), beds (number), baths (number), parking (number), sqm (number), imageUrl (string URL), images (array of URLs), description, estimatedValue (string), propertyType, features (array of strings), agent (object with name, agency, phone, email). Format the response as valid JSON only.`;

    console.log("Sending task to Manus API:", { query, goal: goal.substring(0, 100) + "..." });

    // Create Manus task
    const manusResponse = await fetch("https://api.manus.ai/v1/tasks", {
      method: "POST",
      headers: {
        "API_KEY": manusApiKey,
        "accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: goal,
      }),
    });

    if (!manusResponse.ok) {
      const errorText = await manusResponse.text();
      console.error("Manus API error:", manusResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: "Manus API request failed", 
          status: manusResponse.status,
          details: errorText 
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const manusData = await manusResponse.json();
    console.log("Manus API response:", JSON.stringify(manusData).substring(0, 500));

    // Return the Manus response — the frontend will handle parsing
    return new Response(
      JSON.stringify({
        source: "manus",
        taskId: manusData.task_id || manusData.id,
        status: manusData.status,
        data: manusData,
        query,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
