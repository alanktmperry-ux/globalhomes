import { translateEmailPayload } from "../_shared/translateEmailPayload.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('POST only', { status: 405, headers: corsHeaders });
  }
  try {
    const { targetLocale = 'zh', subject, body, isHtml } = await req.json();
    if (!subject || !body) {
      return new Response(JSON.stringify({ error: 'subject and body required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const result = await translateEmailPayload({ subject, body, isHtml }, targetLocale);
    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
