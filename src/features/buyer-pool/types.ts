export type TopLanguage = {
  lang: string;
  count: number;
  pct: number;
};

export type SuburbLanguageStats = {
  sal_code: string;
  suburb_name: string;
  suburb_slug: string;
  state: string;
  total_population: number;
  english_only_count: number;
  non_english_count: number;
  non_english_pct: number;
  top_languages: TopLanguage[];
};

export type SuburbSuggestion = Pick<
  SuburbLanguageStats,
  "suburb_name" | "state" | "suburb_slug"
> & { non_english_pct?: number };
