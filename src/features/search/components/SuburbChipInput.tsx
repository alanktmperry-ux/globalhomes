import { useEffect, useRef, useState } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import { autocomplete } from '@/shared/lib/googleMapsService';
import { useI18n } from '@/shared/lib/i18n';

interface Props {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
  className?: string;
}

/**
 * Chip-style suburb input with Google Places autocomplete.
 * Lets users build a multi-suburb shortlist (most buyers search 3-5).
 *
 * The display value is just the suburb name (first comma segment), so chips
 * stay short. Pressing Enter without selecting a suggestion adds whatever
 * the user typed as a free-text suburb.
 */
export function SuburbChipInput({ values, onChange, placeholder, max = 8, className }: Props) {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (input.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await autocomplete(input, '(regions)');
        setSuggestions(results.slice(0, 6));
        setOpen(results.length > 0);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const addSuburb = (raw: string) => {
    // Take just the suburb portion (before first comma) so chips stay tidy
    const name = raw.split(',')[0].trim();
    if (!name) return;
    if (values.some(v => v.toLowerCase() === name.toLowerCase())) return;
    if (values.length >= max) return;
    onChange([...values, name]);
    setInput('');
    setSuggestions([]);
    setOpen(false);
  };

  const removeSuburb = (s: string) => onChange(values.filter(v => v !== s));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[0]) addSuburb(suggestions[0].description);
      else if (input.trim()) addSuburb(input.trim());
    } else if (e.key === 'Backspace' && !input && values.length > 0) {
      removeSuburb(values[values.length - 1]);
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${className ?? ''}`}>
      <div className="flex flex-wrap items-center gap-1.5 min-h-9 rounded-md border border-input bg-background px-2 py-1 focus-within:ring-2 focus-within:ring-ring">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
        {values.map(v => (
          <span
            key={v}
            className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full"
          >
            {v}
            <button
              type="button"
              onClick={() => removeSuburb(v)}
              className="hover:text-destructive"
              aria-label={`${t('Remove')} ${v}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? (placeholder ?? t('Add suburbs…')) : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1"
          disabled={values.length >= max}
        />
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground mr-1" />}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map(s => (
            <li key={s.place_id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); addSuburb(s.description); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{s.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {values.length >= max && (
        <p className="text-[11px] text-muted-foreground mt-1">{t('Maximum')} {max} {t('suburbs')}</p>
      )}
    </div>
  );
}
