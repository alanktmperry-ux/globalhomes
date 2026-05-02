// Notification dispatcher — central pipeline for all notification inserts.
// Reads user prefs, respects quiet hours / mute / frequency, logs to notification_log.
// Modes: realtime → insert into notifications + queue email if enabled.
//        digest → insert into notification_queue.
//        off → log suppressed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type DispatchInput = {
  user_id?: string;        // auth user id
  agent_id?: string;       // OR agent id (will resolve to user_id)
  event_key: string;
  title: string;
  message?: string;
  property_id?: string | null;
  lead_id?: string | null;
  payload?: Record<string, unknown>;
  type?: string;           // notifications.type fallback (defaults to event_key)
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  try {
    const input = (await req.json()) as DispatchInput;
    if (!input?.event_key || !input?.title) {
      return json({ error: "event_key and title required" }, 400);
    }

    // Resolve user_id and agent_id (we need agent_id for notifications.agent_id FK)
    let userId = input.user_id ?? null;
    let agentId = input.agent_id ?? null;
    if (!userId && agentId) {
      const { data } = await sb.from("agents").select("user_id").eq("id", agentId).maybeSingle();
      userId = data?.user_id ?? null;
    }
    if (!agentId && userId) {
      const { data } = await sb.from("agents").select("id").eq("user_id", userId).maybeSingle();
      agentId = data?.id ?? null;
    }
    if (!userId || !agentId) {
      return json({ error: "Could not resolve user/agent" }, 400);
    }

    // Load prefs + settings
    const [{ data: pref }, { data: settings }] = await Promise.all([
      sb.from("notification_preferences").select("*").eq("user_id", userId).eq("event_key", input.event_key).maybeSingle(),
      sb.from("notification_settings").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const channels = (pref?.channels ?? { in_app: true, email: false, push: false }) as Record<string, boolean>;
    const frequency = (pref?.frequency ?? "realtime") as string;

    // Mute check
    if (settings?.mute_until && new Date(settings.mute_until) > new Date()) {
      await logSuppressed(sb, userId, input.event_key, ["in_app", "email"], "mute_active");
      return json({ delivered: false, reason: "mute_active" });
    }

    // Off
    if (frequency === "off") {
      await logSuppressed(sb, userId, input.event_key, ["in_app", "email"], "frequency_off");
      return json({ delivered: false, reason: "frequency_off" });
    }

    // Quiet hours (suppresses email entirely; defers in_app via queueing as hourly_digest)
    const inQuietHours = isInQuietHours(settings);
    const results: Record<string, string> = {};

    // Digest path
    if (frequency === "hourly_digest" || frequency === "daily_digest") {
      for (const ch of ["in_app", "email"]) {
        if (!channels[ch]) { results[ch] = "channel_off"; continue; }
        if (ch === "email" && inQuietHours) { results[ch] = "quiet_hours"; continue; }
        await sb.from("notification_queue").insert({
          user_id: userId, event_key: input.event_key, channel: ch,
          frequency, title: input.title, message: input.message ?? null, payload: input.payload ?? {},
        });
        results[ch] = "queued";
      }
      await logBulk(sb, userId, input.event_key, results);
      return json({ delivered: false, queued: true, results });
    }

    // Realtime path
    if (channels.in_app) {
      if (inQuietHours) {
        // defer to hourly digest queue
        await sb.from("notification_queue").insert({
          user_id: userId, event_key: input.event_key, channel: "in_app",
          frequency: "hourly_digest", title: input.title, message: input.message ?? null, payload: input.payload ?? {},
        });
        results.in_app = "deferred_quiet_hours";
      } else {
        const { data: notif, error } = await sb.from("notifications").insert({
          agent_id: agentId,
          type: input.type ?? input.event_key,
          title: input.title,
          message: input.message ?? null,
          property_id: input.property_id ?? null,
          lead_id: input.lead_id ?? null,
        }).select("id").maybeSingle();
        if (error) { results.in_app = `error:${error.message}`; }
        else {
          await sb.from("notification_log").insert({
            user_id: userId, event_key: input.event_key, channel: "in_app",
            delivered_at: new Date().toISOString(), notification_id: notif?.id,
          });
          results.in_app = "delivered";
        }
      }
    } else {
      results.in_app = "channel_off";
      await logSuppressed(sb, userId, input.event_key, ["in_app"], "channel_off");
    }

    if (channels.email) {
      if (inQuietHours) {
        results.email = "quiet_hours";
        await logSuppressed(sb, userId, input.event_key, ["email"], "quiet_hours");
      } else {
        try {
          const { data: agent } = await sb.from("agents").select("email,name").eq("id", agentId).maybeSingle();
          if (agent?.email) {
            // Insert a pending log row first (delivered_at = null until send confirms).
            const { data: logRow } = await sb.from("notification_log").insert({
              user_id: userId, event_key: input.event_key, channel: "email",
              delivered_at: null,
            }).select("id").maybeSingle();

            // Fire-and-forget — don't block dispatcher on email send.
            // Mark delivered_at only on success.
            sb.functions.invoke("send-notification-email", {
              body: {
                to: agent.email, name: agent.name,
                subject: input.title,
                html: input.message ?? input.title,
                event_key: input.event_key,
              },
            }).then(({ error }: { error: unknown }) => {
              if (error) {
                console.error("send-notification-email failed", error);
                return;
              }
              if (logRow?.id) {
                sb.from("notification_log")
                  .update({ delivered_at: new Date().toISOString() })
                  .eq("id", logRow.id)
                  .then(() => {});
              }
            }).catch((err: unknown) => {
              console.error("send-notification-email invoke threw", err);
            });

            results.email = "queued";
          } else {
            results.email = "no_email_address";
          }
        } catch (e: any) {
          results.email = `error:${e?.message ?? e}`;
        }
      }
    } else {
      results.email = "channel_off";
    }

    return json({ delivered: true, results });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function isInQuietHours(settings: any): boolean {
  if (!settings?.quiet_hours_start || !settings?.quiet_hours_end) return false;
  try {
    const tz = settings.quiet_hours_timezone || "Australia/Sydney";
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-AU", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
    const parts = fmt.formatToParts(now);
    const h = Number(parts.find(p => p.type === "hour")?.value ?? "0");
    const m = Number(parts.find(p => p.type === "minute")?.value ?? "0");
    const cur = h * 60 + m;
    const [sh, sm] = settings.quiet_hours_start.split(":").map(Number);
    const [eh, em] = settings.quiet_hours_end.split(":").map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    return start <= end ? (cur >= start && cur < end) : (cur >= start || cur < end);
  } catch { return false; }
}

async function logSuppressed(sb: any, userId: string, eventKey: string, channels: string[], reason: string) {
  for (const ch of channels) {
    await sb.from("notification_log").insert({
      user_id: userId, event_key: eventKey, channel: ch, suppressed_reason: reason,
    });
  }
}

async function logBulk(sb: any, userId: string, eventKey: string, results: Record<string, string>) {
  for (const [ch, r] of Object.entries(results)) {
    await sb.from("notification_log").insert({
      user_id: userId, event_key: eventKey, channel: ch,
      delivered_at: r === "queued" ? null : new Date().toISOString(),
      suppressed_reason: r === "queued" ? null : r,
    });
  }
}
