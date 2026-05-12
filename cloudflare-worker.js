// Cloudflare Worker: listhq-edge
// STATUS: Code complete, not yet deployed. Activation requires:
//   1. Set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID in GitHub repo secrets
//   2. Flip listhq.com.au DNS from grey-cloud to orange-cloud (proxied) on Cloudflare
//   3. Add worker route: listhq.com.au/* → listhq-edge in Cloudflare dashboard
//   4. Push to main — GHA workflow auto-deploys
//
// Runbook: docs/CLOUDFLARE-WORKER-ACTIVATION.md
// Bumping WORKER_VERSION is the easiest way to confirm a fresh deploy is live.

const WORKER_VERSION = '2026-05-12-edge-cache-v2';

const BOT_PATTERNS = [
  'facebookexternalhit', 'facebot', 'twitterbot', 'linkedinbot',
  'whatsapp', 'slackbot', 'discordbot', 'telegrambot',
  'googlebot', 'bingbot', 'applebot', 'duckduckbot',
  'yandexbot', 'baiduspider', 'semrushbot', 'ahrefsbot',
  'msnbot', 'ia_archiver', 'embedly', 'quora link preview',
  'outbrain', 'pinterest', 'developers.google.com/+/web/snippet',
];

// --- Ad-hoc per-IP rate limit for bot traffic (resets on worker recycle) ---
const ipRequestCounts = new Map();
const RATE_LIMIT = 50;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = ipRequestCounts.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    ipRequestCounts.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

function isBot(userAgent) {
  const ua = (userAgent ?? '').toLowerCase();
  return BOT_PATTERNS.some((p) => ua.includes(p));
}

async function fetchPropertyMeta(supabaseUrl, serviceKey, slug) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(slug);
  const field = isUuid ? 'id' : 'slug';
  const res = await fetch(
    `${supabaseUrl}/rest/v1/properties?${field}=eq.${slug}&is_active=eq.true&select=id,slug,title,address,suburb,state,price_formatted,price,beds,baths,property_type,images,image_url,description,listing_type&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const data = await res.json();
  return data?.[0] ?? null;
}

async function fetchAgentMeta(supabaseUrl, serviceKey, slug) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(slug);
  const field = isUuid ? 'id' : 'slug';
  const res = await fetch(
    `${supabaseUrl}/rest/v1/agents?${field}=eq.${slug}&select=id,name,avatar_url,agency,bio,office_address&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const data = await res.json();
  return data?.[0] ?? null;
}

function esc(str) {
  return (str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildPropertyHead(p, appUrl) {
  const img = (p.images && p.images[0]) || p.image_url || '';
  const price = p.price_formatted ?? (p.price ? '$' + Number(p.price).toLocaleString('en-AU') : 'Price on request');
  const isRent = p.listing_type === 'rent' || p.listing_type === 'rental';
  const title = `${price}${isRent ? '/wk' : ''} · ${p.beds > 0 ? p.beds + ' bed ' : ''}${p.property_type ?? 'Property'} in ${p.suburb ?? ''} ${p.state ?? ''} | ListHQ`;
  const desc = (p.description ?? `${price} · ${[p.beds && p.beds + ' bed', p.baths && p.baths + ' bath', p.suburb, p.state].filter(Boolean).join(' · ')}. View on ListHQ.`).slice(0, 200);
  const url = `${appUrl}/property/${p.slug ?? p.id}`;

  return `
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    ${img ? `<meta property="og:image" content="${img}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />` : ''}
    <meta property="og:site_name" content="ListHQ" />
    <meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(desc)}" />
    ${img ? `<meta name="twitter:image" content="${img}" />` : ''}`;
}

function buildAgentHead(a, appUrl) {
  const title = `${a.name}${a.agency ? ' · ' + a.agency : ''} | Real Estate Agent | ListHQ`;
  const desc = (a.bio ?? `${a.name} is a real estate agent.`).slice(0, 200);
  const url = `${appUrl}/agent/${a.slug ?? a.id}`;
  return `
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    ${a.avatar_url ? `<meta property="og:image" content="${a.avatar_url}" />` : ''}
    <meta property="og:site_name" content="ListHQ" />
    <meta name="twitter:card" content="summary" />`;
}

// =============================================================================
// Browser security headers
// CSP is in REPORT-ONLY mode until 19 May 2026. Switch to enforce mode (use
// 'Content-Security-Policy' header name instead of 'Content-Security-Policy-Report-Only')
// after reviewing the csp_violations table for 7 days of clean reports.
// =============================================================================
function buildSecurityHeaders(env) {
  const supabaseUrl = (env.SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseHost = supabaseUrl.replace(/^https?:\/\//, '');
  const reportRef = env.SUPABASE_PROJECT_REF || supabaseHost.split('.')[0];

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://js.stripe.com https://maps.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    `img-src 'self' data: blob: https: https://${supabaseHost} https://images.unsplash.com https://*.googleapis.com https://maps.gstatic.com`,
    `connect-src 'self' ${supabaseUrl} wss://${supabaseHost} https://api.stripe.com https://maps.googleapis.com https://generativelanguage.googleapis.com`,
    "frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com https://www.youtube.com https://player.vimeo.com",
    "media-src 'self' blob: data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
    `report-uri https://${reportRef}.supabase.co/functions/v1/csp-report`,
  ].join('; ');

  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '0',
    'Permissions-Policy': [
      'accelerometer=()',
      'autoplay=()',
      'camera=()',
      'cross-origin-isolated=()',
      'display-capture=()',
      'encrypted-media=()',
      'fullscreen=(self)',
      'geolocation=(self)',
      'gyroscope=()',
      'keyboard-map=()',
      'magnetometer=()',
      'microphone=(self)',
      'midi=()',
      'payment=(self)',
      'picture-in-picture=()',
      'publickey-credentials-get=(self)',
      'screen-wake-lock=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=(self)',
      'xr-spatial-tracking=()',
    ].join(', '),
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site',
    'Server': 'ListHQ',
    'Content-Security-Policy-Report-Only': csp,
  };
}

