/**
 * Canonical language list for the `contacts.preferred_language` field.
 *
 * Codes match the i18n switcher keys in `src/shared/lib/i18n.tsx` so that a
 * contact's preferred_language can be passed directly into setLanguage() and
 * downstream into translation-aware emails / SMS / portal experiences.
 *
 * Notes:
 *   - Mandarin is split into Simplified / Traditional because the listing-content
 *     translation pipeline keys translations on those variants.
 *   - Cantonese (`yue`) is stored as its own distinct value even though, today,
 *     written content falls back to `zh_traditional`. This is intentional: it
 *     lets us add Cantonese-specific voice / audio / spoken-language templates
 *     later without a data migration. See CONTENT_FALLBACK below.
 *   - Pinned (top-of-list) entries are the top AU community languages by
 *     ABS Census language-spoken-at-home counts.
 */

export interface ContactLanguageOption {
  /** Stored in DB. Distinct value per language; may share content via CONTENT_FALLBACK. */
  code: string;
  /** English label shown in the picker. */
  label: string;
  /** Native script label shown alongside (helpful for the contact's own picker UX). */
  native: string;
  /** Emoji flag (illustrative — not used as identity). */
  flag: string;
  /** Pinned to top of dropdown. */
  pinned?: boolean;
}

export const CONTACT_LANGUAGES: ContactLanguageOption[] = [
  // ── Pinned: top AU community languages ──
  { code: 'en',              label: 'English',                native: 'English',     flag: '🇬🇧', pinned: true },
  { code: 'zh_simplified',   label: 'Mandarin (Simplified)',  native: '简体中文',      flag: '🇨🇳', pinned: true },
  { code: 'zh_traditional',  label: 'Mandarin (Traditional)', native: '繁體中文',      flag: '🇹🇼', pinned: true },
  { code: 'yue',             label: 'Cantonese',              native: '粵語',         flag: '🇭🇰', pinned: true },
  { code: 'vi',              label: 'Vietnamese',             native: 'Tiếng Việt',  flag: '🇻🇳', pinned: true },
  { code: 'ar',              label: 'Arabic',                 native: 'العربية',     flag: '🇸🇦', pinned: true },
  { code: 'hi',              label: 'Hindi',                  native: 'हिन्दी',       flag: '🇮🇳', pinned: true },

  // ── Remaining i18n set ──
  { code: 'ko',  label: 'Korean',     native: '한국어',     flag: '🇰🇷' },
  { code: 'ja',  label: 'Japanese',   native: '日本語',     flag: '🇯🇵' },
  { code: 'id',  label: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms',  label: 'Malay',      native: 'Bahasa Melayu',    flag: '🇲🇾' },
  { code: 'th',  label: 'Thai',       native: 'ไทย',       flag: '🇹🇭' },
  { code: 'bn',  label: 'Bengali',    native: 'বাংলা',      flag: '🇧🇩' },
  { code: 'fr',  label: 'French',     native: 'Français',  flag: '🇫🇷' },
  { code: 'es',  label: 'Spanish',    native: 'Español',   flag: '🇪🇸' },
  { code: 'pt',  label: 'Portuguese', native: 'Português', flag: '🇵🇹' },
  { code: 'de',  label: 'German',     native: 'Deutsch',   flag: '🇩🇪' },
  { code: 'nl',  label: 'Dutch',      native: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl',  label: 'Polish',     native: 'Polski',    flag: '🇵🇱' },
  { code: 'ru',  label: 'Russian',    native: 'Русский',   flag: '🇷🇺' },
  { code: 'tr',  label: 'Turkish',    native: 'Türkçe',    flag: '🇹🇷' },
  { code: 'sv',  label: 'Swedish',    native: 'Svenska',   flag: '🇸🇪' },
  { code: 'el',  label: 'Greek',      native: 'Ελληνικά',  flag: '🇬🇷' },
  { code: 'it',  label: 'Italian',    native: 'Italiano',  flag: '🇮🇹' },
];

export const DEFAULT_CONTACT_LANGUAGE = 'en';

/**
 * Content-resolution fallback map.
 *
 * When a downstream system (email/SMS template, listing translation, portal UI)
 * doesn't have content for a given preferred_language, look here for the next
 * best key. Used for written content only — voice/audio templates should NOT
 * use this map (e.g. when Cantonese audio lands, `yue` will play `yue`, not
 * `zh_traditional`).
 *
 * Revisit when voice/audio templates ship.
 */
export const CONTENT_FALLBACK: Record<string, string> = {
  yue: 'zh_traditional', // Cantonese speakers read Traditional Chinese — written only
};

/** Resolve a preferred_language to the actual content key to fetch (written content). */
export function resolveContentLanguage(code: string | null | undefined): string {
  if (!code) return DEFAULT_CONTACT_LANGUAGE;
  return CONTENT_FALLBACK[code] ?? code;
}

/** Look up a label/native pair from a stored DB code. */
export function getContactLanguageOption(code: string | null | undefined): ContactLanguageOption | undefined {
  if (!code) return undefined;
  return CONTACT_LANGUAGES.find(l => l.code === code);
}
