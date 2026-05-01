import { useEffect, useState, useRef } from 'react';
import { useI18n, type Language } from '@/shared/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { translateListing } from '@/features/properties/lib/translationService';

/**
 * Maps the i18n Language code to the JSONB key used inside `properties.translations`.
 * Returns null for languages without a stored translation (English or unsupported).
 */
function mapLanguageToTranslationKey(lang: Language): string | null {
  switch (lang) {
    case 'zh': return 'zh_simplified';
    case 'zh-TW': return 'zh_traditional';
    case 'ko': return 'ko';
    case 'ar': return 'ar';
    case 'ja': return 'ja';
    case 'vi': return 'vi';
    case 'hi': return 'hi';
    case 'bn': return 'bn';
    // Punjabi & Tamil — handled via string match (codes may not be in Language union yet)
    default:
      if ((lang as string) === 'pa') return 'pa';
      if ((lang as string) === 'ta') return 'ta';
      return null;
  }
}

interface TranslationResult {
  title: string;
  description: string;
  summary?: string;
  isTranslating: boolean;
  isTranslated: boolean;
}

/**
 * Hook: returns the listing's title/description in the active language.
 * - English (or unsupported): returns originals immediately, no API call.
 * - Cache hit (translations JSONB has the key): returns cached values.
 * - Cache miss / pending: triggers translateListing() and refreshes the property.
 */
export function useListingTranslation(property: any | null | undefined): TranslationResult {
  const { language } = useI18n();
  const [isTranslating, setIsTranslating] = useState(false);
  const [refreshed, setRefreshed] = useState<any | null>(null);
  const requestedRef = useRef<string | null>(null);

  const source = refreshed ?? property;
  const translationKey = mapLanguageToTranslationKey(language);

  // Read existing cached translation (defensive — translations is JSONB).
  // NOTE: the mapped Property type used in cards/drawers does NOT include
  // `translations`/`translation_status`, so we must always be willing to
  // fetch them from the DB before deciding whether to translate.
  const translations = (source?.translations ?? null) as Record<string, any> | null;
  const cached = translationKey && translations ? translations[translationKey] : null;
  const status = source?.translation_status as string | undefined;

  useEffect(() => {
    if (!property?.id || !translationKey) return;
    if (cached) return;
    const reqKey = `${property.id}:${translationKey}`;
    if (requestedRef.current === reqKey) return;
    if (isTranslating) return;

    requestedRef.current = reqKey;
    setIsTranslating(true);

    (async () => {
      try {
        // 1. Always fetch the latest translations row from DB first —
        //    the prop may be a mapped Property without translations fields.
        const { data: existing } = await supabase
          .from('properties')
          .select('id, translations, translation_status')
          .eq('id', property.id)
          .maybeSingle();

        const existingTrans = (existing?.translations ?? null) as Record<string, any> | null;
        const existingCached = existingTrans ? existingTrans[translationKey] : null;

        if (existingCached) {
          setRefreshed({ ...source, ...existing });
          return;
        }

        // 2. Cache miss → trigger edge function, then re-fetch.
        await translateListing(property.id);
        const { data: fresh } = await supabase
          .from('properties')
          .select('id, translations, translation_status')
          .eq('id', property.id)
          .maybeSingle();
        if (fresh) setRefreshed({ ...source, ...fresh });
      } catch (err: any) {
        console.warn('[useListingTranslation] failed:', err?.message ?? err);
      } finally {
        setIsTranslating(false);
      }
    })();
  }, [property?.id, translationKey, cached, status]);

  // English or unsupported language → return originals
  if (!translationKey) {
    return {
      title: property?.title ?? '',
      description: property?.description ?? '',
      summary: undefined,
      isTranslating: false,
      isTranslated: false,
    };
  }

  if (cached) {
    return {
      title: cached.title || property?.title || '',
      description: cached.description || property?.description || '',
      summary: cached.summary,
      isTranslating: false,
      isTranslated: true,
    };
  }

  // Fallback while loading
  return {
    title: property?.title ?? '',
    description: property?.description ?? '',
    summary: undefined,
    isTranslating,
    isTranslated: false,
  };
}
