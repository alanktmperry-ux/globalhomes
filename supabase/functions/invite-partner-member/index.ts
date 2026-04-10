import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { email, partnerName } = await req.json();
    if (!email) throw new Error("Missing email");

    // Check caller is an owner in partner_members
    const { data: membership } = await supabaseAdmin
      .from("partner_members")
      .select("partner_id, role")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .maybeSingle();

    if (!membership) throw new Error("You must be a partner owner to invite team members.");

    const partnerId = membership.partner_id;

    // Get partner company name if not provided
    let companyName = partnerName;
    if (!companyName) {
      const { data: partner } = await supabaseAdmin
        .from("partners")
        .select("company_name")
        .eq("id", partnerId)
        .single();
      companyName = partner?.company_name || "your company";
    }

    // Fix #6/#14: Use getUserByEmail instead of full-table scan
    const { data: existingUserData } = await supabaseAdmin.auth.admin.getUserByEmail(email.toLowerCase());
    const existingUser = existingUserData?.user || null;

    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    if (existingUser) {
      // Check not already a member
      const { data: existing } = await supabaseAdmin
        .from("partner_members")
        .select("id")
        .eq("partner_id", partnerId)
        .eq("user_id", existingUser.id)
        .maybeSingle();

      if (existing) throw new Error("This user is already a team member.");

      // Direct add
      const { error: insertErr } = await supabaseAdmin
        .from("partner_members")
        .insert({
          partner_id: partnerId,
          user_id: existingUser.id,
          role: "member",
          invited_by: user.id,
          joined_at: new Date().toISOString(),
        });
      if (insertErr) throw insertErr;

      // Add partner role
      await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: existingUser.id, role: "partner" },
          { onConflict: "user_id,role" }
        );
    } else {
      // Pending invite — user_id is null
      const { error: insertErr } = await supabaseAdmin
        .from("partner_members")
        .insert({
          partner_id: partnerId,
          user_id: null,
          role: "member",
          invited_by: user.id,
          invite_token: inviteToken,
          invite_expires_at: expiresAt,
        });
      if (insertErr) throw insertErr;
    }

    // Send invitation email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const emailFrom = Deno.env.get("EMAIL_FROM") || "ListHQ <noreply@listhq.com.au>";
    const joinUrl = existingUser
      ? `${req.headers.get("origin") || "https://globalhomes.lovable.app"}/partner/dashboard`
      : `${req.headers.get("origin") || "https://globalhomes.lovable.app"}/partner/join?token=${inviteToken}`;

    if (resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: emailFrom,
            to: [email],
            subject: `You've been invited to join ${companyName} on ListHQ`,
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;">
                <div style="margin-bottom:32px;">
                  <div style="display:inline-flex;align-items:center;gap:8px;">
                    <div style="width:32px;height:32px;border-radius:8px;background:#6366f1;display:flex;align-items:center;justify-content:center;">
                      <span style="color:#fff;font-size:10px;font-weight:800;">LHQ</span>
                    </div>
                    <span style="font-weight:700;font-size:14px;color:#111;">ListHQ</span>
                  </div>
                </div>
                <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 12px;">You've been invited</h1>
                <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">
                  <strong style="color:#111;">${companyName}</strong> has invited you to join their team on ListHQ's Partner Portal for trust accounting management.
                </p>
                <a href="${joinUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:999px;font-size:14px;font-weight:600;text-decoration:none;">
                  ${existingUser ? "Go to portal →" : "Accept invitation →"}
                </a>
                <p style="color:#999;font-size:12px;margin-top:32px;">
                  ${existingUser ? "" : "This invitation expires in 7 days."}
                </p>
              </div>
            `,
          }),
        });
      } catch (_) {
        // Don't fail if email fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, alreadyUser: !!existingUser }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
