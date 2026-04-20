import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const respond = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return respond({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return respond({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const caller = userData?.user;
    if (userError || !caller) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin"])
      .maybeSingle();

    if (!roleCheck) return respond({ error: "Forbidden — admin role required" }, 403);

    const { userId } = await req.json();
    if (!userId) return respond({ error: "Missing userId" }, 400);

    const log: string[] = [];
    const ARCHIVE_EMAIL_DOMAIN = "no-reply.invalid";

    const getOrCreateArchiveUserId = async (targetUserId: string) => {
      const archiveEmail = `compliance-archive+${targetUserId}@${ARCHIVE_EMAIL_DOMAIN}`;

      const findExistingUser = async () => {
        for (let page = 1; page <= 10; page += 1) {
          const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
          if (error) throw error;

          const match = data.users.find((u) => u.email?.toLowerCase() === archiveEmail);
          if (match) return match.id;
          if (data.users.length < 1000) break;
        }
        return null;
      };

      const existingId = await findExistingUser();
      if (existingId) return existingId;

      const { data, error } = await supabase.auth.admin.createUser({
        email: archiveEmail,
        password: `${crypto.randomUUID()}Aa!1`,
        email_confirm: true,
        user_metadata: {
          system_account: true,
          compliance_archive: true,
          source_user_id: targetUserId,
        },
      });

      if (error) {
        const fallbackId = await findExistingUser();
        if (fallbackId) return fallbackId;
        throw error;
      }

      if (!data.user?.id) throw new Error("Failed to create compliance archive user");
      return data.user.id;
    };

    const del = async (table: string, col: string, val: string | string[]) => {
      const q = Array.isArray(val)
        ? supabase.from(table).delete().in(col, val)
        : supabase.from(table).delete().eq(col, val);
      const { error } = await q;
      if (error && !/does not exist/i.test(error.message)) {
        log.push(`${table}: ${error.message}`);
      }
    };

    // Get agent + agency + properties
    const { data: agent } = await supabase
      .from("agents")
      .select("id,agency_id")
      .eq("user_id", userId)
      .maybeSingle();
    const agentId = agent?.id;
    const agencyId = agent?.agency_id;

    const { data: props } = agentId
      ? await supabase.from("properties").select("id").eq("agent_id", agentId)
      : { data: [] as { id: string }[] };
    const propIds = (props || []).map((p: { id: string }) => p.id);

    const { data: trustAccs } = agentId
      ? await supabase.from("trust_accounts").select("id").eq("agent_id", agentId)
      : { data: [] as { id: string }[] };
    const trustIds = (trustAccs || []).map((t: { id: string }) => t.id);

    const { data: retainedTenancies } = agentId
      ? await supabase.from("tenancies").select("id,property_id").eq("agent_id", agentId)
      : { data: [] as { id: string; property_id: string }[] };
    const retainedPropertyIds = Array.from(new Set((retainedTenancies || []).map((t) => t.property_id).filter(Boolean)));
    const deletablePropertyIds = propIds.filter((id) => !retainedPropertyIds.includes(id));

    if (agentId && retainedTenancies && retainedTenancies.length > 0) {
      const archiveUserId = await getOrCreateArchiveUserId(userId);

      const { error: archiveAgentError } = await supabase
        .from("agents")
        .update({
          user_id: archiveUserId,
          name: "Archived Compliance Record",
          email: null,
          phone: null,
          agency: null,
          is_public_profile: false,
          onboarding_complete: true,
        })
        .eq("id", agentId);

      if (archiveAgentError) {
        log.push(`archive_agent: ${archiveAgentError.message}`);
      } else {
        await supabase.from("properties").update({ is_active: false }).in("id", retainedPropertyIds);
        log.push(`retained_records_archived: preserved ${retainedTenancies.length} tenancy record(s) for compliance`);
      }
    }

    // 1. Property children
    if (deletablePropertyIds.length) {
      for (const t of [
        "listing_documents", "saved_properties", "lead_events", "leads",
        "collab_reactions", "collab_views", "rental_applications", "off_market_shares",
        "listing_buyer_matches", "notifications", "open_home_registrations", "property_views",
        "vendor_reports", "auction_bids", "transactions",
      ]) {
        const col = t === "listing_buyer_matches" ? "listing_id" : "property_id";
        await del(t, col, deletablePropertyIds);
      }
      await del("properties", "id", deletablePropertyIds);
    }

    // 2. Trust
    if (trustIds.length) await del("trust_transactions", "trust_account_id", trustIds);
    if (agentId) {
      for (const t of ["trust_account_balances", "trust_receipts", "trust_payments", "trust_reconciliations"]) {
        await del(t, "agent_id", agentId);
      }
      await del("trust_accounts", "agent_id", agentId);
    }

    // 3. Agent-linked records
    if (agentId) {
      for (const t of [
        "notifications", "lead_events", "leads", "agent_subscriptions",
        "agent_credentials", "agent_locations", "contacts", "rental_applications",
        "transactions", "review_requests", "agent_reviews", "audit_log",
      ]) {
        const col = t === "contacts" ? "assigned_agent_id" : "agent_id";
        await del(t, col, agentId);
      }
      await del("off_market_shares", "sharing_agent_id", agentId);
      await del("off_market_shares", "shared_with_agent_id", agentId);
    }

    // 4. Agency
    if (agencyId) {
      for (const t of ["agency_invite_codes", "agency_members", "activities", "tasks", "transactions", "contacts"]) {
        const col =
          t === "contacts" ? "agency_id" :
          t === "activities" || t === "tasks" ? "office_id" :
          "agency_id";
        await del(t, col, agencyId);
      }
      await supabase.from("agents").update({ agency_id: null }).eq("agency_id", agencyId);
      await del("agencies", "id", agencyId);
    }

    // 5. User-level
    await del("agency_members", "user_id", userId);
    await del("user_roles", "user_id", userId);
    await del("audit_log", "user_id", userId);
    for (const t of [
      "saved_properties", "saved_search_alerts", "buyer_profiles", "collab_reactions",
      "collab_views", "contact_activities", "contacts", "activities", "tasks", "leads",
      "lead_events", "user_preferences", "buyer_activity_events", "buyer_intent", "profiles",
    ]) {
      await del(t, "user_id", userId);
    }

    // 6. Agent record last
    if (agentId && retainedPropertyIds.length === 0) await del("agents", "id", agentId);

    // 7. Auth user — final step
    const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
    if (authErr) log.push(`auth_user: ${authErr.message}`);

    // Audit
    try {
      await supabase.from("audit_log").insert({
        user_id: caller.id,
        action_type: "admin_delete_agent",
        entity_type: "agent",
        entity_id: userId,
        description: "Admin deleted agent",
        metadata: { errors: log },
      });
    } catch (_) { /* ignore */ }

    return respond({ success: true, errors: log });
  } catch (err) {
    console.error("admin-delete-agent error:", err);
    return respond({ error: (err as Error).message }, 200);
  }
});