function withSecurityHeaders(response, env) {
  const contentType = response.headers.get('content-type') || '';
  // Only inject on HTML responses — JSON / JS / CSS / images pass through.
  if (!contentType.includes('text/html')) return response;

  const headers = new Headers(response.headers);
  const secHeaders = buildSecurityHeaders(env);
  for (const [k, v] of Object.entries(secHeaders)) headers.set(k, v);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// =============================================================================
// Edge cache helpers (Cache API + stale-while-revalidate + brotli)
// =============================================================================

const STRIP_QUERY_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', '_ga', '_gl', 'mc_cid', 'mc_eid',
];

const UNCACHEABLE_PREFIXES = ['/api/', '/functions/', '/auth/', '/dashboard', '/admin'];

function isCacheableRequest(request, url) {
  if (request.method !== 'GET') return false;
  if (request.headers.get('Authorization')) return false;
  if (request.headers.get('Cookie')?.includes('sb-')) return false;
  for (const p of UNCACHEABLE_PREFIXES) if (url.pathname.startsWith(p)) return false;
  return true;
}

function buildCacheKey(request) {
  const cleanUrl = new URL(request.url);
  for (const p of STRIP_QUERY_PARAMS) cleanUrl.searchParams.delete(p);
  cleanUrl.searchParams.sort();
  // Vary by Accept-Encoding so brotli/gzip/identity have separate entries
  const ae = request.headers.get('Accept-Encoding') || '';
  const encTag = ae.includes('br') ? 'br' : ae.includes('gzip') ? 'gz' : 'id';
  cleanUrl.searchParams.set('__enc', encTag);
  return new Request(cleanUrl.toString(), { method: 'GET', headers: { 'Accept-Encoding': ae } });
}

function cacheControlFor(url, contentType) {
  if (contentType.includes('text/html')) {
    return 'public, max-age=60, s-maxage=60, stale-while-revalidate=600';
  }
  if (/\/assets\/[^/]+-[a-zA-Z0-9_-]{6,}\.(js|css|woff2?|ttf|otf)$/.test(url.pathname)) {
    return 'public, max-age=31536000, immutable';
  }
  if (url.pathname.startsWith('/hero/') || url.pathname.startsWith('/fonts/')) {
    return 'public, max-age=31536000, immutable';
  }
  if (/\.(jpg|jpeg|png|webp|avif|svg|gif|ico)$/.test(url.pathname)) {
    return 'public, max-age=604800';
  }
  return 'public, max-age=300';
}

