import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Translate a transactional email's subject + body via Google Translate v3.
 * Caches by content hash + language for 24h to avoid duplicate API calls
 * when the same email goes to many users.
 *
 * Falls back to the original (English) inputs on any failure — never blocks the send.
 */

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function gTranslate(text: string, target: string, isHtml: boolean): Promise<string | null> {
  const key = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
  if (!key) return null;
  const resp = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, target, source: 'en', format: isHtml ? 'html' : 'text' }),
    }
  );
  if (!resp.ok) return null;
  const data = await resp.json();
  return data?.data?.translations?.[0]?.translatedText ?? null;
}

export async function translateEmail(opts: {
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  targetLanguage: string;
}): Promise<{ subject: string; bodyHtml: string; bodyText?: string }> {
  const { subject, bodyHtml, bodyText, targetLanguage } = opts;
  if (!targetLanguage || targetLanguage === 'en' || targetLanguage.startsWith('en-')) {
    return { subject, bodyHtml, bodyText };
  }

  const cacheKey = await sha256(`${targetLanguage}::${subject}::${bodyHtml}::${bodyText || ''}`);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Check cache
  const { data: cached } = await supabase
    .from('translate_email_cache')
    .select('translated_subject, translated_body_html, translated_body_text, expires_at')
    .eq('cache_key', cacheKey)
    .maybeSingle();

  if (cached && new Date(cached.expires_at) > new Date()) {
    return {
      subject: cached.translated_subject ?? subject,
      bodyHtml: cached.translated_body_html ?? bodyHtml,
      bodyText: cached.translated_body_text ?? bodyText,
    };
  }

  // Translate
  try {
    const [tSubject, tBodyHtml, tBodyText] = await Promise.all([
      gTranslate(subject, targetLanguage, false),
      gTranslate(bodyHtml, targetLanguage, true),
      bodyText ? gTranslate(bodyText, targetLanguage, false) : Promise.resolve(undefined),
    ]);

    // Fallback if any translation failed
    const result = {
      subject: tSubject ?? subject,
      bodyHtml: tBodyHtml ?? bodyHtml,
      bodyText: tBodyText ?? bodyText,
    };

    // Save to cache (best-effort)
    await supabase.from('translate_email_cache').upsert({
      cache_key: cacheKey,
      language: targetLanguage,
      translated_subject: result.subject,
      translated_body_html: result.bodyHtml,
      translated_body_text: result.bodyText,
    });

    return result;
  } catch (err) {
    console.warn('translateEmail: failed, returning English fallback', err);
    return { subject, bodyHtml, bodyText };
  }
}
