import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some((r: { role: string }) =>
      ["super_admin", "admin", "support"].includes(r.role)
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checks: { name: string; status: "healthy" | "degraded" | "down"; latency_ms?: number; detail?: string }[] = [];

    const dbStart = Date.now();
    const { error: dbErr } = await supabase.from("profiles").select("id").limit(1);
    checks.push({
      name: "database",
      status: dbErr ? "down" : "healthy",
      latency_ms: Date.now() - dbStart,
      detail: dbErr?.message,
    });

    const authStart = Date.now();
    const { error: authErr } = await supabase.auth.getUser();
    checks.push({
      name: "auth",
      status: authErr ? "down" : "healthy",
      latency_ms: Date.now() - authStart,
      detail: authErr?.message,
    });

    const overall = checks.every((c) => c.status === "healthy")
      ? "healthy"
      : checks.some((c) => c.status === "down")
        ? "down"
        : "degraded";

    return new Response(
      JSON.stringify({
        status: overall,
        overall,
        services: checks.map((c) => ({ name: c.name, service: c.name, status: c.status, latency_ms: c.latency_ms, detail: c.detail })),
        checks,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[admin-health-check] error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
