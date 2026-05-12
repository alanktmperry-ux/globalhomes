/**
 * Bulk-translate missing keys in src/shared/lib/i18n/locales/*.ts using
 * Google Cloud Translation API.
 *
 * Usage:
 *   bun run scripts/backfill-locales.ts                # all 9 locales
 *   bun run scripts/backfill-locales.ts zh-CN ko       # subset
 *
 * Requires env: GOOGLE_TRANSLATE_API_KEY
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface LocaleSpec {
  file: string;       // e.g. zh-CN.ts
  exportName: string; // e.g. zhCN
  langCode: string;   // Google Translate target
  importStyle: 'EnBase' | 'TranslationKey';
}

const LOCALES: LocaleSpec[] = [
  { file: 'zh-CN.ts', exportName: 'zhCN', langCode: 'zh-CN', importStyle: 'EnBase' },
  { file: 'zh-TW.ts', exportName: 'zhTW', langCode: 'zh-TW', importStyle: 'EnBase' },
  { file: 'vi.ts',    exportName: 'vi',   langCode: 'vi',    importStyle: 'TranslationKey' },
  { file: 'ko.ts',    exportName: 'ko',   langCode: 'ko',    importStyle: 'TranslationKey' },
  { file: 'ar.ts',    exportName: 'ar',   langCode: 'ar',    importStyle: 'TranslationKey' },
  { file: 'hi.ts',    exportName: 'hi',   langCode: 'hi',    importStyle: 'EnBase' },
  { file: 'bn.ts',    exportName: 'bn',   langCode: 'bn',    importStyle: 'EnBase' },
  { file: 'pa.ts',    exportName: 'pa',   langCode: 'pa',    importStyle: 'TranslationKey' },
  { file: 'ta.ts',    exportName: 'ta',   langCode: 'ta',    importStyle: 'TranslationKey' },
  // Phase 1B — new locales (files created from scratch)
  { file: 'id.ts',    exportName: 'id',   langCode: 'id',    importStyle: 'TranslationKey' },
  { file: 'ms.ts',    exportName: 'ms',   langCode: 'ms',    importStyle: 'TranslationKey' },
  { file: 'th.ts',    exportName: 'th',   langCode: 'th',    importStyle: 'TranslationKey' },
  { file: 'fil.ts',   exportName: 'fil',  langCode: 'tl',    importStyle: 'TranslationKey' },
  { file: 'it.ts',    exportName: 'it',   langCode: 'it',    importStyle: 'TranslationKey' },
  { file: 'es.ts',    exportName: 'es',   langCode: 'es',    importStyle: 'TranslationKey' },
  { file: 'fr.ts',    exportName: 'fr',   langCode: 'fr',    importStyle: 'TranslationKey' },
  { file: 'pt.ts',    exportName: 'pt',   langCode: 'pt',    importStyle: 'TranslationKey' },
  { file: 'ru.ts',    exportName: 'ru',   langCode: 'ru',    importStyle: 'TranslationKey' },
  // el removed — Greek is not in SUPPORTED_LANGUAGES.
  { file: 'ur.ts',    exportName: 'ur',   langCode: 'ur',    importStyle: 'TranslationKey' },
  { file: 'mr.ts',    exportName: 'mr',   langCode: 'mr',    importStyle: 'TranslationKey' },
  { file: 'te.ts',    exportName: 'te',   langCode: 'te',    importStyle: 'TranslationKey' },
];

const LOCALES_DIR = resolve(process.cwd(), 'src/shared/lib/i18n/locales');
const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
if (!API_KEY) {
  console.error('Missing GOOGLE_TRANSLATE_API_KEY env var');
  process.exit(1);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Load a locale module dynamically via Bun's TS import. */
async function loadLocale(file: string, exportName: string): Promise<Record<string, string>> {
  const mod = await import(resolve(LOCALES_DIR, file));
  return mod[exportName] as Record<string, string>;
}

/** Replace {placeholder} tokens with __PHn__ before translating; restore after. */
function protectPlaceholders(text: string): { masked: string; tokens: string[] } {
  const tokens: string[] = [];
  const masked = text.replace(/\{[^}]+\}/g, (m) => {
    tokens.push(m);
    return `__PH${tokens.length - 1}__`;
  });
  return { masked, tokens };
}

