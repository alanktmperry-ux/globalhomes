import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { partnerEmail, agencyId, agentId, accessLevel } = await req.json();

    if (!partnerEmail || !agencyId || !agentId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is owner/admin of this agency
    const { data: membership } = await supabaseAdmin
      .from("agency_members")
      .select("role")
      .eq("agency_id", agencyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || !["owner", "admin", "principal"].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the partner by email
    const { data: partnerUser } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = partnerUser?.users?.find(
      (u: any) => u.email?.toLowerCase() === partnerEmail.toLowerCase()
    );

    if (!targetUser) {
      return new Response(
        JSON.stringify({
          error: `No partner account found for ${partnerEmail}. They must register at listhq.com.au/partner/login first.`,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check they have partner role
    const { data: partnerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUser.id)
      .eq("role", "partner")
      .maybeSingle();

    if (!partnerRole) {
      return new Response(
        JSON.stringify({ error: `${partnerEmail} does not have a partner account.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get partner record
    const { data: partner } = await supabaseAdmin
      .from("partners")
      .select("id, company_name, is_verified")
      .eq("user_id", targetUser.id)
      .single();

    if (!partner) {
      return new Response(
        JSON.stringify({ error: "Partner profile not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!partner.is_verified) {
      return new Response(
        JSON.stringify({
          error: `${partnerEmail}'s partner account has not been verified by ListHQ yet.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if connection already exists
    const { data: existing } = await supabaseAdmin
      .from("partner_agencies")
      .select("id, status")
      .eq("partner_id", partner.id)
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (existing?.status === "active") {
      return new Response(
        JSON.stringify({ error: "This partner already has active access to your agency." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate invite token
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get agency details
    const { data: agency } = await supabaseAdmin
      .from("agencies")
      .select("name")
      .eq("id", agencyId)
      .single();

    // Get inviting agent details
    const { data: agent } = await supabaseAdmin
      .from("agents")
      .select("name, email")
      .eq("id", agentId)
      .single();

    // Upsert partner_agencies row
    await supabaseAdmin.from("partner_agencies").upsert(
      {
        partner_id: partner.id,
        agency_id: agencyId,
        invited_by_agent_id: agentId,
        status: "pending",
        access_level: accessLevel || "trust_and_pm",
        invite_token: inviteToken,
        invite_expires_at: expiresAt,
        invited_at: new Date().toISOString(),
        accepted_at: null,
      },
      { onConflict: "partner_id,agency_id" }
    );

    // Send invite email to partner
    const accessLabel =
      accessLevel === "trust_only"
        ? "Trust accounting only"
        : accessLevel === "full_pm"
          ? "Full property management"
          : "Trust accounting + property management";

    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          to: partnerEmail,
          subject: `You've been invited to manage ${agency?.name || "an agency"} on ListHQ`,
          html: `<h2>Partner Invitation</h2><p>Hi ${partner.company_name},</p><p><strong>${agent?.name || "An agency principal"}</strong> from <strong>${agency?.name || "an agency"}</strong> has invited you to manage their trust accounting on ListHQ.</p><p>Access level: <strong>${accessLabel}</strong></p><p>Log in to your partner portal to accept this invitation. This invitation expires in 7 days.</p>`,
        }),
      });
    } catch (_) {
      // Don't fail the invite if email fails
    }

    return new Response(
      JSON.stringify({ success: true, partnerName: partner.company_name }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
