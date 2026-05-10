import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import "../_shared/email-footer.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      companyName,
      contactName,
      contactEmail,
      contactPhone,
      abn,
      website,
      partner_type: partnerTypeRaw,
      userId: bodyUserId,
    } = body;

    if (!companyName || !contactName || !contactEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve user: prefer Authorization header session, fall back to body.userId verified via admin
    let user: { id: string; email?: string } | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user: sessionUser } } = await supabaseUser.auth.getUser();
      if (sessionUser) user = { id: sessionUser.id, email: sessionUser.email ?? undefined };
    }
    if (!user && bodyUserId) {
      const { data: adminUserData } = await supabaseAdmin.auth.admin.getUserById(bodyUserId);
      if (adminUserData?.user) {
        // Cross-check: email in body must match the user record
        if ((adminUserData.user.email ?? "").toLowerCase() !== String(contactEmail).toLowerCase()) {
          return new Response(
            JSON.stringify({ error: "Email does not match user record" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        user = { id: adminUserData.user.id, email: adminUserData.user.email ?? undefined };
      }
    }
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedTypes = ["trust_accountant", "mortgage_broker"] as const;
    const partnerType = allowedTypes.includes(partnerTypeRaw)
      ? partnerTypeRaw
      : "trust_accountant";

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
        partner_type: partnerType,
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

    // Partner welcome email is sent by send-welcome-email (Touch 2 'verified')
    // after the user verifies their email — includes proper unsubscribe footer.

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

