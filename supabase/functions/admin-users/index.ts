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
      const { error } = await supabase.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      const { email } = await req.json();
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: "https://world-property-pulse.lovable.app/reset-password" },
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: `Recovery link generated for ${email}` }), {
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
