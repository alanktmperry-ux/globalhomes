import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { token, password, name, email: providedEmail } = await req.json();
    if (!token) throw new Error("Missing invite token");

    // Find the invite
    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from("partner_members")
      .select("id, partner_id, user_id, invite_expires_at, role")
      .eq("invite_token", token)
      .maybeSingle();

    if (inviteErr || !invite) throw new Error("Invalid or expired invitation.");

    if (invite.invite_expires_at && new Date(invite.invite_expires_at) < new Date()) {
      throw new Error("This invitation has expired. Ask the team owner to send a new one.");
    }

    // Check if calling user is already authenticated
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (user) userId = user.id;
    }

    if (!userId) {
      // New user — create account
      if (!password || !name) {
        throw new Error("Password and name are required for new accounts.");
      }

      // We need to find the email — it's not stored on the invite row
      // The invite was sent to a specific email, but we need it from the request
      if (!providedEmail) throw new Error("Email is required for new accounts.");

      const { data: newUser, error: signUpErr } = await supabaseAdmin.auth.admin.createUser({
        email: providedEmail,
        password,
        email_confirm: true,
        user_metadata: { display_name: name },
      });

      if (signUpErr) throw signUpErr;
      if (!newUser?.user) throw new Error("Failed to create account.");
      userId = newUser.user.id;
    }

    // Update the partner_members row
    const { error: updateErr } = await supabaseAdmin
      .from("partner_members")
      .update({
        user_id: userId,
        joined_at: new Date().toISOString(),
        invite_token: null,
        invite_expires_at: null,
      })
      .eq("id", invite.id);

    if (updateErr) throw updateErr;

    // Add partner role
    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "partner" },
        { onConflict: "user_id,role" }
      );

    return new Response(
      JSON.stringify({ success: true, partnerId: invite.partner_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
