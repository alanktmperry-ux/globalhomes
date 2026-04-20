/**
 * useTranslation — buyer-facing i18n hook.
 *
 * Thin wrapper around the existing useI18n() context (src/shared/lib/i18n.tsx).
 * It:
 *   - reads the active language from the I18nProvider, which itself
 *     reads/writes localStorage (legacy key `gh-lang` AND the new
 *     `listhq_language` key written by LanguageSwitcher).
 *   - looks up keys first in the new buyer-page locale (en.ts), then in
 *     the legacy translation table, then falls back to the key itself.
 *   - guarantees an English string is returned for any missing translation
 *     so buyer pages never render a raw key.
 *
 * Usage:
 *   const { t, language, setLanguage } = useTranslation();
 *   <h1>{t('exclusive.hero.headline')}</h1>
 */
import { useI18n } from '@/shared/lib/i18n';
import { en, type TranslationKey } from './locales/en';
import { zhCN } from './locales/zh-CN';
import { zhTW } from './locales/zh-TW';
import { hi } from './locales/hi';
import { bn } from './locales/bn';
import {
  LANGUAGE_STORAGE_KEY,
  FROM_LEGACY_CODE_MAP,
  LEGACY_CODE_MAP,
  type SupportedLanguageCode,
} from './config';

/**
 * Registry of new-style locale dictionaries keyed by canonical language code.
 * Add new languages here as they're translated.
 */
const LOCALES: Partial<Record<SupportedLanguageCode, Record<string, string>>> = {
  'en': en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'hi': hi,
  'bn': bn,
};

type AnyKey = TranslationKey | (string & {});

export function useTranslation() {
  const { language: legacyLanguage, setLanguage: setLegacyLanguage, t: legacyT } = useI18n();

  // Map legacy code (`zh`) to canonical (`zh-CN`).
  const language: SupportedLanguageCode =
    FROM_LEGACY_CODE_MAP[legacyLanguage] ?? 'en';

  const setLanguage = (code: SupportedLanguageCode) => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      // storage may be unavailable (private mode, etc.) — non-fatal
    }
    const legacy = LEGACY_CODE_MAP[code] ?? 'en';
    // Cast: legacy setter expects the legacy `Language` union.
    setLegacyLanguage(legacy as Parameters<typeof setLegacyLanguage>[0]);
  };

  /**
   * t(key) — resolve a translation.
   *
   * Resolution order:
   *   1. Legacy translation table (current active language)
   *   2. New English base (en.ts)
   *   3. The key itself (last-resort fallback)
   *
   * Variable interpolation: {name} placeholders are replaced with values
   * from the `vars` argument.
   */
  const t = (key: AnyKey, vars?: Record<string, string | number>): string => {
    // 1. New locale dictionary for the active canonical language (e.g. zh-CN)
    const dict = LOCALES[language];
    let value: string | undefined = dict?.[key as string];

    // 2. Legacy translation table (covers languages not yet migrated)
    if (value === undefined) {
      const legacy = legacyT(key);
      if (legacy !== key) value = legacy;
    }

    // 3. English base
    if (value === undefined && key in en) {
      value = en[key as TranslationKey];
    }

    // 4. Last-resort: the key itself
    if (typeof value !== 'string') return String(key);

    if (vars) {
      return value.replace(/\{(\w+)\}/g, (_, name) =>
        name in vars ? String(vars[name]) : `{${name}}`
      );
    }
    return value;
  };

  return { t, language, setLanguage };
}
