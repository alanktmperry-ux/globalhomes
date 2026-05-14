import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const caller = userData?.user;
    if (userError || !caller) return json({ error: 'Unauthorized' }, 401);

    const { data: roleCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleCheck) return json({ error: 'Forbidden' }, 403);

    const keys_present = !!Deno.env.get('STRIPE_SECRET_KEY');
    const subscription_webhook_secret_present = !!Deno.env.get('STRIPE_SUBSCRIPTION_WEBHOOK_SECRET');
    const credit_webhook_secret_present =
      !!Deno.env.get('STRIPE_WEBHOOK_SECRET') || !!Deno.env.get('STRIPE_CREDIT_WEBHOOK_SECRET');
    const webhook_secret_present =
      subscription_webhook_secret_present && credit_webhook_secret_present;

    // Last subscription webhook activity — proxy via newest agent_subscriptions row touch
    const { data: lastSub } = await supabase
      .from('agent_subscriptions')
      .select('updated_at, subscription_start')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const last_subscription_webhook_at =
      lastSub?.updated_at || lastSub?.subscription_start || null;

    // Last successful credit charge
    const { data: lastCharge } = await supabase
      .from('halo_credit_purchases')
      .select('created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const last_successful_charge_at = lastCharge?.created_at || null;

    // Counts
    const { count: subscription_count } = await supabase
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('is_subscribed', true)
      .not('stripe_subscription_id', 'is', null);

    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count: credit_purchase_count_30d } = await supabase
      .from('halo_credit_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('created_at', since);

    return json({
      keys_present,
      webhook_secret_present,
      subscription_webhook_secret_present,
      credit_webhook_secret_present,
      last_subscription_webhook_at,
      last_successful_charge_at,
      subscription_count: subscription_count ?? 0,
      credit_purchase_count_30d: credit_purchase_count_30d ?? 0,
      checked_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[stripe-health] error', e);
    return json({ error: (e as Error).message || 'Internal error' }, 500);
  }
});
