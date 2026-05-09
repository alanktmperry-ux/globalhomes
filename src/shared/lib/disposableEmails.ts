// Client-side disposable email check. Mirrors the list used by the
// before-signup edge function (supabase/functions/before-signup/disposable-domains.json)
// for fast UX feedback. Server-side check remains the source of truth.

import domains from '../../../supabase/functions/before-signup/disposable-domains.json';

const SET = new Set<string>((domains as string[]).map((d) => d.toLowerCase()));

export function isDisposableEmail(email: string): boolean {
  if (!email) return false;
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return SET.has(domain);
}
