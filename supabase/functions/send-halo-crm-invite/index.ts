import "../_shared/email-footer.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const APP_URL = Deno.env.get('APP_URL') ?? 'https://listhq.com.au';
// NOTE: Falls back to onboarding@resend.dev until listhq.com.au DNS is verified in Resend.
const FROM = 'ListHQ <noreply@listhq.com.au>';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { contact_email, contact_name, agent_id } = await req.json();
    if (!contact_email || !agent_id) {
      return new Response(JSON.stringify({ error: 'contact_email and agent_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const resendKey = Deno.env.get('RESEND_API_KEY');

    // Look up agent name + agency
    const { data: agent } = await admin
      .from('agents')
      .select('name, agency')
      .eq('user_id', agent_id)
      .maybeSingle();
    const agentName = agent?.name ?? 'Your agent';
    const agency = agent?.agency ?? 'ListHQ';

    if (resendKey) {
      const link = `${APP_URL}/halo/new?source_agent_id=${agent_id}&source_type=crm_invite`;
      const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
<h1 style="font-size:22px;margin:0 0 12px;">Hi ${contact_name ?? 'there'},</h1>
<p style="font-size:15px;line-height:1.5;">${agentName} from ${agency} thought you might be interested in ListHQ's Halo feature.</p>
<p style="font-size:15px;line-height:1.5;">Post a free Halo — tell agents exactly what property you're looking for, and let them come to you.</p>
<p style="font-size:14px;line-height:1.6;color:#334155;">${agentName} will be notified when agents respond to your Halo.</p>
<p style="margin:24px 0;"><a href="${link}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Post my Halo →</a></p>
<p style="font-size:12px;color:#64748b;margin-top:32px;">— The ListHQ team</p></div>`;

      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM, to: [contact_email],
          subject: `${agentName} invited you to post a Halo on ListHQ`,
          html,
        }),
      });
      if (!resp.ok) console.error('Resend error', await resp.text());
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});