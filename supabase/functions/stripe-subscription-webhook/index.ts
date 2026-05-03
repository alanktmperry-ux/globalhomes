import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_SUBSCRIPTION_WEBHOOK_SECRET');
  if (!stripeKey || !webhookSecret) return new Response('Stripe not configured', { status: 503 });

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();
  if (!sig) return new Response('Missing signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (e) {
    console.error('Webhook verification failed', e);
    return new Response('Invalid signature', { status: 400 });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== 'subscription') return new Response('ignored', { status: 200 });

    const agentId = session.metadata?.agent_id;
    const planId = session.metadata?.plan_id;
    const annual = session.metadata?.annual === 'true';
    const listingLimit = parseInt(session.metadata?.listing_limit || '15');
    const seatLimit = parseInt(session.metadata?.seat_limit || '1');
    if (!agentId || !planId) return new Response('Missing metadata', { status: 400 });

    const subscriptionId = session.subscription as string;
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    const periodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString();

    await admin.from('agents').update({
      stripe_subscription_id: subscriptionId,
      is_subscribed: true,
      subscription_status: 'active',
      payment_failed_at: null,
    }).eq('id', agentId);

    const subPayload = {
      agent_id: agentId,
      plan_type: planId,
      listing_limit: listingLimit,
      seat_limit: seatLimit,
      annual_billing: annual,
      subscription_end: periodEnd,
      auto_renew: true,
    };
    const { data: existing } = await admin.from('agent_subscriptions').select('id').eq('agent_id', agentId).maybeSingle();
    if (existing) {
      await admin.from('agent_subscriptions').update(subPayload).eq('id', existing.id);
    } else {
      await admin.from('agent_subscriptions').insert(subPayload);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const { data: agentRow } = await admin.from('agents').select('id').eq('stripe_subscription_id', sub.id).maybeSingle();
    const agentId = sub.metadata?.agent_id || agentRow?.id;
    if (agentId) {
      await admin.from('agents').update({ is_subscribed: false, subscription_status: 'cancelled', stripe_subscription_id: null }).eq('id', agentId);
      await admin.from('agent_subscriptions').update({ plan_type: 'demo', auto_renew: false }).eq('agent_id', agentId);
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;
    const { data: agent } = await admin.from('agents').select('id').eq('stripe_customer_id', customerId).maybeSingle();
    if (agent) {
      await admin.from('agents').update({ payment_failed_at: new Date().toISOString(), subscription_status: 'past_due' }).eq('id', agent.id);
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;
    const { data: agent } = await admin.from('agents').select('id').eq('stripe_customer_id', customerId).maybeSingle();
    if (agent) {
      const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
      await admin.from('agents').update({ subscription_status: sub.status }).eq('id', agent.id);
      await admin.from('agent_subscriptions').update({ subscription_end: periodEnd, auto_renew: !sub.cancel_at_period_end }).eq('agent_id', agent.id);
    }
  }

  return new Response('ok', { status: 200 });
});
