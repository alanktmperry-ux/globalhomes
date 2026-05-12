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

  // Atomic increment via SQL function — avoids read-then-write race under concurrency.
  const { data, error } = await supabase.rpc("bump_rate_limit", {
    p_bucket_key: bucketKey,
    p_window_seconds: config.windowSeconds,
    p_max_requests: maxRequests,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    // Fail open
    console.error("[rateLimit] bump_rate_limit failed:", error);
    return {
      allowed: true,
      remaining: maxRequests,
      limit: maxRequests,
      resetAt: new Date(now.getTime() + windowMs),
    };
  }

  const row = data[0] as {
    request_count: number;
    window_start: string;
    blocked_until: string | null;
    allowed: boolean;
  };

  const windowEnd = new Date(new Date(row.window_start).getTime() + windowMs);
  const resetAt = row.blocked_until ? new Date(row.blocked_until) : windowEnd;

  if (!row.allowed) {
    return {
      allowed: false,
      remaining: 0,
      limit: maxRequests,
      resetAt,
      blockedReason: "rate-limited",
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - row.request_count),
    limit: maxRequests,
    resetAt: windowEnd,
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

/**
 * One-call rate-limit guard. Returns a 429 Response if the caller is over
 * the limit, otherwise null. Fails open (returns null) on any internal error
 * so a DB hiccup never takes down an endpoint.
 */
export async function enforceRateLimit(
  req: Request,
  config: RateLimitConfig,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  try {
    const userId = await getUserIdFromRequest(req);
    const result = await checkRateLimit(req, config, userId);
    if (!result.allowed) return rateLimitResponse(result, corsHeaders);
    return null;
  } catch (e) {
    console.error("[rateLimit] check failed, failing open:", e);
    return null;
  }
}
