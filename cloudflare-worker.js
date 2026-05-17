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
  // AI search crawlers
  'gptbot', 'oai-searchbot', 'chatgpt-user',
  'perplexitybot', 'claudebot',
  'amazonbot', 'facebookbot', 'applebot-extended',
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

// Landing language data — duplicated from src/config/landingLanguages.ts
// (Worker build context can't import from src/, keep in sync manually.)
const LANDING_LANGUAGES = [
  {
    slug: 'mandarin',
    nativeName: '中文',
    englishName: 'Mandarin',
    isoCode: 'zh',
    heroHeadlineNative: '在澳大利亚买房 — 用您的语言',
    popularSuburbs: ['Box Hill', 'Glen Waverley', 'Chatswood', 'Eastwood', 'Hurstville', 'Burwood', 'Carlingford'],
    metaTitle: 'Buy Property in Australia in Mandarin | 在澳大利亚买房 | ListHQ',
    metaDescription:
      "Australia's only property platform with full Mandarin support. Search listings, find Chinese-speaking agents, and post a buyer brief in 中文.",
  },
  {
    slug: 'cantonese',
    nativeName: '廣東話',
    englishName: 'Cantonese',
    isoCode: 'zh-HK',
    heroHeadlineNative: '用廣東話喺澳洲搵樓',
    popularSuburbs: ['Hurstville', 'Chatswood', 'Box Hill', 'Burwood', 'Cabramatta'],
    metaTitle: 'Buy Property in Australia in Cantonese | 用廣東話搵樓 | ListHQ',
    metaDescription: "Australia's only property platform with full Cantonese support. Search listings, find Cantonese-speaking agents, and post a buyer brief in 廣東話.",
  },
  {
    slug: 'vietnamese',
    nativeName: 'Tiếng Việt',
    englishName: 'Vietnamese',
    isoCode: 'vi',
    heroHeadlineNative: 'Tìm kiếm bất động sản Úc bằng tiếng Việt',
    popularSuburbs: ['Cabramatta', 'Bankstown', 'Springvale', 'Richmond', 'Footscray'],
    metaTitle: 'Buy Property in Australia in Vietnamese | Tìm nhà tại Úc | ListHQ',
    metaDescription: "Australia's only property platform with full Vietnamese support. Search listings, find Vietnamese-speaking agents, and post a buyer brief in Tiếng Việt.",
  },
  {
    slug: 'arabic',
    nativeName: 'العربية',
    englishName: 'Arabic',
    isoCode: 'ar',
    heroHeadlineNative: 'ابحث عن العقارات في أستراليا باللغة العربية',
    popularSuburbs: ['Lakemba', 'Auburn', 'Bankstown', 'Broadmeadows', 'Dandenong'],
    metaTitle: 'Buy Property in Australia in Arabic | العقارات في أستراليا | ListHQ',
    metaDescription: "Australia's only property platform with full Arabic support. Search listings, find Arabic-speaking agents, and post a buyer brief in العربية.",
  },
  {
    slug: 'hindi',
    nativeName: 'हिन्दी',
    englishName: 'Hindi',
    isoCode: 'hi',
    heroHeadlineNative: 'हिंदी में ऑस्ट्रेलिया में संपत्ति खोजें',
    popularSuburbs: ['Parramatta', 'Truganina', 'Point Cook', 'Blacktown', 'Harris Park'],
    metaTitle: 'Buy Property in Australia in Hindi | ऑस्ट्रेलिया में संपत्ति | ListHQ',
    metaDescription: "Australia's only property platform with full Hindi support. Search listings, find Hindi-speaking agents, and post a buyer brief in हिन्दी.",
  },
  {
    slug: 'korean',
    nativeName: '한국어',
    englishName: 'Korean',
    isoCode: 'ko',
    heroHeadlineNative: '한국어로 호주 부동산 검색하기',
    popularSuburbs: ['Strathfield', 'Eastwood', 'Docklands', 'Box Hill', 'Rhodes'],
    metaTitle: 'Buy Property in Australia in Korean | 호주 부동산 한국어 | ListHQ',
    metaDescription: "Australia's only property platform with full Korean support. Search listings, find Korean-speaking agents, and post a buyer brief in 한국어.",
  },
  {
    slug: 'punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    englishName: 'Punjabi',
    isoCode: 'pa',
    heroHeadlineNative: 'ਪੰਜਾਬੀ ਵਿੱਚ ਆਸਟ੍ਰੇਲੀਆ ਵਿੱਚ ਜਾਇਦਾਦ ਲੱਭੋ',
    popularSuburbs: ['Dandenong', 'Truganina', 'Blacktown', 'Werribee', 'Parramatta'],
    metaTitle: 'Buy Property in Australia in Punjabi | ਆਸਟ੍ਰੇਲੀਆ ਵਿੱਚ ਜਾਇਦਾਦ | ListHQ',
    metaDescription: "Australia's only property platform with full Punjabi support. Search listings, find Punjabi-speaking agents, and post a buyer brief in ਪੰਜਾਬੀ.",
  },
  {
    slug: 'tamil',
    nativeName: 'தமிழ்',
    englishName: 'Tamil',
    isoCode: 'ta',
    heroHeadlineNative: 'தமிழில் ஆஸ்திரேலியாவில் சொத்து தேடுங்கள்',
    popularSuburbs: ['Parramatta', 'Blacktown', 'Dandenong', 'Springvale', 'Harris Park'],
    metaTitle: 'Buy Property in Australia in Tamil | ஆஸ்திரேலியாவில் சொத்து | ListHQ',
    metaDescription: "Australia's only property platform with full Tamil support. Search listings, find Tamil-speaking agents, and post a buyer brief in தமிழ்.",
  },
  {
    slug: 'indonesian',
    nativeName: 'Bahasa Indonesia',
    englishName: 'Indonesian',
    isoCode: 'id',
    heroHeadlineNative: 'Cari properti di Australia dalam Bahasa Indonesia',
    popularSuburbs: ['Sydney CBD', 'Melbourne CBD', 'North Sydney', 'Southbank', 'Docklands'],
    metaTitle: 'Buy Property in Australia in Indonesian | Properti Australia | ListHQ',
    metaDescription: "Australia's only property platform with full Indonesian support. Search listings, find Indonesian-speaking agents, and post a buyer brief in Bahasa Indonesia.",
  },
  {
    slug: 'malay',
    nativeName: 'Bahasa Melayu',
    englishName: 'Malay',
    isoCode: 'ms',
    heroHeadlineNative: 'Cari hartanah di Australia dalam Bahasa Melayu',
    popularSuburbs: ['Sydney CBD', 'Melbourne CBD', 'Docklands', 'Southbank', 'Chatswood'],
    metaTitle: 'Buy Property in Australia in Malay | Hartanah Australia | ListHQ',
    metaDescription: "Australia's only property platform with full Malay support. Search listings, find Malay-speaking agents, and post a buyer brief in Bahasa Melayu.",
  },
  {
    slug: 'thai',
    nativeName: 'ภาษาไทย',
    englishName: 'Thai',
    isoCode: 'th',
    heroHeadlineNative: 'ค้นหาอสังหาริมทรัพย์ในออสเตรเลียเป็นภาษาไทย',
    popularSuburbs: ['Sydney CBD', 'Melbourne CBD', 'Surfers Paradise', 'Docklands', 'North Sydney'],
    metaTitle: 'Buy Property in Australia in Thai | อสังหาริมทรัพย์ออสเตรเลีย | ListHQ',
    metaDescription: "Australia's only property platform with full Thai support. Search listings, find Thai-speaking agents, and post a buyer brief in ภาษาไทย.",
  },
  {
    slug: 'filipino',
    nativeName: 'Filipino',
    englishName: 'Filipino',
    isoCode: 'fil',
    heroHeadlineNative: 'Maghanap ng ari-arian sa Australia sa Filipino',
    popularSuburbs: ['Blacktown', 'Parramatta', 'Docklands', 'Dandenong', 'Liverpool'],
    metaTitle: 'Buy Property in Australia in Filipino | Ari-arian sa Australia | ListHQ',
    metaDescription: "Australia's only property platform with full Filipino support. Search listings, find Filipino-speaking agents, and post a buyer brief in Filipino.",
  },
  {
    slug: 'japanese',
    nativeName: '日本語',
    englishName: 'Japanese',
    isoCode: 'ja',
    heroHeadlineNative: '日本語でオーストラリアの不動産を検索',
    popularSuburbs: ['Sydney CBD', 'North Sydney', 'Melbourne CBD', 'Docklands', 'Chatswood'],
    metaTitle: 'Buy Property in Australia in Japanese | オーストラリアの不動産 | ListHQ',
    metaDescription: "Australia's only property platform with full Japanese support. Search listings, find Japanese-speaking agents, and post a buyer brief in 日本語.",
  },
  {
    slug: 'spanish',
    nativeName: 'Español',
    englishName: 'Spanish',
    isoCode: 'es',
    heroHeadlineNative: 'Busca propiedades en Australia en español',
    popularSuburbs: ['Sydney CBD', 'Melbourne CBD', 'Brisbane CBD', 'Surfers Paradise', 'Adelaide CBD'],
    metaTitle: 'Buy Property in Australia in Spanish | Propiedades en Australia | ListHQ',
    metaDescription: "Australia's only property platform with full Spanish support. Search listings, find Spanish-speaking agents, and post a buyer brief in Español.",
  },
  {
    slug: 'french',
    nativeName: 'Français',
    englishName: 'French',
    isoCode: 'fr',
    heroHeadlineNative: "Recherchez des propriétés en Australie en français",
    popularSuburbs: ['Sydney CBD', 'Melbourne CBD', 'Double Bay', 'Toorak', 'Brisbane CBD'],
    metaTitle: "Buy Property in Australia in French | Propriétés en Australie | ListHQ",
    metaDescription: "Australia's only property platform with full French support. Search listings, find French-speaking agents, and post a buyer brief in Français.",
  },
  {
    slug: 'portuguese',
    nativeName: 'Português',
    englishName: 'Portuguese',
    isoCode: 'pt',
    heroHeadlineNative: 'Pesquise imóveis na Austrália em português',
    popularSuburbs: ['Sydney CBD', 'Melbourne CBD', 'Dandenong', 'Footscray', 'Springvale'],
    metaTitle: 'Buy Property in Australia in Portuguese | Imóveis na Austrália | ListHQ',
    metaDescription: "Australia's only property platform with full Portuguese support. Search listings, find Portuguese-speaking agents, and post a buyer brief in Português.",
  },
  {
    slug: 'italian',
    nativeName: 'Italiano',
    englishName: 'Italian',
    isoCode: 'it',
    heroHeadlineNative: 'Cerca proprietà in Australia in italiano',
    popularSuburbs: ['Carlton', 'Hawthorn', 'Leichhardt', 'Fairfield', 'Thomastown'],
    metaTitle: 'Buy Property in Australia in Italian | Proprietà in Australia | ListHQ',
    metaDescription: "Australia's only property platform with full Italian support. Search listings, find Italian-speaking agents, and post a buyer brief in Italiano.",
  },
  {
    slug: 'greek',
    nativeName: 'Ελληνικά',
    englishName: 'Greek',
    isoCode: 'el',
    heroHeadlineNative: 'Αναζητήστε ακίνητα στην Αυστραλία στα ελληνικά',
    popularSuburbs: ['Oakleigh', 'South Yarra', 'Doncaster', 'Marrickville', 'Rockdale'],
    metaTitle: 'Buy Property in Australia in Greek | Ακίνητα στην Αυστραλία | ListHQ',
    metaDescription: "Australia's only property platform with full Greek support. Search listings, find Greek-speaking agents, and post a buyer brief in Ελληνικά.",
  },
  {
    slug: 'urdu',
    nativeName: 'اردو',
    englishName: 'Urdu',
    isoCode: 'ur',
    heroHeadlineNative: 'اردو میں آسٹریلیا میں جائیداد تلاش کریں',
    popularSuburbs: ['Parramatta', 'Blacktown', 'Auburn', 'Dandenong', 'Lakemba'],
    metaTitle: 'Buy Property in Australia in Urdu | آسٹریلیا میں جائیداد | ListHQ',
    metaDescription: "Australia's only property platform with full Urdu support. Search listings, find Urdu-speaking agents, and post a buyer brief in اردو.",
  },
  {
    slug: 'bengali',
    nativeName: 'বাংলা',
    englishName: 'Bengali',
    isoCode: 'bn',
    heroHeadlineNative: 'বাংলায় অস্ট্রেলিয়ায় সম্পত্তি অনুসন্ধান করুন',
    popularSuburbs: ['Parramatta', 'Granville', 'Dandenong', 'Blacktown', 'Harris Park'],
    metaTitle: 'Buy Property in Australia in Bengali | অস্ট্রেলিয়ায় সম্পত্তি | ListHQ',
    metaDescription: "Australia's only property platform with full Bengali support. Search listings, find Bengali-speaking agents, and post a buyer brief in বাংলা.",
  },
];

