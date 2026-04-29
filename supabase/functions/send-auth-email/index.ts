// IMPORTANT: Register this as a Supabase Auth Hook in the dashboard:
// Supabase Dashboard → Authentication → Hooks → Send Email Hook
// Set the URL to: https://[project-ref].supabase.co/functions/v1/send-auth-email

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuthEmailPayload {
  user: { email: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
  };
}

const FROM_ADDRESS = Deno.env.get('EMAIL_FROM') || 'ListHQ <noreply@listhq.com.au>';

function buildEmail(actionType: string, token: string, redirectTo: string) {
  switch (actionType) {
    case 'signup':
    case 'magiclink':
    case 'email':
      return {
        subject: 'Your ListHQ login code',
        text: `Your verification code is: ${token} — expires in 10 minutes.`,
        html: `<p>Your verification code is: <strong>${token}</strong></p><p>This code expires in 10 minutes.</p>`,
      };
    case 'recovery':
      return {
        subject: 'Reset your ListHQ password',
        text: `Click here to reset your password: ${redirectTo}`,
        html: `<p>Click the link below to reset your password:</p><p><a href="${redirectTo}">${redirectTo}</a></p>`,
      };
    case 'email_change':
      return {
        subject: 'Confirm your new email address',
        text: `Your confirmation code is: ${token}`,
        html: `<p>Your confirmation code is: <strong>${token}</strong></p>`,
      };
    default:
      return {
        subject: 'ListHQ notification',
        text: `Your code is: ${token}`,
        html: `<p>Your code is: <strong>${token}</strong></p>`,
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = (await req.json()) as AuthEmailPayload;
    const email = payload?.user?.email;
    const { token, redirect_to, email_action_type } = payload?.email_data ?? {} as AuthEmailPayload['email_data'];

    if (!email || !email_action_type) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { subject, text, html } = buildEmail(email_action_type, token, redirect_to);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [email],
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('Resend error:', res.status, errorBody);
      return new Response(
        JSON.stringify({ success: false, status: res.status, error: errorBody }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-auth-email error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
