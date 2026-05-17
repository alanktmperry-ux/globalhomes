import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

// Server-to-server webhook called by Stripe. No CORS, no browser access.

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_LISTING_BOOST_WEBHOOK_SECRET');
  if (!stripeKey || !webhookSecret) {
    return new Response('Stripe not configured', { status: 503 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();
  if (!sig) return new Response('Missing signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (e) {
    console.error('Webhook signature verification failed', e);
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response('ignored', { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const { listing_id, tier, agent_id, suburb } = session.metadata ?? {};

  // Only handle featured / premier tiers — ignore halo/super_booster
  if (!listing_id || !tier || !agent_id || !['featured', 'premier'].includes(tier)) {
    return new Response('ignored', { status: 200 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const featuredUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateErr } = await admin
    .from('properties')
    .update({
      is_featured: true,
      boost_tier: tier,
      featured_until: featuredUntil,
      boost_requested_at: null,
      boost_requested_tier: null,
    })
    .eq('id', listing_id);

  if (updateErr) {
    console.error('Failed to activate boost', updateErr);
    return new Response('DB update failed', { status: 500 });
  }

  // Notify the agent
  try {
    const { data: property } = await admin
      .from('properties')
      .select('address')
      .eq('id', listing_id)
      .maybeSingle();

    await admin.functions.invoke('dispatch-notification', {
      body: {
        agent_id,
        event_key: 'listing_approved',
        type: 'boost_activated',
        title: `${tier === 'premier' ? 'Premier' : 'Featured'} boost is live`,
        message: `${property?.address ?? 'Your listing'} is now featured in ${suburb ?? 'your suburb'} for 30 days.`,
        property_id: listing_id,
      },
    });
  } catch (e) {
    // Notification failure is non-fatal — boost is already activated
    console.error('Notification dispatch failed', e);
  }

  console.log(`Boost activated: listing=${listing_id} tier=${tier} until=${featuredUntil}`);
  return new Response('ok', { status: 200 });
});
