import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_HOURS = 4;
const TARGET_CURRENCIES = ["USD", "EUR", "GBP", "JPY"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check cache
    const { data: cached } = await supabase
      .from("exchange_rate_cache")
      .select("*")
      .eq("id", "latest")
      .single();

    if (cached) {
      const fetchedAt = new Date(cached.fetched_at).getTime();
      const now = Date.now();
      const hoursOld = (now - fetchedAt) / (1000 * 60 * 60);

      if (hoursOld < CACHE_HOURS) {
        return new Response(JSON.stringify({ rates: cached.rates, cached: true, fetched_at: cached.fetched_at }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch fresh rates
    const res = await fetch("https://open.er-api.com/v6/latest/AUD");
    const data = await res.json();

    if (data.result !== "success") {
      // Return cached if available
      if (cached) {
        return new Response(JSON.stringify({ rates: cached.rates, cached: true, fetched_at: cached.fetched_at, stale: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("API returned error and no cache available");
    }

    const rates: Record<string, number> = { AUD: 1 };
    for (const code of TARGET_CURRENCIES) {
      if (data.rates[code]) rates[code] = data.rates[code];
    }

    // Upsert cache
    await supabase.from("exchange_rate_cache").upsert({
      id: "latest",
      base_currency: "AUD",
      rates,
      fetched_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ rates, cached: false, fetched_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
