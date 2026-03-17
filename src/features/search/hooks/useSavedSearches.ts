import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Filters, defaultFilters } from '@/shared/components/FilterSidebar';
import { useToast } from '@/shared/hooks/use-toast';

export interface SavedSearch {
  id: string;
  label: string;
  query: string;
  filters: Filters;
  radius?: number;
  center?: { lat: number; lng: number };
  savedAt: number;
}

/**
 * Persist saved searches to user_preferences.saved_searches (JSON column).
 * Also syncs to saved_search_alerts table for email notifications.
 * Falls back to localStorage for unauthenticated users.
 */
export function useSavedSearches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Sync a search to the alerts table for email matching
  const syncToAlerts = useCallback(
    async (search: SavedSearch) => {
      if (!user) return;
      await supabase.from('saved_search_alerts').upsert(
        {
          user_id: user.id,
          label: search.label,
          search_query: search.query,
          filters: search.filters as any,
          radius: search.radius ?? null,
          center_lat: search.center?.lat ?? null,
          center_lng: search.center?.lng ?? null,
          is_active: true,
        },
        { onConflict: 'user_id,label,search_query' },
      );
    },
    [user],
  );

  // Remove from alerts table
  const removeFromAlerts = useCallback(
    async (search: SavedSearch) => {
      if (!user) return;
      await supabase
        .from('saved_search_alerts')
        .delete()
        .eq('user_id', user.id)
        .eq('label', search.label)
        .eq('search_query', search.query);
    },
    [user],
  );

  // Load on mount
  useEffect(() => {
    const load = async () => {
      if (user) {
        const { data } = await supabase
          .from('user_preferences')
          .select('search_history')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.search_history) {
          try {
            const parsed = Array.isArray(data.search_history) ? data.search_history : [];
            setSavedSearches(parsed as unknown as SavedSearch[]);
          } catch {
            setSavedSearches([]);
          }
        }
      } else {
        try {
          const raw = localStorage.getItem('gh_saved_searches');
          if (raw) setSavedSearches(JSON.parse(raw));
        } catch {
          /* ignore */
        }
      }
      setLoaded(true);
    };
    load();
  }, [user]);

  // Persist helper
  const persist = useCallback(
    async (searches: SavedSearch[]) => {
      setSavedSearches(searches);
      if (user) {
        await supabase
          .from('user_preferences')
          .update({ search_history: searches as any })
          .eq('user_id', user.id);
      } else {
        localStorage.setItem('gh_saved_searches', JSON.stringify(searches));
      }
    },
    [user],
  );

  const saveSearch = useCallback(
    async (opts: { query: string; filters: Filters; radius?: number; center?: { lat: number; lng: number } }) => {
      const label = opts.query || 'All properties';
      const newSearch: SavedSearch = {
        id: crypto.randomUUID(),
        label,
        query: opts.query,
        filters: opts.filters,
        radius: opts.radius,
        center: opts.center,
        savedAt: Date.now(),
      };
      const updated = [newSearch, ...savedSearches].slice(0, 10);
      await persist(updated);
      await syncToAlerts(newSearch);
      toast({ title: '🔖 Search saved', description: `"${label}" saved — you'll get email alerts for new matches.` });
    },
    [savedSearches, persist, syncToAlerts, toast],
  );

  const removeSearch = useCallback(
    async (id: string) => {
      const toRemove = savedSearches.find((s) => s.id === id);
      const updated = savedSearches.filter((s) => s.id !== id);
      await persist(updated);
      if (toRemove) await removeFromAlerts(toRemove);
    },
    [savedSearches, persist, removeFromAlerts],
  );

  return { savedSearches, saveSearch, removeSearch, loaded };
}
