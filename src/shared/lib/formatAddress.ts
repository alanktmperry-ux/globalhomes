/**
 * Display-only address cleaner.
 *
 * Some property addresses come from upstream sources with stray escape characters
 * or empty trailing fields (e.g. "31 Neptune Street, St Kilda, Vic 3182\, ,").
 * This util normalises them for rendering without mutating the stored data.
 *
 * Rules:
 *  1. Strip backslashes.
 *  2. Collapse consecutive commas (",  ," -> ",").
 *  3. Trim trailing commas/whitespace.
 *  4. If the cleaned result is empty or pure punctuation, return "Address unavailable".
 */
export function formatAddress(input: string | null | undefined): string {
  if (!input) return 'Address unavailable';

  let cleaned = String(input)
    .replace(/\\/g, '')
    .replace(/,\s*,/g, ',')
    // Re-run to handle ",,,," sequences after the first pass
    .replace(/,\s*,/g, ',')
    .replace(/[,\s]+$/, '')
    .replace(/^[,\s]+/, '')
    .trim();

  // Empty or only punctuation/whitespace
  if (!cleaned || /^[\s,.\-]+$/.test(cleaned)) {
    return 'Address unavailable';
  }

  return cleaned;
}
