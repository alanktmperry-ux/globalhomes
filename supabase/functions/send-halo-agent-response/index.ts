import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const fmtAUD = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('en-AU');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { halo_id } = await req.json();
    if (!halo_id) {
      return new Response(JSON.stringify({ error: 'Missing halo_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: halo } = await admin
      .from('halos')
      .select('*')
      .eq('id', halo_id)
      .maybeSingle();
    if (!halo) {
      return new Response(JSON.stringify({ error: 'Halo not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: userData } = await admin.auth.admin.getUserById(halo.seeker_id);
    const recipientEmail = userData?.user?.email;
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: 'Seeker email not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!resendKey) {
      console.warn('RESEND_API_KEY not set — skipping email send');
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const intentLabel = halo.intent === 'buy' ? 'Buy' : 'Rent';
    const suburbsLabel = (halo.suburbs ?? []).join(', ') || '—';
    const budgetLabel = `AUD $${fmtAUD(halo.budget_min)} – $${fmtAUD(halo.budget_max)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
        <h1 style="font-size: 22px; margin: 0 0 12px;">An agent is interested in your Halo</h1>
        <p style="font-size: 15px; line-height: 1.5;">
          Good news — an agent has responded to your Halo on ListHQ. They'll be reaching out to you directly.
        </p>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0;"><strong>What you're looking for:</strong></p>
          <p style="margin: 8px 0 0;">${intentLabel} · ${suburbsLabel} · ${budgetLabel}</p>
        </div>
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
        from: 'ListHQ <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: 'An agent is interested in your Halo',
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
