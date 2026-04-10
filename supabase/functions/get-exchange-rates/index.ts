import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const CACHE_HOURS = 4;
const TARGET_CURRENCIES = ["USD", "EUR", "GBP", "JPY"];

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

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
