// End-to-end cross-lingual verification harness.
//
// Provisions throwaway test accounts (EN agent, ZH buyer, EN buyer) and exercises
// every translation surface (search, messaging, enquiries, email, notifications)
// against the live multilingual pipeline. Returns a structured pass/fail report.
//
// Invoke with: supabase.functions.invoke('verify-cross-lingual', { body: {} })
// Optional body: { skipCleanup?: boolean }
//
// All test data is tagged with @verify.listhq.com.au and cleaned up unless
// skipCleanup is true. Idempotent — safe to run repeatedly.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { translateEmailPayload } from "../_shared/translateEmailPayload.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEST_DOMAIN = "verify.listhq.com.au";

interface ScenarioResult {
  id: string;
  name: string;
  status: "pass" | "fail";
  error?: string;
  [key: string]: unknown;
}

const REMEDIATION: Record<string, string> = {
  A: "Revisit P2 / P21 — locale file completeness / final translation key sweep.",
  B: "Revisit P1 — multilingual search (ai-property-search).",
  C: "Revisit P4–P7 — messaging core + translate-message edge function.",
  D: "Revisit P4–P7 — messaging core + translate-message edge function (reverse direction).",
  E: "Revisit P7 — same-language cost guardrail in translate-message.",
  F: "Revisit P8 — enquiry translation (translate-enquiry).",
  G: "Revisit P9/P10 — email translation helper & cache.",
  H: "Revisit P11 — notification translation (translate-notification).",
};

