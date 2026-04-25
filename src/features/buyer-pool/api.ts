import { supabase } from "@/integrations/supabase/client";
import type { SuburbLanguageStats, SuburbSuggestion } from "./types";

export async function searchSuburbs(query: string): Promise<SuburbSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from("suburb_language_stats")
    .select("suburb_name, state, suburb_slug, non_english_pct")
    .ilike("suburb_name", `${q}%`)
    .order("non_english_pct", { ascending: false })
    .limit(8);
  if (error) throw error;
  return (data ?? []) as SuburbSuggestion[];
}

export async function getSuburbBySlug(
  slug: string,
): Promise<SuburbLanguageStats | null> {
  const { data, error } = await supabase
    .from("suburb_language_stats")
    .select(
      "sal_code, suburb_name, suburb_slug, state, total_population, english_only_count, non_english_count, non_english_pct, top_languages",
    )
    .eq("suburb_slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as SuburbLanguageStats | null;
}

export async function getTopFallbackSuburbs(): Promise<SuburbSuggestion[]> {
  const { data, error } = await supabase
    .from("suburb_language_stats")
    .select("suburb_name, state, suburb_slug, non_english_pct")
    .order("non_english_pct", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []) as SuburbSuggestion[];
}

export async function logLookup(params: {
  suburb_searched: string;
  sal_code_matched: string | null;
}) {
  try {
    await supabase.from("buyer_pool_lookups").insert({
      suburb_searched: params.suburb_searched,
      sal_code_matched: params.sal_code_matched,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    // never block UI on logging
  }
}
