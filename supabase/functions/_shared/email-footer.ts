// One-line install for any edge function that sends emails via Resend or
// the Lovable connector gateway. Patches global fetch to:
//   1. Skip sends to addresses listed in public.email_unsubscribes
//      (unless the request marks itself as essential).
//   2. Append the Australian Spam Act-compliant unsubscribe footer to the
//      HTML body before posting to the email provider.
//
// Essential emails (auth codes, password resets, billing/invoices) bypass
// suppression. Mark them by setting `X-Email-Essential: true` on the
// outbound fetch headers, OR by importing `markEssential()` and wrapping
// the send call.
import { isSuppressed, withUnsubscribeFooter } from "./unsubscribe.ts";

const RESEND_HOST = "api.resend.com";
const GATEWAY_HOST = "connector-gateway.lovable.dev";

function isEmailEndpoint(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.host === RESEND_HOST && u.pathname.startsWith("/emails")) return true;
    if (u.host === GATEWAY_HOST && u.pathname.includes("/resend/emails")) return true;
    return false;
  } catch {
    return false;
  }
}

let installed = false;

export function installEmailFooterAndSuppression() {
  if (installed) return;
  installed = true;

  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: any, init?: RequestInit) => {
    try {
      const url = typeof input === "string" ? input : (input as Request)?.url;
      if (!url || !isEmailEndpoint(url) || !init?.body) {
        return originalFetch(input, init);
      }

      const headers = new Headers(init.headers || {});
      const essential = headers.get("x-email-essential") === "true";
      headers.delete("x-email-essential");

      let payload: any;
      try {
        payload =
          typeof init.body === "string" ? JSON.parse(init.body) : init.body;
      } catch {
        return originalFetch(input, init);
      }
      if (!payload || typeof payload !== "object") {
        return originalFetch(input, init);
      }

      const recipients: string[] = Array.isArray(payload.to)
        ? payload.to.filter((x: any) => typeof x === "string")
        : typeof payload.to === "string"
        ? [payload.to]
        : [];

      // Suppression check
      if (!essential && recipients.length > 0) {
        const checks = await Promise.all(
          recipients.map((e) => isSuppressed(e, { essential: false })),
        );
        const allowed = recipients.filter((_, i) => !checks[i]);
        if (allowed.length === 0) {
          console.log(
            `[email-footer] suppressed all recipients: ${recipients.join(",")}`,
          );
          return new Response(
            JSON.stringify({ id: "suppressed", suppressed: true }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (allowed.length !== recipients.length) {
          payload.to = allowed;
        }
      }

      // Footer injection
      const footerEmail = recipients[0];
      if (footerEmail && typeof payload.html === "string") {
        payload.html = await withUnsubscribeFooter(payload.html, footerEmail, {
          essential,
        });
      }

      return originalFetch(input, {
        ...init,
        headers,
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error("[email-footer] patch error, falling back:", e);
      return originalFetch(input, init);
    }
  }) as typeof fetch;
}

// Auto-install on import.
installEmailFooterAndSuppression();
