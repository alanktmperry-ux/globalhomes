import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Verify JWT first, before any other logic ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = user.id;

    const { listing_id, supplier_id, email_body } = await req.json();

    if (!listing_id || !supplier_id || !email_body?.trim()) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify agent owns this listing
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: agent } = await serviceClient
      .from('agents')
      .select('id, name, agency')
      .eq('user_id', userId)
      .maybeSingle();

    if (!agent) {
      return new Response(JSON.stringify({ error: 'Agent not found' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: listing } = await serviceClient
      .from('properties')
      .select('id, address, agent_id, marketing_email_sent')
      .eq('id', listing_id)
      .single();

    if (!listing || listing.agent_id !== agent.id) {
      return new Response(JSON.stringify({ error: 'Listing not found or not yours' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (listing.marketing_email_sent) {
      return new Response(JSON.stringify({ error: 'Email already sent for this listing.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch supplier
    const { data: supplier } = await serviceClient
      .from('agent_suppliers')
      .select('*')
      .eq('id', supplier_id)
      .eq('agent_id', agent.id)
      .single();

    if (!supplier) {
      return new Response(JSON.stringify({ error: 'Supplier not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const from = Deno.env.get('EMAIL_FROM') || `${agent.name} via ListHQ <noreply@listhq.com.au>`;

    const htmlBody = email_body.replace(/\n/g, '<br>');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [supplier.email],
        subject: `New Listing Brief — ${listing.address}`,
        html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#333;max-width:600px;">${htmlBody}</div>`,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Resend error:', errText);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark as sent
    await serviceClient
      .from('properties')
      .update({
        marketing_email_sent: true,
        marketing_email_sent_at: new Date().toISOString(),
      })
      .eq('id', listing_id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-marketing-email error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
