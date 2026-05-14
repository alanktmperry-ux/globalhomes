import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const ALLOWED_CATEGORIES = new Set([
  'billing','technical','listing','agent_support','feature_request','complaint','other',
]);
const ALLOWED_PRIORITIES = new Set(['low','normal','high','urgent']);

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  let payload: any;
  try { payload = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const email = String(payload?.email ?? '').trim().toLowerCase();
  const subject = String(payload?.subject ?? '').trim();
  const body = String(payload?.body ?? '').trim();
  const full_name = payload?.full_name ? String(payload.full_name).trim().slice(0, 200) : null;
  const category = String(payload?.category ?? 'other');
  const priority = String(payload?.priority ?? 'normal');
  const context = payload?.context && typeof payload.context === 'object' ? payload.context : null;

  if (!email || !/^\S+@\S+\.\S+$/.test(email) || email.length > 255) {
    return new Response(JSON.stringify({ error: 'Valid email required' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  if (!subject || subject.length > 200) {
    return new Response(JSON.stringify({ error: 'Subject required (max 200 chars)' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  if (!body || body.length > 5000) {
    return new Response(JSON.stringify({ error: 'Message required (max 5000 chars)' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  if (!ALLOWED_CATEGORIES.has(category)) {
    return new Response(JSON.stringify({ error: 'Invalid category' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  if (!ALLOWED_PRIORITIES.has(priority)) {
    return new Response(JSON.stringify({ error: 'Invalid priority' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Try to resolve user from auth header (optional)
  let user_id: string | null = null;
  const auth = req.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) {
    try {
      const anon = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: auth } } },
      );
      const { data } = await anon.auth.getClaims(auth.slice(7));
      user_id = data?.claims?.sub ?? null;
    } catch { /* ignore */ }
  }

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id,
      email,
      full_name,
      // legacy NOT NULL columns kept satisfied for safety
      submitter_email: email,
      submitter_name: full_name ?? email.split('@')[0],
      description: body,
      subject,
      body,
      category,
      priority,
      status: 'new',
      context,
    } as any)
    .select('id, created_at')
    .maybeSingle();

  if (error || !ticket) {
    console.error('[submit-support-ticket] insert failed', error);
    return new Response(JSON.stringify({ error: 'Could not create ticket' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // Initial message from the user
  await supabase.from('support_messages').insert({
    ticket_id: ticket.id,
    sender_type: 'user',
    sender_id: user_id,
    body,
  } as any);

  // Best-effort confirmation email
  try {
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      const from = Deno.env.get('EMAIL_FROM') || 'ListHQ Support <hello@listhq.com.au>';
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from, to: [email], reply_to: 'support@listhq.com.au',
          subject: `[Support] We received your request: ${subject}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:560px"><h2 style="margin:0 0 12px">Thanks${full_name ? `, ${full_name}` : ''} — we've got your request.</h2><p>Our team will get back to you shortly. For reference, here's your message:</p><blockquote style="border-left:3px solid #e5e7eb;margin:16px 0;padding:8px 16px;color:#475569">${escapeHtml(body).replace(/\n/g,'<br/>')}</blockquote><p style="color:#64748b;font-size:12px">Ticket reference: <code>${ticket.id}</code></p></div>`,
        }),
      });
    }
  } catch (e) { console.error('[submit-support-ticket] confirmation email failed', e); }

  return new Response(JSON.stringify({ ok: true, id: ticket.id }), {
    status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
  });
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
