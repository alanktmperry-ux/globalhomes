import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { translateEmailPayload, resolveRecipientLocale } from '../_shared/translateEmailPayload.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { response_id } = await req.json();
    if (!response_id) {
      return new Response(JSON.stringify({ error: 'Missing response_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is the seeker on this Halo
    const { data: resp } = await admin
      .from('halo_responses')
      .select('id, halo_id, agent_id, accepted')
      .eq('id', response_id)
      .maybeSingle();
    if (!resp) {
      return new Response(JSON.stringify({ error: 'Response not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: halo } = await admin
      .from('halos')
      .select('id, seeker_id, suburbs, intent')
      .eq('id', resp.halo_id)
      .maybeSingle();
    if (!halo || halo.seeker_id !== userRes.user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: agentUser } = await admin.auth.admin.getUserById(resp.agent_id);
    const recipientEmail = agentUser?.user?.email;
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: 'Agent email not found' }), {
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

    const suburb = (halo.suburbs ?? [])[0] ?? 'their area';
    const subject = 'A seeker accepted your Halo pitch';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
        <h1 style="font-size: 22px; margin: 0 0 12px;">A seeker accepted your pitch 🎉</h1>
        <p style="font-size: 15px; line-height: 1.5;">
          Great news — a seeker just accepted your response on ListHQ.
          Their contact details are now visible on the Halo page, and you can keep the conversation going from your dashboard.
        </p>
        <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;"><strong>Halo:</strong> ${halo.intent === 'buy' ? 'Buy' : 'Rent'} · ${suburb}</p>
        </div>
        <p style="margin:24px 0;">
          <a href="https://listhq.com.au/dashboard/halo-board/${halo.id}"
             style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
            Open the conversation →
          </a>
        </p>
        <p style="font-size:12px;color:#64748b;margin-top:32px;">— The ListHQ team</p>
      </div>
    `;

    const recipientLocale = await resolveRecipientLocale({ userId: resp.agent_id, email: recipientEmail });
    let translated;
    try {
      translated = await translateEmailPayload(
        { subject, body: html, isHtml: true, sourceLang: 'en' },
        recipientLocale,
      );
    } catch (err) {
      console.error('[send-halo-accept-notification] translation failed, sending original', err);
      translated = { subject, body: html, wasTranslated: false, sourceLang: 'en', targetLang: recipientLocale, cached: false };
    }

    const sendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ListHQ <hello@listhq.com.au>',
        to: [recipientEmail],
        subject: translated.subject,
        html: translated.body,
        headers: {
          'X-ListHQ-Locale': translated.targetLang,
          'X-ListHQ-Translated': translated.wasTranslated ? 'true' : 'false',
        },
      }),
    });

    if (!sendResp.ok) {
      const text = await sendResp.text();
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
