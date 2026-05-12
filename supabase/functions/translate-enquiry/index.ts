// Translate-enquiry edge function.
// Detects source language of a newly inserted buyer enquiry (public.leads row)
// and translates the buyer's message into the recipient agent's preferred locale,
// caching the result in leads.translated_messages and mirroring to crm_leads.
//
// Auth model:
//   - Service-role / anon trigger calls bypass the participant check (system mode).
//   - User JWT calls must match the lead's agent_id (via agents.user_id) OR buyer_id.

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
  "zh-CN": "Simplified Chinese",
  zh_simplified: "Simplified Chinese",
  "zh-TW": "Traditional Chinese",
  zh_traditional: "Traditional Chinese",
  yue: "Cantonese (Traditional script)",
  vi: "Vietnamese",
  ko: "Korean",
  ja: "Japanese",
  ar: "Arabic",
  hi: "Hindi",
  pa: "Punjabi",
  bn: "Bengali",
  ta: "Tamil",
  it: "Italian",
  es: "Spanish",
  fr: "French",
  pt: "Portuguese",
  ru: "Russian",
  th: "Thai",
  id: "Indonesian",
  ms: "Malay",
  fil: "Filipino",
  de: "German",
  el: "Greek",
  tr: "Turkish",
  pl: "Polish",
  ne: "Nepali",
  fa: "Persian",
  ur: "Urdu",
  he: "Hebrew",
};

function langName(code: string): string {
  return LANG_NAMES[code] || code;
}

