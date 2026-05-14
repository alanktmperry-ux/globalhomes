import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const ALLOWED_TYPES = ['export', 'deletion', 'correction', 'consent_withdraw'] as const;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const request_type = String(body.request_type || '');
    const notes = body.notes ? String(body.notes).slice(0, 2000) : null;

    if (!email || !email.includes('@')) return json({ error: 'Valid email required' }, 400);
    if (!ALLOWED_TYPES.includes(request_type as typeof ALLOWED_TYPES[number])) {
      return json({ error: 'Invalid request_type' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Try to match user_id by email
    let user_id: string | null = null;
    try {
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
      const match = list?.users?.find((u) => (u.email || '').toLowerCase() === email);
      if (match) user_id = match.id;
    } catch (_e) { /* non-fatal */ }

    const verification_token = crypto.randomUUID().replace(/-/g, '');

    const { data: inserted, error } = await supabase
      .from('privacy_requests')
      .insert({ email, request_type, notes, user_id, verification_token })
      .select('id')
      .single();
    if (error) return json({ error: error.message }, 500);

    // Confirmation email (best-effort)
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'ListHQ Privacy <privacy@listhq.com.au>',
            to: [email],
            subject: 'We received your privacy request',
            html: `<p>Hi,</p><p>We received your <strong>${request_type}</strong> request and our team will action it within 30 days, as required by the Australian Privacy Act.</p><p>Reference: <code>${inserted.id}</code></p><p>— ListHQ</p>`,
          }),
        });
      } catch (e) {
        console.error('[submit-privacy-request] email failed', e);
      }
    }

    return json({ ok: true, id: inserted.id });
  } catch (e) {
    console.error('[submit-privacy-request] error', e);
    return json({ error: (e as Error).message || 'Internal error' }, 500);
  }
});
