// Smart Search — natural-language property query parser.
// Uses the Lovable AI Gateway (LOVABLE_API_KEY) so we don't need a direct Gemini key.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const AI_MODEL = "google/gemini-2.5-flash";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const PARSER_SYSTEM_PROMPT = `You are a real estate query parser for the Australian market. Extract structured filters from natural-language buyer queries in ANY language (English, Mandarin Simplified/Traditional, Vietnamese with or without diacritics, Korean, Arabic, Hindi, Japanese, etc.).

NUMBER FORMAT HANDLING:
- "$2m", "2M", "2 million", "$2,000,000" → 2000000 (AUD)
- "200万" (Mandarin ten-thousand) → 2000000 AUD
- "200 vạn" (Vietnamese ten-thousand) → 2000000 AUD
- "200만" (Korean man) → 2000000 (KRW) — convert with 1 KRW = 0.0011 AUD ≈ 2200 AUD. If the user clearly means KRW, return min_price_aud/max_price_aud in AUD after FX.
- "1.2m" → 1200000
- "under 1m" / "below $1M" → max_price_aud = 1000000
- "between 500k and 800k" → min_price_aud=500000, max_price_aud=800000
- "from 700k" → min_price_aud=700000

SUBURB MATCHING (Australian context — Melbourne, Sydney, Brisbane, Perth, Adelaide):
- Be lenient on typos: "Box Hil", "Bocks Hill", "boxhill" → Box Hill
- Accept nicknames: "Cabra" → Cabramatta, "Glen Wav" → Glen Waverley, "Parra" → Parramatta
- No-diacritics Vietnamese: "Cabra matta" → Cabramatta
- Chinese suburb names: 墨尔本→Melbourne, 悉尼→Sydney, 博士山→Box Hill, 格兰韦弗利→Glen Waverley, 帕拉马塔→Parramatta, 卡布拉马塔→Cabramatta, 唐卡斯特→Doncaster, 伊斯特伍德→Eastwood, 斯特拉斯菲尔德→Strathfield, 赫斯特维尔→Hurstville, 查茨伍德→Chatswood
- Korean: 시드니→Sydney, 멜버른→Melbourne, 이스트우드→Eastwood, 스트라스필드→Strathfield
- DO NOT invent suburbs — if unclear, leave blank and add to unmatched_terms

INTENT DETECTION:
- "rent", "lease", "let", "to let", "weekly", "per week", "/week", "pw", "p/w", "$X a week", "租", "出租", "thuê", "임대", "إيجار" → "rent"
- "buy", "purchase", "for sale", "买", "购买", "mua", "구매", "شراء" → "buy"
- "sold", "售出", "đã bán" → "sold"
- Default "buy" if unclear

PRICE PERIOD DETECTION (CRITICAL — Australian rent is ALWAYS per-week):
- If intent="rent": ALWAYS set price_period="per_week".
- If intent="buy" or "sold": set price_period="total".
- Mentions of "per week", "/week", "p/w", "pw", "weekly", "a week", "每周", "周", "tuần", "주" → price_period="per_week" AND auto-correct intent to "rent" if not already.
- Mentions of "per month", "/month", "/mo", "monthly" for residential rent → CONVERT to per-week by dividing by 4.33 (round to nearest dollar) and return price_period="per_week".
- Mentions of "per annum", "yearly", "p.a." for rent → divide by 52 and return price_period="per_week".
- If intent unknown and the price is small (< $50,000), assume intent="rent" + price_period="per_week".

PRICE PERIOD EXAMPLES:
- "3 bed apartment Cabramatta under $700 week" → intent=rent, max_price_aud=700, price_period=per_week
- "house in Box Hill under $1.2m" → intent=buy, max_price_aud=1200000, price_period=total
- "rental Eastwood $600 p/w" → intent=rent, max_price_aud=600, price_period=per_week
- "apartment Sydney $800 weekly" → intent=rent, max_price_aud=800, price_period=per_week
- "rent Springvale $2600 per month" → intent=rent, max_price_aud=600, price_period=per_week (2600/4.33≈600)

