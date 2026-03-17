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

  const DEMO_EMAIL = "demo-agent@globalhomes.app";
  const DEMO_PASSWORD = "DemoAgent2024!";

  try {
    // Check if demo user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email === DEMO_EMAIL);

    if (existing) {
      return new Response(JSON.stringify({ message: "Demo agent already exists", userId: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create demo auth user (auto-confirmed)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: "Demo Agent" },
    });
    if (authError) throw authError;
    const userId = authData.user.id;

    // Create profile
    await supabaseAdmin.from("profiles").upsert({
      user_id: userId,
      display_name: "Demo Agent",
      phone: "+61400000000",
    }, { onConflict: "user_id" });

    // Create agent record
    await supabaseAdmin.from("agents").insert({
      user_id: userId,
      name: "Sarah Mitchell",
      agency: "Demo Agency — Ray White South Yarra",
      email: DEMO_EMAIL,
      phone: "+61400000000",
      license_number: "VIC-DEMO-99999",
      specialization: "Residential",
      years_experience: 8,
      bio: "Experienced agent specialising in off-market luxury sales across Melbourne's inner suburbs.",
      service_areas: ["Toorak", "South Yarra", "Richmond", "Brighton", "Hawthorn"],
      is_approved: true,
      rating: 4.8,
      review_count: 47,
      verification_badge_level: "licensed",
      investment_niche: "Luxury Residential",
      handles_trust_accounting: true,
    });

    // Add agent role
    await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: "agent",
    });

    // Create demo agency
    const { data: agencyData } = await supabaseAdmin.from("agencies").insert({
      name: "Ray White South Yarra (Demo)",
      slug: "demo-ray-white-sy",
      owner_user_id: userId,
      email: DEMO_EMAIL,
      phone: "+61400000000",
      description: "Demo agency for exploring the Global Homes agent platform.",
      address: "123 Chapel St, South Yarra VIC 3141",
    }).select("id").single();

    if (agencyData) {
      // Link agent to agency
      const { data: agentData } = await supabaseAdmin
        .from("agents")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (agentData) {
        await supabaseAdmin.from("agents").update({ agency_id: agencyData.id }).eq("id", agentData.id);
        await supabaseAdmin.from("agency_members").insert({
          agency_id: agencyData.id,
          user_id: userId,
          role: "owner",
        });
      }
    }

    // Add some demo properties
    const { data: agentRecord } = await supabaseAdmin.from("agents").select("id").eq("user_id", userId).single();
    if (agentRecord) {
      await supabaseAdmin.from("properties").insert([
        {
          agent_id: agentRecord.id,
          title: "Modern Toorak Townhouse",
          address: "42 Orrong Rd, Toorak VIC 3142",
          suburb: "Toorak",
          state: "VIC",
          country: "Australia",
          price: 2450000,
          price_formatted: "$2,450,000",
          beds: 4,
          baths: 3,
          parking: 2,
          sqm: 320,
          property_type: "Townhouse",
          status: "off-market",
          listing_type: "sale",
          description: "Stunning contemporary townhouse in the heart of Toorak.",
          lat: -37.8407,
          lng: 145.0109,
          views: 234,
          contact_clicks: 18,
        },
        {
          agent_id: agentRecord.id,
          title: "South Yarra Penthouse",
          address: "88 Domain Rd, South Yarra VIC 3141",
          suburb: "South Yarra",
          state: "VIC",
          country: "Australia",
          price: 3800000,
          price_formatted: "$3,800,000",
          beds: 3,
          baths: 2,
          parking: 2,
          sqm: 195,
          property_type: "Apartment",
          status: "off-market",
          listing_type: "sale",
          description: "Luxurious penthouse with panoramic city views.",
          lat: -37.8380,
          lng: 145.0180,
          views: 412,
          contact_clicks: 31,
        },
      ]);
    }

    return new Response(JSON.stringify({ message: "Demo agent created successfully", userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
