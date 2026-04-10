import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

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

    const { token } = await req.json();
    if (!token) throw new Error("Missing invite token");

    // Find the invite
    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from("partner_agencies")
      .select("id, status, invite_expires_at, agency_id, partner_id")
      .eq("invite_token", token)
      .maybeSingle();

    if (inviteErr || !invite) {
      throw new Error("Invalid or expired invitation.");
    }

    // Verify this partner owns the invite
    const { data: partner } = await supabaseAdmin
      .from("partners")
      .select("id, user_id")
      .eq("id", invite.partner_id)
      .single();

    if (!partner || partner.user_id !== user.id) {
      throw new Error("This invitation is not for your account.");
    }

    // Get agency name
    const { data: agency } = await supabaseAdmin
      .from("agencies")
      .select("name")
      .eq("id", invite.agency_id)
      .single();

    const agencyName = agency?.name || "the agency";

    if (invite.status === "active") {
      return new Response(
        JSON.stringify({ success: true, alreadyActive: true, agencyName }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (invite.invite_expires_at && new Date(invite.invite_expires_at) < new Date()) {
      throw new Error("This invitation has expired. Ask the agency to send a new one.");
    }

    // Activate the connection
    await supabaseAdmin
      .from("partner_agencies")
      .update({
        status: "active",
        accepted_at: new Date().toISOString(),
        invite_token: null,
      })
      .eq("id", invite.id);

    // Log the activity
    try {
      await supabaseAdmin.from("partner_activity_log").insert({
        partner_id: partner.id,
        agency_id: invite.agency_id,
        action_type: "access_accepted",
        entity_type: "partner_agencies",
        entity_id: invite.id,
        description: `Partner accepted access to ${agencyName}`,
      });
    } catch (_) {
      // Don't fail if activity log insert fails
    }

    return new Response(
      JSON.stringify({ success: true, agencyName }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
