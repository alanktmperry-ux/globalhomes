import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      userId, email, fullName, phone, mode,
      agencyName, agencyEmail, inviteCode,
      licenseNumber, officeAddress, yearsExperience, specialization,
      investmentNiche, handlesTrustAccounting,
    } = await req.json();

    if (!userId || !email || !mode) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Insert agent role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "agent" });
    if (roleError && !roleError.message.includes("duplicate")) throw roleError;

    const agentExtras = {
      license_number: licenseNumber || null,
      office_address: officeAddress || null,
      years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
      specialization: specialization || "Residential",
      investment_niche: investmentNiche || null,
      handles_trust_accounting: handlesTrustAccounting === true,
    };

    if (mode === "create-agency") {
      if (!agencyName?.trim()) throw new Error("Agency name is required");

      const slug = agencyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
        "-" + Math.random().toString(36).slice(2, 6);

      const { data: agency, error: agencyError } = await supabaseAdmin
        .from("agencies")
        .insert({
          name: agencyName,
          slug,
          owner_user_id: userId,
          email: agencyEmail || email || null,
        })
        .select()
        .single();
      if (agencyError) throw agencyError;

      const { error: memberError } = await supabaseAdmin
        .from("agency_members")
        .insert({ agency_id: agency.id, user_id: userId, role: "principal" });
      if (memberError && !memberError.message.includes("duplicate")) throw memberError;

      // Upsert agent record (handles re-registration attempts gracefully)
      const { error: agentError } = await supabaseAdmin
        .from("agents")
        .upsert({
          user_id: userId,
          name: fullName || email,
          agency: agencyName,
          email,
          phone: phone || null,
          agency_id: agency.id,
          ...agentExtras,
        }, { onConflict: "user_id" });
      if (agentError) throw agentError;

      return new Response(JSON.stringify({ success: true, agencyId: agency.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (mode === "join-agency") {
      if (!inviteCode?.trim()) throw new Error("Invite code is required");

      const { data: invite, error: inviteError } = await supabaseAdmin
        .from("agency_invite_codes")
        .select("*, agencies(name)")
        .eq("code", inviteCode.trim().toUpperCase())
        .eq("is_active", true)
        .single();
      if (inviteError || !invite) throw new Error("Invalid or expired invite code");
      if (invite.max_uses && invite.uses >= invite.max_uses) throw new Error("This invite code has reached its usage limit");
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) throw new Error("This invite code has expired");

      const { error: memberError } = await supabaseAdmin
        .from("agency_members")
        .insert({ agency_id: invite.agency_id, user_id: userId, role: invite.role });
      if (memberError && !memberError.message.includes("duplicate")) throw memberError;

      await supabaseAdmin
        .from("agency_invite_codes")
        .update({ uses: invite.uses + 1 })
        .eq("id", invite.id);

      const agencyData = invite.agencies as any;
      const { error: agentError } = await supabaseAdmin
        .from("agents")
        .upsert({
          user_id: userId,
          name: fullName || email,
          agency: agencyData?.name || null,
          email,
          phone: phone || null,
          agency_id: invite.agency_id,
          ...agentExtras,
        }, { onConflict: "user_id" });
      if (agentError) throw agentError;

      return new Response(JSON.stringify({ success: true, agencyName: agencyData?.name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
