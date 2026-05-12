// CSP Violation Reporting Endpoint
// Browsers POST violation reports here cross-origin. No CORS allow-list required;
// reports are fire-and-forget and contain no user-supplied secrets.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("", { status: 405 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response("", { status: 400 });
  }

  const report = body["csp-report"] || body;

  try {
    await supabase.from("csp_violations").insert({
      document_uri: report["document-uri"] ?? null,
      blocked_uri: report["blocked-uri"] ?? null,
      violated_directive: report["violated-directive"] ?? null,
      effective_directive: report["effective-directive"] ?? null,
      source_file: report["source-file"] ?? null,
      line_number: report["line-number"] ?? null,
      column_number: report["column-number"] ?? null,
      user_agent: req.headers.get("user-agent"),
      raw_report: report,
    });
  } catch (e) {
    console.error("csp-report insert failed", e);
  }

  return new Response("", {
    status: 204,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
});
