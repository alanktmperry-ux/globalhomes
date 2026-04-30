import "../_shared/email-footer.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { property_id, requested_from, requested_email, category_slug, custom_label, message, due_date } = body;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const APP_URL = Deno.env.get('APP_URL') ?? 'https://listhq.com.au';
    const RESEND = Deno.env.get('RESEND_API_KEY') ?? '';
    const FROM = Deno.env.get('EMAIL_FROM') ?? 'ListHQ <documents@listhq.com.au>';

    let recipientEmail = requested_email;
    let recipientName = 'there';
    if (requested_from && !recipientEmail) {
      const { data: u } = await supabase.auth.admin.getUserById(requested_from);
      recipientEmail = u?.user?.email;
      const { data: pr } = await supabase.from('profiles').select('full_name').eq('user_id', requested_from).maybeSingle();
      recipientName = (pr as any)?.full_name?.split(' ')[0] ?? 'there';
    }
    if (!recipientEmail || !RESEND) {
      return new Response(JSON.stringify({ error: 'No recipient or RESEND key' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: prop } = await supabase
      .from('properties').select('address, suburb, state').eq('id', property_id).single();

    let docLabel = custom_label ?? category_slug ?? 'a document';
    if (category_slug && !custom_label) {
      const { data: cat } = await supabase.from('document_categories').select('label').eq('slug', category_slug).single();
      docLabel = (cat as any)?.label ?? docLabel;
    }

    const uploadUrl = `${APP_URL}/property/${property_id}#documents`;
    const dueLine = due_date
      ? `<p style="font-size:13px;color:#d97706;margin:12px 0">📅 Please upload by ${new Date(due_date).toLocaleDateString('en-AU')}</p>`
      : '';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [recipientEmail],
        subject: `Document requested: ${docLabel} — ${prop?.address}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <p style="font-size:15px;color:#111">Hi ${recipientName},</p>
            <p style="font-size:14px;color:#555">A document has been requested for
               <strong>${prop?.address}, ${prop?.suburb} ${prop?.state}</strong>:</p>
            <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0">
              <p style="font-size:14px;font-weight:600;color:#111;margin:0">📄 ${docLabel}</p>
              ${message ? `<p style="font-size:13px;color:#666;margin:8px 0 0;font-style:italic">"${message}"</p>` : ''}
            </div>
            ${dueLine}
            <a href="${uploadUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;margin:12px 0">
              Upload Document →
            </a>
            <p style="font-size:12px;color:#999;margin:24px 0 0">
              You can upload directly on the property page. Your document will only be visible to authorised parties.
            </p>
          </div>
        `,
      }),
    });

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('send-document-request error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});