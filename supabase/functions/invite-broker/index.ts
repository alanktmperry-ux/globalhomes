import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth check: caller must be admin ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      name, email, phone, company, aclNumber, languages,
      tagline, calendarUrl, photoUrl, isFoundingPartner,
    } = await req.json();

    if (!name || !email || !aclNumber) {
      return new Response(
        JSON.stringify({ error: "name, email, and aclNumber are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const capExpiresAt = isFoundingPartner
      ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: broker, error: insertError } = await supabase
      .from("brokers")
      .insert({
        name,
        email: email.toLowerCase(),
        phone: phone ?? null,
        company: company ?? null,
        acl_number: aclNumber,
        languages: languages ?? ["English"],
        tagline: tagline ?? null,
        calendar_url: calendarUrl ?? null,
        photo_url: photoUrl ?? null,
        is_founding_partner: isFoundingPartner ?? false,
        monthly_cap_aud: isFoundingPartner ? 500.00 : null,
        cap_expires_at: capExpiresAt,
        lead_fee_aud: 75.00,
        is_active: true,
      })
      .select("id, name, email")
      .single();

    if (insertError) {
      console.error("Failed to insert broker:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send magic link invitation
    const { error: inviteError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email.toLowerCase(),
      options: {
        redirectTo: `${Deno.env.get('SITE_URL') || 'https://listhq.com.au'}/broker/portal`,
      },
    });

    if (inviteError) {
      console.error("Failed to send magic link:", inviteError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        brokerId: broker.id,
        message: `Broker ${broker.name} created and invitation sent to ${broker.email}.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("invite-broker error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
