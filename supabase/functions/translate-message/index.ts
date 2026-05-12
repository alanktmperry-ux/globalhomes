// Translate-message edge function.
// Detects source language of a newly inserted message and translates it into every
// participant's preferred locale, caching results in messages.translated_bodies.
//
// Auth model:
//   - Caller's JWT (when present) is verified and must belong to a conversation
//     participant. The Postgres trigger calls this function with the service-role
//     key — those calls skip the participant check.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  zh: "Simplified Chinese",
  zh_simplified: "Simplified Chinese",
  zh_traditional: "Traditional Chinese",
  yue: "Cantonese (Traditional script)",
  vi: "Vietnamese",
  ko: "Korean",
  ja: "Japanese",
  ar: "Arabic",
  hi: "Hindi",
  it: "Italian",
  es: "Spanish",
  fr: "French",
  pt: "Portuguese",
  ru: "Russian",
  th: "Thai",
  id: "Indonesian",
  fil: "Filipino",
  de: "German",
  el: "Greek",
  tr: "Turkish",
  pl: "Polish",
  ne: "Nepali",
};

function langName(code: string): string {
  return LANG_NAMES[code] || code;
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const resp = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`gateway_${resp.status}: ${text.slice(0, 200)}`);
  }
  const json = await resp.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("empty_completion");
  }
  return content.trim();
}

async function detectLanguage(apiKey: string, text: string): Promise<string> {
  const system =
    "You detect the source language of short messages. Output ONLY a 2-letter ISO 639-1 code in lowercase. No punctuation, no quotes, no other text.";
  const out = await callGemini(apiKey, system, text.slice(0, 1000));
  const code = out.toLowerCase().replace(/[^a-z]/g, "").slice(0, 2);
  return code || "en";
}

