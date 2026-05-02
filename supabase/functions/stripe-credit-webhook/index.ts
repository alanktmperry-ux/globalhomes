import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

// NOTE: This is a server-to-server webhook called by Stripe. No CORS, no browser access.

async function sendEmail(resendKey: string, to: string, subject: string, html: string) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'ListHQ <onboarding@resend.dev>', to: [to], subject, html }),
  });
  if (!resp.ok) console.error('Resend error', await resp.text());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('Method Not Allowed', { status: 405 });

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
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
  const agentId = session.metadata?.agent_id;
  const packageId = session.metadata?.package_id;
  if (!agentId || !packageId) {
    return new Response('Missing metadata', { status: 400 });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: pkg } = await admin.from('halo_credit_packages')
    .select('*').eq('id', packageId).maybeSingle();
  if (!pkg) return new Response('Package not found', { status: 404 });

  // Idempotency via DB unique constraint on stripe_session_id.
  // Insert FIRST — if it duplicates, we treat as already-processed and exit without crediting.
  const { error: purchaseErr } = await admin.from('halo_credit_purchases').insert({
    agent_id: agentId,
    package_id: pkg.id,
    stripe_session_id: session.id,
    credits_granted: pkg.credits,
    amount_paid_aud: pkg.price_aud,
    status: 'completed',
  });
  if (purchaseErr) {
    // 23505 = unique_violation → duplicate webhook delivery, safe to ignore
    if ((purchaseErr as any).code === '23505') {
      console.log(`Duplicate Stripe session ${session.id} — already processed, skipping credit.`);
      return new Response('duplicate', { status: 200 });
    }
    console.error('halo_credit_purchases insert failed', purchaseErr);
    return new Response('Insert failed', { status: 500 });
  }

  // Atomic credit increment via RPC (no read-then-write race)
  const { data: newBalance, error: rpcErr } = await admin.rpc('increment_halo_credits', {
    p_agent_id: agentId,
    p_credits: pkg.credits,
  });
  if (rpcErr) {
    console.error('increment_halo_credits RPC failed', rpcErr);
    return new Response('Credit increment failed', { status: 500 });
  }

  // Only insert the transaction log when the purchase insert above succeeded
  // (we already returned early on duplicate-session). This prevents duplicate
  // ledger rows on webhook retries.
  await admin.from('halo_credit_transactions').insert({
    agent_id: agentId, amount: pkg.credits, type: 'grant', note: 'Stripe purchase',
    stripe_session_id: session.id,
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

  return new Response('ok', { status: 200 });
});
