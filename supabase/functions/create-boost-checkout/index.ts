import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { getCorsHeaders } from '../_shared/cors.ts';

const json = (body: unknown, status = 200, corsHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const ONE_TIME_TIERS = ['featured', 'premier'] as const;
const SUBSCRIPTION_TIERS = ['halo_boost', 'super_booster'] as const;
const ALL_TIERS = [...ONE_TIME_TIERS, ...SUBSCRIPTION_TIERS];

const ONE_TIME_PRICES: Record<string, { amount: number; name: string }> = {
  featured: { amount: 4900, name: 'Featured Boost — 30 days' },
  premier:  { amount: 9900, name: 'Premier Boost — 30 days' },
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, corsHeaders);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401, corsHeaders);

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return json({ error: 'Stripe not configured' }, 503, corsHeaders);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401, corsHeaders);

    const body = await req.json().catch(() => null) as
      | { listingId?: string; tier?: string; suburb?: string }
      | null;
    if (!body?.listingId || !body?.tier || !body?.suburb) {
      return json({ error: 'listingId, tier, and suburb are required' }, 400, corsHeaders);
    }
    const { listingId, tier, suburb } = body;
    if (!ALL_TIERS.includes(tier as typeof ALL_TIERS[number])) {
      return json({ error: 'Invalid tier' }, 400, corsHeaders);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: agent } = await admin
      .from('agents')
      .select('id, email, stripe_customer_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (!agent) return json({ error: 'Agent not found' }, 404, corsHeaders);

    const { data: property } = await admin
      .from('properties')
      .select('id')
      .eq('id', listingId)
      .eq('agent_id', agent.id)
      .maybeSingle();
    if (!property) return json({ error: 'Forbidden: you do not own this listing' }, 403, corsHeaders);

    // For subscription tiers, guard against duplicates
    if (SUBSCRIPTION_TIERS.includes(tier as typeof SUBSCRIPTION_TIERS[number])) {
      const { data: existing } = await admin
        .from('boost_subscriptions')
        .select('id')
        .eq('listing_id', listingId)
        .eq('tier', tier)
        .in('status', ['pending', 'active'])
        .maybeSingle();
      if (existing) return json({ error: 'An active boost already exists for this listing and tier' }, 409, corsHeaders);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

    let customerId = agent.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: agent.email ?? userData.user.email,
        metadata: { agent_id: agent.id },
      });
      customerId = customer.id;
      await admin.from('agents').update({ stripe_customer_id: customerId }).eq('id', agent.id);
    }

    const origin = req.headers.get('origin') ?? 'https://listhq.com.au';
    const metadata = { agent_id: agent.id, listing_id: listingId, tier, suburb };

    let session: Stripe.Checkout.Session;

    if (ONE_TIME_TIERS.includes(tier as typeof ONE_TIME_TIERS[number])) {
      // One-time payment for featured / premier boost
      const priceData = ONE_TIME_PRICES[tier];
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        line_items: [{
          price_data: {
            currency: 'aud',
            unit_amount: priceData.amount,
            product_data: { name: priceData.name },
          },
          quantity: 1,
        }],
        success_url: `${origin}/dashboard/listings/${listingId}?boost=success&tier=${tier}`,
        cancel_url: `${origin}/dashboard/listings/${listingId}`,
        allow_promotion_codes: true,
        metadata,
      });
    } else {
      // Subscription tiers (halo_boost / super_booster) — existing behaviour
      const lookupKey = tier === 'halo_boost' ? 'halo_boost_monthly' : 'super_booster_monthly';
      const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
      const price = prices.data[0];
      if (!price) return json({ error: `Stripe price not found for lookup_key=${lookupKey}` }, 500, corsHeaders);

      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: `${origin}/dashboard/listings/${listingId}/boost-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dashboard/listings/${listingId}`,
        allow_promotion_codes: true,
        metadata,
        subscription_data: { metadata },
      });
    }

    return json({ url: session.url }, 200, corsHeaders);
  } catch (e) {
    console.error('create-boost-checkout error', e);
    return json({ error: String(e) }, 500);
  }
});
