/**
 * useTranslation — buyer-facing i18n hook.
 *
 * Resolution order (new behavior):
 *   1. New locale dictionary for active language (e.g. LOCALES['zh-CN'])
 *   2. English base (en.ts) — fallback for keys missing in active language
 *   3. Legacy translation table — last-resort for keys not yet migrated
 *   4. Empty string (never expose raw keys)
 *
 * en.ts always wins for keys it has — legacy table is consulted only for
 * keys that haven't been migrated to the new system yet.
 */
import { useI18n } from '@/shared/lib/i18n';
import { en, type TranslationKey } from './locales/en';
import { zhCN } from './locales/zh-CN';
import { zhTW } from './locales/zh-TW';
import { hi } from './locales/hi';
import { bn } from './locales/bn';
import { vi } from './locales/vi';
import { ko } from './locales/ko';
import { ar } from './locales/ar';
import { pa } from './locales/pa';
import { ta } from './locales/ta';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { pt } from './locales/pt';
import { it } from './locales/it';
import { id } from './locales/id';
import { ms } from './locales/ms';
import { th } from './locales/th';
import { fil } from './locales/fil';
import { ru } from './locales/ru';
import {
  LANGUAGE_STORAGE_KEY,
  FROM_LEGACY_CODE_MAP,
  LEGACY_CODE_MAP,
  type SupportedLanguageCode,
} from './config';

const LOCALES: Partial<Record<SupportedLanguageCode, Record<string, string>>> = {
  'en': en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'hi': hi,
  'bn': bn,
  'vi': vi,
  'ko': ko,
  'ar': ar,
  'pa': pa,
  'ta': ta,
  'es': es,
  'fr': fr,
  'pt': pt,
  'it': it,
  'id': id,
  'ms': ms,
  'th': th,
  'fil': fil,
  'ru': ru,
};

type AnyKey = TranslationKey | (string & {});

export function useTranslation() {
  const { language: legacyLanguage, setLanguage: setLegacyLanguage, t: legacyT } = useI18n();

  const language: SupportedLanguageCode =
    FROM_LEGACY_CODE_MAP[legacyLanguage] ?? 'en';

  const setLanguage = (code: SupportedLanguageCode) => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
      sessionStorage.setItem(LANGUAGE_STORAGE_KEY, code);
      localStorage.removeItem('gh-lang');
    } catch { /* non-fatal */ }
    const legacy = LEGACY_CODE_MAP[code] ?? 'en';
    setLegacyLanguage(legacy as Parameters<typeof setLegacyLanguage>[0]);
  };

  const t = (key: AnyKey, vars?: Record<string, string | number>): string => {
    let value: string | undefined;

    // 1. New locale dictionary for active language
    const dict = LOCALES[language];
    if (dict && typeof dict[key as string] === 'string') {
      value = dict[key as string];
    }

    // 2. English base (en.ts) — fallback for missing translations in active language
    if (value === undefined && key in en) {
      value = (en as Record<string, string>)[key as string];
    }

    // 3. Legacy translation table — last-resort for legacy-only keys
    if (value === undefined) {
      const legacy = legacyT(key);
      if (legacy !== key) value = legacy;
    }

    if (typeof value !== 'string') {
      if (import.meta.env.DEV) console.warn('[i18n] Missing translation key:', key);
      return '';
    }

    if (vars) {
      return value.replace(/\{(\w+)\}/g, (_, name) =>
        name in vars ? String(vars[name]) : `{${name}}`
      );
    }
    return value;
  };

  return { t, language, setLanguage };
}
