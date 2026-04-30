// Shared helpers for Australian Spam Act 2003 compliance:
// - Generate per-email unsubscribe tokens (HMAC over email + secret)
// - Build a footer that all non-essential outbound emails must include
// - Check whether an email address is currently unsubscribed
//
// Exempt categories (auth, password reset, billing/invoice) MUST pass
// `essential: true` to bypass the suppression check. They still get a footer
// noting transactional purpose for clarity.

import { createClient } from "npm:@supabase/supabase-js@2";

const APP_URL =
  Deno.env.get("APP_URL") ||
  Deno.env.get("PUBLIC_APP_URL") ||
  "https://listhq.com.au";

const SECRET =
  Deno.env.get("UNSUBSCRIBE_SECRET") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  "listhq-unsubscribe-fallback";

async function hmac(email: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(email.trim().toLowerCase()),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 40);
}

export async function unsubscribeUrl(email: string): Promise<string> {
  const token = await hmac(email);
  const e = encodeURIComponent(email.trim().toLowerCase());
  return `${APP_URL}/unsubscribe?email=${e}&token=${token}`;
}

export async function verifyUnsubscribeToken(
  email: string,
  token: string,
): Promise<boolean> {
  if (!email || !token) return false;
  const expected = await hmac(email);
  // constant-time-ish comparison
  if (expected.length !== token.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function buildUnsubscribeFooter(
  email: string,
  opts: { essential?: boolean } = {},
): Promise<string> {
  if (opts.essential) {
    return `<div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:16px;font-size:11px;color:#9ca3af;text-align:center;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
This is an essential transactional email about your ListHQ account (login, security, or billing) and cannot be unsubscribed from.<br/>
© ListHQ Pty Ltd · Melbourne, Australia
</div>`;
  }
  const url = await unsubscribeUrl(email);
  return `<div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:16px;font-size:11px;color:#9ca3af;text-align:center;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
You're receiving this because you have a ListHQ account.<br/>
To unsubscribe from non-essential emails, <a href="${url}" style="color:#6b7280;text-decoration:underline;">click here</a>.<br/>
© ListHQ Pty Ltd · Melbourne, Australia
</div>`;
}

/**
 * Append the unsubscribe footer to an HTML email body. If the body contains
 * `</body>`, the footer is inserted just before it; otherwise it is appended.
 */
export async function withUnsubscribeFooter(
  html: string,
  email: string,
  opts: { essential?: boolean } = {},
): Promise<string> {
  if (!email) return html;
  const footer = await buildUnsubscribeFooter(email, opts);
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${footer}</body>`);
  }
  return html + footer;
}

let _sb: ReturnType<typeof createClient> | null = null;
function sb() {
  if (_sb) return _sb;
  _sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  return _sb;
}

/**
 * Returns true if the email should NOT be sent because the recipient
 * has unsubscribed. Always returns false for essential emails.
 */
export async function isSuppressed(
  email: string | null | undefined,
  opts: { essential?: boolean } = {},
): Promise<boolean> {
  if (!email) return false;
  if (opts.essential) return false;
  try {
    const { data, error } = await sb().rpc("is_email_unsubscribed", {
      _email: email,
    });
    if (error) {
      console.error("[unsubscribe] is_email_unsubscribed error:", error.message);
      return false; // fail open — don't block sends on RPC error
    }
    return Boolean(data);
  } catch (e) {
    console.error("[unsubscribe] suppression check failed:", e);
    return false;
  }
}
