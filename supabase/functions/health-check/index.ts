import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface ServiceResult {
  service: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  latency_ms: number | null;
  error_message: string | null;
}

async function timed(fn: () => Promise<Response>): Promise<{ ok: boolean; status: number; latency: number; error?: string }> {
  const t0 = performance.now();
  try {
    const res = await fn();
    return { ok: res.ok, status: res.status, latency: Math.round(performance.now() - t0), error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, status: 0, latency: Math.round(performance.now() - t0), error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  // Auth: either x-health-secret (cron) or admin JWT
  const cronSecret = req.headers.get('x-health-secret');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let isAuthorized = !!cronSecret && cronSecret === Deno.env.get('HEALTH_CHECK_SECRET');
  if (!isAuthorized) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const { data: userData } = await supabase.auth.getUser(token);
      const caller = userData?.user;
      if (caller) {
        const { data: roleCheck } = await supabase
          .from('user_roles').select('role').eq('user_id', caller.id).eq('role', 'admin').maybeSingle();
        if (roleCheck) isAuthorized = true;
      }
    }
  }
  if (!isAuthorized) return json({ error: 'Unauthorized' }, 401);

  const results: ServiceResult[] = [];

  // Supabase DB
  {
    const t0 = performance.now();
    try {
      const { error } = await supabase.from('properties').select('id').limit(1);
      const latency = Math.round(performance.now() - t0);
      results.push({ service: 'supabase', status: error ? 'down' : 'healthy', latency_ms: latency, error_message: error?.message ?? null });
    } catch (e) {
      results.push({ service: 'supabase', status: 'down', latency_ms: null, error_message: (e as Error).message });
    }
  }

  // Resend (verify api key validity)
  if (Deno.env.get('RESEND_API_KEY')) {
    const r = await timed(() => fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}` },
    }));
    results.push({ service: 'resend', status: r.ok ? 'healthy' : 'down', latency_ms: r.latency, error_message: r.error ?? null });
  } else {
    results.push({ service: 'resend', status: 'unknown', latency_ms: null, error_message: 'RESEND_API_KEY not configured' });
  }

  // Stripe
  if (Deno.env.get('STRIPE_SECRET_KEY')) {
    const r = await timed(() => fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}` },
    }));
    results.push({ service: 'stripe', status: r.ok ? 'healthy' : 'down', latency_ms: r.latency, error_message: r.error ?? null });
  } else {
    results.push({ service: 'stripe', status: 'unknown', latency_ms: null, error_message: 'STRIPE_SECRET_KEY not configured' });
  }

  // OpenAI / LOVABLE_API_KEY proxy
  if (Deno.env.get('LOVABLE_API_KEY')) {
    const r = await timed(() => fetch('https://ai.gateway.lovable.dev/v1/models', {
      headers: { Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}` },
    }));
    results.push({ service: 'openai', status: r.ok ? 'healthy' : 'degraded', latency_ms: r.latency, error_message: r.error ?? null });
  } else {
    results.push({ service: 'openai', status: 'unknown', latency_ms: null, error_message: 'LOVABLE_API_KEY not configured' });
  }

  // Google Maps (geocode tiny query)
  if (Deno.env.get('GOOGLE_MAPS_API_KEY')) {
    const r = await timed(() => fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=Sydney&key=${Deno.env.get('GOOGLE_MAPS_API_KEY')}`,
    ));
    results.push({ service: 'google_maps', status: r.ok ? 'healthy' : 'down', latency_ms: r.latency, error_message: r.error ?? null });
  } else {
    results.push({ service: 'google_maps', status: 'unknown', latency_ms: null, error_message: 'GOOGLE_MAPS_API_KEY not configured' });
  }

  // Cloudflare (public status endpoint)
  {
    const r = await timed(() => fetch('https://www.cloudflarestatus.com/api/v2/status.json'));
    results.push({ service: 'cloudflare', status: r.ok ? 'healthy' : 'degraded', latency_ms: r.latency, error_message: r.error ?? null });
  }

  // Persist
  try {
    await supabase.from('service_health_log').insert(
      results.map((r) => ({
        service: r.service,
        status: r.status,
        latency_ms: r.latency_ms,
        error_message: r.error_message,
      })),
    );
  } catch (e) {
    console.error('[health-check] log insert failed', e);
  }

  const overall = results.some((r) => r.status === 'down')
    ? 'down'
    : results.some((r) => r.status === 'degraded')
      ? 'degraded'
      : 'healthy';

  return json({ overall, checked_at: new Date().toISOString(), services: results });
});
