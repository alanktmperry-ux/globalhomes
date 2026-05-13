import { getCorsHeaders } from '../_shared/cors.ts';
// Purge the Cloudflare edge cache for listhq.com.au.
//
// Call this after Publish → Update if you need the new HTML live immediately.
// Otherwise the stale-while-revalidate window (10 min) handles it automatically.
//
// Required secrets:
//   CACHE_PURGE_SECRET   — shared bearer token (you choose the value)
//   CLOUDFLARE_API_TOKEN — Cloudflare API token with Zone.Cache Purge permission
//   CLOUDFLARE_ZONE_ID   — Zone ID for listhq.com.au
//
// Usage:
//   curl -X POST -H "Authorization: Bearer $CACHE_PURGE_SECRET" \
//     https://<project-ref>.supabase.co/functions/v1/purge-edge-cache

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const purgeSecret = Deno.env.get('CACHE_PURGE_SECRET');
  const cfToken = Deno.env.get('CLOUDFLARE_API_TOKEN');
  const cfZone = Deno.env.get('CLOUDFLARE_ZONE_ID');

  if (!purgeSecret || !cfToken || !cfZone) {
    return new Response(
      JSON.stringify({
        error: 'not_configured',
        message:
          'Set CACHE_PURGE_SECRET, CLOUDFLARE_API_TOKEN, and CLOUDFLARE_ZONE_ID in project secrets before calling this endpoint.',
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const auth = req.headers.get('Authorization') || '';
  if (auth !== `Bearer ${purgeSecret}`) {
    return new Response('Forbidden', { status: 403, headers: corsHeaders });
  }

  let body: { files?: string[]; tags?: string[] } = {};
  try {
    if (req.headers.get('content-type')?.includes('application/json')) {
      body = await req.json();
    }
  } catch {
    /* empty body is fine */
  }

  const payload =
    body.files?.length
      ? { files: body.files }
      : body.tags?.length
        ? { tags: body.tags }
        : { purge_everything: true };

  const cfRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${cfZone}/purge_cache`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  const result = await cfRes.json().catch(() => ({}));
  return new Response(JSON.stringify({ ok: cfRes.ok, result }), {
    status: cfRes.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