async function compressIfHtml(request, response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') || !response.body) return response;
  if (response.headers.get('content-encoding')) return response; // already encoded
  const ae = request.headers.get('Accept-Encoding') || '';
  let encoding = null;
  if (ae.includes('br')) encoding = 'br';
  else if (ae.includes('gzip')) encoding = 'gzip';
  if (!encoding) return response;
  let stream;
  try {
    stream = response.body.pipeThrough(new CompressionStream(encoding));
  } catch {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.set('Content-Encoding', encoding);
  headers.delete('Content-Length');
  const prevVary = headers.get('Vary');
  headers.set('Vary', prevVary && !/accept-encoding/i.test(prevVary) ? `${prevVary}, Accept-Encoding` : 'Accept-Encoding');
  return new Response(stream, { status: response.status, statusText: response.statusText, headers });
}

function annotateCache(response, status, age) {
  const headers = new Headers(response.headers);
  headers.set('X-Cache-Status', status);
  if (age != null) headers.set('X-Cache-Age', String(age));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function refreshCacheInBackground(originRequest, cacheKey, cache, env) {
  try {
    const fresh = await fetch(originRequest);
    if (fresh.status !== 200) return;
    const ct = fresh.headers.get('content-type') || '';
    const stored = new Response(fresh.clone().body, fresh);
    stored.headers.set('Cache-Control', cacheControlFor(new URL(originRequest.url), ct));
    stored.headers.set('X-Cache-Stored-At', new Date().toUTCString());
    await cache.put(cacheKey, withSecurityHeaders(stored, env));
  } catch (err) {
    console.warn('refreshCache failed', err && err.message);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const userAgent = request.headers.get('User-Agent') ?? '';
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    const APP_ORIGIN = env.APP_ORIGIN;

    // Dynamic sitemap — serve to everyone (bots and humans)
    if (url.pathname === '/sitemap.xml') {
      try {
        const sitemapRes = await fetch(
          `${SUPABASE_URL}/functions/v1/sitemap`,
          { headers: { Authorization: `Bearer ${SUPABASE_KEY}` } }
        );
        const xml = await sitemapRes.text();
        return new Response(xml, {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          },
        });
      } catch {
        // Fall through to serve static sitemap from origin
      }
    }

    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const bot = isBot(userAgent);
    if (bot && checkRateLimit(ip)) {
      return new Response('Too Many Requests', { status: 429 });
    }

    // -----------------------------------------------------------------------
    // Human path with edge cache + SWR + brotli
    // -----------------------------------------------------------------------
    if (!bot) {
      const cacheable = isCacheableRequest(request, url);
      const cache = caches.default;

      if (cacheable) {
        const cacheKey = buildCacheKey(request);
        const cached = await cache.match(cacheKey);
        if (cached) {
          const storedAt = Date.parse(cached.headers.get('X-Cache-Stored-At') || '') || 0;
          const ageSec = storedAt ? Math.floor((Date.now() - storedAt) / 1000) : 0;
          const cc = cached.headers.get('Cache-Control') || '';
          const maxAge = parseInt(cc.match(/max-age=(\d+)/)?.[1] || '60', 10);
          const isStale = ageSec > maxAge;
          if (isStale) {
            const originRequest = new Request(request.url, { method: 'GET', headers: request.headers });
            ctx.waitUntil(refreshCacheInBackground(originRequest, cacheKey, cache, env));
          }
          console.log(JSON.stringify({ type: 'cache', status: isStale ? 'STALE' : 'HIT', path: url.pathname, age: ageSec }));
          return annotateCache(cached, isStale ? 'STALE' : 'HIT', ageSec);
        }

        // MISS — fetch origin, store, compress, return
        const originRes = await fetch(request);
        const ct = originRes.headers.get('content-type') || '';
        const isHtml = ct.includes('text/html');

        if (originRes.status === 200) {
          // Build the cached copy (uncompressed) with stamped Cache-Control + Stored-At.
          const cacheCopy = new Response(originRes.clone().body, originRes);
          cacheCopy.headers.set('Cache-Control', cacheControlFor(url, ct));
          cacheCopy.headers.set('X-Cache-Stored-At', new Date().toUTCString());
          const cacheWithSec = withSecurityHeaders(cacheCopy, env);
          ctx.waitUntil(cache.put(cacheKey, cacheWithSec.clone()));

          // Serve a parallel response (compress HTML before sending to client).
          let response = new Response(originRes.body, originRes);
          response.headers.set('Cache-Control', cacheControlFor(url, ct));
          response = withSecurityHeaders(response, env);
          response = annotateCache(response, 'MISS', 0);
          if (isHtml) response = await compressIfHtml(request, response);
          console.log(JSON.stringify({ type: 'cache', status: 'MISS', path: url.pathname }));
          return response;
        }

        // Non-200 — pass through with security headers, no caching
        return withSecurityHeaders(originRes, env);
      }

      // Bypass path (auth/dashboard/admin/api) — pass through, never cache
      const passRes = await fetch(request);
      const secured = withSecurityHeaders(passRes, env);
      const headers = new Headers(secured.headers);
      headers.set('X-Cache-Status', 'BYPASS');
      headers.set('Cache-Control', 'no-store');
      return new Response(secured.body, { status: secured.status, statusText: secured.statusText, headers });
    }

    // -----------------------------------------------------------------------
    // Bot path (SEO meta injection) — unchanged logic, still gets sec headers
    // -----------------------------------------------------------------------
    const originRes = await fetch(new Request(APP_ORIGIN + url.pathname + url.search, request));
    let html = await originRes.text();
    let injected = '';

    const propertyMatch = url.pathname.match(/^\/property\/([^/]+)/);
    if (propertyMatch) {
      const property = await fetchPropertyMeta(SUPABASE_URL, SUPABASE_KEY, propertyMatch[1]);
      if (property) injected = buildPropertyHead(property, 'https://' + url.hostname);
    }

    const agentMatch = url.pathname.match(/^\/agent\/([^/]+)/);
    if (agentMatch) {
      const agent = await fetchAgentMeta(SUPABASE_URL, SUPABASE_KEY, agentMatch[1]);
      if (agent) injected = buildAgentHead(agent, 'https://' + url.hostname);
    }

    if (injected) {
      html = html.replace('<head>', `<head>\n${injected}`);
    }

    const botRes = new Response(html, {
      headers: {
        ...Object.fromEntries(originRes.headers),
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    });
    return withSecurityHeaders(botRes, env);
  },
};
