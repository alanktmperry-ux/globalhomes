// Supabase Auth "Send Email" hook for ListHQ.
//
// On Lovable Cloud, auth events (signup, recovery, magiclink, invite,
// email_change, reauthentication) are automatically routed to the edge
// function named `auth-email-hook`. We use Lovable's webhook signing
// (`@lovable.dev/webhooks-js`) to verify the request, but we deliberately
// SEND via Resend directly — not via the Lovable callback_url — so every
// auth email comes from `hello@listhq.com.au` with the ListHQ brand shell.
//
// All branding lives in `_shared/email-brand.ts`. Mark the Resend send as
// `x-email-essential: true` so the suppression footer middleware does not
// strip auth emails.

import "../_shared/email-footer.ts";
import { Webhook } from "@lovable.dev/webhooks-js";
import {
  brandShell,
  brandButton,
  brandCodeBlock,
  BRAND,
} from "../_shared/email-brand.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_ADDRESS = Deno.env.get("EMAIL_FROM") || "ListHQ <hello@listhq.com.au>";
const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET") || "";

interface AuthEmailPayload {
  user: { email: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url?: string;
  };
}

const heading = (t: string) =>
  `<h1 style="font-size:22px;font-weight:600;color:${BRAND.navy};margin:0 0 12px;">${t}</h1>`;
const body = (t: string) =>
  `<p style="font-size:14px;line-height:1.6;color:${BRAND.text};margin:0 0 8px;">${t}</p>`;
const muted = (t: string) =>
  `<p style="font-size:12px;color:${BRAND.textMuted};margin:18px 0 0;">${t}</p>`;
const supportFooter = () =>
  `<p style="font-size:12px;color:${BRAND.textMuted};margin:18px 0 0;">Need help? Contact us at <a href="mailto:support@listhq.com.au" style="color:${BRAND.tealDark};">support@listhq.com.au</a></p>`;

function buildEmail(actionType: string, token: string, redirectTo: string) {
  switch (actionType) {
    case "signup":
      return {
        subject: "Confirm your ListHQ account",
        html: brandShell(
          heading("Confirm your email") +
            body("Welcome to ListHQ. Tap the button below to verify your email address and finish setting up your account. This link expires in 1 hour.") +
            brandButton(redirectTo, "Verify email →") +
            muted("Didn't sign up? You can safely ignore this email.") +
            supportFooter(),
          "Welcome to ListHQ",
        ),
        text: `Confirm your ListHQ email: ${redirectTo}`,
      };
    case "recovery":
      return {
        subject: "Reset your ListHQ password",
        html: brandShell(
          heading("Reset your password") +
            body("We received a request to reset your ListHQ password. Click the button below to choose a new one — this link expires in 1 hour.") +
            brandButton(redirectTo, "Reset password →") +
            muted("Didn't request this? Your password has not been changed.") +
            supportFooter(),
          "Password reset",
        ),
        text: `Reset your ListHQ password: ${redirectTo}`,
      };
    case "magiclink":
      return {
        subject: "Your ListHQ sign-in link",
        html: brandShell(
          heading("Sign in to ListHQ") +
            body("Tap the button below to sign in to your ListHQ account. This link expires in 1 hour and can only be used once.") +
            brandButton(redirectTo, "Sign in →") +
            muted("Didn't request this? You can safely ignore this email.") +
            supportFooter(),
          "Secure sign-in",
        ),
        text: `Sign in to ListHQ: ${redirectTo}`,
      };
    case "invite":
      return {
        subject: "You've been invited to ListHQ",
        html: brandShell(
          heading("You've been invited") +
            body("You've been invited to join ListHQ — Australia's multilingual property platform. Accept your invitation below to get started.") +
            brandButton(redirectTo, "Accept invitation →") +
            supportFooter(),
          "Invitation",
        ),
        text: `Accept your ListHQ invitation: ${redirectTo}`,
      };
    case "email_change":
      return {
        subject: "Confirm your new ListHQ email",
        html: brandShell(
          heading("Confirm your new email address") +
            body("Use the code below to confirm the new email address on your ListHQ account.") +
            brandCodeBlock(token) +
            muted("Didn't make this change? Contact us immediately at support@listhq.com.au.") +
            supportFooter(),
          "Email change",
        ),
        text: `Your ListHQ email-change code is: ${token}`,
      };
    case "reauthentication":
      return {
        subject: "Your ListHQ verification code",
        html: brandShell(
          heading("Your verification code") +
            body("Enter this code to confirm your identity. It expires in 10 minutes.") +
            brandCodeBlock(token) +
            supportFooter(),
          "Identity check",
        ),
        text: `Your ListHQ verification code is: ${token}`,
      };
    default:
      return {
        subject: "ListHQ notification",
        html: brandShell(heading("Your code") + brandCodeBlock(token) + supportFooter()),
        text: `Your code: ${token}`,
      };
  }
}

async function sendViaResend(to: string, subject: string, html: string, text: string) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "x-email-essential": "true",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Resend ${res.status}: ${errorBody}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    let payload: AuthEmailPayload;

    // Verify webhook signature when a hook secret is provisioned (Lovable
    // Cloud auth automatically signs requests with SEND_EMAIL_HOOK_SECRET).
    if (HOOK_SECRET) {
      try {
        const wh = new Webhook(HOOK_SECRET);
        const headers: Record<string, string> = {};
        req.headers.forEach((v, k) => (headers[k] = v));
        payload = wh.verify(rawBody, headers) as AuthEmailPayload;
      } catch (err) {
        console.error("auth-email-hook signature verification failed:", err);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else {
      payload = JSON.parse(rawBody);
    }

    const email = payload?.user?.email;
    const { token, redirect_to, email_action_type } = payload?.email_data ?? {} as AuthEmailPayload["email_data"];

    if (!email || !email_action_type) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { subject, html, text } = buildEmail(email_action_type, token, redirect_to);
    const result = await sendViaResend(email, subject, html, text);

    console.log(
      `auth-email-hook sent ${email_action_type} to ${email} (resend id=${result?.id})`,
    );

    return new Response(JSON.stringify({ success: true, id: result?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auth-email-hook error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
