// ListHQ welcome email sender (Touch 2 + Touch 3).
// Contract: POST { user_id: string, category: 'verified' | 'first_halo' | 'first_listing' | 'partner_approved' }
// Honors the public.unsubscribes table (category='welcome' suppresses all welcome emails).
// Australian Spam Act 2003: every welcome email includes a working unsubscribe link.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { renderEmail, buildUnsubscribeToken } from '../_shared/email-frame.ts';

const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'ListHQ <hello@listhq.com.au>';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://listhq.com.au';

type Category = 'verified' | 'first_halo' | 'first_listing' | 'partner_approved';
type Role = 'seeker' | 'agent' | 'partner';

interface BuildArgs { hero: string; body: string; bullets: string[]; cta?: string; ctaPath?: string; subject: string; disclaimer: string; }

function content(category: Category, role: Role, partnerType?: string): BuildArgs {
  const baseDisclaimer = role === 'partner'
    ? "You're receiving this because you applied to be a ListHQ Partner."
    : "You're receiving this because you just signed up for ListHQ.";

  if (category === 'verified') {
    if (role === 'agent') return {
      subject: 'Your 60-day trial is live',
      hero: 'Welcome to ListHQ',
      body: 'Your free 60-day trial is now active. The fastest path to your first listing:',
      bullets: [
        'Complete your agency profile — ABN, licence, trust account details (5 minutes)',
        'Publish your first pocket listing — voice-to-AI-copy in 60 seconds',
        'Translate it — one click into Mandarin, Vietnamese, Cantonese for buyer reach',
      ],
      cta: 'Open My Dashboard', ctaPath: '/dashboard',
      disclaimer: baseDisclaimer,
    };
    if (role === 'partner') return {
      subject: 'Your application is in review',
      hero: 'Application received',
      body: "Thanks for applying to ListHQ Partner. Our team reviews every application personally — we'll get back to you within 24 hours. In the meantime, here's what happens next:",
      bullets: [
        'We verify your ABN and credentials',
        'We confirm your trust accounting setup matches AFA requirements',
        'We grant you portal access and notify you by email',
      ],
      disclaimer: baseDisclaimer,
    };
    return {
      subject: "You're in — let's find your next home",
      hero: 'Welcome to ListHQ',
      body: "Your account is active. Here's how seekers like you find properties faster on ListHQ:",
      bullets: [
        'Post a Halo — tell us what you\'re looking for, agents bring matches to you',
        'Switch languages anytime — search Mandarin, Vietnamese, Cantonese, Korean, and 16 more',
        'Save searches — get an alert the moment a property hits the market',
      ],
      cta: 'Open My Dashboard', ctaPath: '/seeker/dashboard',
      disclaimer: baseDisclaimer,
    };
  }
  if (category === 'first_halo') return {
    subject: 'Your first Halo is live — agents are looking now',
    hero: 'Nice work',
    body: 'Your first Halo is live on ListHQ. Agents across our network can see it now and bring matching properties to you. What to expect:',
    bullets: [
      'First match within 48 hours for most active suburbs',
      'Notifications when an agent responds — no email spam, just real matches',
      "You're in control — accept, decline, or message agents directly",
    ],
    cta: 'View My Halos', ctaPath: '/seeker/dashboard',
    disclaimer: baseDisclaimer,
  };
  if (category === 'first_listing') return {
    subject: 'Your first listing is live',
    hero: 'Your listing is live',
    body: "Your first listing is published. Here's how to maximize it:",
    bullets: [
      'Translate it — one click reaches Mandarin, Vietnamese, and Cantonese buyers',
      'Share it pre-market — send it to your trusted network before public release',
      'Track engagement — your dashboard shows views, saves, and inquiries in real time',
    ],
    cta: 'View My Listings', ctaPath: '/dashboard/listings',
    disclaimer: baseDisclaimer,
  };
  // partner_approved
  const broker = partnerType === 'broker' || partnerType === 'mortgage_broker';
  return {
    subject: "You're approved — welcome to ListHQ Partner",
    hero: "You're approved",
    body: "Welcome to ListHQ Partner. Your portal is now live. Here's what's waiting:",
    bullets: broker ? [
      'Lead pipeline from ListHQ buyer searches',
      'Embeddable mortgage calculator widget',
      'Conversion tracking and referral analytics',
    ] : [
      'Multi-agency dashboard, full audit trail, AFA-compliant ledger',
      'One login across all your client agencies — no more juggling logins',
      'Reconciliation tools and statement generation built in',
    ],
    cta: 'Open Partner Portal', ctaPath: broker ? '/partner/broker' : '/partner/dashboard',
    disclaimer: baseDisclaimer,
  };
}

