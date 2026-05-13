// Shared brand frame for ListHQ branded emails (auth + welcome).
// Single source of truth — auth-email-hook and send-welcome-email both use this.

export interface FrameContent {
  subject: string;
  hero: string;
  body: string;
  bulletList?: string[];
  cta?: string;
  ctaLink?: string;
  disclaimer: string;
  unsubscribeLink?: string;
}

export function renderEmail(c: FrameContent): { subject: string; html: string; text: string } {
  const { subject, hero, body, bulletList, cta, ctaLink, disclaimer, unsubscribeLink } = c;

  const bullets = bulletList && bulletList.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">${
        bulletList.map(item => `<tr><td style="padding:6px 0;font-size:15px;line-height:1.6;color:#475569;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#2563eb;margin:0 10px 3px 0;vertical-align:middle;"></span>${item}</td></tr>`).join('')
      }</table>`
    : '';

  const ctaBlock = cta && ctaLink
    ? `<tr><td style="padding:8px 0 24px 0;">
         <table role="presentation" cellpadding="0" cellspacing="0" border="0">
           <tr><td style="border-radius:10px;background:#2563eb;">
             <a href="${ctaLink}" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:500;color:#ffffff;text-decoration:none;border-radius:10px;">${cta}</a>
           </td></tr>
         </table>
       </td></tr>`
    : '';

  const unsubBlock = unsubscribeLink
    ? `<tr><td align="center" style="padding:0 0 8px 0;">
         <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
           <a href="${unsubscribeLink}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe from welcome emails</a>
         </p>
       </td></tr>`
    : '';

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
      <tr><td style="padding:0 0 24px 0;"><div style="font-size:24px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">ListHQ</div></td></tr>
      <tr><td style="padding:0 0 12px 0;"><h1 style="margin:0 0 12px 0;font-size:28px;line-height:1.25;font-weight:600;color:#0f172a;">${hero}</h1></td></tr>
      <tr><td style="padding:0 0 16px 0;"><p style="margin:0;font-size:15px;line-height:1.6;color:#475569;">${body}</p></td></tr>
      ${bullets ? `<tr><td>${bullets}</td></tr>` : ''}
      ${ctaBlock}
      <tr><td style="padding:0 0 32px 0;"><p style="margin:0;font-size:13px;line-height:1.5;color:#94a3b8;font-style:italic;">${disclaimer}</p></td></tr>
      <tr><td style="padding:0;border-top:1px solid #e2e8f0;"></td></tr>
      <tr><td align="center" style="padding:20px 0 8px 0;"><p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">Questions? <a href="mailto:support@listhq.com.au" style="color:#2563eb;text-decoration:none;">support@listhq.com.au</a></p></td></tr>
      ${unsubBlock}
      <tr><td align="center" style="padding:0 0 8px 0;"><p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">© ListHQ Pty Ltd · Melbourne, Australia</p></td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const text = `${hero}\n\n${body}\n\n${(bulletList || []).map(b => `• ${b.replace(/<[^>]+>/g, '')}`).join('\n')}${cta && ctaLink ? `\n\n${cta}: ${ctaLink}` : ''}\n\n${disclaimer}${unsubscribeLink ? `\n\nUnsubscribe: ${unsubscribeLink}` : ''}\n\n— ListHQ`;

  return { subject, html, text };
}

// HMAC-signed unsubscribe token: base64url(user_id:category:ts:sig)
export async function buildUnsubscribeToken(userId: string, category: string): Promise<string> {
  const secret = Deno.env.get('UNSUBSCRIBE_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET env var is required');
  const ts = Date.now().toString();
  const payload = `${userId}:${category}:${ts}`;
  const sig = await hmac(payload, secret);
  return base64url(`${payload}:${sig.slice(0, 32)}`);
}

export async function verifyUnsubscribeToken(token: string): Promise<{ valid: boolean; userId?: string; category?: string; expired?: boolean }> {
  try {
    const secret = Deno.env.get('UNSUBSCRIBE_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!secret) throw new Error('UNSUBSCRIBE_SECRET env var is required');
    const decoded = base64urlDecode(token);
    const parts = decoded.split(':');
    if (parts.length !== 4) return { valid: false };
    const [userId, category, ts, sig] = parts;
    if (!userId || !category || !ts || !sig) return { valid: false };
    const expected = (await hmac(`${userId}:${category}:${ts}`, secret)).slice(0, 32);
    let mismatch = expected.length ^ sig.length;
    for (let i = 0; i < Math.min(expected.length, sig.length); i++) {
      mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    }
    if (mismatch !== 0) return { valid: false };
    const ageMs = Date.now() - parseInt(ts, 10);
    if (Number.isNaN(ageMs) || ageMs > 90 * 24 * 60 * 60 * 1000) return { valid: false, expired: true };
    return { valid: true, userId, category };
  } catch {
    return { valid: false };
  }
}

async function hmac(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function base64url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
}
