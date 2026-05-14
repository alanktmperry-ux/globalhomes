import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { brandShell, BRAND } from '../_shared/email-brand.ts';

const ROLE_TITLES: Record<string, string> = {
  'founding-engineer': 'Founding Engineer',
  'founding-designer': 'Founding Designer',
  'head-of-growth': 'Head of Growth',
  'agency-sales-lead': 'Agency Sales Lead (BDM)',
  'customer-success-lead': 'Customer Success Lead',
  'general': 'General — exceptional people welcome',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!),
  );
}

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);

  try {
    const body = await req.json().catch(() => null) as { application_id?: string } | null;
    const application_id = body?.application_id;
    if (!application_id || typeof application_id !== 'string') {
      return jsonResponse({ error: 'application_id required' }, 400, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: app, error } = await supabase
      .from('careers_applications')
      .select('email, full_name, role_applied')
      .eq('id', application_id)
      .maybeSingle();

    if (error || !app) {
      console.error('[send-careers-confirmation] fetch failed', error);
      return jsonResponse({ error: 'Application not found' }, 404, corsHeaders);
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('[send-careers-confirmation] RESEND_API_KEY missing');
      return jsonResponse({ error: 'Email not configured' }, 500, corsHeaders);
    }

    const roleTitle = ROLE_TITLES[app.role_applied] || app.role_applied;
    const firstName = (app.full_name || '').split(' ')[0] || 'there';

    const inner = `
      <h1 style="font-size:22px;font-weight:600;color:${BRAND.navy};margin:0 0 16px;">Thanks for your application</h1>
      <p style="font-size:14px;line-height:1.6;color:${BRAND.text};margin:0 0 14px;">
        Hi ${escapeHtml(firstName)}, thanks for applying to the <strong>${escapeHtml(roleTitle)}</strong> role at ListHQ.
      </p>
      <p style="font-size:14px;line-height:1.6;color:${BRAND.text};margin:0 0 14px;">
        We read every application personally. If your background looks like a fit, we'll be in touch within 5 business days to set up an intro call.
      </p>
      <p style="font-size:14px;line-height:1.6;color:${BRAND.text};margin:0 0 24px;">
        While you wait — Australia is the most multicultural property market in the world, and the most monolingual portals serve it. That's what ListHQ is changing. More on the mission at <a href="https://listhq.com.au" style="color:${BRAND.tealDark};">https://listhq.com.au</a>
      </p>
      <p style="font-size:14px;line-height:1.6;color:${BRAND.text};margin:0;">
        Alan Perry — Founder, ListHQ
      </p>
    `;

    const text = `Hi ${firstName},

Thanks for applying to the ${roleTitle} role at ListHQ.

We read every application personally. If your background looks like a fit, we'll be in touch within 5 business days to set up an intro call.

While you wait — Australia is the most multicultural property market in the world, and the most monolingual portals serve it. That's what ListHQ is changing. More on the mission at https://listhq.com.au

Alan Perry — Founder, ListHQ`;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'ListHQ Careers <careers@listhq.com.au>',
        to: [app.email],
        subject: `Thanks for applying to ListHQ — ${roleTitle}`,
        text,
        html: brandShell(inner, 'Careers'),
      }),
    });

    if (!r.ok) {
      const errBody = await r.text();
      console.error('[send-careers-confirmation] resend failed', r.status, errBody);
      return jsonResponse({ error: `Resend error: ${r.status}` }, 500, corsHeaders);
    }

    return jsonResponse({ sent: true }, 200, corsHeaders);
  } catch (e) {
    console.error('[send-careers-confirmation] unexpected error:', e);
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500, corsHeaders);
  }
});
