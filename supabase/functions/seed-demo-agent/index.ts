import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: any = {};
  try { body = await req.json(); } catch { /* no body */ }

  const { user_id, display_name, email } = body;

  if (!user_id) {
    return new Response(JSON.stringify({ error: "user_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const agentName = display_name || "Demo Agent";

    // Ensure profile exists
    await supabaseAdmin.from("profiles").upsert({
      user_id,
      display_name: agentName,
      phone: "",
    }, { onConflict: "user_id" });

    // Create agent record with is_demo = true
    const { data: agentRecord, error: agentErr } = await supabaseAdmin.from("agents").insert({
      user_id,
      name: agentName,
      agency: "Demo Agency",
      email: email || "",
      phone: "",
      license_number: "DEMO-" + user_id.substring(0, 6).toUpperCase(),
      specialization: "Residential",
      years_experience: 5,
      bio: "Demo agent account — explore the full platform features before subscribing.",
      service_areas: ["Melbourne", "Sydney", "Brisbane"],
      is_approved: true,
      rating: 4.5,
      review_count: 12,
      verification_badge_level: "email",
      investment_niche: "Residential",
      handles_trust_accounting: false,
      is_demo: true,
    }).select("id").single();
    if (agentErr) throw agentErr;

    // Add agent role
    await supabaseAdmin.from("user_roles").upsert({
      user_id,
      role: "agent",
    }, { onConflict: "user_id,role" });

    // Create demo agency
    const slug = "demo-" + user_id.substring(0, 8);
    const { data: agencyData } = await supabaseAdmin.from("agencies").insert({
      name: "Demo Agency",
      slug,
      owner_user_id: user_id,
      email: email || "",
      description: "Demo agency for exploring the Global Homes agent platform.",
    }).select("id").single();

    if (agencyData && agentRecord) {
      await supabaseAdmin.from("agents").update({ agency_id: agencyData.id }).eq("id", agentRecord.id);
      await supabaseAdmin.from("agency_members").insert({
        agency_id: agencyData.id,
        user_id,
        role: "owner",
      });
    }

    // Seed sample listings
    if (agentRecord) {
      await supabaseAdmin.from("properties").insert([
        {
          agent_id: agentRecord.id,
          title: "Modern Toorak Residence",
          address: "42 Orrong Rd, Toorak VIC 3142",
          suburb: "Toorak", state: "VIC", country: "Australia",
          price: 3200000, price_formatted: "$3,200,000",
          beds: 5, baths: 3, parking: 3, sqm: 420,
          property_type: "House", status: "off-market", listing_type: "sale",
          description: "Architecturally designed five-bedroom home on a tree-lined Toorak street.",
          lat: -37.8407, lng: 145.0109, views: 487, contact_clicks: 34,
        },
        {
          agent_id: agentRecord.id,
          title: "South Yarra Penthouse",
          address: "88 Domain Rd, South Yarra VIC 3141",
          suburb: "South Yarra", state: "VIC", country: "Australia",
          price: 2800000, price_formatted: "$2,800,000",
          beds: 4, baths: 3, parking: 2, sqm: 280,
          property_type: "Apartment", status: "off-market", listing_type: "sale",
          description: "Sub-penthouse with panoramic city views and private rooftop terrace.",
          lat: -37.8380, lng: 145.0180, views: 612, contact_clicks: 41,
        },
        {
          agent_id: agentRecord.id,
          title: "Brighton Coastal Home",
          address: "9 Beach Rd, Brighton VIC 3186",
          suburb: "Brighton", state: "VIC", country: "Australia",
          price: 2650000, price_formatted: "$2,650,000",
          beds: 5, baths: 3, parking: 2, sqm: 520,
          property_type: "House", status: "coming-soon", listing_type: "sale",
          description: "Beachside family home with seamless indoor-outdoor living.",
          lat: -37.9070, lng: 144.9870, views: 156, contact_clicks: 9,
        },
      ]);

      // Seed sample leads
      const { data: firstProp } = await supabaseAdmin
        .from("properties").select("id").eq("agent_id", agentRecord.id).limit(1).single();

      if (firstProp) {
        await supabaseAdmin.from("leads").insert([
          { agent_id: agentRecord.id, property_id: firstProp.id, user_name: "James Chen", user_email: "james@example.com", message: "Interested in Toorak properties", status: "qualified", score: 85 },
          { agent_id: agentRecord.id, property_id: firstProp.id, user_name: "Emily Tran", user_email: "emily@example.com", message: "Looking for 4-bed family home", status: "new", score: 72 },
        ]);
      }
    }

    return new Response(JSON.stringify({ message: "Demo agent seeded", userId: user_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("seed-demo-agent error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
