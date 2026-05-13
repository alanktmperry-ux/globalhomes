// Geo-locate edge function — returns visitor's suburb/state/region using
// Cloudflare / proxy headers, then matches against suburb_region_map.
// Public, no auth required.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getCorsHeaders } from '../_shared/cors.ts';

interface GeoResponse {
  suburb: string;
  state: string;
  region: string;
  display: string;
  source: 'cf' | 'vercel' | 'fallback';
}

const FALLBACK: GeoResponse = {
  suburb: 'Doncaster',
  state: 'VIC',
  region: 'Melbourne East',
  display: 'Melbourne East',
  source: 'fallback',
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const headers = req.headers;
    const cfCity = headers.get('cf-ipcity') || headers.get('x-vercel-ip-city');
    const cfRegion = headers.get('cf-region') || headers.get('x-vercel-ip-country-region');
    const source: 'cf' | 'vercel' | 'fallback' = headers.get('cf-ipcity')
      ? 'cf'
      : headers.get('x-vercel-ip-city')
      ? 'vercel'
      : 'fallback';

    const city = (cfCity || '').trim();
    const region = (cfRegion || '').trim().toUpperCase();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    if (city) {
      const { data } = await supabase
        .from('suburb_region_map')
        .select('suburb, state, region')
        .ilike('suburb', city)
        .maybeSingle();
      if (data) {
        return new Response(
          JSON.stringify({
            suburb: data.suburb,
            state: data.state,
            region: data.region,
            display: data.region,
            source,
          } satisfies GeoResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fall back by state if we know it
    if (region) {
      const { data } = await supabase
        .from('suburb_region_map')
        .select('suburb, state, region')
        .eq('state', region)
        .limit(1)
        .maybeSingle();
      if (data) {
        return new Response(
          JSON.stringify({
            suburb: data.suburb,
            state: data.state,
            region: data.region,
            display: data.region,
            source,
          } satisfies GeoResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(JSON.stringify(FALLBACK), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify(FALLBACK), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
