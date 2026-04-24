/**
 * Canonical language list for the `contacts.preferred_language` field.
 *
 * Codes match the i18n switcher keys in `src/shared/lib/i18n.tsx` so that a
 * contact's preferred_language can be passed directly into setLanguage() and
 * downstream into translation-aware emails / SMS / portal experiences.
 *
 * Notes:
 *   - Mandarin is intentionally split into Simplified / Traditional because the
 *     listing-content translation pipeline keys translations on those variants.
 *   - Cantonese (yue) speakers most commonly read zh_traditional — we surface
 *     Cantonese as a separate label but persist the underlying zh_traditional
 *     code so listing translations resolve correctly without a mapping layer.
 *   - Pinned (top-of-list) entries are the top AU community languages by
 *     ABS Census language-spoken-at-home counts.
 */

export interface ContactLanguageOption {
  /** Stored in DB. Must match an i18n.tsx key. */
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
  // ── Pinned: top 6 AU community languages ──
  { code: 'en',              label: 'English',              native: 'English',  flag: '🇬🇧', pinned: true },
  { code: 'zh_simplified',   label: 'Mandarin (Simplified)', native: '简体中文',  flag: '🇨🇳', pinned: true },
  { code: 'zh_traditional',  label: 'Mandarin (Traditional)', native: '繁體中文', flag: '🇹🇼', pinned: true },
  { code: 'zh_traditional',  label: 'Cantonese',            native: '粵語',      flag: '🇭🇰', pinned: true },
  { code: 'vi',              label: 'Vietnamese',           native: 'Tiếng Việt', flag: '🇻🇳', pinned: true },
  { code: 'ar',              label: 'Arabic',               native: 'العربية',   flag: '🇸🇦', pinned: true },
  { code: 'hi',              label: 'Hindi',                native: 'हिन्दी',     flag: '🇮🇳', pinned: true },

  // ── Remaining 24-language i18n set ──
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

/** Look up a label/native pair from a stored DB code (returns first match). */
export function getContactLanguageOption(code: string | null | undefined): ContactLanguageOption | undefined {
  if (!code) return undefined;
  return CONTACT_LANGUAGES.find(l => l.code === code);
}
