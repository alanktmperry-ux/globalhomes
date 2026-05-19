// Sprint 5: Embed Halos and Properties for semantic match scoring.
// Modes:
//   { mode: 'halo',     ids?: uuid[] }  → embed specific halos (or all stale active halos)
//   { mode: 'property', ids?: uuid[] }  → embed specific properties (or all stale active properties)
//   { mode: 'backfill' }                → embed everything missing or older than 30 days
// Auth: requires x-cron-secret header OR an admin user JWT.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getCorsHeaders } from '../_shared/cors.ts';

const GATEWAY = 'https://ai.gateway.lovable.dev/v1/embeddings';
const MODEL = 'openai/text-embedding-3-small';
const DIMS = 1536;
const BATCH = 64; // 256 max per request, stay conservative for token budget

function haloText(h: any): string {
  const parts = [
    `Intent: ${h.intent}`,
    h.property_types?.length ? `Property types: ${h.property_types.join(', ')}` : '',
    h.suburbs?.length ? `Suburbs: ${h.suburbs.join(', ')}` : '',
    h.bedrooms_min ? `Min bedrooms: ${h.bedrooms_min}` : '',
    h.budget_max ? `Budget up to: $${h.budget_max}` : '',
    h.timeframe ? `Timeframe: ${h.timeframe}` : '',
    h.description ? `Buyer notes: ${h.description}` : '',
    h.must_haves?.length ? `Must have: ${h.must_haves.join(', ')}` : '',
    h.deal_breakers ? `Deal breakers: ${h.deal_breakers}` : '',
  ].filter(Boolean);
  return parts.join('\n').slice(0, 8000);
}

function propertyText(p: any): string {
  const parts = [
    p.title ? `Title: ${p.title}` : '',
    `Suburb: ${p.suburb}`,
    p.property_type ? `Type: ${p.property_type}` : '',
    p.beds != null ? `Beds: ${p.beds}` : '',
    p.baths != null ? `Baths: ${p.baths}` : '',
    p.price ? `Price: $${p.price}` : '',
    p.description ? `Description: ${p.description}` : '',
    p.features?.length ? `Features: ${p.features.join(', ')}` : '',
  ].filter(Boolean);
  return parts.join('\n').slice(0, 8000);
}

async function embedBatch(inputs: string[], apiKey: string): Promise<number[][]> {
  const resp = await fetch(GATEWAY, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input: inputs, dimensions: DIMS }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Embed ${resp.status}: ${t}`);
  }
  const j = await resp.json();
  return j.data.map((d: any) => d.embedding);
}

function toVectorLiteral(v: number[]): string {
  return `[${v.join(',')}]`;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const cronSecret = Deno.env.get('CRON_SECRET');
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Auth: cron secret OR admin role
  const isCron = req.headers.get('x-cron-secret') === cronSecret;
  if (!isCron) {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    if (!roles?.some((r: any) => r.role === 'admin')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode: string = body.mode ?? 'backfill';
    const ids: string[] | undefined = body.ids;
    const result = { halos_embedded: 0, properties_embedded: 0, errors: [] as string[] };
    const staleCutoff = new Date(Date.now() - 30 * 86400000).toISOString();

    if (mode === 'halo' || mode === 'backfill') {
      let q = admin.from('halos').select('*').eq('status', 'active').limit(500);
      if (ids?.length) q = q.in('id', ids);
      else q = q.or(`embedding.is.null,embedding_updated_at.lt.${staleCutoff}`);
      const { data: halos } = await q;
      for (let i = 0; i < (halos ?? []).length; i += BATCH) {
        const slice = halos!.slice(i, i + BATCH);
        try {
          const vecs = await embedBatch(slice.map(haloText), apiKey);
          for (let j = 0; j < slice.length; j++) {
            const { error } = await admin.from('halos').update({
              embedding: toVectorLiteral(vecs[j]),
              embedding_updated_at: new Date().toISOString(),
            }).eq('id', slice[j].id);
            if (error) result.errors.push(`halo ${slice[j].id}: ${error.message}`);
            else result.halos_embedded++;
          }
        } catch (e) { result.errors.push(`halo batch: ${(e as Error).message}`); }
      }
    }

    if (mode === 'property' || mode === 'backfill') {
      let q = admin.from('properties').select('id, title, suburb, property_type, beds, baths, price, description, features')
        .eq('is_active', true).limit(500);
      if (ids?.length) q = q.in('id', ids);
      else q = q.or(`embedding.is.null,embedding_updated_at.lt.${staleCutoff}`);
      const { data: props } = await q;
      for (let i = 0; i < (props ?? []).length; i += BATCH) {
        const slice = props!.slice(i, i + BATCH);
        try {
          const vecs = await embedBatch(slice.map(propertyText), apiKey);
          for (let j = 0; j < slice.length; j++) {
            const { error } = await admin.from('properties').update({
              embedding: toVectorLiteral(vecs[j]),
              embedding_updated_at: new Date().toISOString(),
            }).eq('id', slice[j].id);
            if (error) result.errors.push(`property ${slice[j].id}: ${error.message}`);
            else result.properties_embedded++;
          }
        } catch (e) { result.errors.push(`property batch: ${(e as Error).message}`); }
      }
    }

    // Recompute matches for any halos we just embedded (so semantic_score lands)
    if (result.halos_embedded > 0) {
      const { data: activeHalos } = await admin.from('halos').select('id').eq('status', 'active').limit(500);
      for (const h of activeHalos ?? []) {
        await admin.rpc('compute_halo_matches', { p_halo_id: h.id });
      }
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
