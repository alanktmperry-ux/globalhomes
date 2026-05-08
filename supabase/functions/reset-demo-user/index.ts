import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const email = "demo@listhq.com.au";
  const password = "cydmeh-jusnI6-gicnok";

  // Find existing
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list.users.find((u) => u.email?.toLowerCase() === email);

  let userId: string;
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    userId = existing.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) return new Response(JSON.stringify({ error: error?.message }), { status: 500 });
    userId = data.user.id;
  }

  // Ensure profile
  await admin.from("profiles").upsert({ user_id: userId, display_name: "Demo Agent", phone: "" }, { onConflict: "user_id" });

  // Ensure agent record
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
    if (agErr) return new Response(JSON.stringify({ error: agErr.message }), { status: 500 });
    agentId = ag.id;
  }

  // Ensure agent role
  await admin.from("user_roles").upsert({ user_id: userId, role: "agent" }, { onConflict: "user_id,role" });

  return new Response(JSON.stringify({ ok: true, userId, agentId, email }), {
    headers: { "Content-Type": "application/json" },
  });
});
