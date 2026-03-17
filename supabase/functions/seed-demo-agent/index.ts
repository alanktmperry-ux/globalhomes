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

  // Support ?reset=true to delete and re-create
  const url = new URL(req.url);
  const forceReset = url.searchParams.get("reset") === "true";
  let body: any = {};
  try { body = await req.json(); } catch { /* no body */ }
  const shouldReset = forceReset || body?.reset === true;

  try {
    // Check if demo user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email === DEMO_EMAIL);

    if (existing && !shouldReset) {
      return new Response(JSON.stringify({ message: "Demo agent already exists", userId: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete existing demo user (cascades to profiles, roles, etc.)
    if (existing) {
      // Clean up related data first
      const { data: agentRec } = await supabaseAdmin.from("agents").select("id").eq("user_id", existing.id).maybeSingle();
      if (agentRec) {
        await supabaseAdmin.from("properties").delete().eq("agent_id", agentRec.id);
        await supabaseAdmin.from("leads").delete().eq("agent_id", agentRec.id);
        await supabaseAdmin.from("transactions").delete().eq("agent_id", agentRec.id);
        await supabaseAdmin.from("trust_account_balances").delete().eq("agent_id", agentRec.id);
        await supabaseAdmin.from("notifications").delete().eq("agent_id", agentRec.id);
        await supabaseAdmin.from("agents").delete().eq("id", agentRec.id);
      }
      await supabaseAdmin.from("agency_members").delete().eq("user_id", existing.id);
      await supabaseAdmin.from("agencies").delete().eq("owner_user_id", existing.id);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", existing.id);
      await supabaseAdmin.from("profiles").delete().eq("user_id", existing.id);
      await supabaseAdmin.auth.admin.deleteUser(existing.id);
    }

    // Create demo auth user (auto-confirmed)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: "Sarah Mitchell" },
    });
    if (authError) throw authError;
    const userId = authData.user.id;

    // Create profile
    await supabaseAdmin.from("profiles").upsert({
      user_id: userId,
      display_name: "Sarah Mitchell",
      phone: "+61400000000",
    }, { onConflict: "user_id" });

    // Create agent record
    await supabaseAdmin.from("agents").insert({
      user_id: userId,
      name: "Sarah Mitchell",
      agency: "South Yarra Demo Agency",
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
      name: "South Yarra Demo Agency",
      slug: "south-yarra-demo",
      owner_user_id: userId,
      email: DEMO_EMAIL,
      phone: "+61400000000",
      description: "Demo agency for exploring the Global Homes agent platform.",
      address: "123 Chapel St, South Yarra VIC 3141",
    }).select("id").single();

    // Get agent record
    const { data: agentRecord } = await supabaseAdmin.from("agents").select("id").eq("user_id", userId).single();

    if (agencyData && agentRecord) {
      // Link agent to agency
      await supabaseAdmin.from("agents").update({ agency_id: agencyData.id }).eq("id", agentRecord.id);
      await supabaseAdmin.from("agency_members").insert({
        agency_id: agencyData.id,
        user_id: userId,
        role: "owner",
      });
    }

    if (agentRecord) {
      // ─── 5 Melbourne Listings ($1.8M–$3.2M) ───
      await supabaseAdmin.from("properties").insert([
        {
          agent_id: agentRecord.id,
          title: "Modern Toorak Residence",
          address: "42 Orrong Rd, Toorak VIC 3142",
          suburb: "Toorak",
          state: "VIC",
          country: "Australia",
          price: 3200000,
          price_formatted: "$3,200,000",
          beds: 5,
          baths: 3,
          parking: 3,
          sqm: 420,
          property_type: "House",
          status: "off-market",
          listing_type: "sale",
          description: "Architecturally designed five-bedroom home on a tree-lined Toorak street. Grand living zones, heated pool, and landscaped gardens.",
          lat: -37.8407,
          lng: 145.0109,
          views: 487,
          contact_clicks: 34,
          commission_rate: 2.0,
          year_built: 2019,
          rental_yield_pct: 2.8,
          rental_weekly: 1750,
        },
        {
          agent_id: agentRecord.id,
          title: "South Yarra Penthouse",
          address: "88 Domain Rd, South Yarra VIC 3141",
          suburb: "South Yarra",
          state: "VIC",
          country: "Australia",
          price: 2800000,
          price_formatted: "$2,800,000",
          beds: 4,
          baths: 3,
          parking: 2,
          sqm: 280,
          property_type: "Apartment",
          status: "off-market",
          listing_type: "sale",
          description: "Sub-penthouse with panoramic city views, Gaggenau kitchen, and private rooftop terrace overlooking the Botanic Gardens.",
          lat: -37.8380,
          lng: 145.0180,
          views: 612,
          contact_clicks: 41,
          commission_rate: 2.0,
          year_built: 2021,
          rental_yield_pct: 3.1,
          rental_weekly: 1650,
        },
        {
          agent_id: agentRecord.id,
          title: "Hawthorn Heritage Gem",
          address: "15 Burwood Rd, Hawthorn VIC 3122",
          suburb: "Hawthorn",
          state: "VIC",
          country: "Australia",
          price: 2350000,
          price_formatted: "$2,350,000",
          beds: 4,
          baths: 2,
          parking: 2,
          sqm: 380,
          property_type: "House",
          status: "off-market",
          listing_type: "sale",
          description: "Beautifully renovated Victorian with original period details, north-facing garden, and modern rear extension.",
          lat: -37.8220,
          lng: 145.0350,
          views: 298,
          contact_clicks: 22,
          commission_rate: 2.0,
          year_built: 1895,
          rental_yield_pct: 3.4,
          rental_weekly: 1500,
        },
        {
          agent_id: agentRecord.id,
          title: "Brighton Coastal Family Home",
          address: "9 Beach Rd, Brighton VIC 3186",
          suburb: "Brighton",
          state: "VIC",
          country: "Australia",
          price: 2650000,
          price_formatted: "$2,650,000",
          beds: 5,
          baths: 3,
          parking: 2,
          sqm: 520,
          property_type: "House",
          status: "coming-soon",
          listing_type: "sale",
          description: "Beachside family home with seamless indoor-outdoor living, pool, and walking distance to Church St shops.",
          lat: -37.9070,
          lng: 144.9870,
          views: 156,
          contact_clicks: 9,
          commission_rate: 2.0,
          year_built: 2017,
          rental_yield_pct: 2.6,
          rental_weekly: 1350,
        },
        {
          agent_id: agentRecord.id,
          title: "Richmond Warehouse Conversion",
          address: "22 Stewart St, Richmond VIC 3121",
          suburb: "Richmond",
          state: "VIC",
          country: "Australia",
          price: 1800000,
          price_formatted: "$1,800,000",
          beds: 3,
          baths: 2,
          parking: 1,
          sqm: 210,
          property_type: "Apartment",
          status: "off-market",
          listing_type: "sale",
          description: "Industrial-chic warehouse conversion with soaring 4m ceilings, exposed brick, and private courtyard. Walk to MCG.",
          lat: -37.8230,
          lng: 144.9940,
          views: 345,
          contact_clicks: 27,
          commission_rate: 2.0,
          year_built: 2015,
          rental_yield_pct: 3.8,
          rental_weekly: 1300,
        },
      ]);

      // ─── Trust Account Balance: $47,230 ───
      await supabaseAdmin.from("trust_account_balances").upsert({
        agent_id: agentRecord.id,
        opening_balance: 35000,
        current_balance: 47230,
        last_reconciled_date: new Date().toISOString().split('T')[0],
      }, { onConflict: "agent_id" });

      // ─── Demo Transactions (GCI $1.25M YTD) ───
      const now = new Date();
      const ytdTransactions = [
        { amount: 64000, gst: 6400, desc: "Commission — 42 Orrong Rd Toorak", monthsAgo: 0, type: "commission" },
        { amount: 56000, gst: 5600, desc: "Commission — 88 Domain Rd South Yarra", monthsAgo: 1, type: "commission" },
        { amount: 47000, gst: 4700, desc: "Commission — 15 Burwood Rd Hawthorn", monthsAgo: 2, type: "commission" },
        { amount: 53000, gst: 5300, desc: "Commission — 9 Beach Rd Brighton", monthsAgo: 3, type: "commission" },
        { amount: 36000, gst: 3600, desc: "Commission — 22 Stewart St Richmond", monthsAgo: 4, type: "commission" },
      ];

      const txInserts = ytdTransactions.map(tx => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - tx.monthsAgo);
        return {
          created_by: userId,
          agent_id: agentRecord.id,
          amount: tx.amount,
          gst_amount: tx.gst,
          description: tx.desc,
          type: tx.type,
          status: "settled",
          transaction_date: d.toISOString().split('T')[0],
        };
      });
      await supabaseAdmin.from("transactions").insert(txInserts);

      // ─── Demo Leads for pipeline ───
      const demoLeads = [
        { user_name: "James Chen", user_email: "james.chen@example.com", message: "Interested in off-market Toorak properties", status: "qualified", urgency: "ready_now", budget_range: "$2.5M - $3.5M", score: 85 },
        { user_name: "Emily Tran", user_email: "emily.t@example.com", message: "Looking for 4-bed family home in Brighton", status: "new", urgency: "3_months", budget_range: "$2M - $3M", score: 72 },
        { user_name: "David Park", user_email: "david.park@example.com", message: "Investor seeking high-yield Richmond apartments", status: "contacted", urgency: "ready_now", budget_range: "$1.5M - $2M", score: 90 },
        { user_name: "Sophie Williams", user_email: "s.williams@example.com", message: "Relocating from Sydney, premium South Yarra", status: "new", urgency: "6_months", budget_range: "$2.5M - $4M", score: 65 },
      ];

      // Get the first property for lead association
      const { data: firstProp } = await supabaseAdmin.from("properties").select("id").eq("agent_id", agentRecord.id).limit(1).single();
      if (firstProp) {
        await supabaseAdmin.from("leads").insert(
          demoLeads.map(l => ({
            ...l,
            agent_id: agentRecord.id,
            property_id: firstProp.id,
          }))
        );
      }
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
