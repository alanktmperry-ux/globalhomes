import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // --- Verify JWT and admin role before doing anything ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "").trim();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const caller = userData?.user;
  if (userError || !caller) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: roleCheck } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleCheck) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // --- End auth check ---

  const email = "demo@listhq.com.au";
  const password = Deno.env.get("DEMO_USER_PASSWORD");
  if (!password) {
    return new Response(JSON.stringify({ error: "DEMO_USER_PASSWORD secret not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list.users.find((u) => u.email?.toLowerCase() === email);

  let userId: string;
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    userId = existing.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) return new Response(JSON.stringify({ error: error?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    userId = data.user.id;
  }

  await admin.from("profiles").upsert({ user_id: userId, display_name: "Demo Agent", phone: "" }, { onConflict: "user_id" });

  const { data: agentExisting } = await admin.from("agents").select("id").eq("user_id", userId).maybeSingle();
  let agentId = agentExisting?.id;
  if (!agentId) {
    const { data: ag, error: agErr } = await admin.from("agents").insert({
      user_id: userId,
      name: "Demo Agent",
      agency: "Demo Agency",
      email,
      phone: "",
      license_number: "DEMO-" + userId.substring(0, 6).toUpperCase(),
      specialization: "Residential",
      years_experience: 5,
      bio: "Demo agent account — explore the full ListHQ platform.",
      service_areas: ["Melbourne", "Sydney", "Brisbane"],
      is_approved: true,
      rating: 4.8,
      review_count: 24,
      verification_badge_level: "email",
      investment_niche: "Residential",
      handles_trust_accounting: false,
      is_demo: true,
    }).select("id").single();
    if (agErr) return new Response(JSON.stringify({ error: agErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    agentId = ag.id;
  }

  await admin.from("user_roles").upsert({ user_id: userId, role: "agent" }, { onConflict: "user_id,role" });

  return new Response(JSON.stringify({ ok: true, userId, agentId, email }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
