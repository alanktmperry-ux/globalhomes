/**
 * Locale-aware Intl formatters.
 *
 * Internal language codes (e.g. 'zh', 'zh-CN', 'en') are mapped to BCP 47
 * locale tags accepted by Intl.* APIs.
 */

const INTL_LOCALE_MAP: Record<string, string> = {
  en: 'en-AU',
  zh: 'zh-CN',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  vi: 'vi',
  ko: 'ko',
  ar: 'ar',
  hi: 'hi',
  bn: 'bn',
  pa: 'pa-IN',
  ta: 'ta',
  id: 'id',
  ms: 'ms',
  th: 'th',
  fil: 'fil',
  it: 'it',
  es: 'es',
  fr: 'fr',
  pt: 'pt',
  ru: 'ru',
  ja: 'ja',
  de: 'de',
};

export function toIntlLocale(lang: string | undefined | null): string {
  if (!lang) return 'en-AU';
  return INTL_LOCALE_MAP[lang] ?? lang;
}

export function formatDate(
  date: Date | string | number,
  lang: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(
    toIntlLocale(lang),
    options ?? { year: 'numeric', month: 'short', day: 'numeric' },
  ).format(d);
}

export function formatRelativeTime(date: Date | string | number, lang: string): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const absSec = Math.abs(diffMs) / 1000;
  const rtf = new Intl.RelativeTimeFormat(toIntlLocale(lang), { numeric: 'auto' });
  const sign = diffMs > 0 ? -1 : 1;

  if (absSec < 60) return rtf.format(0, 'second');
  if (absSec < 3600) return rtf.format(sign * Math.round(absSec / 60), 'minute');
  if (absSec < 86400) return rtf.format(sign * Math.round(absSec / 3600), 'hour');
  const days = Math.round(absSec / 86400);
  if (days < 30) return rtf.format(sign * days, 'day');
  if (days < 365) return rtf.format(sign * Math.round(days / 30), 'month');
  return rtf.format(sign * Math.round(days / 365), 'year');
}

export function formatNumber(
  value: number,
  lang: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(toIntlLocale(lang), options).format(value);
}

export function formatCurrency(
  value: number,
  lang: string,
  currency: string = 'AUD',
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(toIntlLocale(lang), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
}
