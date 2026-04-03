import { useState, useRef, useEffect } from 'react';
import { GraduationCap, X, Search } from 'lucide-react';
import { useSchoolSearch, type SchoolSearchResult } from '@/hooks/useSchoolSearch';

interface Props {
  selectedSchool: SchoolSearchResult | null;
  onSelect: (school: SchoolSearchResult | null) => void;
  stateFilter?: string;
}

export function SchoolSearchFilter({ selectedSchool, onSelect, stateFilter }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { results, loading, searchSchools } = useSchoolSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => searchSchools(query, stateFilter), 200);
    return () => clearTimeout(timer);
  }, [query, stateFilter, searchSchools]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectedSchool) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl border border-primary/30 bg-primary/5">
        <GraduationCap size={16} className="text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{selectedSchool.name}</p>
          <p className="text-[11px] text-muted-foreground">Catchment zone filter active</p>
        </div>
        <button onClick={() => onSelect(null)} className="text-primary hover:text-primary/80 transition-colors">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-card">
        <Search size={14} className="text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search by school catchment..."
          className="flex-1 text-sm outline-none bg-transparent text-foreground placeholder:text-muted-foreground"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }}>
            <X size={14} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {loading && <p className="px-4 py-3 text-sm text-muted-foreground">Searching...</p>}
          {!loading && results.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">No schools found</p>}
          {results.map(school => (
            <button
              key={school.id}
              onMouseDown={(e) => { e.preventDefault(); onSelect(school); setOpen(false); setQuery(''); }}
              className="w-full text-left px-4 py-2.5 hover:bg-secondary transition-colors border-b border-border last:border-0"
            >
              <p className="text-sm font-medium text-foreground">{school.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {school.type.charAt(0).toUpperCase() + school.type.slice(1)} ·{' '}
                {school.sector.charAt(0).toUpperCase() + school.sector.slice(1)} ·{' '}
                {school.suburb}, {school.state}
                {school.icsea ? ` · ICSEA ${school.icsea}` : ''}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
