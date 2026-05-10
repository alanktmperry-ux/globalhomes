/**
 * Public entry point for the i18n module.
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
export { zhTW } from './locales/zh-TW';

// Legacy-compat exports (provider, types). useI18n is internal; prefer
// useTranslation() from this module.
export {
  I18nProvider,
  useI18n,
  languageNames,
  type Language,
} from './legacy-core';
