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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the calling user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { consumer_profile_id, agent_id } = await req.json();
    if (!consumer_profile_id || !agent_id) {
      return new Response(JSON.stringify({ error: "Missing consumer_profile_id or agent_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify agent belongs to calling user
    const { data: agent } = await adminClient
      .from("agents")
      .select("id, name, email")
      .eq("id", agent_id)
      .eq("user_id", user.id)
      .single();

    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent not found or unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch consumer profile
    const { data: profile, error: profileError } = await adminClient
      .from("consumer_profiles")
      .select("*")
      .eq("id", consumer_profile_id)
      .eq("is_purchasable", true)
      .is("purchased_by", null)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Lead not available for purchase" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as purchased
    const { error: updateError } = await adminClient
      .from("consumer_profiles")
      .update({
        purchased_by: agent_id,
        purchased_at: new Date().toISOString(),
        is_purchasable: false,
      })
      .eq("id", consumer_profile_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to purchase lead" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log activity
    await adminClient.from("activities").insert({
      user_id: user.id,
      action: "lead_purchased",
      entity_type: "consumer_profile",
      entity_id: consumer_profile_id,
      description: `Purchased lead: ${profile.name}`,
    });

    // TODO Phase 2: Stripe charge, email notification to buyer

    return new Response(
      JSON.stringify({
        success: true,
        buyer: {
          name: profile.name,
          email: profile.email,
          buying_situation: profile.buying_situation,
          budget_min: profile.budget_min,
          budget_max: profile.budget_max,
          preferred_suburbs: profile.preferred_suburbs,
          preferred_type: profile.preferred_type,
          min_bedrooms: profile.min_bedrooms,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
