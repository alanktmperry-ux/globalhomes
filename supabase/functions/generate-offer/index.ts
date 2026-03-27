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
    const { lead_id, property_id, agent_id, offer_amount, settlement_days, conditions } = await req.json();

    if (!lead_id || !property_id || !agent_id || !offer_amount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch property details
    const { data: property } = await supabase
      .from("properties")
      .select("title, address, suburb, state, price, property_type, bedrooms, bathrooms")
      .eq("id", property_id)
      .single();

    // Fetch agent details
    const { data: agent } = await supabase
      .from("agents")
      .select("name, agency, license_number, phone, email")
      .eq("id", agent_id)
      .single();

    // Fetch lead details
    const { data: lead } = await supabase
      .from("leads")
      .select("user_name, user_email, user_phone")
      .eq("id", lead_id)
      .single();

    // Fetch comparable sales (recent settled properties in the same suburb)
    const { data: comparables } = await supabase
      .from("properties")
      .select("address, price, suburb")
      .eq("suburb", property?.suburb || "")
      .neq("id", property_id)
      .not("price", "is", null)
      .order("created_at", { ascending: false })
      .limit(5);

    const comparableSales = (comparables || []).map((c: any) => ({
      address: c.address,
      price: c.price,
    }));

    // Calculate suburb median
    const prices = (comparables || [])
      .map((c: any) => parseFloat(c.price))
      .filter((p: number) => !isNaN(p) && p > 0)
      .sort((a: number, b: number) => a - b);
    const suburbMedian = prices.length > 0
      ? prices[Math.floor(prices.length / 2)]
      : null;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AUD = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0 });

    const prompt = `You are a licensed Australian real estate agent drafting a formal offer letter.

Property: ${property?.address || "Unknown"}, ${property?.suburb || ""} ${property?.state || ""}
Property Type: ${property?.property_type || "Residential"}, ${property?.bedrooms || "?"} bed, ${property?.bathrooms || "?"} bath
Asking Price: ${property?.price ? AUD.format(parseFloat(property.price)) : "Not disclosed"}

Offer Amount: ${AUD.format(offer_amount)}
Settlement Period: ${settlement_days} days
Conditions: ${conditions || "Unconditional"}

Buyer: ${lead?.user_name || "Buyer"}
Agent: ${agent?.name || "Agent"}, ${agent?.agency || ""}, Licence ${agent?.license_number || "N/A"}

${suburbMedian ? `Suburb median price: ${AUD.format(suburbMedian)}` : ""}
${comparableSales.length > 0 ? `Comparable recent sales:\n${comparableSales.map((c: any) => `- ${c.address}: ${AUD.format(parseFloat(c.price))}`).join("\n")}` : ""}

Draft a professional offer letter addressed to the vendor's agent. Include:
1. Opening with the offer amount and property address
2. Settlement terms and conditions
3. Reference to comparable sales to justify the offer price
4. Professional closing with the buyer's agent details

Keep the tone professional and concise. Use Australian real estate conventions.`;

    const aiRes = await fetch("https://ai.lovable.dev/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const draftText = aiData.choices?.[0]?.message?.content || "Unable to generate draft.";

    // Save offer to DB
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .insert({
        lead_id,
        property_id,
        agent_id,
        offer_amount,
        settlement_days,
        conditions,
        draft_text: draftText,
        comparable_sales: comparableSales,
        suburb_median: suburbMedian,
        status: "draft",
      })
      .select()
      .single();

    if (offerError) {
      console.error("Offer insert error:", offerError);
    }

    return new Response(
      JSON.stringify({
        draftText,
        comparableSales,
        suburbMedian,
        offerId: offer?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-offer error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
