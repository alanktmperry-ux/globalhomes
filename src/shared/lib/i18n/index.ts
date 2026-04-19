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
