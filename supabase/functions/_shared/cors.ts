// Shared CORS configuration for all edge functions.
// Only allow requests from the production domain and Lovable preview domains.

const ALLOWED_ORIGINS = [
  'https://listhq.com.au',
  'https://www.listhq.com.au',
  'https://globalhomes.lovable.app',
];

// Lovable preview domains follow the pattern: https://*--*.lovable.app
const LOVABLE_PREVIEW_PATTERN = /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/;

export function getAllowedOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null;
  if (ALLOWED_ORIGINS.includes(requestOrigin)) return requestOrigin;
  if (LOVABLE_PREVIEW_PATTERN.test(requestOrigin)) return requestOrigin;
  return null;
}

export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = getAllowedOrigin(requestOrigin);
  return {
    'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    ...(origin ? { 'Vary': 'Origin' } : {}),
  };
}
