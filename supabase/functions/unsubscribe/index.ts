// Public unsubscribe endpoint. GET /unsubscribe?t=<signed-token>
// Token is HMAC-signed (user_id:category:ts:sig). 90-day expiry.
// Renders a minimal branded HTML page; records the row in public.unsubscribes.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyUnsubscribeToken } from '../_shared/email-frame.ts';

const HTML_HEADERS = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' };

function page(title: string, heading: string, body: string, ok: boolean): Response {
  const accent = ok ? '#2563eb' : '#dc2626';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · ListHQ</title>
<style>body{margin:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;}
.wrap{max-width:520px;margin:0 auto;padding:80px 24px;text-align:center;}
.brand{font-size:24px;font-weight:700;letter-spacing:-0.3px;margin-bottom:48px;color:#0f172a;}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:40px 28px;}
h1{margin:0 0 12px;font-size:24px;font-weight:600;color:#0f172a;}
p{margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;}
.dot{display:inline-block;width:48px;height:48px;border-radius:50%;background:${accent}1a;color:${accent};font-size:24px;line-height:48px;margin-bottom:16px;font-weight:700;}
a{color:#2563eb;text-decoration:none;}
.foot{margin-top:24px;font-size:12px;color:#94a3b8;}</style></head>
<body><div class="wrap"><div class="brand">ListHQ</div><div class="card"><div class="dot">${ok ? '✓' : '!'}</div><h1>${heading}</h1>${body}</div><div class="foot">© ListHQ Pty Ltd · Melbourne, Australia</div></div></body></html>`;
  return new Response(html, { status: 200, headers: HTML_HEADERS });
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  const url = new URL(req.url);
  const token = url.searchParams.get('t');
  if (!token) {
    return page('Invalid link', 'Link invalid', '<p>This unsubscribe link is missing or malformed.</p><p>You can manage your email preferences from your account dashboard.</p>', false);
  }

  const verified = await verifyUnsubscribeToken(token);
  if (!verified.valid) {
    if (verified.expired) {
      return page('Link expired', 'Link expired', '<p>This unsubscribe link has expired. To stop receiving welcome emails, please update your preferences from your account dashboard.</p><p><a href="https://listhq.com.au/login">Sign in to ListHQ</a></p>', false);
    }
    return page('Invalid link', 'Link invalid', '<p>This unsubscribe link could not be verified.</p><p>If you keep seeing this, contact <a href="mailto:support@listhq.com.au">support@listhq.com.au</a>.</p>', false);
  }

  const { userId, category } = verified;
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: target } = await admin.auth.admin.getUserById(userId!);
    const email = target?.user?.email || '';
    await admin
      .from('unsubscribes')
      .upsert({ user_id: userId, email, category: category || 'welcome' }, { onConflict: 'user_id,category' });
  } catch (e) {
    console.error('[unsubscribe] insert failed', e);
  }

  return page(
    'Unsubscribed',
    "You've been unsubscribed",
    `<p>You won't receive welcome emails from ListHQ anymore.</p><p>You'll still receive critical account, security, and legal emails.</p><p><a href="https://listhq.com.au">Return to ListHQ</a></p>`,
    true,
  );
});
