import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEYS = ['listhq.locale', 'gh-lang'];

function getLocalLocale(): string {
  for (const k of STORAGE_KEYS) {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null;
    if (v) return v.split('-')[0].split('_')[0];
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language.split('-')[0];
  }
  return 'en';
}

export async function getViewerLocale(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('locale, language_preference, preferred_language')
        .eq('user_id', user.id)
        .maybeSingle();
      const loc = (data as any)?.locale
        || (data as any)?.language_preference
        || (data as any)?.preferred_language;
      if (loc) return String(loc).split('-')[0].split('_')[0];
    }
  } catch { /* noop */ }
  return getLocalLocale();
}

export function useViewerLocale(): string {
  const [locale, setLocale] = useState<string>(() => getLocalLocale());

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const loc = await getViewerLocale();
      if (!cancelled) setLocale(loc);
    };
    sync();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { sync(); });

    const onStorage = (e: StorageEvent) => {
      if (e.key && STORAGE_KEYS.includes(e.key)) sync();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return locale;
}
