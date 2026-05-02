// Notification digest dispatcher — runs hourly and daily via pg_cron.
// Aggregates queued items per user per channel and delivers a single message.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  try {
    const { frequency } = await safeJson(req); // "hourly_digest" | "daily_digest"
    if (!frequency || !["hourly_digest", "daily_digest"].includes(frequency)) {
      return json({ error: "frequency required: hourly_digest|daily_digest" }, 400);
    }

    const { data: pending } = await sb
      .from("notification_queue")
      .select("id, user_id, event_key, channel, title, message")
      .is("delivered_at", null)
      .eq("frequency", frequency)
      .limit(1000);

    // Group by user+channel
    const groups = new Map<string, any[]>();
    for (const item of (pending ?? [])) {
      const key = `${item.user_id}:${item.channel}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    let delivered = 0;
    for (const [key, items] of groups) {
      const [userId, channel] = key.split(":");
      const summaryTitle = `Digest: ${items.length} update${items.length === 1 ? "" : "s"}`;
      const summaryBody = items.slice(0, 10).map((i: any) => `• ${i.title}`).join("\n") +
        (items.length > 10 ? `\n…and ${items.length - 10} more` : "");

      try {
        if (channel === "in_app") {
          const { data: agent } = await sb.from("agents").select("id").eq("user_id", userId).maybeSingle();
          if (agent?.id) {
            await sb.from("notifications").insert({
              agent_id: agent.id,
              type: `digest_${frequency}`,
              title: summaryTitle,
              message: summaryBody,
            });
          }
        } else if (channel === "email") {
          const { data: agent } = await sb.from("agents").select("email,name").eq("user_id", userId).maybeSingle();
          if (agent?.email) {
            await sb.functions.invoke("send-notification-email", {
              body: { to: agent.email, name: agent.name, subject: summaryTitle, body: summaryBody, event_key: `digest_${frequency}` },
            });
          }
        }

        const ids = items.map((i: any) => i.id);
        await sb.from("notification_queue").update({ delivered_at: new Date().toISOString() }).in("id", ids);
        await sb.from("notification_log").insert({
          user_id: userId, event_key: `digest_${frequency}`, channel,
          delivered_at: new Date().toISOString(),
        });
        delivered++;
      } catch (e: any) {
        await sb.from("notification_log").insert({
          user_id: userId, event_key: `digest_${frequency}`, channel,
          suppressed_reason: `error:${String(e?.message ?? e).slice(0, 200)}`,
        });
      }
    }

    return json({ ok: true, frequency, groups: groups.size, delivered });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

async function safeJson(req: Request) { try { return await req.json(); } catch { return {}; } }
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
