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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user: caller } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleCheck } = await supabase
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

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "list_users") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const perPage = 50;
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;

      // Fetch all agents with subscription info
      const { data: agents } = await supabase
        .from("agents")
        .select("user_id, is_demo, is_subscribed, agent_subscriptions(plan_type)");

      // Fetch demo requests (approved/redeemed)
      const { data: demoRequests } = await supabase
        .from("demo_requests")
        .select("*")
        .in("status", ["approved", "redeemed", "pending"])
        .order("created_at", { ascending: false });

      // Build agent lookup by user_id
      const agentMap = new Map<string, any>();
      for (const a of (agents || [])) {
        agentMap.set(a.user_id, a);
      }

      // Map auth users
      const authUsers = data.users.map((u: any) => {
        const agent = agentMap.get(u.id);
        const isDemo = agent?.is_demo || false;
        const isSubscribed = agent?.is_subscribed || false;
        const subscription = agent?.agent_subscriptions;
        const planType = subscription?.plan_type || null;

        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          email_confirmed_at: u.email_confirmed_at,
          banned_until: u.banned_until,
          display_name: u.user_metadata?.display_name || u.user_metadata?.full_name || u.email,
          provider: u.app_metadata?.provider || 'email',
          user_type: isDemo ? 'demo' : (agent ? 'agent' : 'seeker'),
          is_subscribed: isSubscribed,
          plan_type: planType,
        };
      });

      // Map demo request users that are NOT auth users (people who requested demo access)
      const authEmails = new Set(data.users.map((u: any) => (u.email || '').toLowerCase()));
      const demoUsers = (demoRequests || [])
        .filter((dr: any) => !authEmails.has((dr.email || '').toLowerCase()))
        .map((dr: any) => ({
          id: `demo-${dr.id}`,
          email: dr.email,
          created_at: dr.created_at,
          last_sign_in_at: null,
          email_confirmed_at: null,
          banned_until: null,
          display_name: dr.full_name,
          provider: 'demo_request',
          user_type: 'demo_request',
          is_subscribed: false,
          plan_type: null,
          demo_status: dr.status,
          agency_name: dr.agency_name,
        }));

      return new Response(JSON.stringify({
        users: [...authUsers, ...demoUsers],
        total: data.total + demoUsers.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ban_user") {
      const { user_id, ban } = await req.json();
      if (ban) {
        const { error } = await supabase.auth.admin.updateUserById(user_id, { ban_duration: "876000h" });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.admin.updateUserById(user_id, { ban_duration: "none" });
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_subscription") {
      const { user_id, plan_type, listing_limit, seat_limit, founding_member } = await req.json();

      const { data: agent, error: agentErr } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (agentErr || !agent) {
        return new Response(
          JSON.stringify({ error: "Agent not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: subErr } = await supabase
        .from("agent_subscriptions")
        .upsert({
          agent_id: agent.id,
          plan_type,
          listing_limit,
          seat_limit,
          founding_member,
          updated_at: new Date().toISOString(),
        }, { onConflict: "agent_id" });

      if (subErr) throw subErr;

      await supabase
        .from("agents")
        .update({ is_subscribed: plan_type !== "demo" })
        .eq("id", agent.id);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
      const { request_id } = await req.json();
      if (!request_id) {
        return new Response(JSON.stringify({ error: "Missing request_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("demo_requests").delete().eq("id", request_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      const { user_id } = await req.json();

      const ensure = (error: any, step: string) => {
        if (error) throw new Error(`${step}: ${error.message}`);
      };

      const deleteIn = async (table: string, column: string, ids: string[]) => {
        if (!ids.length) return;
        const { error } = await supabase.from(table as any).delete().in(column, ids as any);
        ensure(error, `delete ${table}`);
      };

      const deleteEq = async (table: string, column: string, value: string) => {
        const { error } = await supabase.from(table as any).delete().eq(column, value as any);
        ensure(error, `delete ${table}`);
      };

      // Load owned agent + agency ids
      const { data: agentRows, error: agentRowsError } = await supabase
        .from("agents")
        .select("id, agency_id")
        .eq("user_id", user_id);
      ensure(agentRowsError, "load agents");

      const { data: ownedAgencies, error: ownedAgenciesError } = await supabase
        .from("agencies")
        .select("id")
        .eq("owner_user_id", user_id);
      ensure(ownedAgenciesError, "load owned agencies");

      const agentIds = Array.from(new Set((agentRows || []).map((a: any) => a.id).filter(Boolean)));
      const agencyIdsFromAgent = (agentRows || []).map((a: any) => a.agency_id).filter(Boolean);
      const ownedAgencyIds = (ownedAgencies || []).map((a: any) => a.id);
      const allAgencyIds = Array.from(new Set([...agencyIdsFromAgent, ...ownedAgencyIds]));

      // Load properties owned by these agents
      let propIds: string[] = [];
      if (agentIds.length > 0) {
        const { data: propRows, error: propRowsError } = await supabase
          .from("properties")
          .select("id")
          .in("agent_id", agentIds);
        ensure(propRowsError, "load agent properties");
        propIds = (propRows || []).map((p: any) => p.id);
      }

      // Load trust accounts for these agents/agencies
      const trustAccountIdSet = new Set<string>();
      if (agentIds.length > 0) {
        const { data: taByAgent, error: taByAgentError } = await supabase
          .from("trust_accounts")
          .select("id")
          .in("agent_id", agentIds);
        ensure(taByAgentError, "load trust accounts by agent");
        (taByAgent || []).forEach((r: any) => trustAccountIdSet.add(r.id));
      }
      if (allAgencyIds.length > 0) {
        const { data: taByAgency, error: taByAgencyError } = await supabase
          .from("trust_accounts")
          .select("id")
          .in("agency_id", allAgencyIds);
        ensure(taByAgencyError, "load trust accounts by agency");
        (taByAgency || []).forEach((r: any) => trustAccountIdSet.add(r.id));
      }
      const trustAccountIds = Array.from(trustAccountIdSet);

      // Load trust transaction ids to clear off_market_shares trust_entry references first
      if (trustAccountIds.length > 0) {
        const { data: trustTxRows, error: trustTxRowsError } = await supabase
          .from("trust_transactions")
          .select("id")
          .in("trust_account_id", trustAccountIds);
        ensure(trustTxRowsError, "load trust transactions");
        const trustTxIds = (trustTxRows || []).map((t: any) => t.id);
        await deleteIn("off_market_shares", "trust_entry_id", trustTxIds);
      }

      // Property dependencies
      await deleteIn("listing_documents", "property_id", propIds);
      await deleteIn("saved_properties", "property_id", propIds);
      await deleteIn("lead_events", "property_id", propIds);
      await deleteIn("leads", "property_id", propIds);
      await deleteIn("notifications", "property_id", propIds);
      await deleteIn("collab_reactions", "property_id", propIds);
      await deleteIn("collab_views", "property_id", propIds);
      await deleteIn("off_market_shares", "property_id", propIds);
      await deleteIn("rental_applications", "property_id", propIds);
      await deleteIn("transactions", "property_id", propIds);
      await deleteIn("trust_transactions", "property_id", propIds);

      // Trust dependencies
      await deleteIn("trust_transactions", "trust_account_id", trustAccountIds);
      await deleteIn("trust_account_balances", "agent_id", agentIds);
      await deleteIn("trust_receipts", "agent_id", agentIds);
      await deleteIn("trust_payments", "agent_id", agentIds);
      await deleteIn("trust_reconciliations", "agent_id", agentIds);
      await deleteIn("trust_accounts", "agent_id", agentIds);
      await deleteIn("trust_accounts", "agency_id", allAgencyIds);

      // Agent dependencies
      await deleteIn("notifications", "agent_id", agentIds);
      await deleteIn("lead_events", "agent_id", agentIds);
      await deleteIn("leads", "agent_id", agentIds);
      await deleteIn("agent_subscriptions", "agent_id", agentIds);
      await deleteIn("agent_credentials", "agent_id", agentIds);
      await deleteIn("agent_locations", "agent_id", agentIds);
      await deleteIn("off_market_shares", "sharing_agent_id", agentIds);
      await deleteIn("off_market_shares", "shared_with_agent_id", agentIds);
      await deleteIn("contacts", "assigned_agent_id", agentIds);
      await deleteIn("rental_applications", "agent_id", agentIds);
      await deleteIn("transactions", "agent_id", agentIds);

      await deleteIn("properties", "id", propIds);
      await deleteIn("agents", "id", agentIds);

      // Agency dependencies
      await deleteIn("agency_invite_codes", "agency_id", allAgencyIds);
      await deleteIn("agency_members", "agency_id", allAgencyIds);
      await deleteIn("activities", "office_id", allAgencyIds);
      await deleteIn("tasks", "office_id", allAgencyIds);
      await deleteIn("transactions", "office_id", allAgencyIds);
      await deleteIn("contacts", "agency_id", allAgencyIds);

      if (allAgencyIds.length > 0) {
        const { error: unlinkAgentsError } = await supabase
          .from("agents")
          .update({ agency_id: null })
          .in("agency_id", allAgencyIds);
        ensure(unlinkAgentsError, "unlink agents from agency");
      }

      await deleteIn("agencies", "id", ownedAgencyIds);

      // Conversations/messages
      const { data: convRows, error: convRowsError } = await supabase
        .from("conversations")
        .select("id")
        .or(`participant_1.eq.${user_id},participant_2.eq.${user_id}`);
      ensure(convRowsError, "load conversations");
      const convIds = (convRows || []).map((c: any) => c.id);
      await deleteIn("messages", "conversation_id", convIds);
      await deleteEq("messages", "sender_id", user_id);

      const { error: conversationsDeleteError } = await supabase
        .from("conversations")
        .delete()
        .or(`participant_1.eq.${user_id},participant_2.eq.${user_id}`);
      ensure(conversationsDeleteError, "delete conversations");

      // User-level rows
      await deleteEq("agency_members", "user_id", user_id);
      await deleteEq("agency_invite_codes", "created_by", user_id);
      await deleteEq("saved_properties", "user_id", user_id);
      await deleteEq("saved_search_alerts", "user_id", user_id);
      await deleteEq("buyer_profiles", "user_id", user_id);
      await deleteEq("collab_reactions", "user_id", user_id);
      await deleteEq("collab_views", "user_id", user_id);
      await deleteEq("contact_activities", "user_id", user_id);
      await deleteEq("contacts", "created_by", user_id);
      await deleteEq("activities", "user_id", user_id);
      await deleteEq("tasks", "user_id", user_id);
      await deleteEq("leads", "user_id", user_id);
      await deleteEq("lead_events", "user_id", user_id);
      await deleteEq("user_preferences", "user_id", user_id);
      await deleteEq("user_roles", "user_id", user_id);
      await deleteEq("profiles", "user_id", user_id);

      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user_id);
      ensure(deleteAuthError, "delete auth user");

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      const { email } = await req.json();
      const { error } = await anonClient.auth.resetPasswordForEmail(email, {
        redirectTo: (Deno.env.get("SITE_URL") || "https://globalhomes.lovable.app") + "/reset-password",
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: `Recovery email sent to ${email}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "table_stats") {
      const tables = ['profiles', 'properties', 'agents', 'leads', 'voice_searches', 'saved_properties', 'user_roles', 'lead_events'];
      const stats: Record<string, number> = {};
      for (const table of tables) {
        const { count } = await supabase.from(table).select('id', { count: 'exact', head: true });
        stats[table] = count || 0;
      }
      return new Response(JSON.stringify({ stats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "browse_table") {
      const table = url.searchParams.get("table") || "profiles";
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const allowedTables = ['profiles', 'properties', 'agents', 'leads', 'voice_searches', 'saved_properties', 'user_roles', 'lead_events', 'user_preferences'];
      if (!allowedTables.includes(table)) {
        return new Response(JSON.stringify({ error: "Table not allowed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ data, total: count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_record") {
      const { table, record_id } = await req.json();
      const allowedTables = ['properties', 'leads', 'voice_searches', 'saved_properties', 'lead_events'];
      if (!allowedTables.includes(table)) {
        return new Response(JSON.stringify({ error: "Delete not allowed on this table" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from(table).delete().eq('id', record_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
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
