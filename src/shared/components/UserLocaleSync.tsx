import { useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useI18n, type Language } from '@/shared/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { LANGUAGE_STORAGE_KEY } from '@/shared/lib/i18n/config';

// Map the ISO 639-1 `locale` stored on profiles to the legacy Language enum
// used by the i18n provider.
const LOCALE_TO_LANGUAGE: Record<string, Language> = {
  en: 'en', zh: 'zh', vi: 'vi', ko: 'ko', ar: 'ar', hi: 'hi', ja: 'ja',
  it: 'it', de: 'de', es: 'es', fr: 'fr', pt: 'pt', ru: 'ru', th: 'th',
  id: 'id', fil: 'fil', pl: 'pl', ne: 'ne', tr: 'tr',
};

/**
 * On authenticated sign-in, hydrate the i18n provider from profiles.locale so
 * a user who set Mandarin 6 months ago sees the platform in Mandarin on every
 * new device immediately after login.
 */
export function UserLocaleSync(): null {
  const { user } = useAuth();
  const { setLanguage } = useI18n();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        // Respect a recent manual override on this device (set in the last 60s)
        // so we don't fight a user mid-click.
        // Respect a manual override on this device — if the user has picked
        // a language via the switcher, NEVER overwrite it from the profile.
        // Profile-side locale is a *seed* for new sessions, not an enforced lock.
        try {
          const manualOverride =
            localStorage.getItem('listhq_lang_user_set') === '1' ||
            localStorage.getItem('listhq_language_manually_set') === '1';
          if (manualOverride) return;
        } catch { /* */ }

        // Only seed once per device per user — re-logins should not flip the UI.
        const syncedKey = `listhq_locale_synced_for_${user.id}`;
        try {
          if (localStorage.getItem(syncedKey) === '1') return;
        } catch { /* */ }

        const { data } = await supabase
          .from('profiles')
          .select('locale')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled || !data?.locale) return;
        const legacy = LOCALE_TO_LANGUAGE[data.locale];
        if (!legacy) return;
        setLanguage(legacy);
        try {
          localStorage.setItem('listhq.locale', data.locale);
          localStorage.setItem(LANGUAGE_STORAGE_KEY, legacy);
          localStorage.setItem(syncedKey, '1');
          document.documentElement.lang = legacy;
          document.documentElement.dir = legacy === 'ar' ? 'rtl' : 'ltr';
        } catch { /* */ }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[UserLocaleSync] failed', err);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, setLanguage]);

  return null;
}

export default UserLocaleSync;
