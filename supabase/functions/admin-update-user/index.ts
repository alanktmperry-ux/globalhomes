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
    if (userError || !caller) return respond({ error: "Unauthorized" }, 401);

    // Admin check via user_roles (project convention — roles live in dedicated table)
    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleCheck) return respond({ error: "Forbidden — admin role required" }, 403);

    const body = await req.json().catch(() => ({}));
    const { user_id, email, password } = body as {
      user_id?: string;
      email?: string;
      password?: string;
    };

    if (!user_id) return respond({ error: "Missing user_id" }, 400);
    if (!email && !password) {
      return respond({ error: "Provide email and/or password to update" }, 400);
    }

    const updates: { email?: string; password?: string } = {};
    if (email && typeof email === "string") {
      const trimmed = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return respond({ error: "Invalid email format" }, 400);
      }
      updates.email = trimmed;
    }
    if (password && typeof password === "string") {
      if (password.length < 8) {
        return respond({ error: "Password must be at least 8 characters" }, 400);
      }
      updates.password = password;
    }

    const { data, error } = await supabase.auth.admin.updateUserById(user_id, updates);
    if (error) return respond({ error: error.message }, 400);

    return respond({ ok: true, user: { id: data.user?.id, email: data.user?.email } });
  } catch (err) {
    return respond({ error: (err as Error).message || "Unexpected error" }, 500);
  }
});