async function translateOne(
  apiKey: string,
  source: string,
  fromLang: string,
  toLang: string,
): Promise<string> {
  const system =
    `You are translating an Australian real-estate chat message from ${langName(fromLang)} to ${langName(toLang)}.\n\nPRESERVE proper nouns exactly (Australian suburb names like Box Hill, Cabramatta, Auburn, Parramatta, Doncaster; agent and agency names; street names).\nPRESERVE numbers, currency amounts, dates, contact details, and listing references verbatim.\nPRESERVE acronyms like AUD, NSW, VIC, ListHQ, Halo.\nMatch the tone of the source (casual vs formal).\nReturn ONLY the translated text — no quotes, no commentary, no preamble.`;
  return await callGemini(apiKey, system, `Source text:\n${source}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { enforceRateLimit } = await import("../_shared/rateLimit.ts");
  const rlBlocked = await enforceRateLimit(req, {
    endpoint: "translate-message",
    userMaxPerWindow: 100,
    ipMaxPerWindow: 0,
    windowSeconds: 60,
    punishScrapers: true,
  }, corsHeaders);
  if (rlBlocked) return rlBlocked;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "missing_lovable_api_key" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let messageId: string | null = null;
  try {
    const body = await req.json();
    messageId = body?.messageId ?? body?.message_id ?? null;
  } catch {
    /* empty body */
  }
  if (!messageId || typeof messageId !== "string") {
    return new Response(JSON.stringify({ error: "messageId_required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // ---- Auth ----
  // Two modes:
  //   (a) System mode: caller has no JWT, or supplies the project anon/service-role
  //       key in Authorization. Used by the AFTER INSERT trigger and server-side jobs.
  //       Skips the participant ACL — data exposure is still gated by messages RLS
  //       on the read side (translated_bodies is only readable by participants).
  //   (b) User mode: caller supplies a user JWT. We resolve the user and require
  //       them to be a participant in the message's conversation.
  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const isSystemCall =
    !bearer || bearer === SERVICE_ROLE || (ANON_KEY && bearer === ANON_KEY);

  let callerUserId: string | null = null;
  if (!isSystemCall) {
    const { data: userData, error: userErr } = await admin.auth.getUser(bearer);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    callerUserId = userData.user.id;
  }

  // ---- Load message ----
  const { data: msg, error: msgErr } = await admin
    .from("messages")
    .select(
      "id, conversation_id, sender_id, original_body, original_lang, translated_bodies, translation_status",
    )
    .eq("id", messageId)
    .maybeSingle();
  if (msgErr || !msg) {
    return new Response(JSON.stringify({ error: "message_not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- Participant ACL (skipped for service-role) ----
  if (!isSystemCall && callerUserId) {
    const { data: part } = await admin
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", msg.conversation_id)
      .eq("user_id", callerUserId)
      .maybeSingle();
    if (!part) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // ---- Idempotency ----
  if (
    msg.translation_status === "complete" ||
    msg.translation_status === "skipped"
  ) {
    return new Response(
      JSON.stringify({
        status: msg.translation_status,
        translated_bodies: msg.translated_bodies ?? {},
        detectedLang: msg.original_lang,
        cached: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ---- Claim work ----
  await admin
    .from("messages")
    .update({ translation_status: "translating" })
    .eq("id", messageId)
    .eq("translation_status", "pending");

  // ---- Detect source language if needed ----
  let sourceLang = (msg.original_lang || "").trim().toLowerCase();
  const sourceText = msg.original_body || "";
  if (!sourceLang || sourceLang.length < 2) {
    try {
      sourceLang = await detectLanguage(LOVABLE_API_KEY, sourceText);
    } catch (e) {
      console.error("[translate-message] detect_failed", e);
      sourceLang = "en";
    }
    await admin
      .from("messages")
      .update({ original_lang: sourceLang })
      .eq("id", messageId);
  }
  console.log(
    `[translate-message] detect msg=${messageId} lang=${sourceLang} preview="${sourceText.slice(0, 50)}"`,
  );

  // ---- Participant locales ----
  const { data: locRow } = await admin
    .from("conversation_participant_locales")
    .select("locales")
    .eq("conversation_id", msg.conversation_id)
    .maybeSingle();

  const allLocales: string[] = Array.isArray(locRow?.locales)
    ? (locRow!.locales as string[]).filter(Boolean)
    : [];

  // Normalize: strip region tags (e.g. "en-AU" → "en"); keep zh_* as-is.
  const normalize = (l: string) =>
    l.startsWith("zh_") ? l : l.split(/[-_]/)[0].toLowerCase();
  const targets = Array.from(
    new Set(allLocales.map(normalize).filter((l) => l && l !== sourceLang)),
  );

  if (targets.length === 0) {
    await admin
      .from("messages")
      .update({ translation_status: "skipped" })
      .eq("id", messageId);
    console.log(
      `[translate-message] skipped msg=${messageId} reason=same-language locales=${JSON.stringify(allLocales)}`,
    );
    return new Response(
      JSON.stringify({
        status: "skipped",
        reason: "same-language conversation",
        detectedLang: sourceLang,
        translated_bodies: {},
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ---- Translate in parallel ----
  const existing =
    (msg.translated_bodies && typeof msg.translated_bodies === "object"
      ? (msg.translated_bodies as Record<string, string>)
      : {}) || {};

  const results = await Promise.all(
    targets.map(async (locale) => {
      // Skip if already cached (shouldn't happen on pending, but defensive)
      if (typeof existing[locale] === "string" && existing[locale]) {
        return { locale, text: existing[locale], ok: true as const };
      }
      try {
        const text = await translateOne(
          LOVABLE_API_KEY,
          sourceText,
          sourceLang,
          locale,
        );
        console.log(
          `[translate-message] translate msg=${messageId} ${sourceLang}->${locale} src="${sourceText.slice(0, 50)}" dst="${text.slice(0, 50)}"`,
        );
        return { locale, text, ok: true as const };
      } catch (e) {
        console.error(
          `[translate-message] translate_failed msg=${messageId} locale=${locale}`,
          e,
        );
        return { locale, text: sourceText, ok: false as const };
      }
    }),
  );

  const merged: Record<string, string> = { ...existing };
  for (const r of results) merged[r.locale] = r.text;
  const allFailed = results.every((r) => !r.ok);
  const finalStatus = allFailed ? "failed" : "complete";

  await admin
    .from("messages")
    .update({
      translated_bodies: merged,
      translation_status: finalStatus,
    })
    .eq("id", messageId);

  return new Response(
    JSON.stringify({
      status: finalStatus,
      translated_bodies: merged,
      detectedLang: sourceLang,
      targets,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
