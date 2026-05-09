// Pre-signup gate: hCaptcha verification, disposable email block,
// and (agent/partner only) HaveIBeenPwned breach check.
//
// SECURITY: Never log the password. Only the first 5 chars of its SHA-1
// hash leave this function (k-anonymity range API to pwnedpasswords.com).

import disposableDomains from "./disposable-domains.json" with { type: "json" };
import { logAuth, clientIp, type AuditEvent } from "../_shared/audit.ts";

const HCAPTCHA_SECRET = Deno.env.get("HCAPTCHA_SECRET_KEY") || "";

const ALLOWED_ORIGINS = [
  "https://listhq.com.au",
  "https://www.listhq.com.au",
  "https://listhq.lovable.app",
];

function corsHeadersFor(origin: string | null): Record<string, string> {
  let allow = "https://listhq.com.au";
  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin)) allow = origin;
    else if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/i.test(origin)) allow = origin;
    else if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i.test(origin)) allow = origin;
  }
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const disposableSet = new Set<string>(
  (disposableDomains as string[]).map((d) => d.toLowerCase()),
);

type Reason = "invalid_captcha" | "disposable_email" | "breached_password";

function fail(reason: Reason, cors: Record<string, string>) {
  return new Response(JSON.stringify({ ok: false, reason }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function sha1Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function verifyHCaptcha(token: string): Promise<boolean> {
  if (!HCAPTCHA_SECRET || !token) return false;
  try {
    const body = new URLSearchParams({ secret: HCAPTCHA_SECRET, response: token });
    const res = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return false;
    const json = await res.json();
    return json?.success === true;
  } catch (_e) {
    return false;
  }
}

async function isPasswordBreached(password: string): Promise<boolean> {
  try {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!res.ok) return false; // fail-open on upstream outage
    const text = await res.text();
    for (const line of text.split("\n")) {
      const [hSuffix, countStr] = line.trim().split(":");
      if (!hSuffix) continue;
      if (hSuffix.toUpperCase() === suffix) {
        const count = parseInt(countStr || "0", 10);
        if (count >= 1) return true;
      }
    }
    return false;
  } catch (_e) {
    return false;
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const cors = corsHeadersFor(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, reason: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: {
    email?: string;
    password?: string;
    role?: "seeker" | "agent" | "partner";
    hcaptchaToken?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, reason: "bad_json" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const role: "seeker" | "agent" | "partner" =
    body.role === "agent" || body.role === "partner" ? body.role : "seeker";
  const hcaptchaToken = body.hcaptchaToken || "";

  if (!email || !password) {
    return new Response(JSON.stringify({ ok: false, reason: "missing_fields" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // 1. hCaptcha
  const captchaOk = await verifyHCaptcha(hcaptchaToken);
  if (!captchaOk) {
    console.log(`[before-signup] captcha fail role=${role}`);
    return fail("invalid_captcha", cors);
  }

  // 2. Disposable email
  const domain = email.split("@")[1] || "";
  if (disposableSet.has(domain)) {
    console.log(`[before-signup] disposable domain=${domain} role=${role}`);
    return fail("disposable_email", cors);
  }

  // 3. Breach check (agent/partner only)
  if (role === "agent" || role === "partner") {
    const breached = await isPasswordBreached(password);
    if (breached) {
      console.log(`[before-signup] breached password role=${role}`);
      return fail("breached_password", cors);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
