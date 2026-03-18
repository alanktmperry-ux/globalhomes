import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
      return new Response(JSON.stringify({
        users: data.users.map((u: any) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          email_confirmed_at: u.email_confirmed_at,
          banned_until: u.banned_until,
          display_name: u.user_metadata?.display_name || u.user_metadata?.full_name || u.email,
          provider: u.app_metadata?.provider || 'email',
        })),
        total: data.total,
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

    if (action === "delete_user") {
      const { user_id } = await req.json();

      // Cascade delete all user data before removing auth account
      // 1. Get agent id(s) for this user
      const { data: agentRows } = await supabase
        .from("agents")
        .select("id, agency_id")
        .eq("user_id", user_id);

      const agentIds = (agentRows || []).map((a: any) => a.id);
      const agencyIds = (agentRows || []).filter((a: any) => a.agency_id).map((a: any) => a.agency_id);

      if (agentIds.length > 0) {
        // Delete data referencing agent ids
        await supabase.from("notifications").delete().in("agent_id", agentIds);
        await supabase.from("lead_events").delete().in("agent_id", agentIds);
        await supabase.from("leads").delete().in("agent_id", agentIds);
        await supabase.from("agent_subscriptions").delete().in("agent_id", agentIds);
        await supabase.from("agent_credentials").delete().in("agent_id", agentIds);
        await supabase.from("agent_locations").delete().in("agent_id", agentIds);
        await supabase.from("off_market_shares").delete().in("sharing_agent_id", agentIds);
        await supabase.from("off_market_shares").delete().in("shared_with_agent_id", agentIds);
        await supabase.from("contacts").delete().in("assigned_agent_id", agentIds);
        await supabase.from("rental_applications").delete().in("agent_id", agentIds);

        // Delete properties owned by this agent (and their dependents)
        const { data: propRows } = await supabase
          .from("properties")
          .select("id")
          .in("agent_id", agentIds);
        const propIds = (propRows || []).map((p: any) => p.id);

        if (propIds.length > 0) {
          await supabase.from("listing_documents").delete().in("property_id", propIds);
          await supabase.from("saved_properties").delete().in("property_id", propIds);
          await supabase.from("lead_events").delete().in("property_id", propIds);
          await supabase.from("leads").delete().in("property_id", propIds);
          await supabase.from("notifications").delete().in("property_id", propIds);
          await supabase.from("collab_reactions").delete().in("property_id", propIds);
          await supabase.from("collab_views").delete().in("property_id", propIds);
          await supabase.from("off_market_shares").delete().in("property_id", propIds);
          await supabase.from("rental_applications").delete().in("property_id", propIds);
          await supabase.from("properties").delete().in("id", propIds);
        }

        // Delete the agent records themselves
        await supabase.from("agents").delete().in("id", agentIds);
      }

      // 2. Delete agency-related data where user is owner
      const { data: ownedAgencies } = await supabase
        .from("agencies")
        .select("id")
        .eq("owner_user_id", user_id);
      const ownedAgencyIds = (ownedAgencies || []).map((a: any) => a.id);

      if (ownedAgencyIds.length > 0) {
        await supabase.from("agency_invite_codes").delete().in("agency_id", ownedAgencyIds);
        await supabase.from("agency_members").delete().in("agency_id", ownedAgencyIds);
        await supabase.from("activities").delete().in("office_id", ownedAgencyIds);
        await supabase.from("contacts").delete().in("agency_id", ownedAgencyIds);
        await supabase.from("agencies").delete().in("id", ownedAgencyIds);
      }

      // 3. Delete user-level data
      await supabase.from("agency_members").delete().eq("user_id", user_id);
      await supabase.from("saved_properties").delete().eq("user_id", user_id);
      await supabase.from("saved_search_alerts").delete().eq("user_id", user_id);
      await supabase.from("buyer_profiles").delete().eq("user_id", user_id);
      await supabase.from("collab_reactions").delete().eq("user_id", user_id);
      await supabase.from("collab_views").delete().eq("user_id", user_id);
      await supabase.from("contact_activities").delete().eq("user_id", user_id);
      await supabase.from("contacts").delete().eq("created_by", user_id);
      await supabase.from("activities").delete().eq("user_id", user_id);
      await supabase.from("user_roles").delete().eq("user_id", user_id);
      await supabase.from("profiles").delete().eq("user_id", user_id);

      // Delete conversations where user is participant
      await supabase.from("messages").delete().in("conversation_id",
        (await supabase.from("conversations").select("id").or(`participant_1.eq.${user_id},participant_2.eq.${user_id}`)).data?.map((c: any) => c.id) || []
      );
      await supabase.from("conversations").delete().or(`participant_1.eq.${user_id},participant_2.eq.${user_id}`);

      // 4. Finally delete the auth user
      const { error } = await supabase.auth.admin.deleteUser(user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      const { email } = await req.json();
      // Use anon client to trigger the standard recovery email flow
      const { error } = await anonClient.auth.resetPasswordForEmail(email, {
        redirectTo: "https://world-property-pulse.lovable.app/reset-password",
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
