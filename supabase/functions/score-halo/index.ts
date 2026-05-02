import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function scoreHalo(h: any): number {
  let score = 0;
  if (h.budget_min != null && h.budget_min > 0) score += 10;
  if (h.budget_max != null && h.budget_min != null && h.budget_max > h.budget_min * 0.5) score += 10;
  if (Array.isArray(h.suburbs) && h.suburbs.length >= 2) score += 15;
  if (typeof h.description === 'string' && h.description.trim().length > 50) score += 20;
  if (Array.isArray(h.must_haves) && h.must_haves.length >= 1) score += 10;
  if (typeof h.deal_breakers === 'string' && h.deal_breakers.trim().length > 0) score += 10;
  if (h.timeframe === 'ready_now' || h.timeframe === '3_to_6_months') score += 15;
  if (h.finance_status === 'pre_approved' || h.finance_status === 'cash_buyer') score += 10;
  return Math.min(100, score);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    // ── Auth check ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { halo_id } = await req.json();
    if (!halo_id) {
      return new Response(JSON.stringify({ error: 'Missing halo_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: halo, error } = await admin.from('halos').select('*').eq('id', halo_id).maybeSingle();
    if (error || !halo) {
      return new Response(JSON.stringify({ error: 'Halo not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Ownership check: caller must be the halo's agent ──
    const { data: agentRow } = await admin
      .from('agents')
      .select('id')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (!agentRow || agentRow.id !== halo.agent_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const score = scoreHalo(halo);
    await admin.from('halos').update({ quality_score: score }).eq('id', halo_id);
    return new Response(JSON.stringify({ ok: true, quality_score: score }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
