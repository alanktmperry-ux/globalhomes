// Shared API-usage logger used by edge functions to track external service spend.
// All inserts are wrapped so a logging failure never breaks the user flow.

import { createClient } from "npm:@supabase/supabase-js@2";

export const COST_RATES = {
  deepgram_per_minute: 0.0125,    // AUD / minute (also used for OpenAI Whisper)
  gemini_per_1k_tokens: 0.0015,   // AUD / 1k tokens
  resend_per_email: 0.001,        // AUD / email above free tier
  google_maps_per_request: 0.012, // AUD / place lookup
  supabase_monthly_base: 39,
};

export type ApiService =
  | "deepgram"
  | "gemini"
  | "resend"
  | "google_maps"
  | "supabase";

interface LogEvent {
  service: ApiService;
  action: string;
  units?: number;
  cost_estimate?: number;
  user_id?: string | null;
  metadata?: Record<string, unknown>;
}

let _client: ReturnType<typeof createClient> | null = null;
function getClient() {
  if (_client) return _client;
  const url = Deno.env.get("SUPABASE_URL");
  const key =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  _client = createClient(url, key);
  return _client;
}

/**
 * Log a single API usage event. Never throws.
 */
export async function logApiUsage(evt: LogEvent): Promise<void> {
  try {
    const client = getClient();
    if (!client) return;
    await client.from("api_usage_events").insert({
      service: evt.service,
      action: evt.action,
      units: evt.units ?? 1,
      cost_estimate: Number(evt.cost_estimate ?? 0),
      user_id: evt.user_id ?? null,
      metadata: evt.metadata ?? null,
    });
  } catch (e) {
    console.error("logApiUsage failed:", e);
  }
}

export const costFor = {
  deepgram(seconds: number) {
    return (seconds / 60) * COST_RATES.deepgram_per_minute;
  },
  gemini(tokens: number) {
    return (tokens / 1000) * COST_RATES.gemini_per_1k_tokens;
  },
  resend() {
    return COST_RATES.resend_per_email;
  },
  googleMaps() {
    return COST_RATES.google_maps_per_request;
  },
};