function normalizeLocale(l: string): string {
  if (!l) return "en";
  return l.startsWith("zh_") ? l : l.split(/[-_]/)[0].toLowerCase();
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
    `You are translating an Australian real-estate buyer enquiry from ${langName(fromLang)} to ${langName(toLang)}.\n\nPRESERVE proper nouns exactly (Australian suburb names like Box Hill, Cabramatta, Auburn, Parramatta, Doncaster; agent and agency names; street names).\nPRESERVE numbers, currency amounts (AUD), dates, phone numbers, email addresses, and listing references verbatim.\nPRESERVE acronyms like AUD, NSW, VIC, ListHQ.\nMatch the tone of the source (casual buyer enquiry vs formal).\nReturn ONLY the translated text — no quotes, no commentary, no preamble.`;
  return await callGemini(apiKey, system, `Source text:\n${source}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { enforceRateLimit } = await import("../_shared/rateLimit.ts");
  const rlBlocked = await enforceRateLimit(req, {
    endpoint: "translate-enquiry",
    userMaxPerWindow: 60,
    ipMaxPerWindow: 20,
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

  let enquiryId: string | null = null;
  try {
    const body = await req.json();
    enquiryId = body?.enquiryId ?? body?.enquiry_id ?? body?.leadId ?? null;
  } catch {
    /* empty body */
  }
  if (!enquiryId || typeof enquiryId !== "string") {
    return new Response(JSON.stringify({ error: "enquiryId_required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // ---- Auth: system-mode vs user-mode ----
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

  // ---- Load lead ----
  const { data: lead, error: leadErr } = await admin
    .from("leads")
    .select(
      "id, property_id, agent_id, user_id, user_email, user_name, message, original_message, original_lang, translated_messages, translation_status, created_at",
    )
    .eq("id", enquiryId)
    .maybeSingle();
  if (leadErr || !lead) {
    return new Response(JSON.stringify({ error: "enquiry_not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- ACL (user mode) ----
  if (!isSystemCall && callerUserId) {
    const { data: agentRow } = await admin
      .from("agents")
      .select("user_id")
      .eq("id", lead.agent_id)
      .maybeSingle();
    const isAgent = agentRow?.user_id === callerUserId;
    const isBuyer = lead.user_id === callerUserId;
    if (!isAgent && !isBuyer) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // ---- Idempotency ----
  if (
    lead.translation_status === "complete" ||
    lead.translation_status === "skipped"
  ) {
    return new Response(
      JSON.stringify({
        status: lead.translation_status,
        translated_messages: lead.translated_messages ?? {},
        detectedLang: lead.original_lang,
        cached: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const sourceText = (lead.original_message || lead.message || "").trim();
  if (!sourceText) {
    await admin
      .from("leads")
      .update({ translation_status: "skipped" })
      .eq("id", enquiryId);
    return new Response(
      JSON.stringify({ status: "skipped", reason: "empty_message" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ---- Claim work ----
  await admin
    .from("leads")
    .update({ translation_status: "translating" })
    .eq("id", enquiryId)
    .eq("translation_status", "pending");

  // ---- Detect source language if needed ----
  let sourceLang = normalizeLocale((lead.original_lang || "").trim());
  if (!sourceLang || sourceLang.length < 2) {
    try {
      sourceLang = await detectLanguage(LOVABLE_API_KEY, sourceText);
    } catch (e) {
      console.error("[translate-enquiry] detect_failed", e);
      sourceLang = "en";
    }
    await admin
      .from("leads")
      .update({ original_lang: sourceLang })
      .eq("id", enquiryId);
  }
  console.log(
    `[translate-enquiry] detect lead=${enquiryId} lang=${sourceLang} preview="${sourceText.slice(0, 50)}"`,
  );

  // ---- Resolve agent locale ----
  let agentLocale = "en";
  try {
    const { data: agentRow } = await admin
      .from("agents")
      .select("user_id")
      .eq("id", lead.agent_id)
      .maybeSingle();
    const agentUserId = agentRow?.user_id;
    if (agentUserId) {
      const { data: prof } = await admin
        .from("profiles")
        .select("locale, language_preference, preferred_language")
        .eq("user_id", agentUserId)
        .maybeSingle();
      const raw =
        (prof as any)?.locale ||
        (prof as any)?.language_preference ||
        (prof as any)?.preferred_language ||
        "en";
      agentLocale = normalizeLocale(String(raw));
    }
  } catch (e) {
    console.warn("[translate-enquiry] agent_locale_lookup_failed", e);
  }

  // ---- Skip same-language ----
  if (agentLocale === sourceLang) {
    await admin
      .from("leads")
      .update({ translation_status: "skipped" })
      .eq("id", enquiryId);
    // Also mirror skipped status to crm_leads
    await admin
      .from("crm_leads")
      .update({
        original_message: sourceText,
        original_lang: sourceLang,
        translation_status: "skipped",
      })
      .eq("agent_id", lead.agent_id)
      .eq("source_property_id", lead.property_id)
      .gte("created_at", new Date(new Date(lead.created_at).getTime() - 60000).toISOString())
      .lte("created_at", new Date(new Date(lead.created_at).getTime() + 60000).toISOString());

    console.log(
      `[translate-enquiry] skipped lead=${enquiryId} reason=same-language agent=${agentLocale}`,
    );
    return new Response(
      JSON.stringify({
        status: "skipped",
        reason: "same_language",
        detectedLang: sourceLang,
        agentLocale,
        translated_messages: {},
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ---- Translate ----
  const existing =
    (lead.translated_messages && typeof lead.translated_messages === "object"
      ? (lead.translated_messages as Record<string, string>)
      : {}) || {};

  let translatedText: string = sourceText;
  let ok = false;
  if (typeof existing[agentLocale] === "string" && existing[agentLocale]) {
    translatedText = existing[agentLocale];
    ok = true;
  } else {
    try {
      translatedText = await translateOne(
        LOVABLE_API_KEY,
        sourceText,
        sourceLang,
        agentLocale,
      );
      ok = true;
      console.log(
        `[translate-enquiry] translate lead=${enquiryId} ${sourceLang}->${agentLocale} src="${sourceText.slice(0, 50)}" dst="${translatedText.slice(0, 50)}"`,
      );
    } catch (e) {
      console.error(
        `[translate-enquiry] translate_failed lead=${enquiryId} locale=${agentLocale}`,
        e,
      );
      translatedText = sourceText;
      ok = false;
    }
  }

  const merged: Record<string, string> = { ...existing, [agentLocale]: translatedText };
  const finalStatus = ok ? "complete" : "failed";

  await admin
    .from("leads")
    .update({
      translated_messages: merged,
      translation_status: finalStatus,
    })
    .eq("id", enquiryId);

  // ---- Mirror onto matching crm_leads row (best-effort) ----
  try {
    const window = 2 * 60 * 1000;
    const ts = new Date(lead.created_at).getTime();
    await admin
      .from("crm_leads")
      .update({
        original_message: sourceText,
        original_lang: sourceLang,
        translated_messages: merged,
        translation_status: finalStatus,
      })
      .eq("agent_id", lead.agent_id)
      .eq("source_property_id", lead.property_id)
      .gte("created_at", new Date(ts - window).toISOString())
      .lte("created_at", new Date(ts + window).toISOString());
  } catch (e) {
    console.warn("[translate-enquiry] crm_mirror_failed", e);
  }

  return new Response(
    JSON.stringify({
      status: finalStatus,
      translated_messages: merged,
      detectedLang: sourceLang,
      agentLocale,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
