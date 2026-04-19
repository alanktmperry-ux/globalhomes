/**
 * i18n configuration for the buyer-facing pages.
 *
 * This file defines the canonical set of supported languages for the new
 * useTranslation() hook. It sits on top of the existing i18n system in
 * src/shared/lib/i18n.tsx (which supports 25 languages); the codes here
 * are the ones we actively translate buyer-facing copy into.
 *
 * Storage: localStorage key `listhq_language` (mirrored to the legacy
 * `gh-lang` key by the LanguageSwitcher for backward compatibility).
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en',    name: 'English' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'vi',    name: 'Tiếng Việt' },
  { code: 'ko',    name: '한국어' },
  { code: 'ar',    name: 'العربية' },
] as const;

export type SupportedLanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export const DEFAULT_LANGUAGE: SupportedLanguageCode = 'en';

export const LANGUAGE_STORAGE_KEY = 'listhq_language';

/**
 * Maps the canonical codes used in this config to the legacy codes used by
 * src/shared/lib/i18n.tsx. The legacy system uses `zh` instead of `zh-CN`.
 */
export const LEGACY_CODE_MAP: Record<SupportedLanguageCode, string> = {
  'en':    'en',
  'zh-CN': 'zh',
  'zh-TW': 'zh-TW',
  'vi':    'vi',
  'ko':    'ko',
  'ar':    'ar',
};

export const FROM_LEGACY_CODE_MAP: Record<string, SupportedLanguageCode> = {
  'en':    'en',
  'zh':    'zh-CN',
  'zh-TW': 'zh-TW',
  'vi':    'vi',
  'ko':    'ko',
  'ar':    'ar',
};
