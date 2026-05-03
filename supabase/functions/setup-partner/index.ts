import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import "../_shared/email-footer.ts";
import {
  brandShell,
  brandButton,
  brandFeatureList,
  BRAND,
} from "../_shared/email-brand.ts";

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

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) throw new Error("Not authenticated");

    const { companyName, contactName, contactEmail, contactPhone, abn, website } = await req.json();

    if (!companyName || !contactName || !contactEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check partner doesn't already exist
    const { data: existing } = await supabaseAdmin
      .from("partners")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Partner account already exists" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create partner record
    const { data: partner, error: partnerErr } = await supabaseAdmin
      .from("partners")
      .insert({
        user_id: user.id,
        company_name: companyName,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone || null,
        abn: abn || null,
        website: website || null,
        is_verified: false,
      })
      .select("id")
      .single();

    if (partnerErr) throw partnerErr;

    // Add owner to partner_members
    const { error: memberError } = await supabaseAdmin
      .from("partner_members")
      .insert({
        partner_id: partner.id,
        user_id: user.id,
        role: "owner",
        joined_at: new Date().toISOString(),
      });

    if (memberError) throw memberError;

    // Add partner role to user_roles
    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: user.id, role: "partner" },
        { onConflict: "user_id,role" }
      );

    // Welcome email to the partner
    try {
      const firstName = (contactName || "").split(" ")[0] || "there";
      const appUrl = Deno.env.get("APP_URL") ?? "https://app.listhq.com.au";
      const html = buildPartnerWelcome({ firstName, companyName, appUrl });
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY") ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("EMAIL_FROM") ?? "ListHQ <hello@listhq.com.au>",
          to: [contactEmail],
          subject: `Welcome to ListHQ, ${firstName} — your partner account is live`,
          html,
        }),
      });
    } catch (_) {
      // Don't fail registration if email fails
    }

    // Send notification email to admin
    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    if (adminEmail) {
      try {
        await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              to: adminEmail,
              subject: `New partner registration — ${companyName}`,
              html: `<h2>A new partner has registered on ListHQ.</h2><p>Company: ${companyName}</p><p>Contact: ${contactName}</p><p>Email: ${contactEmail}</p><p>ABN: ${abn || "Not provided"}</p>`,
            }),
          }
        );
      } catch (_) {
        // Don't fail registration if email fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, partnerId: partner.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildPartnerWelcome(p: { firstName: string; companyName: string; appUrl: string }) {
  const inner = `
    <h1 style="font-size:24px;font-weight:600;color:${BRAND.navy};margin:0 0 12px;">Welcome, ${p.firstName}! 🤝</h1>
    <p style="font-size:14px;line-height:1.6;color:${BRAND.text};margin:0 0 8px;">
      <strong>${p.companyName}</strong> is now registered as a ListHQ partner. Your account is under review — we'll notify you once approved (usually within 24 hours).
    </p>

    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};margin:24px 0 10px;font-weight:600;">
      As a ListHQ partner you'll get
    </div>
    ${brandFeatureList([
      { icon: '📈', label: 'Real-time referral dashboard and earnings tracking' },
      { icon: '🌏', label: "Access to Australia's multicultural buyer network" },
      { icon: '💼', label: 'Dedicated partner support and co-marketing materials' },
      { icon: '💰', label: 'Competitive referral commissions paid monthly' },
    ])}

    ${brandButton(`${p.appUrl}/partner`, 'Go to Partner Portal →')}

    <p style="font-size:12px;color:${BRAND.textMuted};text-align:center;margin:20px 0 0;">
      Questions? Reply to this email — your dedicated partner manager will be in touch.
    </p>
  `;
  return brandShell(inner, 'Partner Portal');
}
