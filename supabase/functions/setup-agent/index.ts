import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fix #2: Verify caller identity from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: claimsErr } = await anonClient.auth.getUser();
    if (claimsErr || !user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      userId, email, fullName, phone, mode,
      agencyName, agencyEmail, inviteCode,
      licenseNumber, officeAddress, yearsExperience, specialization,
      investmentNiche, handlesTrustAccounting,
    } = await req.json();

    // Enforce caller.id === userId
    if (user.id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden: caller ID mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Generate unique 6-digit support PIN
    const generatePin = () =>
      String(Math.floor(100000 + Math.random() * 900000));
    let supportPin = generatePin();
    let pinUnique = false;
    let attempts = 0;
    while (!pinUnique && attempts < 10) {
      const { data: existing } = await supabaseAdmin
        .from('agents')
        .select('id')
        .eq('support_pin', supportPin)
        .maybeSingle();
      if (!existing) {
        pinUnique = true;
      } else {
        supportPin = generatePin();
        attempts++;
      }
    }

    const agentExtras = {
      license_number: licenseNumber || null,
      office_address: officeAddress || null,
      years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
      specialization: specialization || "Residential",
      investment_niche: investmentNiche || null,
      handles_trust_accounting: handlesTrustAccounting === true,
      support_pin: supportPin,
      approval_status: 'pending',
    };

    if (mode === "create-agency") {
      if (!agencyName?.trim()) throw new Error("Agency name is required");

      const slug = agencyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
        "-" + Math.random().toString(36).slice(2, 6);

      // Check if agency already exists for this user (re-registration)
      const { data: existing } = await supabaseAdmin
        .from("agencies")
        .select("id, name")
        .eq("owner_user_id", userId)
        .eq("name", agencyName)
        .maybeSingle();

      let agency;
      if (existing) {
        agency = existing;
      } else {
        const { data: newAgency, error: agencyError } = await supabaseAdmin
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
        agency = newAgency;
      }

      const { error: memberError } = await supabaseAdmin
        .from("agency_members")
        .insert({ agency_id: agency.id, user_id: userId, role: "principal" });
      if (memberError && !memberError.message.includes("duplicate")) throw memberError;

      // Upsert agent record (handles re-registration attempts gracefully)
      // On conflict, do NOT overwrite approval_status
      const { approval_status: _discard, ...agentExtrasForUpdate } = agentExtras;
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
        }, { onConflict: "user_id", ignoreDuplicates: false });
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
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
