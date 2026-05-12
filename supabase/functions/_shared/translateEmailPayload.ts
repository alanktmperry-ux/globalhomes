import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const LANG_NAMES: Record<string, string> = {
  en: 'English', zh: 'Chinese (Simplified)', vi: 'Vietnamese', ko: 'Korean', ar: 'Arabic',
  hi: 'Hindi', ja: 'Japanese', it: 'Italian', de: 'German', es: 'Spanish', fr: 'French',
  pt: 'Portuguese', ru: 'Russian', th: 'Thai', id: 'Indonesian', fil: 'Filipino',
  el: 'Greek', pl: 'Polish', ne: 'Nepali', tr: 'Turkish', fa: 'Persian',
  uk: 'Ukrainian', my: 'Burmese', km: 'Khmer',
};

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface EmailPayload {
  subject: string;
  body: string;
  isHtml?: boolean;
  sourceLang?: string;
}

export interface TranslatedPayload {
  subject: string;
  body: string;
  wasTranslated: boolean;
  sourceLang: string;
  targetLang: string;
  cached: boolean;
}

export async function translateEmailPayload(
  payload: EmailPayload,
  targetLocale: string,
): Promise<TranslatedPayload> {
  const sourceLang = payload.sourceLang || 'en';

  if (!targetLocale || sourceLang === targetLocale) {
    return {
      subject: payload.subject,
      body: payload.body,
      wasTranslated: false,
      sourceLang,
      targetLang: targetLocale || sourceLang,
      cached: false,
    };
  }

  const hashInput = `${payload.subject}|${payload.body}|${targetLocale}|${sourceLang}`;
  const payloadHash = await sha256(hashInput);

  try {
    const { data: cached } = await supabase
      .from('email_translation_cache')
      .select('translated_subject, translated_body')
      .eq('payload_hash', payloadHash)
      .maybeSingle();

    if (cached) {
      // Bump hit_count + last_used_at via RPC-style update (fire-and-forget)
      supabase.rpc('increment_email_cache_hit', { p_hash: payloadHash }).then(
        () => {},
        () => {
          // Fallback: plain update if RPC doesn't exist
          supabase
            .from('email_translation_cache')
            .update({ last_used_at: new Date().toISOString() })
            .eq('payload_hash', payloadHash)
            .then(() => {}, () => {});
        },
      );
      return {
        subject: cached.translated_subject,
        body: cached.translated_body,
        wasTranslated: true,
        sourceLang,
        targetLang: targetLocale,
        cached: true,
      };
    }
  } catch (err) {
    console.warn('translateEmailPayload: cache lookup failed', err);
  }

  const sourceLangName = LANG_NAMES[sourceLang] || sourceLang;
  const targetLangName = LANG_NAMES[targetLocale] || targetLocale;
  const htmlInstruction = payload.isHtml
    ? "The body is HTML — preserve all tags, attributes, and structure exactly. Only translate visible text content. Do NOT translate URLs, email addresses, or attribute values like style/class/id."
    : "";

  const prompt = `Translate this Australian real estate platform email from ${sourceLangName} to ${targetLangName}.

PRESERVE proper nouns (Australian suburb names like Box Hill, Cabramatta, Auburn, Parramatta; agent and agency names; street names; ListHQ; Halo; AUD; NSW; VIC).
PRESERVE numbers, currency amounts, dates, phone numbers, email addresses, URLs.
Match the tone of the source (professional but warm for transactional emails; energetic for marketing).
Use the formal "you" form in languages that distinguish (German Sie, Japanese keigo, Korean 존댓말, Italian Lei, French vous).
${htmlInstruction}

Return ONLY a JSON object with this exact shape, no preamble, no markdown fences:
{"subject":"<translated subject>","body":"<translated body>"}

Source subject: ${payload.subject}

Source body:
${payload.body}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini empty response');

    const parsed = JSON.parse(text);
    if (!parsed.subject || !parsed.body) throw new Error('Gemini malformed response');

    supabase
      .from('email_translation_cache')
      .insert({
        payload_hash: payloadHash,
        source_lang: sourceLang,
        target_lang: targetLocale,
        original_subject: payload.subject,
        original_body: payload.body,
        translated_subject: parsed.subject,
        translated_body: parsed.body,
      })
      .then(() => {}, (err) => console.warn('translateEmailPayload: cache insert failed', err));

    return {
      subject: parsed.subject,
      body: parsed.body,
      wasTranslated: true,
      sourceLang,
      targetLang: targetLocale,
      cached: false,
    };
  } catch (err) {
    console.error('translateEmailPayload error', err, { targetLocale, sourceLang });
    return {
      subject: payload.subject,
      body: payload.body,
      wasTranslated: false,
      sourceLang,
      targetLang: targetLocale,
      cached: false,
    };
  }
}

/**
 * Resolves recipient locale from a user ID or email + falls back to 'en'.
 */
export async function resolveRecipientLocale(opts: {
  userId?: string;
  email?: string;
  explicitLocale?: string;
}): Promise<string> {
  if (opts.explicitLocale) return opts.explicitLocale;
  if (opts.userId) {
    const { data } = await supabase
      .from('profiles')
      .select('locale')
      .eq('id', opts.userId)
      .maybeSingle();
    if (data?.locale) return data.locale;
  }
  if (opts.email) {
    const { data } = await supabase
      .from('profiles')
      .select('locale')
      .eq('email', opts.email)
      .maybeSingle();
    if (data?.locale) return data.locale;
  }
  return 'en';
}
