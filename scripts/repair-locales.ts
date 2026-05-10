/**
 * Repair locale files: escape any literal newlines/CR inside single-quoted
 * string values produced by an earlier backfill run.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILES = ['zh-CN.ts', 'zh-TW.ts', 'vi.ts', 'ko.ts', 'ar.ts', 'hi.ts', 'bn.ts', 'pa.ts', 'ta.ts', 'id.ts', 'ms.ts', 'th.ts', 'fil.ts', 'it.ts', 'es.ts', 'fr.ts', 'pt.ts', 'ru.ts', 'el.ts'];
const DIR = resolve(process.cwd(), 'src/shared/lib/i18n/locales');

// Match:  '  '<key>': '<value-possibly-multiline>',\n  ' (entry line)
// Lazy match the value, terminated by `',` followed by newline.
const ENTRY_RE = /^(\s+'[^']+': ')([\s\S]*?)(',\s*$)/gm;

for (const f of FILES) {
  const path = resolve(DIR, f);
  const src = readFileSync(path, 'utf8');
  let fixed = 0;
  const out = src.replace(ENTRY_RE, (_m, prefix: string, value: string, suffix: string) => {
    if (!/[\r\n]/.test(value)) return prefix + value + suffix;
    fixed++;
    const escaped = value.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
    return prefix + escaped + suffix;
  });
  writeFileSync(path, out, 'utf8');
  console.log(`${f}: fixed ${fixed} entries`);
}
