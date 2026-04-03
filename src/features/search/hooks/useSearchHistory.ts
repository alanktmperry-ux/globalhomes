import { useState, useCallback } from 'react';
import { SearchQuery } from '@/lib/types';

const STORAGE_KEY = 'gh-search-history';
const MAX_HISTORY = 10;

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchQuery[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addSearch = useCallback((query: string) => {
    const locationMatch = query.match(/(?:in\s+)([A-Z][a-zA-Z\s]+(?:,\s*[A-Z][a-zA-Z\s]+)?)/i);
    const newEntry: SearchQuery = {
      text: query,
      timestamp: Date.now(),
      location: locationMatch?.[1]?.trim(),
    };

    setHistory(prev => {
      const updated = [newEntry, ...prev.filter(h => h.text !== query)].slice(0, MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const lastSearch = history[0] || null;

  return { history, addSearch, lastSearch };
}
