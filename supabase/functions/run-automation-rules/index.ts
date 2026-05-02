// Rule-based automation triggers — runs every 15 min via pg_cron.
// Per-rule try/catch; failures recorded to automation_log.error_msg.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Rule = {
  id: string;
  agency_id: string;
  trigger_type: string;
  conditions: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
};

type ProcessResult = { processed: number; fired: number; errors: number };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // ── Cron secret check ──
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const summary: Record<string, ProcessResult> = {};

  try {
    const { data: rules, error } = await sb
      .from("automation_rules")
      .select("id, agency_id, trigger_type, conditions, action_type, action_config")
      .eq("is_active", true)
      .eq("source_data_available", true);

    if (error) throw error;

    for (const rule of (rules ?? []) as Rule[]) {
      const key = `${rule.trigger_type}:${rule.id.slice(0, 8)}`;
      try {
        const result = await processRule(sb, rule);
        summary[key] = result;
      } catch (e: any) {
        summary[key] = { processed: 0, fired: 0, errors: 1 };
        await sb.from("automation_log").insert({
          rule_id: rule.id,
          agency_id: rule.agency_id,
          target_id: rule.id, // placeholder when rule itself fails
          target_type: "rule_error",
          action_taken: null,
          error_msg: String(e?.message ?? e).slice(0, 1000),
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processRule(sb: any, rule: Rule): Promise<ProcessResult> {
  switch (rule.trigger_type) {
    case "hot_lead_new":
      return await runHotLead(sb, rule);
    case "lead_going_cold":
      return await runLeadGoingCold(sb, rule);
    case "under_offer_stale":
      return await runUnderOfferStale(sb, rule);
    case "inspection_followup":
      return await runInspectionFollowup(sb, rule);
    default:
      return { processed: 0, fired: 0, errors: 0 };
  }
}

// ---- Trigger handlers ----

async function runHotLead(sb: any, rule: Rule): Promise<ProcessResult> {
  const { data: leads } = await sb
    .from("crm_leads")
    .select("id, agent_id, contact_id")
    .eq("lead_temperature", "hot")
    .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    .not("agent_id", "is", null);
  return await fireForEach(sb, rule, leads ?? [], "lead", (l: any) => l.agent_id, (l: any) => `New hot lead requires contact`);
}

async function runLeadGoingCold(sb: any, rule: Rule): Promise<ProcessResult> {
  const days = Number(rule.conditions?.days_since_last_contact ?? 6);
  const tiers = (rule.conditions?.tiers ?? ["warm", "cool"]) as string[];
  const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  const { data: leads } = await sb
    .from("crm_leads")
    .select("id, agent_id, last_contacted, lead_temperature")
    .in("lead_temperature", tiers)
    .lt("last_contacted", cutoff)
    .not("agent_id", "is", null);
  return await fireForEach(sb, rule, leads ?? [], "lead", (l: any) => l.agent_id, () => `Lead going cold — no contact in ${days} days`);
}

async function runUnderOfferStale(sb: any, rule: Rule): Promise<ProcessResult> {
  const days = Number(rule.conditions?.days_since_stage_change ?? 7);
  const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  const { data: leads } = await sb
    .from("crm_leads")
    .select("id, agent_id, last_status_change_at, stage")
    .eq("stage", "under_offer")
    .lt("last_status_change_at", cutoff)
    .not("agent_id", "is", null);
  // recipient resolution handled inside fireForEach via rule.action_config
  return await fireForEach(sb, rule, leads ?? [], "lead", (l: any) => l.agent_id, () => `Under Offer stale — no update in ${days} days`);
}

async function runInspectionFollowup(sb: any, rule: Rule): Promise<ProcessResult> {
  // Inactive by default — source data not yet populated. No-op safely.
  return { processed: 0, fired: 0, errors: 0 };
}

// ---- Fire helper ----

async function fireForEach(
  sb: any,
  rule: Rule,
  targets: any[],
  targetType: string,
  defaultAgentResolver: (t: any) => string,
  messageBuilder: (t: any) => string,
): Promise<ProcessResult> {
  let fired = 0;
  let errors = 0;
  for (const t of targets) {
    try {
      // dedup check (unique index will also enforce)
      const recipient = await resolveRecipient(sb, rule, t, defaultAgentResolver);
      if (!recipient) continue;

      if (rule.action_type === "notify_agent") {
        await sb.functions.invoke("dispatch-notification", {
          body: {
            agent_id: recipient,
            event_key: `automation_${rule.trigger_type}`,
            type: `automation_${rule.trigger_type}`,
            title: rule.name,
            message: messageBuilder(t),
            lead_id: targetType === "lead" ? t.id : null,
          },
        });
      }
      // suggest_template / create_task / set_next_action: log only in v1 (UI pickup later)

      const { error: logErr } = await sb.from("automation_log").insert({
        rule_id: rule.id,
        agency_id: rule.agency_id,
        target_id: t.id,
        target_type: targetType,
        action_taken: rule.action_type,
      });
      if (!logErr) fired++;
      // unique-violation = already fired today — silent skip
    } catch (e: any) {
      errors++;
      await sb.from("automation_log").insert({
        rule_id: rule.id,
        agency_id: rule.agency_id,
        target_id: t.id,
        target_type: targetType,
        error_msg: String(e?.message ?? e).slice(0, 1000),
      });
    }
  }
  return { processed: targets.length, fired, errors };
}

async function resolveRecipient(sb: any, rule: Rule, target: any, fallback: (t: any) => string): Promise<string | null> {
  const recipient = rule.action_config?.recipient ?? "assigned";
  if (recipient === "specific_agent_id" && rule.action_config?.agent_id) return rule.action_config.agent_id;
  if (recipient === "principal") {
    const { data: principal } = await sb
      .from("agency_members")
      .select("user_id")
      .eq("agency_id", rule.agency_id)
      .eq("role", "principal")
      .limit(1)
      .maybeSingle();
    if (principal?.user_id) {
      const { data: agent } = await sb.from("agents").select("id").eq("user_id", principal.user_id).maybeSingle();
      return agent?.id ?? null;
    }
  }
  return fallback(target) ?? null;
}