function normalizeRole(raw: unknown): Role {
  const v = String(raw || '').toLowerCase();
  if (v === 'agent') return 'agent';
  if (v === 'partner' || v === 'trust_accountant' || v === 'broker' || v === 'mortgage_broker') return 'partner';
  return 'seeker';
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    // Verify caller is authenticated (any signed-in user can request a welcome — function dedupes server-side).
    const authedClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user: caller }, error: authErr } = await authedClient.auth.getUser();
    if (authErr || !caller) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Accept new contract OR legacy {type, user_id, name, email, agency} for back-compat.
    const payload = await req.json().catch(() => ({}));
    const user_id: string = payload.user_id;
    let category: Category = payload.category;

    if (!category && payload.type) {
      // Legacy mapping → 'verified'
      category = 'verified';
    }
    if (!user_id || !category) return json({ error: 'Missing user_id or category' }, 400);
    if (!['verified', 'first_halo', 'first_listing', 'partner_approved'].includes(category)) {
      return json({ error: 'Invalid category' }, 400);
    }
    if (!RESEND_KEY) return json({ ok: false, reason: 'resend_not_configured' });

    // Look up the target user
    const { data: targetUserRes, error: tuErr } = await admin.auth.admin.getUserById(user_id);
    if (tuErr || !targetUserRes?.user?.email) return json({ ok: false, reason: 'user_not_found' });
    const target = targetUserRes.user;
    const email = target.email!;

    // Check unsubscribe
    const { data: unsub } = await admin
      .from('unsubscribes')
      .select('id')
      .eq('user_id', user_id)
      .eq('category', 'welcome')
      .maybeSingle();
    if (unsub) {
      console.log('[send-welcome-email] skipped — unsubscribed', { user_id, category });
      return json({ ok: true, skipped: 'unsubscribed' });
    }

    // Idempotency: skip if a welcome of this category was already sent
    const tplKey = `welcome_${category}`;
    const { data: prev } = await admin
      .from('email_log')
      .select('id')
      .eq('recipient_email', email)
      .eq('template', tplKey)
      .maybeSingle();
    if (prev) {
      console.log('[send-welcome-email] skipped — already sent', { user_id, category });
      return json({ ok: true, skipped: 'already_sent' });
    }

    // Determine role
    let role: Role;
    let partnerType: string | undefined;
    if (category === 'partner_approved') {
      role = 'partner';
      const { data: partnerRow } = await admin.from('partners' as any).select('partner_type').eq('user_id', user_id).maybeSingle();
      partnerType = (partnerRow as any)?.partner_type;
    } else {
      role = normalizeRole((target.user_metadata as any)?.registered_as);
    }

    const c = content(category, role, partnerType);
    const token = await buildUnsubscribeToken(user_id, 'welcome');
    const unsubscribeLink = `${APP_URL}/unsubscribe?t=${token}`;
    const ctaLink = c.ctaPath ? `${APP_URL}${c.ctaPath}` : undefined;

    const rendered = renderEmail({
      subject: c.subject,
      hero: c.hero,
      body: c.body,
      bulletList: c.bullets,
      cta: c.cta,
      ctaLink,
      disclaimer: c.disclaimer,
      unsubscribeLink,
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: EMAIL_FROM, to: [email], subject: rendered.subject, html: rendered.html, text: rendered.text }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[send-welcome-email] Resend failed', errText);
      return json({ ok: false, reason: 'send_failed', detail: errText }, 502);
    }

    await admin.from('email_log').insert({
      recipient_email: email,
      recipient_id: user_id,
      template: tplKey,
      subject: rendered.subject,
      sent_at: new Date().toISOString(),
    } as any);

    return json({ ok: true });
  } catch (err) {
    console.error('[send-welcome-email] error', err);
    return json({ error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});
