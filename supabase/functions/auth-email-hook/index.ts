// Supabase Auth "Send Email" hook for ListHQ — receives webhooks from
// Lovable Cloud's managed email proxy (api.lovable.dev/.../backend/email-hook)
// and delivers branded auth emails via Resend from hello@listhq.com.au.
//
// Payload shape (Lovable webhook envelope):
//   { version, type, run_id, data: { email, action_type, url, token, new_email, callback_url } }

import { verifyWebhookRequest, type EmailWebhookPayload } from "npm:@lovable.dev/webhooks-js@0.0.1";
import { logAuth, clientIp } from "../_shared/audit.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_ADDRESS = Deno.env.get("EMAIL_FROM") || "ListHQ <hello@listhq.com.au>";
// Lovable's managed email proxy signs requests with LOVABLE_API_KEY.
const HOOK_SECRET = Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("SEND_EMAIL_HOOK_SECRET") || "";

type Role = "seeker" | "agent" | "partner";

interface EmailContent {
  subject: string;
  hero: string;
  body: string;
  body2?: string;
  cta: string;
  disclaimer: string;
}

// ---------- Brand frame ----------

function renderEmail(content: EmailContent, link: string): { subject: string; html: string; text: string } {
  const { subject, hero, body, body2, cta, disclaimer } = content;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
<tr><td style="padding:0 0 24px 0;"><div style="font-size:24px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">ListHQ</div></td></tr>
<tr><td style="padding:0 0 12px 0;"><h1 style="margin:0 0 12px 0;font-size:28px;line-height:1.25;font-weight:600;color:#0f172a;">${hero}</h1></td></tr>
<tr><td style="padding:0 0 16px 0;"><p style="margin:0;font-size:15px;line-height:1.6;color:#475569;">${body}</p></td></tr>
${body2 ? `<tr><td style="padding:0 0 24px 0;"><p style="margin:0;font-size:15px;line-height:1.6;color:#475569;">${body2}</p></td></tr>` : ""}
<tr><td style="padding:8px 0 24px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:10px;background:#2563eb;"><a href="${link}" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:500;color:#ffffff;text-decoration:none;border-radius:10px;">${cta}</a></td></tr></table></td></tr>
<tr><td style="padding:0 0 32px 0;"><p style="margin:0;font-size:13px;line-height:1.5;color:#94a3b8;font-style:italic;">${disclaimer}</p></td></tr>
<tr><td style="padding:0;border-top:1px solid #e2e8f0;"></td></tr>
<tr><td align="center" style="padding:20px 0 8px 0;"><p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">Questions? <a href="mailto:support@listhq.com.au" style="color:#2563eb;text-decoration:none;">support@listhq.com.au</a></p></td></tr>
<tr><td align="center" style="padding:0 0 8px 0;"><p style="margin:0;font-size:11px;line-height:1.6;color:#94a3b8;">ListHQ — Australia's multilingual real estate platform</p></td></tr>
<tr><td align="center" style="padding:0;"><p style="margin:0;font-size:11px;line-height:1.6;color:#94a3b8;"><a href="https://listhq.com.au/terms" style="color:#94a3b8;text-decoration:underline;">Terms</a> · <a href="https://listhq.com.au/privacy" style="color:#94a3b8;text-decoration:underline;">Privacy</a></p></td></tr>
</table></td></tr></table></body></html>`;

  const text = `${hero}\n\n${body}${body2 ? "\n\n" + body2 : ""}\n\n${cta}: ${link}\n\n${disclaimer}\n\nQuestions? support@listhq.com.au`;
  return { subject, html, text };
}

function signupContent(role: Role): EmailContent {
  if (role === "agent") return {
    subject: "Welcome to ListHQ — your 60-day free trial starts here",
    hero: "Welcome to ListHQ",
    body: "Your free 60-day trial starts the moment you verify your email. No credit card required. Multilingual listings in 20 languages, pre-market sharing across our agent network, AI buyer matching, AFA-compliant trust accounting — everything you need to grow your agency.",
    body2: "Click below to verify your email and activate your trial.",
    cta: "Verify Email & Start Trial",
    disclaimer: "If you didn't sign up for ListHQ, you can safely ignore this email.",
  };
  if (role === "partner") return {
    subject: "Welcome to ListHQ Partner — verify your email",
    hero: "Welcome to ListHQ Partner",
    body: "Manage trust accounting across multiple agencies from a single login. Full audit trail on every transaction. Compliance-grade controls.",
    body2: "Click below to verify your email. We'll review your application and notify you within 24 hours.",
    cta: "Verify Email",
    disclaimer: "If you didn't sign up for ListHQ Partner, you can safely ignore this email.",
  };
  return {
    subject: "Welcome to ListHQ — confirm your email",
    hero: "Welcome to ListHQ",
    body: "You're moments away from finding your next home. ListHQ is Australia's only multilingual property platform — search in 20 languages, see off-market listings before they hit the public market, and get AI-matched to properties that fit your brief.",
    body2: "Click below to verify your email and start your search.",
    cta: "Verify Email & Start Searching",
    disclaimer: "If you didn't sign up for ListHQ, you can safely ignore this email.",
  };
}

const recoveryContent: EmailContent = {
  subject: "Reset your ListHQ password",
  hero: "Password reset",
  body: "We received a request to reset your ListHQ password. Click below to set a new one. The link expires in 1 hour.",
  cta: "Reset Password",
  disclaimer: "If you didn't request a password reset, you can safely ignore this email — your password won't change.",
};

const emailChangeContent: EmailContent = {
  subject: "Confirm your new ListHQ email",
  hero: "Confirm new email",
  body: "Click below to confirm your new email address for ListHQ.",
  cta: "Confirm New Email",
  disclaimer: "If you didn't request this change, contact us immediately at support@listhq.com.au.",
};

const inviteContent: EmailContent = {
  subject: "You're invited to ListHQ",
  hero: "You're invited",
  body: "Someone has invited you to ListHQ. Click below to set up your account and get started.",
  cta: "Accept Invitation",
  disclaimer: "If you weren't expecting this invitation, you can safely ignore it.",
};

const magicLinkContent: EmailContent = {
  subject: "Sign in to ListHQ",
  hero: "Sign in to ListHQ",
  body: "Click below to sign in to your ListHQ account. The link expires in 1 hour.",
  cta: "Sign In →",
  disclaimer: "If you didn't request this sign-in link, you can safely ignore this email.",
};

const reauthContent: EmailContent = {
  subject: "Your ListHQ verification code",
  hero: "Verify your identity",
  body: "Click below to confirm your identity and continue. The link expires shortly.",
  cta: "Confirm Identity",
  disclaimer: "If you didn't request this, contact support@listhq.com.au immediately.",
};

function pickContent(actionType: string, role: Role): EmailContent {
  switch (actionType) {
    case "signup":
    case "confirmation":
      return signupContent(role);
    case "recovery":
    case "password_recovery":
      return recoveryContent;
    case "email_change":
    case "email_change_new":
    case "email_change_current":
      return emailChangeContent;
    case "invite":
      return inviteContent;
    case "magiclink":
    case "magic_link":
      return magicLinkContent;
    case "reauthentication":
      return reauthContent;
    default:
      return signupContent(role);
  }
}

function normaliseRole(raw: unknown): Role {
  const v = typeof raw === "string" ? raw.toLowerCase() : "";
  if (v === "agent") return "agent";
  if (v === "partner") return "partner";
  return "seeker";
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
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Resend ${res.status}: ${errorBody}`);
  }
  return await res.json();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    let payload: EmailWebhookPayload;

    if (HOOK_SECRET) {
      try {
        const verified = await verifyWebhookRequest<EmailWebhookPayload>({
          req,
          secret: HOOK_SECRET,
        });
        payload = verified.payload;
      } catch (err) {
        console.error("auth-email-hook signature verification failed:", err);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      payload = (await req.json()) as EmailWebhookPayload;
    }

    const data = payload?.data ?? {};
    const email = (data.email as string) || "";
    const action_type = (data.action_type as string) || "signup";
    const link = (data.url as string) || "";
    // Role isn't passed in Lovable envelope; default to seeker. Agent/partner branding
    // is best-effort via metadata if present in data.
    const role = normaliseRole((data as Record<string, unknown>).registered_as);

    if (!email) {
      console.error("auth-email-hook missing email in payload", payload);
      return new Response(JSON.stringify({ error: "Invalid payload: missing email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = pickContent(action_type, role);
    const { subject, html, text } = renderEmail(content, link);
    const result = await sendViaResend(email, subject, html, text);

    console.log(
      `auth-email-hook sent ${action_type} to ${email} via Resend (id=${result?.id})`,
    );

    const evtMap: Record<string, "signup_succeeded" | "password_reset_requested" | "email_changed" | null> = {
      signup: "signup_succeeded",
      confirmation: "signup_succeeded",
      recovery: "password_reset_requested",
      password_recovery: "password_reset_requested",
      email_change: "email_changed",
      email_change_new: "email_changed",
      email_change_current: "email_changed",
    };
    const evt = evtMap[action_type] ?? null;
    if (evt) {
      await logAuth({
        event_type: evt,
        email,
        event_data: { action_type, message_id: result?.id ?? null, sender: FROM_ADDRESS },
        ip: clientIp(req),
        user_agent: req.headers.get("user-agent"),
      });
    }

    return new Response(JSON.stringify({ success: true, id: result?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auth-email-hook error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
