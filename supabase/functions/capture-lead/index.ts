import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function calculateLeadScore({
  urgency,
  preApprovalStatus,
  message,
}: {
  urgency?: string;
  preApprovalStatus?: string;
  message?: string;
}): number {
  let score = 50;
  if (urgency === "immediate") score += 30;
  else if (urgency === "this_week") score += 20;
  else if (urgency === "this_month") score += 10;
  if (preApprovalStatus === "approved") score += 20;
  if (message && message.length > 100) score += 10;
  return Math.min(score, 100);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      propertyId,
      agentId,
      userEmail,
      userPhone,
      userName,
      message,
      searchContext,
      preferredContact,
      urgency,
      preApprovalStatus,
    } = await req.json();

    // Validate required fields
    if (!propertyId || !agentId || !userEmail || !userName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: propertyId, agentId, userEmail, userName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const score = calculateLeadScore({ urgency, preApprovalStatus, message });

    const { data: lead, error } = await supabase
      .from("leads")
      .insert([{
        property_id: propertyId,
        agent_id: agentId,
        user_email: userEmail,
        user_phone: userPhone || null,
        user_name: userName,
        message: message || null,
        search_context: searchContext || null,
        preferred_contact: preferredContact || "email",
        urgency: urgency || "just_browsing",
        pre_approval_status: preApprovalStatus || "not_started",
        status: "new",
        score,
      }])
      .select()
      .single();

    if (error) {
      console.error("Lead insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to submit inquiry" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also record in lead_events for the existing analytics system
    await supabase.from("lead_events").insert([{
      property_id: propertyId,
      agent_id: agentId,
      event_type: "lead_captured",
    }]);

    return new Response(
      JSON.stringify({
        success: true,
        leadId: lead.id,
        estimatedResponse: "Within 2 hours",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Lead capture error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to submit inquiry" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
