/**
 * useTranslation — canonical i18n hook.
 *
 * Returns { language, setLanguage, t, canonical } as before, but locale
 * dictionaries (other than English, which is the always-loaded fallback)
 * are loaded on demand via dynamic import() so they ship as their own
 * code-split chunks instead of bloating the initial bundle.
 */
import { useEffect, useState } from 'react';
import { useI18n } from './legacy-core';
import { en, type TranslationKey } from './locales/en';
import {
  FROM_LEGACY_CODE_MAP,
  type SupportedLanguageCode,
} from './config';

type LocaleDict = Record<string, string>;

const loaders: Partial<Record<SupportedLanguageCode, () => Promise<unknown>>> = {
  'zh-CN': () => import('./locales/zh-CN'),
  'zh-TW': () => import('./locales/zh-TW'),
  'hi':    () => import('./locales/hi'),
  'bn':    () => import('./locales/bn'),
  'vi':    () => import('./locales/vi'),
  'ko':    () => import('./locales/ko'),
  'ar':    () => import('./locales/ar'),
  'pa':    () => import('./locales/pa'),
  'ta':    () => import('./locales/ta'),
  'es':    () => import('./locales/es'),
  'fr':    () => import('./locales/fr'),
  'pt':    () => import('./locales/pt'),
  'it':    () => import('./locales/it'),
  'id':    () => import('./locales/id'),
  'ms':    () => import('./locales/ms'),
  'th':    () => import('./locales/th'),
  'fil':   () => import('./locales/fil'),
  'ru':    () => import('./locales/ru'),
  'ne':    () => import('./locales/ne'),
  'pl':    () => import('./locales/pl'),
  'zh':    () => import('./locales/zh'),
  'ja':    () => import('./locales/ja'),
  'tr':    () => import('./locales/tr'),
  'de':    () => import('./locales/de'),
  'el':    () => import('./locales/el'),
  'ur':    () => import('./locales/ur'),
  'mr':    () => import('./locales/mr'),
  'te':    () => import('./locales/te'),
};

const cache: Partial<Record<SupportedLanguageCode, LocaleDict>> = { en: en as LocaleDict };
const pending = new Map<SupportedLanguageCode, Promise<void>>();
const subscribers = new Set<() => void>();

function notify() {
  for (const s of subscribers) s();
}

function pickDict(mod: unknown): LocaleDict | undefined {
  if (!mod || typeof mod !== 'object') return undefined;
  const m = mod as Record<string, unknown>;
  if (m.default && typeof m.default === 'object') return m.default as LocaleDict;
  for (const v of Object.values(m)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as LocaleDict;
  }
  return undefined;
}

export function ensureLocaleLoaded(code: SupportedLanguageCode): Promise<void> {
  if (cache[code]) return Promise.resolve();
  const existing = pending.get(code);
  if (existing) return existing;
  const loader = loaders[code];
  if (!loader) return Promise.resolve();
  const p = loader()
    .then((mod) => {
      const dict = pickDict(mod);
      if (dict) cache[code] = dict;
      pending.delete(code);
      notify();
    })
    .catch((err) => {
      pending.delete(code);
      // eslint-disable-next-line no-console
      console.error('[i18n] Failed to load locale', code, err);
    });
  pending.set(code, p);
  return p;
}

type AnyKey = TranslationKey | (string & {});

export function useTranslation() {
  const { language, setLanguage, t: legacyT } = useI18n();
  const canonical: SupportedLanguageCode = FROM_LEGACY_CODE_MAP[language] ?? 'en';

  // Subscribe to locale-cache updates so this hook re-renders when the
  // active locale finishes loading.
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((x) => x + 1);
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  }, []);

  // Kick off the dynamic import if we don't have the active locale yet.
  if (canonical !== 'en' && !cache[canonical] && loaders[canonical]) {
    void ensureLocaleLoaded(canonical);
  }

  const t = (key: AnyKey, vars?: Record<string, string | number>): string => {
    let value: string | undefined;

    // 1. Active language dictionary (if loaded)
    const dict = cache[canonical];
    if (dict && typeof dict[key as string] === 'string') {
      value = dict[key as string];
    }

    // 2. English base (en.ts) — always available
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
        name in vars ? String(vars[name]) : `{${name}}`,
      );
    }
    return value;
  };

  return { t, language, setLanguage, canonical };
}
