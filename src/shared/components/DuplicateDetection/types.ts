/**
 * Duplicate detection shared types.
 */

export type DuplicateMatchMethod = 'email' | 'phone' | 'name_fuzzy' | 'mixed';

export interface DuplicateMatch {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  tags: string[];
  communication_preferences: { channel: string; handle: string; is_primary: boolean }[];
  created_by: string;
  updated_at: string;
  match_method: Exclude<DuplicateMatchMethod, 'mixed'>;
  confidence: number;
  is_owned_by_other: boolean;
  /** Resolved when we look up the owning agent's display name (optional) */
  owner_name?: string | null;
}

export interface DuplicateQuery {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
}

/**
 * Normalise an Australian phone number for matching.
 * Mirrors the DB-generated `phone_normalized` column logic so client-side
 * lookups stay in sync with stored values.
 *
 * Strategy: strip non-digits. If >= 9 digits AND last-9 starts with '4'
 * (Australian mobile), return last 9. Otherwise return all digits (landline).
 */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length >= 9 && digits.slice(-9).charAt(0) === '4') {
    return digits.slice(-9);
  }
  return digits;
}

export function isMobileFromRaw(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 9 && digits.slice(-9).charAt(0) === '4';
}