function findLandingLanguage(slug) {
  if (!slug) return null;
  const s = String(slug).toLowerCase();
  return LANDING_LANGUAGES.find((l) => l.slug === s) || null;
}

async function handleLandingLanguage(request, env, lang) {
  const APP_ORIGIN = env.APP_ORIGIN;
  const url = new URL(request.url);
  const originRes = await fetch(APP_ORIGIN + url.pathname + url.search, {
    headers: { 'User-Agent': request.headers.get('User-Agent') || 'ListHQ-Edge' },
  });
  if (originRes.status !== 200) return null;
  const ct = originRes.headers.get('content-type') || '';
  if (!ct.includes('text/html')) return null;
  let html = await originRes.text();

  const title = esc(lang.metaTitle);
  const desc = esc(lang.metaDescription);
  const pageUrl = `https://listhq.com.au/property-australia/${lang.slug}`;

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"/i,
    `<meta name="description" content="${desc}"`
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"/i,
    `<meta property="og:title" content="${title}"`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"/i,
    `<meta property="og:description" content="${desc}"`
  );
  html = html.replace(/(<html[^>]*\slang=")[^"]*"/i, `$1${lang.isoCode}"`);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: lang.metaTitle,
    description: lang.metaDescription,
    inLanguage: lang.isoCode,
    url: pageUrl,
    isPartOf: { '@id': 'https://listhq.com.au/#website' },
    about: {
      '@type': 'Thing',
      name: `Australian real estate for ${lang.englishName}-speaking buyers`,
    },
  };
  const ld = `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  html = html.replace('</head>', `${ld}\n</head>`);

  const res = new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
      'X-Landing-Lang': lang.slug,
    },
  });
  return withSecurityHeaders(res, env);
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

