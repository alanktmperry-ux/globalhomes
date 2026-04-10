import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the calling user's token
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

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) throw new Error("Not authenticated");

    const { agencyId, email, role, accessLevel } = await req.json();
    console.log(`[invite-team-member] Inviting ${email} to agency ${agencyId} as ${role}`);

    if (!agencyId || !email || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller is principal/owner/admin of this agency
    const { data: callerMembership } = await supabaseAdmin
      .from("agency_members")
      .select("role")
      .eq("agency_id", agencyId)
      .eq("user_id", user.id)
      .single();

    if (!callerMembership || !["principal", "owner", "admin"].includes(callerMembership.role)) {
      return new Response(JSON.stringify({ error: "You don't have permission to invite members" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fix #6/#14: Use getUserByEmail instead of full-table scan
    const { data: existingUserData } = await supabaseAdmin.auth.admin.getUserByEmail(email.toLowerCase());
    const existingUser = existingUserData?.user || null;

    if (existingUser) {
      console.log(`[invite-team-member] User ${email} already exists (${existingUser.id}), adding directly`);
      
      // Check if already a member
      const { data: existingMember } = await supabaseAdmin
        .from("agency_members")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("user_id", existingUser.id)
        .maybeSingle();

      if (existingMember) {
        return new Response(JSON.stringify({ error: "This user is already a member of the agency" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add existing user to agency
      const { error: memberError } = await supabaseAdmin
        .from("agency_members")
        .insert({
          agency_id: agencyId,
          user_id: existingUser.id,
          role: role,
          access_level: accessLevel || "full",
        });
      if (memberError) throw memberError;

      // Ensure they have agent role
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: existingUser.id, role: "agent" })
        .then(() => {});

      // Get agency name
      const { data: agency } = await supabaseAdmin
        .from("agencies")
        .select("name")
        .eq("id", agencyId)
        .single();

      // Create/update agent record
      const { data: existingAgent } = await supabaseAdmin
        .from("agents")
        .select("id")
        .eq("user_id", existingUser.id)
        .maybeSingle();

      if (existingAgent) {
        await supabaseAdmin
          .from("agents")
          .update({ agency_id: agencyId, agency: agency?.name || null })
          .eq("id", existingAgent.id);
      } else {
        await supabaseAdmin
          .from("agents")
          .insert({
            user_id: existingUser.id,
            name: existingUser.email || "Agent",
            email: existingUser.email,
            agency_id: agencyId,
            agency: agency?.name || null,
          });
      }

      console.log(`[invite-team-member] Existing user ${email} added to agency successfully`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Existing user added to agency",
        isExisting: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User doesn't exist — generate an invite code they can use to sign up
    console.log(`[invite-team-member] User ${email} not found, creating invite code`);

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let inviteCode = "";
    for (let i = 0; i < 8; i++) inviteCode += chars[Math.floor(Math.random() * chars.length)];

    const { error: codeError } = await supabaseAdmin
      .from("agency_invite_codes")
      .insert({
        agency_id: agencyId,
        code: inviteCode,
        created_by: user.id,
        role: role,
        max_uses: 1,
        is_active: true,
      });
    if (codeError) throw codeError;

    // Also try sending the invite email via Supabase Auth (best effort)
    let emailSent = false;
    try {
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          invited_to_agency: agencyId,
          invited_role: role,
          invited_access_level: accessLevel || "full",
        },
      });
      if (!inviteError) {
        emailSent = true;
        console.log(`[invite-team-member] Auth invite email sent to ${email}`);
      } else {
        console.warn(`[invite-team-member] Auth invite email failed: ${inviteError.message}`);
      }
    } catch (emailErr: any) {
      console.warn(`[invite-team-member] Auth invite email error: ${emailErr.message}`);
    }

    // Get agency name for response
    const { data: agencyInfo } = await supabaseAdmin
      .from("agencies")
      .select("name")
      .eq("id", agencyId)
      .single();

    console.log(`[invite-team-member] Invite code ${inviteCode} created for ${email}. Email sent: ${emailSent}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: emailSent 
        ? "Invitation email sent. An invite code has also been generated as a backup."
        : "An invite code has been generated. Share it with the person to join your agency.",
      isExisting: false,
      inviteCode,
      emailSent,
      agencyName: agencyInfo?.name || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(`[invite-team-member] Error: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
