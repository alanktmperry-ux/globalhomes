import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const PLATFORM_FROM_EMAIL =
  Deno.env.get("EMAIL_FROM") ?? "ListHQ <noreply@globalhomes.lovable.app>";

interface LeadPayload {
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  buyerMessage?: string;
  propertyId?: string;
  propertyAddress?: string;
  propertyPrice?: string;
  brokerId?: string;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: LeadPayload = await req.json();

    if (!payload.buyerName?.trim() || !payload.buyerEmail?.trim()) {
      return new Response(
        JSON.stringify({ error: "buyerName and buyerEmail are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.buyerEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Resolve broker ──────────────────────────────────────────────────────
    let brokerQuery = supabase
      .from("brokers")
      .select("id, name, email, lead_fee_aud")
      .eq("is_active", true);

    if (payload.brokerId) {
      brokerQuery = brokerQuery.eq("id", payload.brokerId);
    }

    const { data: broker, error: brokerError } = await brokerQuery
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (brokerError || !broker) {
      console.error("No active broker found:", brokerError);
      return new Response(
        JSON.stringify({ error: "No active broker available" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Duplicate check ─────────────────────────────────────────────────────
    let isDuplicate = false;
    if (payload.propertyId) {
      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      const { data: existing } = await supabase
        .from("broker_leads")
        .select("id")
        .eq("buyer_email", payload.buyerEmail.toLowerCase())
        .eq("property_id", payload.propertyId)
        .eq("broker_id", broker.id)
        .gte("created_at", thirtyDaysAgo)
        .maybeSingle();

      isDuplicate = !!existing;
    }

    // ── Persist lead ────────────────────────────────────────────────────────
    const { error: insertError } = await supabase
      .from("broker_leads")
      .insert({
        buyer_name: payload.buyerName.trim(),
        buyer_email: payload.buyerEmail.toLowerCase().trim(),
        buyer_phone: payload.buyerPhone?.trim() ?? null,
        buyer_message: payload.buyerMessage?.trim() ?? null,
        property_id: payload.propertyId ?? null,
        property_address: payload.propertyAddress ?? null,
        property_price: payload.propertyPrice ?? null,
        broker_id: broker.id,
        broker_name: broker.name,
        broker_email: broker.email,
        is_duplicate: isDuplicate,
        is_qualified: !isDuplicate,
      });

    if (insertError) {
      console.error("Failed to insert broker lead:", insertError);
    }

    // ── Send emails for non-duplicate leads ─────────────────────────────────
    if (!isDuplicate) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

      if (resendApiKey && lovableApiKey) {
        const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

        const brokerEmailHtml = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#1e40af;">New Lead — ListHQ</h2>
  <p style="color:#6b7280;font-size:14px;">$${broker.lead_fee_aud} qualified lead · Founding Partner Programme</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Name</td><td style="padding:8px;border:1px solid #e5e7eb;">${payload.buyerName}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Email</td><td style="padding:8px;border:1px solid #e5e7eb;">${payload.buyerEmail}</td></tr>
    ${payload.buyerPhone ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Phone</td><td style="padding:8px;border:1px solid #e5e7eb;">${payload.buyerPhone}</td></tr>` : ""}
    ${payload.propertyAddress ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Property</td><td style="padding:8px;border:1px solid #e5e7eb;">${payload.propertyAddress}${payload.propertyPrice ? ` — ${payload.propertyPrice}` : ""}</td></tr>` : ""}
  </table>
  ${payload.buyerMessage ? `<div style="background:#f9fafb;padding:12px;border-radius:8px;margin:16px 0;"><p style="font-weight:600;margin:0 0 4px;">Message</p><p style="margin:0;">${payload.buyerMessage}</p></div>` : ""}
  <p style="font-size:12px;color:#9ca3af;margin-top:24px;">This lead has been recorded in the ListHQ lead register and will appear on your monthly invoice. Lead fee: $${broker.lead_fee_aud} AUD + GST. View your full lead history at your broker portal.</p>
  <p style="font-size:11px;color:#d1d5db;">ListHQ · globalhomes.lovable.app · ListHQ is a referral platform only and does not provide credit assistance.</p>
</div>`;

        const buyerEmailHtml = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#1e40af;">Your finance enquiry has been received</h2>
  <p>Hi ${payload.buyerName},</p>
  <p>Your enquiry has been sent to ${broker.name}, who will be in touch with you shortly${payload.propertyAddress ? ` regarding ${payload.propertyAddress}` : ""}.</p>
  <p>In the meantime, you can continue browsing properties on <a href="https://globalhomes.lovable.app" style="color:#2563eb;">ListHQ</a>.</p>
  <p style="font-size:12px;color:#9ca3af;margin-top:24px;">ListHQ is a referral platform only and does not provide credit assistance.</p>
</div>`;

        await Promise.allSettled([
          fetch(`${GATEWAY_URL}/emails`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableApiKey}`,
              "X-Connection-Api-Key": resendApiKey,
            },
            body: JSON.stringify({
              from: PLATFORM_FROM_EMAIL,
              to: [broker.email],
              subject: `New lead: ${payload.buyerName}${payload.propertyAddress ? ` — ${payload.propertyAddress}` : ""} · ListHQ`,
              html: brokerEmailHtml,
            }),
          }),
          fetch(`${GATEWAY_URL}/emails`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableApiKey}`,
              "X-Connection-Api-Key": resendApiKey,
            },
            body: JSON.stringify({
              from: PLATFORM_FROM_EMAIL,
              to: [payload.buyerEmail],
              subject: "Your finance enquiry — ListHQ",
              html: buyerEmailHtml,
            }),
          }),
        ]);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        isDuplicate,
        message: isDuplicate
          ? "Enquiry already received for this property."
          : "Lead recorded and broker notified.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-broker-lead error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
