import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Sparkles, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MortgageBrokerCard } from './MortgageBrokerCard';
import { capture } from '@/shared/lib/posthog';
import { useI18n, type Language } from '@/shared/lib/i18n';

type LanguageKey = 'en' | 'zh_simplified' | 'zh_traditional' | 'vi';

interface Translation {
  title: string;
  description: string;
  summary: string;
  cultural_highlights?: string[];
}

interface AgentInsights {
  multicultural_appeal?: string;
  suggested_buyer_profiles?: string[];
  key_selling_points_for_diverse_buyers?: string[];
}

interface ListingRow {
  id: string;
  title?: string;
  description?: string;
  address?: string;
  suburb?: string;
  state?: string;
  price?: number;
  beds?: number;
  baths?: number;
  parking?: number;
  translations?: Record<string, Translation> | null;
  agent_insights?: AgentInsights | null;
  translation_status?: string | null;
  translations_generated_at?: string | null;
  [key: string]: unknown;
}

interface Props {
  listing: ListingRow;
  isAgent?: boolean;
}

const LANGUAGES: { key: LanguageKey; flag: string; label: string }[] = [
  { key: 'en', flag: '🇦🇺', label: 'English' },
  { key: 'zh_simplified', flag: '🇨🇳', label: '普通话' },
  { key: 'zh_traditional', flag: '🇭🇰', label: '廣東話' },
  { key: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
];

const TRANSLATABLE_LANGS: LanguageKey[] = ['zh_simplified', 'zh_traditional', 'vi'];

const LANGUAGE_DISPLAY_NAMES: Record<LanguageKey, string> = {
  en: 'English',
  zh_simplified: 'Simplified Chinese',
  zh_traditional: 'Traditional Chinese',
  vi: 'Vietnamese',
};

/** Map the i18n Language codes to this component's LanguageKey */
function i18nLangToListingLang(lang: Language): LanguageKey {
  if (lang === 'zh') return 'zh_simplified';
  if (lang === 'zh-TW') return 'zh_traditional';
  if (lang === 'vi') return 'vi';
  return 'en';
}

const MultilingualListingDetail = ({ listing, isAgent = false }: Props) => {
  const { language: i18nLang } = useI18n();

  const [liveTranslations, setLiveTranslations] = useState<Record<string, Translation>>(
    () => (listing.translations ?? {}) as Record<string, Translation>
  );
  const agentInsights = (listing.agent_insights ?? null) as AgentInsights | null;
  const hasTranslations = Object.keys(liveTranslations).length > 0;

  const availableLanguages = LANGUAGES.filter(
    (l) => l.key === 'en' || liveTranslations[l.key]
  );

  const [language, setLanguage] = useState<LanguageKey>('en');
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [autoTranslating, setAutoTranslating] = useState(false);
  const [autoTranslateLang, setAutoTranslateLang] = useState<LanguageKey | null>(null);
  const translationAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setLiveTranslations((listing.translations ?? {}) as Record<string, Translation>);
  }, [listing.translations]);

  // React to i18n language changes (including on mount)
  useEffect(() => {
    const targetLang = i18nLangToListingLang(i18nLang);

    // Cancel any in-flight translation request
    if (translationAbortRef.current) {
      translationAbortRef.current.abort();
      translationAbortRef.current = null;
    }

    if (!TRANSLATABLE_LANGS.includes(targetLang)) {
      // Not a supported translation language — show English
      setLanguage('en');
      setAutoTranslating(false);
      setAutoTranslateLang(null);
      return;
    }

    if (liveTranslations[targetLang]) {
      // Translation already available
      setLanguage(targetLang);
      setAutoTranslating(false);
      setAutoTranslateLang(null);
      return;
    }

    // Translation missing — trigger auto-translation
    setLanguage(targetLang);
    setAutoTranslateLang(targetLang);
    setAutoTranslating(true);

    const controller = new AbortController();
    translationAbortRef.current = controller;

    supabase.functions
      .invoke('generate-translations', {
        body: { listing_id: listing.id },
      })
      .then(({ data, error }) => {
        if (controller.signal.aborted) return;
        if (error || !data) {
          setLanguage('en');
          setAutoTranslating(false);
          setAutoTranslateLang(null);
          return;
        }
        return supabase
          .from('properties')
          .select('translations')
          .eq('id', listing.id)
          .maybeSingle();
      })
      .then((result) => {
        if (!result || controller.signal.aborted) return;
        if (result.data?.translations) {
          const newTranslations = result.data.translations as unknown as Record<string, Translation>;
          setLiveTranslations(newTranslations);
          setLanguage(newTranslations[targetLang] ? targetLang : 'en');
        } else {
          setLanguage('en');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLanguage('en');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setAutoTranslating(false);
          setAutoTranslateLang(null);
        }
      });

    capture('listing_viewed', {
      listing_id: listing.id,
      language: targetLang,
      has_translations: hasTranslations,
    });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18nLang, listing.id]);

  const switchLanguage = useCallback(
    (to: LanguageKey) => {
      const from = language;
      setLanguage(to);
      capture('listing_language_switched', {
        listing_id: listing.id,
        from_language: from,
        to_language: to,
      });
    },
    [language, listing.id]
  );

  const isEnglish = language === 'en';
  const t = isEnglish ? null : liveTranslations[language];

  const title = t?.title || listing.title || listing.address || 'Untitled';
  const description = t?.description || listing.description || '';
  const summary = t?.summary || '';
  const culturalHighlights = t?.cultural_highlights ?? [];

  return (
    <div className="space-y-6">
      {/* Auto-translation banner */}
      {autoTranslating && autoTranslateLang && (
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary animate-pulse">
          <span>✨</span>
          <span>
            Translating this listing into {LANGUAGE_DISPLAY_NAMES[autoTranslateLang]}…
          </span>
        </div>
      )}

      {/* Translation status warning */}
      {!autoTranslating && listing.translation_status && listing.translation_status !== 'complete' && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            Translations are {listing.translation_status === 'pending' ? 'pending generation' : listing.translation_status}.
            Content shown may not be up to date.
          </span>
        </div>
      )}

      {/* Language toggle */}
      {availableLanguages.length > 1 && (
        <div className="flex items-center gap-1.5">
          <Globe size={14} className="text-muted-foreground" />
          {availableLanguages.map((l) => (
            <button
              key={l.key}
              onClick={() => switchLanguage(l.key)}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                language === l.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Title */}
      <div className="flex items-start gap-3 flex-wrap">
        <h1 className="font-display text-2xl font-bold text-foreground leading-tight flex-1">
          {title}
        </h1>
        {!isEnglish && hasTranslations && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 px-3 py-1 text-xs font-semibold text-teal-600 dark:text-teal-400 shrink-0 mt-1">
            <Globe size={12} />
            AI Translated
          </span>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <p className="text-base text-muted-foreground italic">{summary}</p>
      )}

      {/* Description */}
      {description && (
        <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
          {description.split('\n').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      {/* Mortgage Broker Card */}
      <MortgageBrokerCard
        propertyId={listing.id}
        propertyAddress={listing.address ?? listing.suburb ?? undefined}
        propertyPrice={listing.price ? `$${Number(listing.price).toLocaleString()}` : undefined}
      />
      {culturalHighlights.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-300">
            <Sparkles size={14} />
            Cultural Highlights
          </h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-amber-700 dark:text-amber-400">
            {culturalHighlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Agent Insights */}
      {!isEnglish && agentInsights && (
        <div className="rounded-xl border border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20">
          <button
            onClick={() => setInsightsOpen(!insightsOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-blue-800 dark:text-blue-300"
          >
            <span>Buyer Insights for This Market</span>
            {insightsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {insightsOpen && (
            <div className="space-y-3 border-t border-blue-200 px-4 py-3 text-sm text-blue-700 dark:border-blue-700 dark:text-blue-400">
              {agentInsights.multicultural_appeal && (
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-300">Multicultural Appeal</h4>
                  <p>{agentInsights.multicultural_appeal}</p>
                </div>
              )}
              {agentInsights.suggested_buyer_profiles && agentInsights.suggested_buyer_profiles.length > 0 && (
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-300">Suggested Buyer Profiles</h4>
                  <ul className="list-inside list-disc space-y-0.5">
                    {agentInsights.suggested_buyer_profiles.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {agentInsights.key_selling_points_for_diverse_buyers &&
                agentInsights.key_selling_points_for_diverse_buyers.length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-800 dark:text-blue-300">Key Selling Points</h4>
                    <ul className="list-inside list-disc space-y-0.5">
                      {agentInsights.key_selling_points_for_diverse_buyers.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── MultilingualSearchBar ────────────────────────────────────────── */

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function MultilingualSearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [translating, setTranslating] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);

  const placeholders = [
    'Search properties…',
    '搜索房产…',
    'Tìm kiếm bất động sản…',
  ];
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setTranslating(true);
    setDetectedLang(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-translations', {
        body: { type: 'translate_search', search_query: trimmed },
      });

      if (error || !data?.english_query) throw new Error('Translation failed');

      setDetectedLang(data.detected_language || null);
      onSearch(data.english_query);
    } catch {
      // Fallback: search with raw input
      onSearch(trimmed);
    } finally {
      setTranslating(false);
    }
  };

  const langNames: Record<string, string> = {
    en: 'English',
    zh: '中文 (Chinese)',
    vi: 'Tiếng Việt',
    ko: '한국어',
    ja: '日本語',
    ar: 'العربية',
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholders[placeholderIdx]}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {translating && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {detectedLang && detectedLang !== 'en' && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Detected: {langNames[detectedLang] || detectedLang} — translated to English for search
        </p>
      )}
    </form>
  );
}

export default MultilingualListingDetail;
