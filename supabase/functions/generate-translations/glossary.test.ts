// Test the glossary sentinel pre/post-processing end-to-end against the
// Lovable AI gateway. This proves curated terminology is preserved through
// a real AI translation roundtrip.
//
// Run: supabase functions test glossary.test.ts
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Inline copies of the helpers + a small slice of the glossary so the test
// is self-contained and doesn't import the function module (which has
// top-level side-effects like getCorsHeaders).

type GlossarySupportedLanguage = "zh_simplified" | "zh_traditional" | "vi" | "ko";
type GlossaryEntry = {
  source: string;
  translations: Partial<Record<GlossarySupportedLanguage, string>>;
};

const GLOSSARY: GlossaryEntry[] = [
  { source: "OFI",        translations: { zh_simplified: "开放参观", zh_traditional: "開放參觀", vi: "Mở tham quan", ko: "공개 관람" } },
  { source: "settlement", translations: { zh_simplified: "过户结算", zh_traditional: "過戶結算", vi: "Thanh toán bàn giao", ko: "잔금 정산" } },
  { source: "auction",    translations: { zh_simplified: "拍卖", zh_traditional: "拍賣", vi: "Đấu giá", ko: "경매" } },
];

function applyGlossarySentinels(text: string) {
  let out = text;
  const replacements: Array<{ sentinel: string; entry: GlossaryEntry }> = [];
  let counter = 0;
  const sorted = [...GLOSSARY].sort((a, b) => b.source.length - a.source.length);
  for (const entry of sorted) {
    const sentinel = `<<G:${counter}>>`;
    const pattern = new RegExp(`\\b${entry.source.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "gi");
    if (pattern.test(out)) {
      replacements.push({ sentinel, entry });
      out = out.replace(pattern, sentinel);
      counter++;
    }
  }
  return { text: out, replacements };
}

function restoreGlossarySentinels(
  translatedText: string,
  replacements: Array<{ sentinel: string; entry: GlossaryEntry }>,
  targetLang: string,
) {
  let out = translatedText;
  for (const { sentinel, entry } of replacements) {
    const replacement =
      entry.translations[targetLang as GlossarySupportedLanguage] ?? entry.source;
    out = out.split(sentinel).join(replacement);
  }
  return out;
}

Deno.test("glossary sentinels survive a real AI roundtrip and restore curated zh terms", async () => {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.warn("LOVABLE_API_KEY not set — skipping live AI roundtrip");
    return;
  }

  const english =
    "Join us at the OFI on Saturday. Settlement is 60 days. The auction will be held onsite.";
  const { text, replacements } = applyGlossarySentinels(english);

  // Sentinels were inserted for OFI / settlement / auction
  assertEquals(replacements.length, 3);
  assertStringIncludes(text, "<<G:");
  assert(!/\bOFI\b/.test(text), "OFI should be sentinelled");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "Translate the user's English text into Simplified Chinese. Any token of the form <<G:N>> is a sentinel — copy it verbatim into the output. Return ONLY the translated string, no JSON.",
        },
        { role: "user", content: text },
      ],
    }),
  });
  if (resp.status !== 200) {
    const errBody = await resp.text();
    throw new Error(`AI gateway returned ${resp.status}: ${errBody}`);
  }
  const data = await resp.json();
  const translated: string = data.choices?.[0]?.message?.content ?? "";
  console.log("Sentinelled translation:", translated);

  // Restore for zh_simplified
  const finalZh = restoreGlossarySentinels(translated, replacements, "zh_simplified");
  console.log("Final zh_simplified:", finalZh);

  assertStringIncludes(finalZh, "开放参观");  // OFI
  assertStringIncludes(finalZh, "过户结算");  // settlement
  assertStringIncludes(finalZh, "拍卖");      // auction
  assert(!/<<G:\d+>>/.test(finalZh), "no sentinels should leak through");
});
