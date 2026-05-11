/**
 * useTranslation — canonical i18n hook.
 *
 * Returns the same surface as the legacy useI18n() ({ language, setLanguage, t })
 * so it's a drop-in replacement, but resolves translations via the new
 * per-locale dictionaries first, falling back to en.ts and then the legacy
 * translation table.
 */
import { useI18n } from './legacy-core';
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
import { ne } from './locales/ne';
import { pl } from './locales/pl';
import {
  FROM_LEGACY_CODE_MAP,
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
  'ne': ne as any,
  'pl': pl as any,
};

type AnyKey = TranslationKey | (string & {});

export function useTranslation() {
  const { language, setLanguage, t: legacyT } = useI18n();
  const canonical: SupportedLanguageCode = FROM_LEGACY_CODE_MAP[language] ?? 'en';

  const t = (key: AnyKey, vars?: Record<string, string | number>): string => {
    let value: string | undefined;

    // 1. New locale dictionary for active language
    const dict = LOCALES[canonical];
    if (dict && typeof dict[key as string] === 'string') {
      value = dict[key as string];
    }

    // 2. English base (en.ts)
    if (value === undefined && key in en) {
      value = (en as Record<string, string>)[key as string];
    }

    // 3. Legacy translation table — last-resort fallback
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

  return { t, language, setLanguage, canonical };
}
