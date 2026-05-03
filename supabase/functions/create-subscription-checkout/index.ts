import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = 'https://globalhomes.lovable.app';

const PLAN_CONFIG: Record<string, { name: string; monthlyAud: number; listingLimit: number; seatLimit: number }> = {
  solo:       { name: 'Solo',       monthlyAud: 29900,  listingLimit: 15,     seatLimit: 1      },
  agency:     { name: 'Agency',     monthlyAud: 89900,  listingLimit: 75,     seatLimit: 12     },
  agency_pro: { name: 'Agency Pro', monthlyAud: 199900, listingLimit: 999999, seatLimit: 999999 },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { planId, annual } = await req.json();
    const plan = PLAN_CONFIG[planId];
    if (!plan) return new Response(JSON.stringify({ error: 'Invalid plan' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: agent } = await admin.from('agents').select('id, stripe_customer_id').eq('user_id', userData.user.id).maybeSingle();
    if (!agent) return new Response(JSON.stringify({ error: 'Agent not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

    let customerId = agent.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.user.email,
        metadata: { agent_id: agent.id },
      });
      customerId = customer.id;
      await admin.from('agents').update({ stripe_customer_id: customerId }).eq('id', agent.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{
        price_data: {
          currency: 'aud',
          product_data: { name: `ListHQ ${plan.name}${annual ? ' (Annual)' : ''}` },
          unit_amount: annual ? plan.monthlyAud * 10 : plan.monthlyAud,
          recurring: { interval: annual ? 'year' : 'month', interval_count: 1 },
        },
        quantity: 1,
      }],
      success_url: `${APP_URL}/dashboard/billing?success=true`,
      cancel_url: `${APP_URL}/dashboard/billing?cancelled=true`,
      metadata: {
        agent_id: agent.id,
        plan_id: planId,
        annual: annual ? 'true' : 'false',
        listing_limit: String(plan.listingLimit),
        seat_limit: String(plan.seatLimit),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
