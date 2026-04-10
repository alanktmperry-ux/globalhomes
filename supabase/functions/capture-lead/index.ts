import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

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

    // --- hCaptcha verification (if token provided) ---
    if (hcaptcha_token) {
      const hcaptchaSecret = Deno.env.get("HCAPTCHA_SECRET_KEY");
      if (hcaptchaSecret) {
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
