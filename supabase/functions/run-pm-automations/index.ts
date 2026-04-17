import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * run-pm-automations
 * ------------------
 * Modes:
 *   - { rule_type: 'arrears_sequence' | 'lease_renewal_notice' | 'inspection_entry_notice', agent_id?: string }
 *   - { rule_type: 'maintenance_update', maintenance_job_id: string, new_status: 'acknowledged'|'in_progress'|'completed' }
 *   - { run_all: true }   // scheduled cron entry point
 */

type Rule = {
  id: string;
  agent_id: string;
  rule_type: string;
  trigger_day: number | null;
  trigger_event: string | null;
  channel: string;
  template_subject: string | null;
  template_body: string | null;
  is_active: boolean;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function fillMerge(template: string | null, vars: Record<string, string>): string {
  if (!template) return "";
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function bodyToHtml(body: string): string {
  const escaped = escapeHtml(body).replace(/\n/g, "<br/>");
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;font-size:15px;line-height:1.55;">
      ${escaped}
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <div style="font-size:11px;color:#94a3b8">Sent automatically via ListHQ Property Management.</div>
    </div></body></html>`;
}

async function sendEmail(supabase: ReturnType<typeof createClient>, to: string, subject: string, body: string) {
  const { data, error } = await supabase.functions.invoke("send-notification-email", {
    body: { to, subject, html: bodyToHtml(body) },
  });
  if (error) return { ok: false, reason: error.message };
  if (data && (data as any).success === false) return { ok: false, reason: (data as any).reason || "send failed" };
  return { ok: true };
}

async function logSend(
  supabase: ReturnType<typeof createClient>,
  rule: Rule,
  tenancyId: string | null,
  recipient: string,
  subject: string,
  status: "sent" | "failed" | "skipped",
  errorText?: string,
) {
  await supabase.from("pm_automation_log").insert({
    rule_id: rule.id,
    agent_id: rule.agent_id,
    tenancy_id: tenancyId,
    recipient_email: recipient,
    recipient_type: "tenant",
    subject,
    status,
    error_text: errorText ?? null,
  } as any);
}

// Has a similar send already gone out for this tenancy + rule in the last 7 days?
async function alreadySentRecently(
  supabase: ReturnType<typeof createClient>,
  ruleId: string,
  tenancyId: string,
  windowDays = 7,
): Promise<boolean> {
  const since = new Date(Date.now() - windowDays * 86400_000).toISOString();
  const { data } = await supabase
    .from("pm_automation_log")
    .select("id")
    .eq("rule_id", ruleId)
    .eq("tenancy_id", tenancyId)
    .gte("sent_at", since)
    .limit(1);
  return !!(data && data.length);
}

async function getAgentInfo(supabase: ReturnType<typeof createClient>, agentId: string) {
  const { data } = await supabase
    .from("agents")
    .select("id, name, phone")
    .eq("id", agentId)
    .maybeSingle();
  return data ?? { id: agentId, name: "Your Property Manager", phone: "" };
}

async function propertyAddress(supabase: ReturnType<typeof createClient>, propertyId: string): Promise<string> {
  const { data } = await supabase
    .from("properties")
    .select("address, suburb, state")
    .eq("id", propertyId)
    .maybeSingle();
  if (!data) return "your property";
  return [data.address, data.suburb, data.state].filter(Boolean).join(", ");
}

// ─── ARREARS ───────────────────────────────────────────────────────────
async function processArrears(supabase: ReturnType<typeof createClient>, agentFilter?: string) {
  let q = supabase
    .from("pm_automation_rules")
    .select("*")
    .eq("rule_type", "arrears_sequence")
    .eq("is_active", true);
  if (agentFilter) q = q.eq("agent_id", agentFilter);
  const { data: rules } = await q;
  if (!rules?.length) return { processed: 0 };

  // Group rules by agent so we only fetch each agent's tenancies once
  const byAgent = new Map<string, Rule[]>();
  for (const r of rules as Rule[]) {
    if (!byAgent.has(r.agent_id)) byAgent.set(r.agent_id, []);
    byAgent.get(r.agent_id)!.push(r);
  }

  let processed = 0;
  for (const [agentId, agentRules] of byAgent) {
    const agent = await getAgentInfo(supabase, agentId);
    const { data: tenancies } = await supabase
      .from("tenancies")
      .select("id, property_id, tenant_name, tenant_email, rent_amount, rent_frequency, lease_start, status")
      .eq("agent_id", agentId)
      .eq("status", "active");
    if (!tenancies?.length) continue;

    for (const t of tenancies as any[]) {
      if (!t.tenant_email) continue;

      // Days overdue: latest paid rent_payments row vs today
      const { data: payments } = await supabase
        .from("rent_payments")
        .select("payment_date, amount, status, paid_to")
        .eq("tenancy_id", t.id)
        .order("payment_date", { ascending: false })
        .limit(50);

      const lastPaid = (payments ?? []).find((p: any) => p.status === "paid");
      // "paid_to" is the date rent is paid up to; if missing, use last payment_date or lease_start
      const paidTo = lastPaid?.paid_to ?? lastPaid?.payment_date ?? t.lease_start;
      if (!paidTo) continue;
      const daysOverdue = Math.floor((Date.now() - new Date(paidTo).getTime()) / 86400_000);
      if (daysOverdue <= 0) continue;

      const matched = agentRules.find((r) => r.trigger_day === daysOverdue);
      if (!matched) continue;

      if (await alreadySentRecently(supabase, matched.id, t.id, 7)) continue;

      const propAddr = await propertyAddress(supabase, t.property_id);
      const vars: Record<string, string> = {
        tenant_name: t.tenant_name || "Tenant",
        property_address: propAddr,
        amount_overdue: `$${Number(t.rent_amount || 0).toFixed(2)}`,
        days_overdue: String(daysOverdue),
        agent_name: agent.name || "Your Property Manager",
        agent_phone: (agent as any).phone || "",
      };
      const subject = fillMerge(matched.template_subject, vars);
      const body = fillMerge(matched.template_body, vars);
      const res = await sendEmail(supabase, t.tenant_email, subject, body);
      await logSend(
        supabase,
        matched,
        t.id,
        t.tenant_email,
        subject,
        res.ok ? "sent" : "failed",
        res.ok ? undefined : res.reason,
      );
      processed++;
    }
  }
  return { processed };
}

// ─── LEASE RENEWALS ────────────────────────────────────────────────────
async function processRenewals(supabase: ReturnType<typeof createClient>, agentFilter?: string) {
  let q = supabase
    .from("pm_automation_rules")
    .select("*")
    .eq("rule_type", "lease_renewal_notice")
    .eq("is_active", true);
  if (agentFilter) q = q.eq("agent_id", agentFilter);
  const { data: rules } = await q;
  if (!rules?.length) return { processed: 0 };

  const byAgent = new Map<string, Rule[]>();
  for (const r of rules as Rule[]) {
    if (!byAgent.has(r.agent_id)) byAgent.set(r.agent_id, []);
    byAgent.get(r.agent_id)!.push(r);
  }

  let processed = 0;
  const today = new Date();
  for (const [agentId, agentRules] of byAgent) {
    const agent = await getAgentInfo(supabase, agentId);
    const { data: tenancies } = await supabase
      .from("tenancies")
      .select("id, property_id, tenant_name, tenant_email, lease_end, status")
      .eq("agent_id", agentId)
      .eq("status", "active");
    if (!tenancies?.length) continue;

    for (const t of tenancies as any[]) {
      if (!t.tenant_email || !t.lease_end) continue;
      const days = Math.ceil((new Date(t.lease_end).getTime() - today.getTime()) / 86400_000);
      if (days < 0 || days > 95) continue;

      const matched = agentRules.find((r) => r.trigger_day === days);
      if (!matched) continue;

      if (await alreadySentRecently(supabase, matched.id, t.id, 14)) continue;

      const propAddr = await propertyAddress(supabase, t.property_id);
      const vars: Record<string, string> = {
        tenant_name: t.tenant_name || "Tenant",
        property_address: propAddr,
        lease_end_date: new Date(t.lease_end).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }),
        agent_name: agent.name || "Your Property Manager",
        agent_phone: (agent as any).phone || "",
      };
      const subject = fillMerge(matched.template_subject, vars);
      const body = fillMerge(matched.template_body, vars);
      const res = await sendEmail(supabase, t.tenant_email, subject, body);
      await logSend(supabase, matched, t.id, t.tenant_email, subject, res.ok ? "sent" : "failed", res.ok ? undefined : res.reason);
      processed++;
    }
  }
  return { processed };
}

// ─── INSPECTION NOTICES ────────────────────────────────────────────────
async function processInspections(supabase: ReturnType<typeof createClient>, agentFilter?: string) {
  let q = supabase
    .from("pm_automation_rules")
    .select("*")
    .eq("rule_type", "inspection_entry_notice")
    .eq("is_active", true);
  if (agentFilter) q = q.eq("agent_id", agentFilter);
  const { data: rules } = await q;
  if (!rules?.length) return { processed: 0 };

  const byAgent = new Map<string, Rule[]>();
  for (const r of rules as Rule[]) {
    if (!byAgent.has(r.agent_id)) byAgent.set(r.agent_id, []);
    byAgent.get(r.agent_id)!.push(r);
  }

  let processed = 0;
  const today = new Date();
  for (const [agentId, agentRules] of byAgent) {
    const agent = await getAgentInfo(supabase, agentId);
    const { data: inspections } = await supabase
      .from("property_inspections")
      .select("id, property_id, tenancy_id, scheduled_date, status")
      .eq("agent_id", agentId)
      .gte("scheduled_date", new Date(Date.now() - 86400_000).toISOString())
      .lte("scheduled_date", new Date(Date.now() + 8 * 86400_000).toISOString());
    if (!inspections?.length) continue;

    for (const insp of inspections as any[]) {
      const days = Math.ceil((new Date(insp.scheduled_date).getTime() - today.getTime()) / 86400_000);
      const matched = agentRules.find((r) => r.trigger_day === days);
      if (!matched || !insp.tenancy_id) continue;

      const { data: tenancy } = await supabase
        .from("tenancies")
        .select("id, tenant_name, tenant_email, property_id")
        .eq("id", insp.tenancy_id)
        .maybeSingle();
      if (!tenancy?.tenant_email) continue;

      if (await alreadySentRecently(supabase, matched.id, tenancy.id, 2)) continue;

      const propAddr = await propertyAddress(supabase, tenancy.property_id);
      const dt = new Date(insp.scheduled_date);
      const vars: Record<string, string> = {
        tenant_name: tenancy.tenant_name || "Tenant",
        property_address: propAddr,
        inspection_date: dt.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }),
        inspection_time: dt.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }),
        agent_name: agent.name || "Your Property Manager",
        agent_phone: (agent as any).phone || "",
      };
      const subject = fillMerge(matched.template_subject, vars);
      const body = fillMerge(matched.template_body, vars);
      const res = await sendEmail(supabase, tenancy.tenant_email, subject, body);
      await logSend(supabase, matched, tenancy.id, tenancy.tenant_email, subject, res.ok ? "sent" : "failed", res.ok ? undefined : res.reason);
      processed++;
    }
  }
  return { processed };
}

// ─── MAINTENANCE STATUS UPDATE (on-demand) ────────────────────────────
async function processMaintenance(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  newStatus?: string,
) {
  const { data: job } = await supabase
    .from("maintenance_jobs")
    .select("id, agent_id, tenancy_id, property_id, title, status")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || !job.tenancy_id) return { processed: 0 };

  const status = newStatus || (job as any).status;
  if (!["acknowledged", "in_progress", "completed"].includes(status)) return { processed: 0 };

  const { data: rule } = await supabase
    .from("pm_automation_rules")
    .select("*")
    .eq("agent_id", (job as any).agent_id)
    .eq("rule_type", "maintenance_update")
    .eq("trigger_event", status)
    .eq("is_active", true)
    .maybeSingle();
  if (!rule) return { processed: 0 };

  const { data: tenancy } = await supabase
    .from("tenancies")
    .select("id, tenant_name, tenant_email, property_id")
    .eq("id", (job as any).tenancy_id)
    .maybeSingle();
  if (!tenancy?.tenant_email) return { processed: 0 };

  // Idempotency: don't send the same status notice twice for the same job
  const { data: prior } = await supabase
    .from("pm_automation_log")
    .select("id")
    .eq("rule_id", (rule as any).id)
    .eq("tenancy_id", tenancy.id)
    .contains("meta", { job_id: jobId })
    .limit(1);
  if (prior && prior.length) return { processed: 0 };

  const agent = await getAgentInfo(supabase, (job as any).agent_id);
  const propAddr = await propertyAddress(supabase, tenancy.property_id);
  const vars: Record<string, string> = {
    tenant_name: tenancy.tenant_name || "Tenant",
    property_address: propAddr,
    job_title: (job as any).title || "your maintenance request",
    agent_name: agent.name || "Your Property Manager",
    agent_phone: (agent as any).phone || "",
  };
  const subject = fillMerge((rule as any).template_subject, vars);
  const body = fillMerge((rule as any).template_body, vars);
  const res = await sendEmail(supabase, tenancy.tenant_email, subject, body);
  await supabase.from("pm_automation_log").insert({
    rule_id: (rule as any).id,
    agent_id: (job as any).agent_id,
    tenancy_id: tenancy.id,
    recipient_email: tenancy.tenant_email,
    recipient_type: "tenant",
    subject,
    status: res.ok ? "sent" : "failed",
    error_text: res.ok ? null : res.reason,
    meta: { job_id: jobId, status },
  } as any);
  return { processed: 1 };
}

// ─── HTTP ENTRY ─────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const payload = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const { rule_type, agent_id, maintenance_job_id, new_status, run_all } = payload as Record<string, any>;

    let result: Record<string, unknown> = {};

    if (rule_type === "maintenance_update" || maintenance_job_id) {
      result = await processMaintenance(supabase, maintenance_job_id, new_status);
    } else if (rule_type === "arrears_sequence") {
      result = await processArrears(supabase, agent_id);
    } else if (rule_type === "lease_renewal_notice") {
      result = await processRenewals(supabase, agent_id);
    } else if (rule_type === "inspection_entry_notice") {
      result = await processInspections(supabase, agent_id);
    } else if (run_all || !rule_type) {
      const a = await processArrears(supabase, agent_id);
      const r = await processRenewals(supabase, agent_id);
      const i = await processInspections(supabase, agent_id);
      result = { arrears: a, renewals: r, inspections: i };
    }

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("run-pm-automations error", e);
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
