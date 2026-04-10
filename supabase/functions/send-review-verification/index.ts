import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { agent_id, reviewer_email } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch the most recent pending review
    const { data: review } = await supabase
      .from('agent_reviews')
      .select('id, reviewer_name, agent_id')
      .eq('agent_id', agent_id)
      .eq('reviewer_email', reviewer_email)
      .eq('status', 'pending')
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!review) {
      return new Response(JSON.stringify({ error: 'Review not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create verification token
    const { data: tokenRow } = await supabase
      .from('review_verify_tokens')
      .insert({ review_id: review.id })
      .select('token')
      .single();

    // Fetch agent name
    const { data: agent } = await supabase
      .from('agents')
      .select('name, slug')
      .eq('id', agent_id)
      .single();

    const siteUrl = Deno.env.get('SITE_URL') || 'https://listhq.com.au';
    const verifyUrl = `${siteUrl}/verify-review?token=${tokenRow!.token}`;
    const resendKey = Deno.env.get('RESEND_API_KEY');

    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ListHQ Reviews <reviews@listhq.com.au>',
          to: reviewer_email,
          subject: `Please verify your review of ${agent?.name ?? 'your agent'}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
              <h2>Hi ${review.reviewer_name},</h2>
              <p>Thanks for leaving a review on ListHQ. To publish your review, click below:</p>
              <p style="text-align:center;margin:32px 0;">
                <a href="${verifyUrl}" style="background:#000;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">
                  Verify My Review
                </a>
              </p>
              <p style="color:#666;font-size:13px;">This link expires in 48 hours.</p>
            </div>
          `,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
