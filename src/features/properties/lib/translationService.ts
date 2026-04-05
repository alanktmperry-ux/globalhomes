import { supabase } from '@/integrations/supabase/client';
import { capture } from '@/shared/lib/posthog';

/**
 * Call the generate-translations edge function for a listing
 * and track the result to PostHog.
 */
export async function translateListing(listingId: string) {
  const { data, error } = await supabase.functions.invoke('generate-translations', {
    body: { listing_id: listingId },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  // Track successful translation
  const languages = data?.translations ? Object.keys(data.translations) : [];
  capture('listing_translated', { listing_id: listingId, languages });

  return data;
}

/**
 * Call the generate-translations edge function for search query translation.
 */
export async function translateSearchQuery(searchQuery: string) {
  const { data, error } = await supabase.functions.invoke('generate-translations', {
    body: { type: 'translate_search', search_query: searchQuery },
  });

  if (error || !data?.english_query) throw new Error('Translation failed');

  return {
    englishQuery: data.english_query as string,
    detectedLanguage: data.detected_language as string,
    searchIntent: data.search_intent,
  };
}
