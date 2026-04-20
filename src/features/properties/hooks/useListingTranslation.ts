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
    default: return null;
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

  // Read existing cached translation (defensive — translations is JSONB)
  const translations = (source?.translations ?? null) as Record<string, any> | null;
  const cached = translationKey && translations ? translations[translationKey] : null;
  const status = source?.translation_status as string | undefined;

  useEffect(() => {
    if (!property?.id || !translationKey) return;
    if (cached) return;
    // Avoid duplicate requests per (property,language) pair
    const reqKey = `${property.id}:${translationKey}`;
    if (requestedRef.current === reqKey) return;
    if (isTranslating) return;

    // Fire when missing or still pending
    if (!cached || status === 'pending') {
      requestedRef.current = reqKey;
      setIsTranslating(true);
      translateListing(property.id)
        .then(async () => {
          // Re-fetch fresh translations row
          const { data } = await supabase
            .from('properties')
            .select('id, translations, translation_status')
            .eq('id', property.id)
            .maybeSingle();
          if (data) {
            setRefreshed({ ...source, ...data });
          }
        })
        .catch((err) => {
          console.warn('[useListingTranslation] translateListing failed:', err?.message ?? err);
        })
        .finally(() => setIsTranslating(false));
    }
  }, [property?.id, translationKey, cached, status, isTranslating, source]);

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
