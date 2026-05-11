import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, apikey, authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cfCity = req.headers.get("cf-ipcity") || "";
    const cfRegion = req.headers.get("cf-region") || "";
    const cfCountry = req.headers.get("cf-ipcountry") || "";

    const supaCity = req.headers.get("x-vercel-ip-city") || req.headers.get("x-country-city") || "";
    const supaRegion = req.headers.get("x-vercel-ip-region") || req.headers.get("x-country-region") || "";

    let city = cfCity || supaCity || "Melbourne";
    let region = cfRegion || supaRegion || "VIC";
    let country = cfCountry || "AU";

    try { city = decodeURIComponent(city); } catch {}

    const stateMap: Record<string, string> = {
      "New South Wales": "NSW", "Victoria": "VIC", "Queensland": "QLD",
      "South Australia": "SA", "Western Australia": "WA",
      "Tasmania": "TAS", "Australian Capital Territory": "ACT", "Northern Territory": "NT",
    };
    region = stateMap[region] || region;

    const result = {
      city,
      region,
      country,
      display: country === "AU" && city ? `${city}, ${region}` : "Melbourne, VIC",
      isFallback: !cfCity && !supaCity,
    };

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({
      city: "Melbourne",
      region: "VIC",
      country: "AU",
      display: "Melbourne, VIC",
      isFallback: true,
      error: String(e),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
