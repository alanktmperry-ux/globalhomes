import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { translateEmail } from "../_shared/translateEmail.ts";

function calculateLeadScore({
  urgency,
  preApprovalStatus,
  message,
}: {
  urgency?: string;
  preApprovalStatus?: string;
  message?: string;
}): number {
  let score = 50;
  if (urgency === "immediate") score += 30;
  else if (urgency === "this_week") score += 20;
  else if (urgency === "this_month") score += 10;
  if (preApprovalStatus === "approved") score += 20;
  if (message && message.length > 100) score += 10;
  return Math.min(score, 100);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      propertyId,
      agentId,
      userEmail,
      userPhone,
      userName,
      message,
      searchContext,
      preferredContact,
      urgency,
      preApprovalStatus,
      hcaptcha_token,
    } = await req.json();

    // --- hCaptcha verification (required when HCAPTCHA_SECRET_KEY is configured) ---
    const hcaptchaSecret = Deno.env.get("HCAPTCHA_SECRET_KEY");
    if (hcaptchaSecret) {
      if (!hcaptcha_token) {
        return new Response(
          JSON.stringify({ error: "Captcha required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const verifyResp = await fetch("https://hcaptcha.com/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${encodeURIComponent(hcaptchaSecret)}&response=${encodeURIComponent(hcaptcha_token)}`,
      });
      const verifyResult = await verifyResp.json();
      if (verifyResult.success !== true) {
        return new Response(
          JSON.stringify({ error: "CAPTCHA verification failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    // --- End hCaptcha verification ---

    // Validate required fields
    if (!propertyId || !agentId || !userEmail || !userName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: propertyId, agentId, userEmail, userName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const score = calculateLeadScore({ urgency, preApprovalStatus, message });

    const { data: lead, error } = await supabase
      .from("leads")
      .insert([{
        property_id: propertyId,
        agent_id: agentId,
        user_email: userEmail,
        user_phone: userPhone || null,
        user_name: userName,
        message: message || null,
        search_context: searchContext || null,
        preferred_contact: preferredContact || "email",
        urgency: urgency || "just_browsing",
        pre_approval_status: preApprovalStatus || "not_started",
        status: "new",
        score,
      }])
      .select()
      .single();

    if (error) {
      console.error("Lead insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to submit inquiry" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also record in lead_events for the existing analytics system
    await supabase.from("lead_events").insert([{
      property_id: propertyId,
      agent_id: agentId,
      event_type: "lead_captured",
    }]);

    // Mirror into crm_leads so the agent sees this enquiry in their CRM pipeline
    const nameParts = userName.trim().split(' ');
    const firstName = nameParts[0] || userName;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
    const crmPriority =
      urgency === 'immediate' ? 'high' :
      urgency === 'this_week' ? 'medium' : 'low';

    await supabase.from("crm_leads").insert([{
      agent_id: agentId,
      property_id: propertyId,
      first_name: firstName,
      last_name: lastName,
      email: userEmail,
      phone: userPhone || null,
      stage: 'new',
      priority: crmPriority,
      source: 'enquiry_form',
      pre_approved: preApprovalStatus === 'approved',
      notes: message || null,
      tags: [],
    }]);

    // ── Drip: enroll agent in lead follow-up sequence ──────────
    try {
      const { data: leadSeq } = await supabase
        .from('drip_sequences')
        .select('id')
        .eq('trigger_event', 'lead_contact')
        .eq('is_active', true)
        .single();

      if (leadSeq) {
        // Get property address for the template
        const { data: property } = await supabase
          .from('properties')
          .select('address')
          .eq('id', propertyId)
          .single();

        await supabase.from('drip_enrollments').upsert({
          agent_id:    agentId,
          sequence_id: leadSeq.id,
          enrolled_at: new Date().toISOString(),
          next_step_order: 1,
          completed:   false,
          metadata: {
            buyer_name:       userName,
            property_address: property?.address ?? 'your listing',
            property_id:      propertyId,
          },
        }, { onConflict: 'agent_id,sequence_id', ignoreDuplicates: false });
      }
    } catch (dripErr) {
      // Non-fatal — log and continue
      console.warn('Drip enroll failed (non-fatal):', dripErr);
    }
    // ────────────────────────────────────────────────────────────

    // ── Buyer auto-reply confirmation email (non-fatal) ────────
    try {
      const { data: property } = await supabase
        .from('properties')
        .select('address, slug, id')
        .eq('id', propertyId)
        .maybeSingle();

      const { data: agentRow } = await supabase
        .from('agents')
        .select('full_name, first_name, last_name')
        .eq('id', agentId)
        .maybeSingle();

      const agentName =
        (agentRow as any)?.full_name ||
        [(agentRow as any)?.first_name, (agentRow as any)?.last_name].filter(Boolean).join(' ') ||
        'The agent';

      const propAddress = property?.address || 'the property';
      const listingUrl = `https://listhq.com.au/property/${property?.slug || property?.id || propertyId}`;

      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
          <p>Hi ${userName.split(' ')[0]},</p>
          <p>Thanks for your enquiry about <strong>${propAddress}</strong>.</p>
          <p>${agentName} will be in touch with you soon.</p>
          <p>In the meantime, you can view the listing here:<br>
            <a href="${listingUrl}" style="color:#3b82f6;">${propAddress}</a>
          </p>
          <p style="margin-top:24px;">If you'd like to find more properties that match your needs,
            <a href="https://listhq.com.au/halo/create" style="color:#3b82f6;">create a free Halo</a>
            and we'll match you automatically.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <p style="font-size:11px;color:#9ca3af;">
            You're receiving this because you submitted an enquiry on ListHQ.
            This is a one-time confirmation — you won't receive further emails unless you create an account.
          </p>
        </div>
      `;

      // Phase 2: resolve recipient language. Buyers are typically anonymous,
      // but if they have a registered account, honor their saved preference.
      let recipientLanguage = 'en';
      try {
        const { data: usersPage } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
        const matched = (usersPage?.users ?? []).find(u => u.email?.toLowerCase() === userEmail.toLowerCase());
        if (matched) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('language_preference')
            .eq('id', matched.id)
            .maybeSingle();
          if ((profile as any)?.language_preference) recipientLanguage = (profile as any).language_preference;
        }
      } catch { /* default to en */ }

      const translated = await translateEmail({
        subject: `Enquiry received — ${propAddress}`,
        bodyHtml: html,
        targetLanguage: recipientLanguage,
      });

      await supabase.functions.invoke('send-notification-email', {
        body: {
          to: userEmail,
          subject: translated.subject,
          html: translated.bodyHtml,
        },
      });
    } catch (replyErr) {
      console.warn('Buyer auto-reply failed (non-fatal):', replyErr);
    }
    // ────────────────────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        leadId: lead.id,
        estimatedResponse: "Within 2 hours",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Lead capture error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to submit inquiry" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