function restorePlaceholders(text: string, tokens: string[]): string {
  let out = text;
  tokens.forEach((tok, i) => {
    // Google occasionally lowercases or adds spaces around the token; normalise.
    const re = new RegExp(`__\\s*PH\\s*${i}\\s*__`, 'gi');
    out = out.replace(re, tok);
  });
  return out;
}

async function translate(text: string, target: string): Promise<string> {
  const { masked, tokens } = protectPlaceholders(text);
  const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: masked, target, source: 'en', format: 'text' }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json() as { data: { translations: { translatedText: string }[] } };
  const out = data.data.translations[0].translatedText;
  return restorePlaceholders(out, tokens);
}

/** Escape a string for inclusion in a single-quoted TS literal. */
function escSingle(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

/** Build the new locale file content preserving header & import style. */
function buildFileContent(originalSource: string | null, spec: LocaleSpec, entries: Record<string, string>): string {
  let header: string;
  if (originalSource) {
    const exportLineRe = new RegExp(`export const ${spec.exportName}[^{]*\\{`);
    const match = originalSource.match(exportLineRe);
    if (!match) {
      throw new Error(`Could not locate export line in ${spec.file}`);
    }
    const headerEnd = (match.index ?? 0) + match[0].length;
    header = originalSource.slice(0, headerEnd);
  } else {
    // Build a fresh header for newly created locale files.
    header =
      `/**\n * ${spec.langCode} translations for buyer-facing pages.\n * Auto-generated by scripts/backfill-locales.ts.\n */\n` +
      `import type { TranslationKey } from './en';\n\n` +
      `export const ${spec.exportName}: Partial<Record<TranslationKey, string>> = {`;
  }

  const lines: string[] = [];
  for (const [key, value] of Object.entries(entries)) {
    lines.push(`  '${escSingle(key)}': '${escSingle(value)}',`);
  }

  return `${header}\n${lines.join('\n')}\n};\n`;
}

async function processLocale(spec: LocaleSpec, enEntries: Record<string, string>) {
  const filePath = resolve(LOCALES_DIR, spec.file);
  const fileExists = existsSync(filePath);
  const originalSource = fileExists ? readFileSync(filePath, 'utf8') : null;
  const existing: Record<string, string> = fileExists
    ? await loadLocale(spec.file, spec.exportName)
    : {};

  const allKeys = Object.keys(enEntries);
  const merged: Record<string, string> = {};

  let translated = 0;
  let kept = 0;
  let failed = 0;
  const total = allKeys.length;

  for (let i = 0; i < allKeys.length; i++) {
    const key = allKeys[i];
    const enVal = enEntries[key];
    const existingVal = existing[key];

    // Keep existing translation if present and different from English.
    if (existingVal && existingVal !== enVal) {
      merged[key] = existingVal;
      kept++;
      continue;
    }

    try {
      const t = await translate(enVal, spec.langCode);
      merged[key] = t;
      translated++;
      if (translated % 25 === 0 || i === allKeys.length - 1) {
        console.log(`[${spec.langCode}] ${translated} translated, ${kept} kept, ${failed} failed (progress ${i + 1}/${total})`);
      }
      await sleep(50);
    } catch (err) {
      failed++;
      console.warn(`[${spec.langCode}] FAIL key='${key}': ${(err as Error).message}`);
      // Skip — don't include the key, so it stays untranslated rather than English.
    }
  }

  const content = buildFileContent(originalSource, spec, merged);
  writeFileSync(filePath, content, 'utf8');
  console.log(`[${spec.langCode}] DONE — wrote ${Object.keys(merged).length} keys (translated=${translated}, kept=${kept}, failed=${failed})`);
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0
    ? LOCALES.filter(l => args.includes(l.langCode))
    : LOCALES;

  if (targets.length === 0) {
    console.error('No matching locales for args:', args);
    process.exit(1);
  }

  const enMod = await import(resolve(LOCALES_DIR, 'en.ts'));
  const enEntries = enMod.en as Record<string, string>;
  console.log(`Loaded en.ts: ${Object.keys(enEntries).length} keys`);
  console.log(`Targets: ${targets.map(t => t.langCode).join(', ')}\n`);

  for (const spec of targets) {
    console.log(`\n=== Processing ${spec.langCode} ===`);
    try {
      await processLocale(spec, enEntries);
    } catch (err) {
      console.error(`[${spec.langCode}] FATAL: ${(err as Error).message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
