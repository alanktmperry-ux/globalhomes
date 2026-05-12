// Cloudflare Worker: listhq-seo-proxy
// Deploy manually to Cloudflare Workers — not used by Lovable build.
// Intercepts bot requests and injects property/agent meta tags into HTML.
// Humans receive the unmodified SPA.

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

export default {
  async fetch(request, env) {
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
    if (isBot(userAgent) && checkRateLimit(ip)) {
      return new Response('Too Many Requests', { status: 429 });
    }

    if (!isBot(userAgent)) {
      const humanRes = await fetch(request);
      return withSecurityHeaders(humanRes, env);
    }

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
