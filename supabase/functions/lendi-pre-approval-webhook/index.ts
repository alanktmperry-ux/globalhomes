import { getCorsHeaders } from "../_shared/cors.ts";
// STUB — For future Lendi API integration
// When Lendi completes a soft assessment, they POST to this endpoint
// with approval status and amount. We auto-verify without document upload.

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // TODO: Verify Lendi webhook signature
  // const signature = req.headers.get('X-Lendi-Signature');

  // Expected body: { user_id, approved_amount, expiry_date, lender_name, status }

  // TODO: Auto-insert and auto-verify a buyer_pre_approvals record
  // TODO: Skip document upload flow for broker-API-verified buyers
  // TODO: Show "Verified by Lendi" label instead of "Verified by ListHQ"

  return new Response(JSON.stringify({ error: "Not implemented" }), {
    status: 501,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
