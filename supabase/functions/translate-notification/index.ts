// translate-notification edge function.
// Translates a single in-app notification's title + body into the recipient's
// preferred locale via the Lovable AI gateway (Gemini).
// Triggered automatically from a Postgres AFTER INSERT trigger on public.notifications.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const LANG_NAMES: Record<string, string> = {
  en: "English", zh: "Simplified Chinese", "zh-CN": "Simplified Chinese", zh_simplified: "Simplified Chinese",
  "zh-TW": "Traditional Chinese", zh_traditional: "Traditional Chinese", yue: "Cantonese (Traditional script)",
  vi: "Vietnamese", ko: "Korean", ja: "Japanese", ar: "Arabic", hi: "Hindi", pa: "Punjabi",
  bn: "Bengali", ta: "Tamil", it: "Italian", es: "Spanish", fr: "French", pt: "Portuguese",
  ru: "Russian", th: "Thai", id: "Indonesian", ms: "Malay", fil: "Filipino", de: "German",
  el: "Greek", tr: "Turkish", pl: "Polish", ne: "Nepali", fa: "Persian", ur: "Urdu", he: "Hebrew",
};
const langName = (c: string) => LANG_NAMES[c] || c;
const normalizeLocale = (l: string) => {
  if (!l) return "en";
  return l.startsWith("zh_") ? l : l.split(/[-_]/)[0].toLowerCase();
};

async function callGemini(apiKey: string, system: string, user: string): Promise<string> {
  const resp = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`gateway_${resp.status}: ${t.slice(0, 200)}`);
  }
  const json = await resp.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("empty_completion");
  return content.trim();
}

async function detectLanguage(apiKey: string, text: string): Promise<string> {
  const system = "You detect the source language of short messages. Output ONLY a 2-letter ISO 639-1 code in lowercase. No punctuation, no quotes, no other text.";
  const out = await callGemini(apiKey, system, text.slice(0, 1000));
  return out.toLowerCase().replace(/[^a-z]/g, "").slice(0, 2) || "en";
}

function extractJson(s: string): { title: string; body: string } | null {
  // Strip ```json fences if present
  const cleaned = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const o = JSON.parse(cleaned);
    if (typeof o?.title === "string" && typeof o?.body === "string") return { title: o.title, body: o.body };
  } catch { /* try a regex extract */ }
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const o = JSON.parse(m[0]);
      if (typeof o?.title === "string" && typeof o?.body === "string") return { title: o.title, body: o.body };
    } catch { /* noop */ }
  }
  return null;
}

