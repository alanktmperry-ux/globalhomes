import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import { Filters, defaultFilters } from '@/components/FilterSidebar';
import { useToast } from '@/hooks/use-toast';

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
 * Falls back to localStorage for unauthenticated users.
 */
export function useSavedSearches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loaded, setLoaded] = useState(false);

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
            // search_history stores saved searches as JSON array
            const parsed = Array.isArray(data.search_history) ? data.search_history : [];
            setSavedSearches(parsed as SavedSearch[]);
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
      const updated = [newSearch, ...savedSearches].slice(0, 10); // max 10
      await persist(updated);
      toast({ title: '🔖 Search saved', description: `"${label}" added to your saved searches.` });
    },
    [savedSearches, persist, toast],
  );

  const removeSearch = useCallback(
    async (id: string) => {
      const updated = savedSearches.filter((s) => s.id !== id);
      await persist(updated);
    },
    [savedSearches, persist],
  );

  return { savedSearches, saveSearch, removeSearch, loaded };
}