PROPERTY TYPE:
- "house", "独立屋", "단독주택", "nhà phố", "villa" → "house"
- "apartment", "unit", "公寓", "아파트", "căn hộ" → "apartment"
- "townhouse", "联排", "타운하우스", "nhà liền kề" → "townhouse"
- "land", "block", "土地", "땅", "đất" → "land"
- "commercial", "shop", "office", "商铺", "상업용" → "commercial"

CAR SPACES:
- "2 car", "2 car garage", "double garage", "2车位", "2주차", "2 chỗ đậu xe" → parking_min=2

FEATURES (extract to features array):
- "pool", "swimming pool", "泳池", "수영장", "hồ bơi"
- "north-facing", "north facing", "朝北", "북향"
- "study", "office room", "书房", "서재"
- "near schools", "good school zone", "学区房", "학군"
- "pet friendly", "pets allowed", "宠物友好", "반려동물 가능"
- "new build", "新建", "신축"
- "period home", "old home", "老房子"

DEAL BREAKERS (extract negations):
- "no strata", "không có chung cư phí" → ["no strata"]
- "not near highway", "不要靠近主路" → ["not near highway"]
- "no ground floor", "không tầng trệt" → ["no ground floor"]

EMOJI: ignore emojis but extract numbers next to them (🛏 next to 3 = beds_min: 3).

ALL CAPS / no spaces: handle gracefully ("BOXHILLUNDER1M" → suburb=Box Hill, max_price_aud=1000000).

Return ONLY valid JSON matching the exact schema below. No prose. No markdown. No code fences.

SCHEMA:
{
  "intent": "buy" | "rent" | "sold" | "unknown",
  "suburb_or_locality": string | null,
  "postcode": string | null,
  "state": "VIC" | "NSW" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT" | null,
  "property_types": string[] | null,
  "beds_min": number | null,
  "beds_max": number | null,
  "baths_min": number | null,
  "parking_min": number | null,
  "min_price_aud": number | null,
  "max_price_aud": number | null,
  "price_period": "per_week" | "total" | null,
  "features": string[] | null,
  "deal_breakers": string[] | null,
  "raw_language": string,
  "confidence": number,
  "unmatched_terms": string[] | null
}`;

async function parseWithAI(query: string, locale: string) {
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: PARSER_SYSTEM_PROMPT },
        { role: "user", content: `QUERY: ${query}\nUI_LOCALE: ${locale}` },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI gateway ${res.status}: ${text}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty AI response");
  return JSON.parse(text);
}

async function hashQuery(query: string, locale: string): Promise<string> {
  const enc = new TextEncoder().encode(`${locale}::${query.trim().toLowerCase()}`);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Resolve user (optional — anonymous searches allowed)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await admin.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    const { query, locale = "en" } = await req.json();

    if (query === '__warmup__') {
      return new Response(JSON.stringify({ warmup: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!query || typeof query !== "string" || query.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hash = await hashQuery(query, locale);

    // Cache lookup
    const { data: cached } = await admin
      .from("parsed_queries")
      .select("parsed_filters, expires_at")
      .eq("query_hash", hash)
      .maybeSingle();

    if (cached && new Date(cached.expires_at) > new Date()) {
      return new Response(
        JSON.stringify({ parsed: cached.parsed_filters, cached: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Cache miss — call AI
    const parsed = await parseWithAI(query, locale);

    // Store in cache
    await admin.from("parsed_queries").upsert({
      query_hash: hash,
      locale,
      parsed_filters: parsed,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    // Log to audit table
    await admin.from("search_queries").insert({
      user_id: userId,
      raw_query: query,
      detected_language: parsed.raw_language ?? locale,
      parsed_filters: parsed,
      confidence: parsed.confidence ?? null,
    });

    return new Response(JSON.stringify({ parsed, cached: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[parse-search-query] error:", err);
    return new Response(
      JSON.stringify({ error: "Parse failed", detail: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
