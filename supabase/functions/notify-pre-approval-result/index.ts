import "../_shared/email-footer.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { approval_id } = await req.json();
    if (!approval_id) {
      return new Response(JSON.stringify({ error: "approval_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: approval } = await supabase
      .from("buyer_pre_approvals")
      .select("status, rejection_reason, lender_name, approved_amount, user_id")
      .eq("id", approval_id)
      .single();

    if (!approval) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", approval.user_id)
      .single();

    // Get email from auth.users
    const { data: authUser } = await supabase.auth.admin.getUserById(approval.user_id);
    const email = authUser?.user?.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "No email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isVerified = approval.status === "verified";
    const name = profile?.full_name?.split(" ")[0] ?? "there";
    const amount = approval.approved_amount
      ? `$${Number(approval.approved_amount).toLocaleString()}`
      : null;

    const subject = isVerified
      ? "✓ Your pre-approval has been verified — ListHQ"
      : "Action needed: Pre-approval document — ListHQ";

    const html = isVerified
      ? `<h2>Great news, ${name}!</h2>
         <p>Your pre-approval letter from ${approval.lender_name ?? "your lender"} has been verified.</p>
         ${amount ? `<p><strong>Approved amount: ${amount}</strong></p>` : ""}
         <p>Your Pre-Approved ✓ badge is now live on your ListHQ profile and visible to agents you message.</p>`
      : `<h2>Hi ${name},</h2>
         <p>Unfortunately we couldn't verify your pre-approval document.</p>
         ${approval.rejection_reason ? `<p><em>Reason: ${approval.rejection_reason}</em></p>` : ""}
         <p>Please resubmit with a clear, legible copy of your current pre-approval letter.</p>`;

    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "ListHQ <noreply@listhq.com.au>";

    if (RESEND_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: EMAIL_FROM, to: email, subject, html }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});