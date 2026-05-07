import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logApiUsage, costFor } from "../_shared/usageLog.ts";

// Actions that are public read-only geo lookups — no auth required
const PUBLIC_ACTIONS = ['geocode', 'autocomplete', 'place_details', 'reverse_geocode'];

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { action?: string; input?: any; input_types?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { action, input, input_types } = body;

  // Require auth only for non-public actions
  if (!PUBLIC_ACTIONS.includes(action ?? '')) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    try {
      const authClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data, error: authErr } = await authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
      if (authErr || !data?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    if (action === 'get_key') {
      return new Response(JSON.stringify({ error: 'This action has been removed.' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'autocomplete') {
      const types = input_types || '(regions)';
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=${encodeURIComponent(types)}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      await logApiUsage({ service: 'google_maps', action: 'autocomplete', units: 1, cost_estimate: costFor.googleMaps(), metadata: { types } });
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'geocode') {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(input)}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      await logApiUsage({ service: 'google_maps', action: 'geocode', units: 1, cost_estimate: costFor.googleMaps() });
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'place_details') {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(input)}&fields=geometry,formatted_address,address_components&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      await logApiUsage({ service: 'google_maps', action: 'place_details', units: 1, cost_estimate: costFor.googleMaps() });
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'reverse_geocode') {
      const { lat, lng } = input;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      await logApiUsage({ service: 'google_maps', action: 'reverse_geocode', units: 1, cost_estimate: costFor.googleMaps() });
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