const handler = {
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

    // Multilingual landing pages: /property-australia/:language
    // Inject page-specific head (title/desc/og/lang/JSON-LD) for AI crawlers
    // and search engines. React still hydrates and renders the page normally.
    const landingMatch = url.pathname.match(/^\/property-australia\/([a-z-]+)\/?$/i);
    if (landingMatch) {
      const lang = findLandingLanguage(landingMatch[1]);
      if (lang) {
        const landingRes = await handleLandingLanguage(request, env, lang);
        if (landingRes) return landingRes;
      }
      // unknown slug → fall through to React app (which redirects to /buy)
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
            const originRequest = new Request(APP_ORIGIN + url.pathname + url.search, { method: 'GET', headers: request.headers });
            ctx.waitUntil(refreshCacheInBackground(originRequest, cacheKey, cache, env));
          }
          console.log(JSON.stringify({ type: 'cache', status: isStale ? 'STALE' : 'HIT', path: url.pathname, age: ageSec }));
          return annotateCache(cached, isStale ? 'STALE' : 'HIT', ageSec);
        }

        // MISS — fetch origin, store, compress, return
        const originRes = await fetch(new Request(APP_ORIGIN + url.pathname + url.search, request));
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
      const passRes = await fetch(new Request(APP_ORIGIN + url.pathname + url.search, request));
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

// Wrapper: stamp X-Worker-Version on every response so a curl -I against
// listhq.com.au can confirm a fresh worker deploy is actually live.
export default {
  async fetch(request, env, ctx) {
    const res = await handler.fetch(request, env, ctx);
    const headers = new Headers(res.headers);
    headers.set('X-Worker-Version', WORKER_VERSION);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  },
};