async function translatePair(apiKey: string, title: string, body: string, fromLang: string, toLang: string) {
  const system = `Translate this Australian real estate platform notification from ${langName(fromLang)} to ${langName(toLang)}.
PRESERVE proper nouns (Box Hill, Cabramatta, Auburn, Parramatta, ListHQ, Halo, AUD, NSW, VIC).
PRESERVE numbers, currency, dates, phone numbers, URLs.
Match the tone of the source (concise, alert-style).

Return ONLY a JSON object with this exact shape:
{"title":"<translated title>","body":"<translated body>"}`;
  const user = `Source title: ${title}\nSource body: ${body}`;
  const raw = await callGemini(apiKey, system, user);
  const parsed = extractJson(raw);
  if (!parsed) throw new Error("invalid_json_response");
  return parsed;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { enforceRateLimit } = await import("../_shared/rateLimit.ts");
  const rlBlocked = await enforceRateLimit(req, {
    endpoint: "translate-notification",
    userMaxPerWindow: 200,
    ipMaxPerWindow: 0,
    windowSeconds: 60,
    punishScrapers: true,
  }, corsHeaders);
  if (rlBlocked) return rlBlocked;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "missing_lovable_api_key" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let notificationId: string | null = null;
  try {
    const body = await req.json();
    notificationId = body?.notificationId ?? body?.notification_id ?? null;
  } catch { /* noop */ }
  if (!notificationId || typeof notificationId !== "string") {
    return new Response(JSON.stringify({ error: "notificationId_required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const { data: notif, error: nerr } = await admin
    .from("notifications")
    .select("id, agent_id, title, message, original_title, original_body, original_lang, translated_titles, translated_bodies, translation_status")
    .eq("id", notificationId)
    .maybeSingle();
  if (nerr || !notif) {
    return new Response(JSON.stringify({ error: "notification_not_found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Idempotency
  if (notif.translation_status === "complete" || notif.translation_status === "skipped") {
    return new Response(JSON.stringify({
      status: notif.translation_status,
      translated_titles: notif.translated_titles ?? {},
      translated_bodies: notif.translated_bodies ?? {},
      detectedLang: notif.original_lang,
      cached: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const sourceTitle = (notif.original_title || notif.title || "").trim();
  const sourceBody = (notif.original_body || notif.message || "").trim();
  if (!sourceTitle && !sourceBody) {
    await admin.from("notifications").update({ translation_status: "skipped" }).eq("id", notificationId);
    return new Response(JSON.stringify({ status: "skipped", reason: "empty" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Claim
  await admin.from("notifications").update({ translation_status: "translating" })
    .eq("id", notificationId).eq("translation_status", "pending");

  // Detect source language if missing
  let sourceLang = normalizeLocale((notif.original_lang || "").trim());
  if (!sourceLang || sourceLang.length < 2) {
    try {
      sourceLang = await detectLanguage(LOVABLE_API_KEY, `${sourceTitle}\n${sourceBody}`);
    } catch (e) {
      console.error("[translate-notification] detect_failed", e);
      sourceLang = "en";
    }
    await admin.from("notifications").update({ original_lang: sourceLang }).eq("id", notificationId);
  }

  // Resolve recipient locale via agents.user_id -> profiles
  let recipientLocale = "en";
  try {
    const { data: agentRow } = await admin.from("agents").select("user_id").eq("id", notif.agent_id).maybeSingle();
    const uid = agentRow?.user_id;
    if (uid) {
      const { data: prof } = await admin
        .from("profiles")
        .select("locale, language_preference, preferred_language")
        .eq("user_id", uid)
        .maybeSingle();
      const raw = (prof as any)?.locale || (prof as any)?.language_preference || (prof as any)?.preferred_language || "en";
      recipientLocale = normalizeLocale(String(raw));
    }
  } catch (e) {
    console.warn("[translate-notification] locale_lookup_failed", e);
  }

  // Same-language skip
  if (recipientLocale === sourceLang) {
    await admin.from("notifications").update({ translation_status: "skipped" }).eq("id", notificationId);
    console.log(`[translate-notification] skipped id=${notificationId} same-lang=${recipientLocale}`);
    return new Response(JSON.stringify({
      status: "skipped", reason: "same_language", detectedLang: sourceLang, recipientLocale,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const existingTitles = (notif.translated_titles && typeof notif.translated_titles === "object"
    ? notif.translated_titles as Record<string, string> : {});
  const existingBodies = (notif.translated_bodies && typeof notif.translated_bodies === "object"
    ? notif.translated_bodies as Record<string, string> : {});

  let translatedTitle = sourceTitle;
  let translatedBody = sourceBody;
  let ok = false;

  if (existingTitles[recipientLocale] || existingBodies[recipientLocale]) {
    translatedTitle = existingTitles[recipientLocale] || sourceTitle;
    translatedBody = existingBodies[recipientLocale] || sourceBody;
    ok = true;
  } else {
    try {
      const out = await translatePair(LOVABLE_API_KEY, sourceTitle, sourceBody, sourceLang, recipientLocale);
      translatedTitle = out.title;
      translatedBody = out.body;
      ok = true;
      console.log(`[translate-notification] ok id=${notificationId} ${sourceLang}->${recipientLocale}`);
    } catch (e) {
      console.error(`[translate-notification] failed id=${notificationId} locale=${recipientLocale}`, e);
      ok = false;
    }
  }

  const mergedTitles: Record<string, string> = { ...existingTitles };
  const mergedBodies: Record<string, string> = { ...existingBodies };
  if (ok) {
    mergedTitles[recipientLocale] = translatedTitle;
    mergedBodies[recipientLocale] = translatedBody;
  }
  const finalStatus = ok ? "complete" : "failed";

  await admin.from("notifications").update({
    translated_titles: mergedTitles,
    translated_bodies: mergedBodies,
    translation_status: finalStatus,
  }).eq("id", notificationId);

  return new Response(JSON.stringify({
    status: finalStatus,
    translated_titles: mergedTitles,
    translated_bodies: mergedBodies,
    detectedLang: sourceLang,
    recipientLocale,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
