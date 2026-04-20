import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Verify JWT first, before any other logic ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const caller = userData?.user;
    if (userError || !caller) {
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
    // Support params from URL query string OR JSON body (for supabase.functions.invoke)
    let bodyParams: Record<string, any> = {};
    if (req.method === "POST") {
      try { bodyParams = await req.clone().json(); } catch { bodyParams = {}; }
    }
    const getParam = (key: string, fallback?: string) =>
      url.searchParams.get(key) ?? bodyParams[key]?.toString() ?? fallback ?? null;

    const action = getParam("action");

    if (action === "list_users") {
      const page = parseInt(getParam("page", "1")!);
      const perPage = 50;
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;

      // Fetch all agents with subscription info
      const { data: agents } = await supabase
        .from("agents")
        .select("user_id, is_demo, is_subscribed, support_pin, subscription_status, payment_failed_at, admin_grace_until, agent_subscriptions(plan_type)");

      // Fetch demo requests (approved/redeemed)
      const { data: demoRequests } = await supabase
        .from("demo_requests")
        .select("*")
        .in("status", ["approved", "redeemed", "pending"])
        .order("created_at", { ascending: false });

      // Fetch partners
      const { data: partners } = await supabase
        .from("partners")
        .select("user_id, is_verified");

      const partnerMap = new Map<string, any>();
      for (const p of (partners || [])) {
        partnerMap.set(p.user_id, p);
      }

      // Build agent lookup by user_id
      const agentMap = new Map<string, any>();
      for (const a of (agents || [])) {
        agentMap.set(a.user_id, a);
      }

      // Map auth users
      const authUsers = data.users.map((u: any) => {
        const agent = agentMap.get(u.id);
        const partnerRecord = partnerMap.get(u.id);
        const isPartner = !!partnerRecord;
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
          user_type: isPartner ? 'partner' : (isDemo ? 'demo' : (agent ? 'agent' : 'seeker')),
          is_subscribed: isSubscribed,
          plan_type: planType,
          is_partner_verified: partnerRecord?.is_verified || false,
          support_pin: agent?.support_pin || null,
          subscription_status: agent?.subscription_status || null,
          payment_failed_at: agent?.payment_failed_at || null,
          admin_grace_until: agent?.admin_grace_until || null,
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

      // Audit log
      await supabase.from("audit_log").insert({
        user_id: caller.id,
        action_type: ban ? "admin_ban_user" : "admin_unban_user",
        entity_type: "user",
        entity_id: user_id,
        description: ban ? "Admin banned user" : "Admin unbanned user",
        metadata: { performed_by: caller.email, banned: !!ban },
      }).catch(e => console.error("audit log:", e));

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

      const { error: agentUpdateErr } = await supabase
        .from("agents")
        .update({ is_subscribed: plan_type !== "demo" })
        .eq("id", agent.id);
      if (agentUpdateErr) throw agentUpdateErr;

      // Audit log
      await supabase.from("audit_log").insert({
        user_id: caller.id,
        action_type: "admin_set_subscription",
        entity_type: "user",
        entity_id: user_id,
        description: "Admin changed subscription",
        metadata: { plan_type, performed_by: caller.email },
      }).catch(e => console.error("audit log:", e));

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify_partner") {
      const { user_id, verify } = await req.json();
      const { data: partner, error: findErr } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (findErr || !partner) {
        return new Response(
          JSON.stringify({ error: "Partner record not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateErr } = await supabase
        .from("partners")
        .update({
          is_verified: verify,
          verified_at: verify ? new Date().toISOString() : null,
        })
        .eq("id", partner.id);

      if (updateErr) throw updateErr;

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete_demo_request") {
      const { request_id } = await req.json();
      if (!request_id) {
        return new Response(JSON.stringify({ error: "Missing request_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("demo_requests").delete().eq("id", request_id);
      if (error) throw error;

      // Audit log
      await supabase.from("audit_log").insert({
        user_id: caller.id,
        action_type: "admin_delete_user",
        entity_type: "user",
        entity_id: request_id,
        description: "Admin deleted demo request",
        metadata: { performed_by: caller.email },
      }).catch(e => console.error("audit log:", e));

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      const user_id = bodyParams.user_id;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const warnings: string[] = [];

      // Pre-cleanup: remove rows that block cascade via foreign keys
      const { data: agentRow } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (agentRow) {
        // Delete audit_log entries referencing this agent (blocks agent deletion)
        const { error: alErr } = await supabase
          .from("audit_log")
          .delete()
          .eq("agent_id", agentRow.id);
        if (alErr) {
          console.error("audit_log cleanup error:", alErr);
          warnings.push(`audit_log: ${alErr.message}`);
        }

        // Delete agent_lifecycle_notes
        const { error: alnErr } = await supabase
          .from("agent_lifecycle_notes")
          .delete()
          .eq("agent_id", agentRow.id);
        if (alnErr) {
          console.error("agent_lifecycle_notes cleanup error:", alnErr);
          warnings.push(`agent_lifecycle_notes: ${alnErr.message}`);
        }

        // Delete analytics_events
        const { error: aeErr } = await supabase
          .from("analytics_events")
          .delete()
          .eq("agent_id", agentRow.id);
        if (aeErr) {
          console.error("analytics_events cleanup error:", aeErr);
          warnings.push(`analytics_events: ${aeErr.message}`);
        }
      }

      // Also clean audit_log by user_id (covers non-agent entries)
      const { error: auditUserErr } = await supabase
        .from("audit_log")
        .delete()
        .eq("user_id", user_id);
      if (auditUserErr) {
        console.error("audit_log user cleanup error:", auditUserErr);
        warnings.push(`audit_log_user: ${auditUserErr.message}`);
      }

      const { error: rpcError } = await supabase.rpc("delete_user_cascade", {
        p_user_id: user_id,
      });

      if (rpcError) {
        console.error("delete_user_cascade error:", rpcError);
        return new Response(
          JSON.stringify({ error: "User deletion failed. No data was deleted. Please try again.", details: rpcError.message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user_id);
      if (deleteAuthError) {
        console.error("delete auth user error:", deleteAuthError);
        return new Response(
          JSON.stringify({ error: "Data deleted but auth account removal failed. Contact support." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Audit log
      await supabase.from("audit_log").insert({
        user_id: caller.id,
        action_type: "admin_delete_user",
        entity_type: "user",
        entity_id: user_id,
        description: "Admin deleted user",
        metadata: { performed_by: caller.email },
      }).catch(e => console.error("audit log:", e));

      return new Response(JSON.stringify({ success: true, warnings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      const { email } = await req.json();
      const { error } = await anonClient.auth.resetPasswordForEmail(email, {
        redirectTo: (Deno.env.get("SITE_URL") || "https://listhq.lovable.app") + "/reset-password",
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
      const table = getParam("table", "profiles")!;
      const limit = parseInt(getParam("limit", "50")!);
      const offset = parseInt(getParam("offset", "0")!);
      const allowedTables = ['profiles', 'properties', 'agents', 'leads', 'voice_searches', 'saved_properties', 'user_roles', 'lead_events', 'user_preferences'];
      if (!allowedTables.includes(table)) {
        return new Response(JSON.stringify({ error: "Table not allowed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fix #13: Select specific columns instead of * to limit data exposure
      const columnMap: Record<string, string> = {
        profiles: 'user_id, display_name, full_name, avatar_url, provider, onboarded, created_at',
        properties: 'id, title, suburb, state, status, is_active, agent_id, created_at',
        agents: 'id, name, email, agency, is_approved, is_subscribed, lifecycle_stage, created_at',
        leads: 'id, name, email, property_id, created_at',
        voice_searches: 'id, user_id, transcript, created_at',
        saved_properties: 'id, user_id, property_id, created_at',
        user_roles: 'id, user_id, role',
        lead_events: 'id, property_id, agent_id, event_type, created_at',
        user_preferences: 'user_id, budget_max, preferred_locations, created_at',
      };
      const columns = columnMap[table] || 'id, created_at';

      const { data, count, error } = await supabase
        .from(table)
        .select(columns, { count: 'exact' })
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

    if (action === "extend_grace") {
      const { user_id, grace_until } = await req.json();
      const { data: agent, error: findErr } = await supabase
        .from("agents")
        .select("id, subscription_status")
        .eq("user_id", user_id)
        .maybeSingle();
      if (findErr || !agent) {
        return new Response(JSON.stringify({ error: "Agent not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const updates: Record<string, any> = { admin_grace_until: grace_until, updated_at: new Date().toISOString() };
      if (agent.subscription_status === "locked") {
        updates.subscription_status = "payment_failed";
      }
      const { error } = await supabase.from("agents").update(updates).eq("id", agent.id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "mark_active") {
      const { user_id } = await req.json();
      const { data: agent, error: findErr } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();
      if (findErr || !agent) {
        return new Response(JSON.stringify({ error: "Agent not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("agents").update({
        subscription_status: "active",
        payment_failed_at: null,
        admin_grace_until: null,
        updated_at: new Date().toISOString(),
      }).eq("id", agent.id);
      if (error) throw error;
      // Reactivate listings
      await supabase.from("properties").update({ is_active: true }).eq("agent_id", agent.id);

      // Audit log
      await supabase.from("audit_log").insert({
        user_id: caller.id,
        action_type: "admin_unban_user",
        entity_type: "user",
        entity_id: user_id,
        description: "Admin unbanned user",
        metadata: { performed_by: caller.email },
      }).catch(e => console.error("audit log:", e));

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-users unhandled error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
