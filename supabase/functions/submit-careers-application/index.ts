import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getCorsHeaders } from '../_shared/cors.ts';

const ALLOWED_ROLES = new Set([
  'founding-engineer',
  'founding-designer',
  'head-of-growth',
  'agency-sales-lead',
  'customer-success-lead',
  'general',
]);

// In-memory rate limit: 5 submissions per IP per hour.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 5;
const ipHits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (ipHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) {
    ipHits.set(ip, arr);
    return true;
  }
  arr.push(now);
  ipHits.set(ip, arr);
  return false;
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

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) {
    return jsonResponse(
      { error: 'Too many applications from this IP — please wait an hour and try again.' },
      429,
      corsHeaders,
    );
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return jsonResponse({ error: 'Invalid JSON body.' }, 400, corsHeaders);
    }

    const {
      full_name,
      email,
      role_applied,
      linkedin_url,
      portfolio_url,
      location,
      why_listhq,
      cv_storage_path,
      has_work_rights,
    } = body as Record<string, unknown>;

    const requireStr = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

    if (!requireStr(full_name)) return jsonResponse({ error: 'Full name is required.' }, 400, corsHeaders);
    if (!requireStr(email)) return jsonResponse({ error: 'Email is required.' }, 400, corsHeaders);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email as string)) {
      return jsonResponse({ error: 'Please enter a valid email address.' }, 400, corsHeaders);
    }
    if (!requireStr(role_applied) || !ALLOWED_ROLES.has(role_applied as string)) {
      return jsonResponse({ error: 'Please select a valid role.' }, 400, corsHeaders);
    }
    if (!requireStr(linkedin_url) || !(linkedin_url as string).includes('linkedin.com')) {
      return jsonResponse({ error: 'Please provide a valid LinkedIn URL.' }, 400, corsHeaders);
    }
    if (!requireStr(location)) return jsonResponse({ error: 'Location is required.' }, 400, corsHeaders);
    if (!requireStr(why_listhq)) return jsonResponse({ error: 'Please tell us why ListHQ.' }, 400, corsHeaders);
    if ((why_listhq as string).length > 500) {
      return jsonResponse({ error: '"Why ListHQ" must be 500 characters or fewer.' }, 400, corsHeaders);
    }
    if (has_work_rights !== true) {
      return jsonResponse(
        { error: 'We can only accept applications from candidates with Australian work rights at this stage.' },
        400,
        corsHeaders,
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: inserted, error: insertError } = await supabase
      .from('careers_applications')
      .insert({
        full_name: (full_name as string).trim(),
        email: (email as string).trim().toLowerCase(),
        role_applied,
        linkedin_url: (linkedin_url as string).trim(),
        portfolio_url: typeof portfolio_url === 'string' && portfolio_url.trim() ? portfolio_url.trim() : null,
        location: (location as string).trim(),
        why_listhq: (why_listhq as string).trim(),
        cv_storage_path: typeof cv_storage_path === 'string' && cv_storage_path.trim() ? cv_storage_path.trim() : null,
        has_work_rights: true,
      })
      .select('id')
      .maybeSingle();

    if (insertError || !inserted) {
      console.error('[submit-careers-application] insert error:', insertError);
      return jsonResponse(
        { error: 'Server error — please email careers@listhq.com.au directly.' },
        500,
        corsHeaders,
      );
    }

    const application_id = inserted.id as string;
    const cv_upload_path = `careers-uploads/${application_id}/cv.pdf`;

    // Internal notification email via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY) {
      const lines = [
        `Name: ${full_name}`,
        `Email: ${email}`,
        `Role: ${role_applied}`,
        `LinkedIn: ${linkedin_url}`,
        `Portfolio: ${portfolio_url || '—'}`,
        `Location: ${location}`,
        `Work rights: ${has_work_rights ? 'Yes' : 'No'}`,
        `Why ListHQ: ${why_listhq}`,
        `CV path: ${cv_storage_path || '(none uploaded yet — expected at ' + cv_upload_path + ')'}`,
        ``,
        `Review: https://listhq.com.au/admin/careers/${application_id}`,
      ];
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'ListHQ Careers <careers@listhq.com.au>',
            to: ['alan@squaredevelopment.com.au'],
            subject: `New ListHQ application — ${full_name} (${role_applied})`,
            text: lines.join('\n'),
          }),
        });
        if (!r.ok) console.error('[submit-careers-application] notify email failed', r.status, await r.text());
      } catch (e) {
        console.error('[submit-careers-application] notify email error', e);
      }
    } else {
      console.warn('[submit-careers-application] RESEND_API_KEY not set — skipping notify');
    }

    // Fire-and-forget candidate confirmation
    try {
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-careers-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ application_id }),
      }).catch((e) => console.error('[submit-careers-application] confirmation invoke error', e));
    } catch (e) {
      console.error('[submit-careers-application] confirmation fire error', e);
    }

    return jsonResponse({ application_id, cv_upload_path }, 200, corsHeaders);
  } catch (e) {
    console.error('[submit-careers-application] unexpected error:', e);
    return jsonResponse(
      { error: 'Server error — please email careers@listhq.com.au directly.' },
      500,
      corsHeaders,
    );
  }
});
