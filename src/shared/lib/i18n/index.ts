/**
 * Public entry point for the buyer-facing i18n module.
 *
 * Re-exports everything callers need so imports stay tidy:
 *   import { useTranslation, SUPPORTED_LANGUAGES } from '@/shared/lib/i18n';
 *
 * NOTE: the legacy provider/hook still live in src/shared/lib/i18n.tsx and
 * are re-exported from there for backward compatibility. This `index.ts`
 * is resolved AFTER the `.tsx` file by Vite (because i18n.tsx is a file
 * and i18n/ is a folder), so to avoid ambiguity callers should import
 * the new helpers from their explicit paths:
 *
 *   import { useTranslation } from '@/shared/lib/i18n/useTranslation';
 *   import { SUPPORTED_LANGUAGES } from '@/shared/lib/i18n/config';
 */
export { useTranslation } from './useTranslation';
export {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  LEGACY_CODE_MAP,
  FROM_LEGACY_CODE_MAP,
  type SupportedLanguageCode,
} from './config';
export { en, type TranslationKey } from './locales/en';
export { zhCN } from './locales/zh-CN';

import { en } from './locales/en';
import { zhCN } from './locales/zh-CN';
import type { SupportedLanguageCode } from './config';

/**
 * Registry of all locale dictionaries keyed by canonical language code.
 * useTranslation() reads from this map first before falling back to the
 * legacy translation table in src/shared/lib/i18n.tsx.
 */
export const LOCALES: Partial<Record<SupportedLanguageCode, Record<string, string>>> = {
  'en': en,
  'zh-CN': zhCN,
};
