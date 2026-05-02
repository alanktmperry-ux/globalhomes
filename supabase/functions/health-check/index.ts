import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requiredEnvVars = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADMIN_EMAIL",
    "RESEND_API_KEY",
  ];

  const optionalEnvVars = [
    "STRIPE_SECRET_KEY",
    "FIRECRAWL_API_KEY",
    "GOOGLE_MAPS_API_KEY",
    "LOVABLE_API_KEY",
    "MANUS_API_KEY",
  ];

  const missing = requiredEnvVars.filter((v) => !Deno.env.get(v));
  const missingOptional = optionalEnvVars.filter((v) => !Deno.env.get(v));

  // Test database connectivity
  let dbStatus = "ok";
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await supabase.from("properties").select("id").limit(1);
    if (error) dbStatus = `error: ${error.message}`;
  } catch (e) {
    dbStatus = `error: ${(e as Error).message}`;
  }

  const status = missing.length > 0 ? "error" : "ok";
  const statusCode = missing.length > 0 ? 500 : 200;

  // Do NOT expose secret/key names publicly. Only report counts.
  return new Response(
    JSON.stringify({
      status,
      database: dbStatus,
      timestamp: new Date().toISOString(),
      missing_required_count: missing.length,
      missing_optional_count: missingOptional.length,
    }),
    {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
