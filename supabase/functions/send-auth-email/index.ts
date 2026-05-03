import "../_shared/email-footer.ts";
import {
  brandShell,
  brandButton,
  brandCodeBlock,
  BRAND,
} from "../_shared/email-brand.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

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

const heading = (t: string) =>
  `<h1 style="font-size:22px;font-weight:600;color:${BRAND.navy};margin:0 0 12px;">${t}</h1>`;
const body = (t: string) =>
  `<p style="font-size:14px;line-height:1.6;color:${BRAND.text};margin:0 0 8px;">${t}</p>`;
const muted = (t: string) =>
  `<p style="font-size:12px;color:${BRAND.textMuted};margin:18px 0 0;">${t}</p>`;

function buildEmail(actionType: string, token: string, redirectTo: string) {
  switch (actionType) {
    case 'signup':
    case 'magiclink':
    case 'email':
      return {
        subject: 'Your ListHQ verification code',
        text: `Your ListHQ verification code is: ${token} — expires in 10 minutes.`,
        html: brandShell(
          heading('Your verification code') +
            body('Enter this code to continue signing in to ListHQ. It expires in 10 minutes.') +
            brandCodeBlock(token) +
            muted("Didn't request this? You can safely ignore this email."),
          'Secure sign-in',
        ),
      };
    case 'recovery':
      return {
        subject: 'Reset your ListHQ password',
        text: `Click here to reset your password: ${redirectTo}`,
        html: brandShell(
          heading('Reset your password') +
            body('We received a request to reset your ListHQ password. Click the button below — this link expires in 1 hour.') +
            brandButton(redirectTo, 'Reset password →') +
            muted("Didn't request this? Your password has not been changed."),
          'Password reset',
        ),
      };
    case 'email_change':
      return {
        subject: 'Confirm your new ListHQ email address',
        text: `Your confirmation code is: ${token}`,
        html: brandShell(
          heading('Confirm your new email') +
            body('Use this code to confirm your new email address on ListHQ.') +
            brandCodeBlock(token) +
            muted("Didn't make this change? Contact us at support@listhq.com.au"),
          'Email change',
        ),
      };
    default:
      return {
        subject: 'ListHQ notification',
        text: `Your code is: ${token}`,
        html: brandShell(heading('Your code') + brandCodeBlock(token)),
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
        'x-email-essential': 'true',
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
