import "../_shared/email-footer.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TIMEFRAME_LABELS: Record<string, string> = {
  ready_now: 'Ready now',
  '3_to_6_months': '3 to 6 months',
  '6_to_12_months': '6 to 12 months',
  exploring: 'Just exploring',
};

const fmtAUD = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('en-AU');

const formatBudget = (min: number | null | undefined, max: number | null | undefined) => {
  const hasMin = min != null && Number(min) > 0;
  const hasMax = max != null && Number(max) > 0;
  if (hasMin && hasMax) return `AUD $${Number(min).toLocaleString('en-AU')} – $${Number(max).toLocaleString('en-AU')}`;
  if (hasMax) return `Up to AUD $${Number(max).toLocaleString('en-AU')}`;
  if (hasMin) return `From AUD $${Number(min).toLocaleString('en-AU')}`;
  return 'Budget not specified';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { id, seeker_id } = await req.json();
    if (!id || !seeker_id) {
      return new Response(JSON.stringify({ error: 'Missing id or seeker_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Load halo
    const { data: halo, error: haloErr } = await admin
      .from('halos')
      .select('*')
      .eq('id', id)
      .eq('seeker_id', seeker_id)
      .maybeSingle();
    if (haloErr || !halo) {
      return new Response(JSON.stringify({ error: 'Halo not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user email
    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(seeker_id);
    if (userErr || !userData?.user?.email) {
      return new Response(JSON.stringify({ error: 'User email not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const recipientEmail = userData.user.email;

    if (!resendKey) {
      console.warn('RESEND_API_KEY not set — skipping email send');
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const intentLabel = halo.intent === 'buy' ? 'Buy' : 'Rent';
    const suburbsLabel = (halo.suburbs ?? []).join(', ') || '—';
    const budgetLabel = formatBudget(halo.budget_min, halo.budget_max);
    const propertyLabel = (halo.property_types ?? []).join(', ') || '—';
    const timeframeLabel = TIMEFRAME_LABELS[halo.timeframe] ?? halo.timeframe;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
        <h1 style="font-size: 22px; margin: 0 0 12px;">Your Halo is live</h1>
        <p style="font-size: 15px; line-height: 1.5;">Great news — your Halo is live on ListHQ.</p>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px;"><strong>Intent:</strong> ${intentLabel}</p>
          <p style="margin: 0 0 8px;"><strong>Suburbs:</strong> ${suburbsLabel}</p>
          <p style="margin: 0 0 8px;"><strong>Budget:</strong> ${budgetLabel}</p>
          <p style="margin: 0 0 8px;"><strong>Property types:</strong> ${propertyLabel}</p>
          <p style="margin: 0;"><strong>Timeframe:</strong> ${timeframeLabel}</p>
        </div>
        <p style="font-size: 15px; line-height: 1.5;">
          Agents who have properties matching your requirements will contact you directly.
        </p>
        <p style="margin: 24px 0;">
          <a href="https://globalhomes.lovable.app/dashboard/my-halos"
             style="display: inline-block; background: #3b82f6; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Manage my Halo →
          </a>
        </p>
        <p style="font-size: 12px; color: #64748b; margin-top: 32px;">— The ListHQ team</p>
      </div>
    `;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // NOTE: Falls back to onboarding@resend.dev until listhq.com.au DNS is verified in Resend.
        from: 'ListHQ <noreply@listhq.com.au>',
        to: [recipientEmail],
        subject: 'Your Halo is live — agents can now find you',
        html,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('Resend error:', text);
      return new Response(JSON.stringify({ error: 'Email send failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});