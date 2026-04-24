/**
 * Searchable language dropdown for the `contacts.preferred_language` field.
 * Pinned AU community languages appear first, then the rest of the i18n set.
 *
 * Search matches across English label, native script, and the underlying code.
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Check, Globe } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  CONTACT_LANGUAGES,
  DEFAULT_CONTACT_LANGUAGE,
  getContactLanguageOption,
  type ContactLanguageOption,
} from '@/shared/lib/contactLanguages';

interface Props {
  value: string | null | undefined;
  onChange: (code: string) => void;
  /** Optional label override. */
  label?: string;
}

export default function ContactLanguagePicker({ value, onChange, label = 'Preferred Language' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = getContactLanguageOption(value ?? DEFAULT_CONTACT_LANGUAGE);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { pinned, rest } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filter = (l: ContactLanguageOption) =>
      !q ||
      l.label.toLowerCase().includes(q) ||
      l.native.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q);

    return {
      pinned: CONTACT_LANGUAGES.filter(l => l.pinned && filter(l)),
      rest: CONTACT_LANGUAGES.filter(l => !l.pinned && filter(l)),
    };
  }, [query]);

  const renderOption = (l: ContactLanguageOption, key: string) => {
    const isActive = l.code === (value ?? DEFAULT_CONTACT_LANGUAGE) && l.label === selected?.label;
    return (
      <button
        key={key}
        type="button"
        onClick={() => {
          onChange(l.code);
          setOpen(false);
          setQuery('');
        }}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors ${
          isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent'
        }`}
      >
        <span className="text-base leading-none">{l.flag}</span>
        <span className="flex-1 truncate">
          <span className="font-medium">{l.label}</span>
          <span className="text-muted-foreground ml-1.5">{l.native}</span>
        </span>
        {isActive && <Check size={14} className="text-primary shrink-0" />}
      </button>
    );
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Label className="text-xs">{label}</Label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-9 px-3 flex items-center gap-2 border border-input rounded-md bg-background text-sm text-foreground hover:bg-accent/50 transition-colors"
      >
        {selected ? (
          <>
            <span className="text-base leading-none">{selected.flag}</span>
            <span className="flex-1 text-left truncate">
              {selected.label}
              <span className="text-muted-foreground ml-1.5 text-xs">{selected.native}</span>
            </span>
          </>
        ) : (
          <>
            <Globe size={14} className="text-muted-foreground" />
            <span className="flex-1 text-left text-muted-foreground">Select language…</span>
          </>
        )}
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search size={13} className="text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search language…"
              className="flex-1 text-[13px] bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {pinned.length > 0 && (
              <>
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Top AU community languages
                </div>
                {pinned.map((l, i) => renderOption(l, `pinned-${i}-${l.code}-${l.label}`))}
                {rest.length > 0 && <div className="my-1 border-t border-border" />}
              </>
            )}
            {rest.length > 0 && (
              <>
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  All languages
                </div>
                {rest.map((l, i) => renderOption(l, `rest-${i}-${l.code}-${l.label}`))}
              </>
            )}
            {pinned.length === 0 && rest.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                No matches for “{query}”
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
