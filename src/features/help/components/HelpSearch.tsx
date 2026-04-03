import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FAQ_ITEMS, type FaqItem } from '@/data/faq';

interface Props {
  onSelect?: (item: FaqItem) => void;
  className?: string;
  placeholder?: string;
}

export function HelpSearch({ onSelect, className = '', placeholder }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [debouncedQuery, setDebouncedQuery] = useState('');

  const handleChange = useCallback((val: string) => {
    setQuery(val);
    setSelectedAnswer(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(val), 150);
  }, []);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return FAQ_ITEMS.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [debouncedQuery]);

  useEffect(() => {
    setOpen(results.length > 0 || (debouncedQuery.trim().length > 0 && results.length === 0));
  }, [results, debouncedQuery]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setQuery(''); setDebouncedQuery(''); setOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={placeholder || "Search for help — e.g. 'how to list a property', 'auction registration'"}
          className="pl-10 pr-10 h-12 text-sm"
        />
        {query && (
          <button onClick={() => { setQuery(''); setDebouncedQuery(''); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-lg max-h-[400px] overflow-y-auto">
          {results.length > 0 ? (
            <>
              <p className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
                {results.length} result{results.length !== 1 ? 's' : ''} for "{debouncedQuery}"
              </p>
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (onSelect) { onSelect(item); setOpen(false); }
                    else setSelectedAnswer(selectedAnswer === item.id ? null : item.id);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors border-b border-border last:border-0"
                >
                  <p className="text-sm font-medium text-foreground">{item.question}</p>
                  {selectedAnswer === item.id ? (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">{item.answer}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.answer.slice(0, 80)}…</p>
                  )}
                </button>
              ))}
            </>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              No results found. Try a different search term or{' '}
              <a href="/help/contact" className="text-primary hover:underline">contact support</a>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
