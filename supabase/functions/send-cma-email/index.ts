import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const APP_URL = Deno.env.get('APP_URL') || 'https://listhq.com.au'

  const { cma_id, recipient_email, recipient_name } = await req.json()
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { data: cma } = await supabase
    .from('cma_reports')
    .select('*')
    .eq('id', cma_id)
    .single()

  if (!cma || !cma.is_shared) {
    return new Response(JSON.stringify({ error: 'Not found or not shared' }), { status: 404, headers: corsHeaders })
  }

  const { data: agent } = await supabase
    .from('agents')
    .select('name, phone')
    .eq('id', cma.agent_id)
    .single()

  const cmaUrl = `${APP_URL}/cma/${cma.share_token}`
  const priceFormatted = cma.agent_recommended_price
    ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(cma.agent_recommended_price)
    : null

  const toEmail = recipient_email || cma.prepared_for_email
  if (!toEmail) {
    return new Response(JSON.stringify({ error: 'No recipient email' }), { status: 400, headers: corsHeaders })
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${agent?.name ?? 'ListHQ'} via ListHQ <noreply@listhq.com.au>`,
      to: toEmail,
      subject: `Your Property Market Analysis — ${cma.subject_address}`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h1 style="font-size:20px;margin-bottom:8px">Your Comparative Market Analysis</h1>
        <p>Hi ${recipient_name || cma.vendor_name || 'there'},</p>
        <p>${agent?.name ?? 'Your agent'} has prepared a market analysis for:</p>
        <p style="font-size:16px;font-weight:600">${cma.subject_address}, ${cma.subject_suburb} ${cma.subject_state}</p>
        ${priceFormatted ? `<p>Recommended price: <strong>${priceFormatted}</strong></p>` : ''}
        <a href="${cmaUrl}" style="display:inline-block;background:#2563eb;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;margin:16px 0">View Your Market Analysis</a>
        <p style="font-size:12px;color:#888;margin-top:24px">Powered by ListHQ</p>
      </div>`
    })
  })

  return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
