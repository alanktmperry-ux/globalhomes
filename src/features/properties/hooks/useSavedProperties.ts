import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

const STORAGE_KEY = 'gh-saved-properties';

function readLocal(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeLocal(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function useSavedProperties() {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(readLocal);
  const synced = useRef(false);

  // On auth change, fetch from Supabase and merge with localStorage
  useEffect(() => {
    if (!user) {
      synced.current = false;
      return;
    }
    if (synced.current) return;
    synced.current = true;

    const syncFromDb = async () => {
      const { data } = await supabase
        .from('saved_properties')
        .select('property_id')
        .eq('user_id', user.id);

      const dbIds = new Set((data ?? []).map((r: any) => r.property_id as string));
      const localIds = readLocal();

      // Merge: union of both sets
      const merged = new Set([...dbIds, ...localIds]);

      // Upload any local-only IDs to Supabase
      const localOnly = [...localIds].filter((id) => !dbIds.has(id));
      if (localOnly.length > 0) {
        const rows = localOnly.map((property_id) => ({ user_id: user.id, property_id }));
        await supabase.from('saved_properties').upsert(rows, { onConflict: 'user_id,property_id', ignoreDuplicates: true });
      }

      writeLocal(merged);
      setSavedIds(merged);
    };

    syncFromDb();
  }, [user]);

  const toggleSaved = useCallback(
    (id: string) => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        const removing = next.has(id);
        if (removing) next.delete(id);
        else next.add(id);

        writeLocal(next);

        // Sync to Supabase if authenticated (fire-and-forget)
        if (user) {
          if (removing) {
            supabase
              .from('saved_properties')
              .delete()
              .eq('user_id', user.id)
              .eq('property_id', id)
              .then();
          } else {
            supabase
              .from('saved_properties')
              .insert({ user_id: user.id, property_id: id })
              .then();
          }
        }

        return next;
      });
    },
    [user],
  );

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  return { savedIds, toggleSaved, isSaved };
}
