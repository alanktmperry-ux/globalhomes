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

    if (!isBot(userAgent)) {
      return fetch(request);
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

    return new Response(html, {
      headers: {
        ...Object.fromEntries(originRes.headers),
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    });
  },
};
