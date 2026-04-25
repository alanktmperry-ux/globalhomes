import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({} as any));
    const agentId: string | undefined = body?.agent_id;

    if (agentId) {
      const { data, error } = await supabase.rpc('compute_agent_reputation', { p_agent_id: agentId });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, components: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Nightly mode — recompute all agents
    const { data: agents, error: aErr } = await supabase.from('agents').select('id');
    if (aErr) throw aErr;

    let count = 0;
    for (const a of agents ?? []) {
      const { error } = await supabase.rpc('compute_agent_reputation', { p_agent_id: a.id });
      if (!error) count++;
    }

    return new Response(JSON.stringify({ ok: true, processed: count }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
