import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, stripe-signature',
};

async function sendEmail(resendKey: string, to: string, subject: string, html: string) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'ListHQ <onboarding@resend.dev>', to: [to], subject, html }),
  });
  if (!resp.ok) console.error('Resend error', await resp.text());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!stripeKey || !webhookSecret) {
    return new Response('Stripe not configured', { status: 503, headers: corsHeaders });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();
  if (!sig) return new Response('Missing signature', { status: 400, headers: corsHeaders });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (e) {
    console.error('Webhook signature verification failed', e);
    return new Response('Invalid signature', { status: 400, headers: corsHeaders });
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response('ignored', { status: 200, headers: corsHeaders });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const agentId = session.metadata?.agent_id;
  const packageId = session.metadata?.package_id;
  if (!agentId || !packageId) {
    return new Response('Missing metadata', { status: 400, headers: corsHeaders });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Idempotency: skip if purchase already recorded
  const { data: existing } = await admin.from('halo_credit_purchases')
    .select('id').eq('stripe_session_id', session.id).maybeSingle();
  if (existing) return new Response('duplicate', { status: 200, headers: corsHeaders });

  const { data: pkg } = await admin.from('halo_credit_packages')
    .select('*').eq('id', packageId).maybeSingle();
  if (!pkg) return new Response('Package not found', { status: 404, headers: corsHeaders });

  // Upsert credits
  const { data: current } = await admin.from('halo_credits')
    .select('balance').eq('agent_id', agentId).maybeSingle();
  const newBalance = (current?.balance ?? 0) + pkg.credits;
  if (current) {
    await admin.from('halo_credits')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('agent_id', agentId);
  } else {
    await admin.from('halo_credits').insert({ agent_id: agentId, balance: newBalance });
  }

  await admin.from('halo_credit_transactions').insert({
    agent_id: agentId, amount: pkg.credits, type: 'grant', note: 'Stripe purchase',
  });

  await admin.from('halo_credit_purchases').insert({
    agent_id: agentId, package_id: pkg.id, stripe_session_id: session.id,
    credits_granted: pkg.credits, amount_paid_aud: pkg.price_aud, status: 'completed',
  });

  // Notify agent
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const { data: u } = await admin.auth.admin.getUserById(agentId);
  const email = u?.user?.email;
  if (email && resendKey) {
    await sendEmail(resendKey, email,
      'Your Halo credits have been added',
      `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;"><h1 style="font-size:22px;margin:0 0 12px;">Credits added</h1><p style="font-size:15px;line-height:1.5;">Your credits have been added. You now have <strong>${newBalance} credits</strong>.</p><p style="margin:24px 0;"><a href="https://globalhomes.lovable.app/dashboard/halo-board" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Go to Halo Board →</a></p></div>`);
  }

  return new Response('ok', { status: 200, headers: corsHeaders });
});
