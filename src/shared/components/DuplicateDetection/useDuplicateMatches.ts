/**
 * Hook: live duplicate-contact detection.
 * Debounces input changes (400ms) and queries the `find_duplicate_contacts`
 * RPC. Resolves owner display names for any matches owned by another agent.
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { capture } from '@/shared/lib/posthog';
import {
  type DuplicateMatch,
  type DuplicateQuery,
  normalisePhone,
} from './types';

interface Options {
  agencyId: string | null | undefined;
  query: DuplicateQuery;
  /** Contact id to exclude (when editing). Pass null/undefined for create. */
  excludeContactId?: string | null;
  /** Skip lookup entirely (e.g. while modal closed). */
  enabled?: boolean;
}

interface Result {
  matches: DuplicateMatch[];
  loading: boolean;
  error: string | null;
}

const DEBOUNCE_MS = 400;

export function useDuplicateMatches({
  agencyId,
  query,
  excludeContactId,
  enabled = true,
}: Options): Result {
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const reqIdRef = useRef(0);

  const email = (query.email ?? '').trim().toLowerCase();
  const phoneNorm = normalisePhone(query.phone);
  const firstName = (query.firstName ?? '').trim();
  const lastName = (query.lastName ?? '').trim();
  const address = (query.address ?? '').trim();

  // Determine if we have enough signal to bother querying
  const hasSignal =
    email.length > 3 ||
    (phoneNorm !== null && phoneNorm.length >= 6) ||
    (firstName.length >= 2 && (phoneNorm !== null || address.length >= 3));

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!enabled || !agencyId || !hasSignal) {
      setMatches([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const reqId = ++reqIdRef.current;
      try {
        const { data, error: rpcError } = await supabase.rpc(
          'find_duplicate_contacts' as any,
          {
            p_agency_id: agencyId,
            p_email: email || null,
            p_phone_normalized: phoneNorm,
            p_first_name: firstName || null,
            p_last_name: lastName || null,
            p_address: address || null,
            p_exclude_contact_id: excludeContactId || null,
          } as any,
        );

        // Drop stale responses
        if (reqId !== reqIdRef.current) return;

        if (rpcError) {
          setError(rpcError.message);
          setMatches([]);
        } else {
          const rows = (data ?? []) as DuplicateMatch[];
          setMatches(rows);
          setError(null);

          // Telemetry: log that we surfaced suggestions
          if (rows.length > 0) {
            capture('contact_duplicate_suggested', {
              agency_id: agencyId,
              match_count: rows.length,
              match_methods: rows.map(r => r.match_method),
            });
            // Also persist to DB telemetry table (fire-and-forget)
            void logDuplicateEvent({
              agencyId,
              action: 'suggested',
              matchMethod: dominantMethod(rows),
              suggestedIds: rows.map(r => r.id),
            });
          }
        }
      } catch (err: any) {
        if (reqId !== reqIdRef.current) return;
        setError(err?.message ?? 'Lookup failed');
        setMatches([]);
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, agencyId, email, phoneNorm, firstName, lastName, address, excludeContactId, hasSignal]);

  // Resolve owner display names for matches owned by other agents
  useEffect(() => {
    const otherOwnerIds = Array.from(
      new Set(
        matches.filter(m => m.is_owned_by_other && !m.owner_name).map(m => m.created_by),
      ),
    );
    if (otherOwnerIds.length === 0) return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('agents')
        .select('user_id, name')
        .in('user_id', otherOwnerIds);
      if (cancelled || !data) return;
      const map = new Map<string, string>(
        (data as { user_id: string; name: string }[]).map(r => [r.user_id, r.name]),
      );
      setMatches(prev =>
        prev.map(m =>
          m.is_owned_by_other && !m.owner_name
            ? { ...m, owner_name: map.get(m.created_by) ?? null }
            : m,
        ),
      );
    })();

    return () => {
      cancelled = true;
    };
    // Re-run only when the set of "other-owned, unresolved" ids changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches.map(m => `${m.id}:${m.is_owned_by_other}:${m.owner_name ?? ''}`).join('|')]);

  return { matches, loading, error };
}

function dominantMethod(rows: DuplicateMatch[]): 'email' | 'phone' | 'name_fuzzy' | 'mixed' {
  const set = new Set(rows.map(r => r.match_method));
  if (set.size > 1) return 'mixed';
  return [...set][0] as any;
}

/** Fire-and-forget DB telemetry. Failures never throw. */
export async function logDuplicateEvent(opts: {
  agencyId: string | null;
  action: 'suggested' | 'accepted' | 'created_anyway' | 'ignored' | 'blocked_at_save' | 'soft_warned';
  matchMethod?: 'email' | 'phone' | 'name_fuzzy' | 'mixed' | null;
  matchCount?: number;
  suggestedIds?: string[];
  acceptedContactId?: string | null;
  similarityScore?: number | null;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('contact_duplicate_events' as any).insert({
      agent_user_id: user.id,
      agency_id: opts.agencyId,
      action: opts.action,
      match_method: opts.matchMethod ?? null,
      match_count: opts.matchCount ?? opts.suggestedIds?.length ?? 0,
      suggested_contact_ids: opts.suggestedIds ?? [],
      accepted_contact_id: opts.acceptedContactId ?? null,
      similarity_score: opts.similarityScore ?? null,
    } as any);
  } catch {
    // Telemetry must never break the app
  }
}