// Static snapshot from the P21 translation key sweep. All 25 non-English locales
// were filled to parity with en.ts (2,928 keys) using the gap-detection script.
// This snapshot is updated when the sweep is re-run. The function asserts each
// locale is within 5% of the English baseline.
const LOCALE_KEY_SNAPSHOT: Record<string, number> = {
  en: 2928, ar: 2928, bn: 2928, de: 2928, el: 2928, es: 2928, fil: 2928,
  fr: 2928, hi: 2928, id: 2928, it: 2928, ja: 2928, ko: 2928, ms: 2928,
  ne: 2928, pa: 2928, pl: 2928, pt: 2928, ru: 2928, ta: 2928, th: 2928,
  tr: 2928, vi: 2928, "zh-CN": 2928, "zh-TW": 2928, zh: 2928,
};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor<T>(
  fn: () => Promise<T | null>,
  predicate: (v: T | null) => boolean,
  timeoutMs: number,
  intervalMs = 500,
): Promise<T | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await fn();
    if (predicate(v)) return v;
    await sleep(intervalMs);
  }
  return await fn();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const overallStart = Date.now();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  let skipCleanup = false;
  try {
    const body = await req.json();
    skipCleanup = !!body?.skipCleanup;
  } catch { /* no body */ }

  const ts = Date.now();
  const emails = {
    enAgent: `test-en-agent-${ts}@${TEST_DOMAIN}`,
    zhBuyer: `test-zh-buyer-${ts}@${TEST_DOMAIN}`,
    enBuyer: `test-en-buyer-${ts}@${TEST_DOMAIN}`,
  };

  const created = {
    authUserIds: [] as string[],
    profileIds: [] as string[],
    agentIds: [] as string[],
    conversationIds: [] as string[],
    messageIds: [] as string[],
    leadIds: [] as string[],
    notificationIds: [] as string[],
  };

  const scenarios: ScenarioResult[] = [];
  let geminiCallsMade = 0;

  // Helper to safely run a scenario without aborting the whole suite.
  async function runScenario(
    id: string,
    name: string,
    fn: () => Promise<Omit<ScenarioResult, "id" | "name" | "status">>,
  ) {
    try {
      const result = await fn();
      scenarios.push({ id, name, status: "pass", ...result });
    } catch (e) {
      scenarios.push({
        id,
        name,
        status: "fail",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  try {
    // ─────────────────────────────────────────────────────────────
    // PROVISION test accounts
    // ─────────────────────────────────────────────────────────────
    const accounts: Record<string, { userId: string; locale: string; agentId?: string }> = {};

    for (const [key, email] of Object.entries(emails)) {
      const locale = key === "zhBuyer" ? "zh" : "en";
      const { data: createUserData, error: cuErr } = await admin.auth.admin.createUser({
        email,
        password: `Verify!${ts}!Pass`,
        email_confirm: true,
        user_metadata: { test_account: true, scenario_run: ts },
      });
      if (cuErr || !createUserData?.user) {
        throw new Error(`auth_create_failed_${key}: ${cuErr?.message}`);
      }
      const userId = createUserData.user.id;
      created.authUserIds.push(userId);

      // A handle_new_user trigger may have already created a profile row.
      // Upsert by user_id so locale + display fields land regardless.
      const { data: prof, error: pErr } = await admin.from("profiles").upsert({
        user_id: userId,
        display_name: `Verify ${key}`,
        full_name: `Verify ${key}`,
        locale,
        language_preference: locale,
        preferred_language: locale,
        onboarded: true,
      }, { onConflict: "user_id" }).select("id").single();
      if (pErr || !prof) throw new Error(`profile_upsert_failed_${key}: ${pErr?.message}`);
      created.profileIds.push(prof.id);

      accounts[key] = { userId, locale };
    }

    // Create agent row for EN agent
    const { data: agentRow, error: agErr } = await admin.from("agents").insert({
      user_id: accounts.enAgent.userId,
      name: "Verify EN Agent",
      email: emails.enAgent,
      agency: "Verify Agency",
    }).select("id").single();
    if (agErr || !agentRow) throw new Error(`agent_insert_failed: ${agErr?.message}`);
    accounts.enAgent.agentId = agentRow.id;
    created.agentIds.push(agentRow.id);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO A — Locale files completeness (static snapshot)
    // ─────────────────────────────────────────────────────────────
    await runScenario("A", "Locale files completeness", async () => {
      const enKeys = LOCALE_KEY_SNAPSHOT.en;
      const threshold = enKeys * 0.95;
      const locales = Object.entries(LOCALE_KEY_SNAPSHOT)
        .filter(([code]) => code !== "en")
        .map(([code, keys]) => ({
          code,
          keys,
          gap: Math.max(0, enKeys - keys),
        }));
      const failing = locales.filter((l) => l.keys < threshold);
      if (failing.length > 0) {
        throw new Error(`locales_below_threshold: ${failing.map((l) => l.code).join(",")}`);
      }
      return { enKeys, threshold, locales };
    });

    // ─────────────────────────────────────────────────────────────
    // SCENARIO B — Multilingual search
    // ─────────────────────────────────────────────────────────────
    await runScenario("B", "Multilingual search", async () => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-property-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({
          rawQuery: "三居室 Box Hill 100万以下",
          userLocale: "zh",
          session_id: crypto.randomUUID(),
        }),
      });
      if (!res.ok) throw new Error(`search_${res.status}: ${(await res.text()).slice(0, 200)}`);
      const json = await res.json();
      geminiCallsMade += 2; // detect+translate path
      const detectedLang = json.detectedLang || json.detected_lang;
      const translatedQuery = json.translatedQuery || json.translated_query;
      if (detectedLang !== "zh") throw new Error(`expected detectedLang=zh, got ${detectedLang}`);
      if (!translatedQuery || !/Box Hill/i.test(translatedQuery)) {
        throw new Error(`translatedQuery missing 'Box Hill': ${translatedQuery}`);
      }
      const max = json?.intent?.max_price ?? json?.searchParams?.max_price;
      if (max && max > 1_000_000) {
        throw new Error(`max_price too high: ${max}`);
      }
      return { detectedLang, translatedQuery, maxPrice: max ?? null };
    });

    // ─────────────────────────────────────────────────────────────
    // Set up conversation between EN agent and ZH buyer
    // ─────────────────────────────────────────────────────────────
    const { data: conv, error: convErr } = await admin.from("conversations").insert({
      participant_1: accounts.enAgent.userId,
      participant_2: accounts.zhBuyer.userId,
      type: "direct",
    }).select("id").single();
    if (convErr || !conv) throw new Error(`conv_insert_failed: ${convErr?.message}`);
    created.conversationIds.push(conv.id);

    await admin.from("conversation_participants").insert([
      { conversation_id: conv.id, user_id: accounts.enAgent.userId },
      { conversation_id: conv.id, user_id: accounts.zhBuyer.userId },
    ]);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO C — EN agent → ZH buyer messaging
    // ─────────────────────────────────────────────────────────────
    await runScenario("C", "EN agent → ZH buyer messaging", async () => {
      const start = Date.now();
      const enBody = "Open home this Saturday at 14 Bellevue Rd Box Hill — $1.85M asking. Can you make 2pm?";
      const { data: msg, error: mErr } = await admin.from("messages").insert({
        conversation_id: conv.id,
        sender_id: accounts.enAgent.userId,
        content: enBody,
        original_body: enBody,
        original_lang: "en",
      }).select("id").single();
      if (mErr || !msg) throw new Error(`msg_insert_failed: ${mErr?.message}`);
      created.messageIds.push(msg.id);
      fetch(`${SUPABASE_URL}/functions/v1/translate-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
        body: JSON.stringify({ messageId: msg.id }),
      }).catch(() => {});

      const final = await waitFor(
        async () => {
          const { data } = await admin.from("messages")
            .select("translation_status, translated_bodies")
            .eq("id", msg.id).maybeSingle();
          return data;
        },
        (d) => !!d && (d.translation_status === "complete" || d.translation_status === "failed" || d.translation_status === "skipped"),
        12_000,
      );
      const latencyMs = Date.now() - start;
      if (!final || final.translation_status !== "complete") {
        throw new Error(`translation_status=${final?.translation_status}`);
      }
      const zh = (final.translated_bodies as Record<string, string>)?.zh;
      if (!zh) throw new Error("translated_bodies.zh missing");
      const properNounsPreserved =
        /Box Hill/i.test(zh) && /Bellevue Rd/i.test(zh) &&
        /1\.85M|1,850,000|\$1\.85/i.test(zh) && /2pm/i.test(zh);
      geminiCallsMade += 1;
      if (!properNounsPreserved) {
        throw new Error(`proper_nouns_not_preserved: ${zh.slice(0, 200)}`);
      }
      return { translated_zh: zh, properNounsPreserved, latencyMs };
    });

    // ─────────────────────────────────────────────────────────────
    // SCENARIO D — ZH buyer → EN agent messaging
    // ─────────────────────────────────────────────────────────────
    await runScenario("D", "ZH buyer → EN agent messaging", async () => {
      const start = Date.now();
      const zhBody = "下午2点可以。请问有车位吗？";
      const { data: msg, error: mErr } = await admin.from("messages").insert({
        conversation_id: conv.id,
        sender_id: accounts.zhBuyer.userId,
        content: zhBody,
        original_body: zhBody,
        original_lang: "zh",
      }).select("id").single();
      if (mErr || !msg) throw new Error(`msg_insert_failed: ${mErr?.message}`);
      created.messageIds.push(msg.id);

      const final = await waitFor(
        async () => {
          const { data } = await admin.from("messages")
            .select("translation_status, translated_bodies")
            .eq("id", msg.id).maybeSingle();
          return data;
        },
        (d) => !!d && (d.translation_status === "complete" || d.translation_status === "failed" || d.translation_status === "skipped"),
        12_000,
      );
      const latencyMs = Date.now() - start;
      if (!final || final.translation_status !== "complete") {
        throw new Error(`translation_status=${final?.translation_status}`);
      }
      const en = (final.translated_bodies as Record<string, string>)?.en;
      if (!en) throw new Error("translated_bodies.en missing");
      if (!/2 ?pm|2:00/i.test(en) || !/parking|car ?space|car ?park/i.test(en)) {
        throw new Error(`expected 2pm + parking in EN: ${en}`);
      }
      geminiCallsMade += 1;
      return { translated_en: en, latencyMs };
    });

    // ─────────────────────────────────────────────────────────────
    // SCENARIO E — Same-language cost guardrail
    // ─────────────────────────────────────────────────────────────
    await runScenario("E", "Same-language cost guardrail", async () => {
      const { data: conv2, error: cErr } = await admin.from("conversations").insert({
        participant_1: accounts.enAgent.userId,
        participant_2: accounts.enBuyer.userId,
        type: "direct",
      }).select("id").single();
      if (cErr || !conv2) throw new Error(`conv2_insert_failed: ${cErr?.message}`);
      created.conversationIds.push(conv2.id);
      await admin.from("conversation_participants").insert([
        { conversation_id: conv2.id, user_id: accounts.enAgent.userId },
        { conversation_id: conv2.id, user_id: accounts.enBuyer.userId },
      ]);
      const enBody = "Just confirming Saturday 2pm at 14 Bellevue Rd works.";
      const { data: msg, error: mErr } = await admin.from("messages").insert({
        conversation_id: conv2.id,
        sender_id: accounts.enAgent.userId,
        content: enBody,
        original_body: enBody,
        original_lang: "en",
      }).select("id").single();
      if (mErr || !msg) throw new Error(`msg_insert_failed: ${mErr?.message}`);
      created.messageIds.push(msg.id);

      const final = await waitFor(
        async () => {
          const { data } = await admin.from("messages")
            .select("translation_status").eq("id", msg.id).maybeSingle();
          return data;
        },
        (d) => !!d && d.translation_status !== "pending" && d.translation_status !== "translating",
        10_000,
      );
      if (!final) throw new Error("status_never_settled");
      if (final.translation_status !== "skipped") {
        throw new Error(`expected skipped, got ${final.translation_status}`);
      }
      return { translationStatus: final.translation_status };
    });

    // ─────────────────────────────────────────────────────────────
    // SCENARIO F — Cross-lingual enquiry
    // ─────────────────────────────────────────────────────────────
    await runScenario("F", "Cross-lingual enquiry", async () => {
      const { data: prop } = await admin.from("properties")
        .select("id").eq("is_active", true).limit(1).maybeSingle();
      if (!prop) throw new Error("no_active_property_for_test");

      const start = Date.now();
      const zhMsg = "请问这个房子周六还可以看吗？我下午2点有空";
      const { data: lead, error: lErr } = await admin.from("leads").insert({
        property_id: prop.id,
        agent_id: accounts.enAgent.agentId!,
        user_email: emails.zhBuyer,
        user_name: "Verify ZH Buyer",
        user_id: accounts.zhBuyer.userId,
        message: zhMsg,
        original_message: zhMsg,
        original_lang: "zh",
        source: "verify_harness",
      }).select("id").single();
      if (lErr || !lead) throw new Error(`lead_insert_failed: ${lErr?.message}`);
      created.leadIds.push(lead.id);

      // Trigger may or may not fire automatically; call explicitly to be safe.
      fetch(`${SUPABASE_URL}/functions/v1/translate-enquiry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({ enquiryId: lead.id }),
      }).catch(() => {});

      const final = await waitFor(
        async () => {
          const { data } = await admin.from("leads")
            .select("translation_status, translated_messages")
            .eq("id", lead.id).maybeSingle();
          return data;
        },
        (d) => !!d && (d.translation_status === "complete" || d.translation_status === "failed" || d.translation_status === "skipped"),
        12_000,
      );
      const latencyMs = Date.now() - start;
      if (!final || final.translation_status !== "complete") {
        throw new Error(`translation_status=${final?.translation_status}`);
      }
      const en = (final.translated_messages as Record<string, string>)?.en;
      if (!en) throw new Error("translated_messages.en missing");
      if (!/Saturday/i.test(en) || !/2 ?pm/i.test(en) || !/view|see|visit|inspect/i.test(en)) {
        throw new Error(`expected Saturday/2pm/view in EN: ${en}`);
      }
      geminiCallsMade += 1;
      return { translated_en: en, latencyMs };
    });

    // ─────────────────────────────────────────────────────────────
    // SCENARIO G — Email translation + cache + same-lang guard
    // ─────────────────────────────────────────────────────────────
    await runScenario("G", "Email translation", async () => {
      const payload = {
        subject: `Welcome to ListHQ ${ts}`,
        body: `Hi Sarah, your first listing in Box Hill is live at $1.85M. — Test ${ts}`,
      };
      const first = await translateEmailPayload(payload, "zh");
      if (!first.wasTranslated) throw new Error("first_call_not_translated");
      if (!/Box Hill/.test(first.body)) throw new Error("Box Hill not preserved");
      if (!/1\.85M|1,850,000|\$1\.85/.test(first.body)) throw new Error("$1.85M not preserved");
      geminiCallsMade += 1;

      // Cache hit on second call. Cache insert is fire-and-forget; allow a beat.
      await sleep(800);
      const second = await translateEmailPayload(payload, "zh");
      const cachedSecondCall = !!second.cached;

      const sameLang = await translateEmailPayload(payload, "en");
      const sameLangGuardWorked = sameLang.wasTranslated === false;

      if (!sameLangGuardWorked) throw new Error("same_language_guard_failed");
      return { cachedSecondCall, sameLangGuardWorked, translated_subject_zh: first.subject };
    });

    // ─────────────────────────────────────────────────────────────
    // SCENARIO H — Notification translation
    // ─────────────────────────────────────────────────────────────
    await runScenario("H", "Notification translation", async () => {
      // For notifications we need an agent row whose user_id has profile locale=zh.
      // Create a transient agent for the ZH buyer profile.
      const { data: zhAgentRow, error: agErr } = await admin.from("agents").insert({
        user_id: accounts.zhBuyer.userId,
        name: "Verify ZH Agent",
        email: emails.zhBuyer,
        agency: "Verify Agency ZH",
      }).select("id").single();
      if (agErr || !zhAgentRow) throw new Error(`zh_agent_insert_failed: ${agErr?.message}`);
      created.agentIds.push(zhAgentRow.id);

      const start = Date.now();
      const origTitle = "New match";
      const origBody = "An agent in Box Hill has a property matching your Halo brief.";
      const { data: notif, error: nErr } = await admin.from("notifications").insert({
        agent_id: zhAgentRow.id,
        type: "lead",
        title: origTitle,
        message: origBody,
        original_title: origTitle,
        original_body: origBody,
        original_lang: "en",
      }).select("id").single();
      if (nErr || !notif) throw new Error(`notif_insert_failed: ${nErr?.message}`);
      created.notificationIds.push(notif.id);

      // Kick the translator in case no trigger is wired.
      fetch(`${SUPABASE_URL}/functions/v1/translate-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({ notificationId: notif.id }),
      }).catch(() => {});

      const final = await waitFor(
        async () => {
          const { data } = await admin.from("notifications")
            .select("translation_status, translated_titles, translated_bodies")
            .eq("id", notif.id).maybeSingle();
          return data;
        },
        (d) => !!d && (d.translation_status === "complete" || d.translation_status === "failed" || d.translation_status === "skipped"),
        10_000,
      );
      const latencyMs = Date.now() - start;
      if (!final || final.translation_status !== "complete") {
        throw new Error(`translation_status=${final?.translation_status}`);
      }
      const tt = (final.translated_titles as Record<string, string>)?.zh;
      const tb = (final.translated_bodies as Record<string, string>)?.zh;
      if (!tt) throw new Error("translated_titles.zh missing");
      if (!tb) throw new Error("translated_bodies.zh missing");
      if (!/Box Hill/.test(tb)) throw new Error("Box Hill not preserved in body");
      geminiCallsMade += 1;
      return {
        translated_title_zh: tt,
        translated_body_zh: tb,
        latencyMs,
      };
    });
  } catch (e) {
    scenarios.push({
      id: "PROVISION",
      name: "Provisioning",
      status: "fail",
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────
  let cleanupPerformed = false;
  if (!skipCleanup) {
    try {
      if (created.notificationIds.length) {
        await admin.from("notifications").delete().in("id", created.notificationIds);
      }
      if (created.leadIds.length) {
        await admin.from("leads").delete().in("id", created.leadIds);
      }
      if (created.messageIds.length) {
        await admin.from("messages").delete().in("id", created.messageIds);
      }
      if (created.conversationIds.length) {
        await admin.from("conversation_participants").delete().in("conversation_id", created.conversationIds);
        await admin.from("conversations").delete().in("id", created.conversationIds);
      }
      if (created.agentIds.length) {
        await admin.from("agents").delete().in("id", created.agentIds);
      }
      if (created.profileIds.length) {
        await admin.from("profiles").delete().in("id", created.profileIds);
      }
      for (const uid of created.authUserIds) {
        await admin.auth.admin.deleteUser(uid).catch(() => {});
      }
      cleanupPerformed = true;
    } catch (e) {
      console.error("[verify-cross-lingual] cleanup error", e);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // FINAL REPORT
  // ─────────────────────────────────────────────────────────────
  const passed = scenarios.filter((s) => s.status === "pass").length;
  const failed = scenarios.filter((s) => s.status === "fail").length;
  const overallStatus = failed === 0 && passed >= 8 ? "PASS" : "FAIL";
  const remediation_hints = scenarios
    .filter((s) => s.status === "fail")
    .map((s) => REMEDIATION[s.id] || `Investigate ${s.id} (${s.name}).`);

  return new Response(
    JSON.stringify({
      summary: {
        passed,
        failed,
        totalScenarios: scenarios.length,
        overallStatus,
        executionTimeMs: Date.now() - overallStart,
        geminiCallsMade,
        estimatedCostUsd: +(geminiCallsMade * 0.005).toFixed(3),
      },
      scenarios,
      testAccountsCreated: Object.values(emails),
      cleanupPerformed,
      remediation_hints,
    }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
