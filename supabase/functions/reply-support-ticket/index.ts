import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logAdminAction } from "../_shared/adminAudit.ts";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } },
  );
  const token = auth.slice(7);
  const { data: claimsRes, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsRes?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  const userId = claimsRes.claims.sub as string;

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Verify role
  const { data: roleCheck } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['admin', 'support']);
  if (!roleCheck || roleCheck.length === 0) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  let payload: any;
  try { payload = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  const ticket_id = String(payload?.ticket_id ?? '');
  const body = String(payload?.body ?? '').trim();
  const newStatus = payload?.status ? String(payload.status) : null;

  if (!/^[0-9a-f-]{36}$/i.test(ticket_id)) {
    return new Response(JSON.stringify({ error: 'Invalid ticket_id' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  if (!body || body.length > 10000) {
    return new Response(JSON.stringify({ error: 'Reply body required (max 10000 chars)' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const { data: ticket, error: tErr } = await admin
    .from('support_tickets')
    .select('id, email, subject, full_name, status')
    .eq('id', ticket_id)
    .maybeSingle();
  if (tErr || !ticket) {
    return new Response(JSON.stringify({ error: 'Ticket not found' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // Insert reply message
  const { error: mErr } = await admin.from('support_messages').insert({
    ticket_id,
    sender_type: 'admin',
    sender_id: userId,
    body,
  } as any);
  if (mErr) {
    console.error('[reply-support-ticket] message insert failed', mErr);
    return new Response(JSON.stringify({ error: 'Could not save reply' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // Update ticket status (default: waiting_on_user)
  const targetStatus = ['new','in_progress','waiting_on_user','resolved','closed'].includes(newStatus ?? '')
    ? newStatus!
    : 'waiting_on_user';
  const updates: Record<string, unknown> = { status: targetStatus };
  if (targetStatus === 'resolved') updates.resolved_at = new Date().toISOString();
  await admin.from('support_tickets').update(updates).eq('id', ticket_id);

  // Send email
  try {
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey && ticket.email) {
      const from = Deno.env.get('EMAIL_FROM') || 'ListHQ Support <hello@listhq.com.au>';
      const greet = ticket.full_name ? `Hi ${ticket.full_name},` : 'Hi there,';
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from, to: [ticket.email], reply_to: 'support@listhq.com.au',
          subject: `Re: ${ticket.subject}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:560px"><p>${escapeHtml(greet)}</p><div style="white-space:pre-wrap;color:#0f172a">${escapeHtml(body).replace(/\n/g,'<br/>')}</div><p style="color:#64748b;font-size:12px;margin-top:24px">Reply to this email to continue the conversation.<br/>Ticket reference: <code>${ticket.id}</code></p></div>`,
        }),
      });
    }
  } catch (e) { console.error('[reply-support-ticket] email send failed', e); }

  await logAdminAction({
    actor_id: userId,
    actor_email: (claimsRes.claims.email as string) ?? 'unknown',
    action: 'support_ticket.replied',
    target_type: 'support_ticket', target_id: ticket.id,
    target_summary: `Ticket: ${ticket.subject}`,
    after_state: { status: targetStatus },
    notes: body.length > 240 ? body.slice(0, 240) + '…' : body,
    request: req,
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
