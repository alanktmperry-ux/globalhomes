// Shared rate-limit helper backed by the `rate_limits` table.
// NOTE: This is an ad-hoc DB-backed limiter — fine for protecting against
// abuse / scraping, but not a substitute for an edge-deployed limiter at
// very high concurrency. Each check costs 1-2 round trips to Postgres.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SCRAPER_UA_PATTERNS = [
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /python-urllib/i,
  /scrapy/i,
  /go-http-client/i,
  /httpie/i,
  /^okhttp/i,
  /java\//i,
  /node-fetch/i,
];

function detectScraperUserAgent(req: Request): boolean {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua) return true; // missing UA from a non-internal caller = suspicious
  return SCRAPER_UA_PATTERNS.some((p) => p.test(ua));
}

export interface RateLimitConfig {
  endpoint: string;
  userMaxPerWindow: number;
  ipMaxPerWindow: number;
  windowSeconds: number;
  punishScrapers?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
  blockedReason?: string;
}

export async function checkRateLimit(
  req: Request,
  config: RateLimitConfig,
  userId: string | null,
): Promise<RateLimitResult> {
  const ip = req.headers.get("cf-connecting-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";

  const isScraper = !!config.punishScrapers && detectScraperUserAgent(req);

  const bucketKey = userId
    ? `${config.endpoint}:user:${userId}`
    : `${config.endpoint}:ip:${ip}`;

  const maxRequests = userId
    ? config.userMaxPerWindow
    : (isScraper ? Math.floor(config.ipMaxPerWindow / 2) : config.ipMaxPerWindow);

  const now = new Date();
  const windowMs = config.windowSeconds * 1000;
  const windowFloor = new Date(now.getTime() - windowMs);

  // Hard zero — endpoint disallows this scope entirely
  if (maxRequests <= 0) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      resetAt: new Date(now.getTime() + windowMs),
      blockedReason: "scope-not-allowed",
    };
  }

  const { data: existing } = await supabase
    .from("rate_limits")
    .select("request_count, window_start, blocked_until")
    .eq("bucket_key", bucketKey)
    .maybeSingle();

  if (existing?.blocked_until && new Date(existing.blocked_until) > now) {
    return {
      allowed: false,
      remaining: 0,
      limit: maxRequests,
      resetAt: new Date(existing.blocked_until),
      blockedReason: "rate-limited",
    };
  }

  if (existing && new Date(existing.window_start) > windowFloor) {
    const newCount = existing.request_count + 1;
    const windowEnd = new Date(new Date(existing.window_start).getTime() + windowMs);

    if (newCount > maxRequests) {
      await supabase
        .from("rate_limits")
        .update({
          request_count: newCount,
          last_request_at: now.toISOString(),
          blocked_until: windowEnd.toISOString(),
        })
        .eq("bucket_key", bucketKey);

      return {
        allowed: false,
        remaining: 0,
        limit: maxRequests,
        resetAt: windowEnd,
        blockedReason: "rate-limited",
      };
    }

    await supabase
      .from("rate_limits")
      .update({
        request_count: newCount,
        last_request_at: now.toISOString(),
      })
      .eq("bucket_key", bucketKey);

    return {
      allowed: true,
      remaining: maxRequests - newCount,
      limit: maxRequests,
      resetAt: windowEnd,
    };
  }

  // New window — upsert reset row
  await supabase
    .from("rate_limits")
    .upsert(
      {
        bucket_key: bucketKey,
        request_count: 1,
        window_start: now.toISOString(),
        last_request_at: now.toISOString(),
        blocked_until: null,
      },
      { onConflict: "bucket_key" },
    );

  return {
    allowed: true,
    remaining: maxRequests - 1,
    limit: maxRequests,
    resetAt: new Date(now.getTime() + windowMs),
  };
}

export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>,
): Response {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000));
  return new Response(
    JSON.stringify({
      error: "rate_limited",
      message: "Too many requests. Please slow down.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": result.resetAt.toISOString(),
      },
    },
  );
}

/** Extracts the authenticated user id from a request, or null if anonymous/invalid. */
export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const { data } = await supabase.auth.getUser(token);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}
