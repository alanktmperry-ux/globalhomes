import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Mic, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/shared/lib/i18n';
import { useVoiceSearch } from '@/features/search/hooks/useVoiceSearch';
import { autocomplete } from '@/shared/lib/googleMapsService';
import { useToast } from '@/shared/hooks/use-toast';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void;
  initialValue?: string;
}

export function SearchBar({ onSearch, onLocationSelect, initialValue = '' }: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const { toast } = useToast();

  const handleVoiceResult = useCallback((text: string) => {
    setQuery(text);
    // Auto-submit voice result immediately
    if (text.trim()) {
      onSearch(text.trim());
    }
  }, [onSearch]);

  const handleVoiceError = useCallback((message: string) => {
    toast({ title: '🎙️ Voice Search', description: message, variant: 'destructive' });
  }, [toast]);

  const { isListening, isTranscribing, startListening, stopListening, isSupported } = useVoiceSearch(handleVoiceResult, handleVoiceError);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      if (!localStorage.getItem("maps_consent_given")) return;
      const results = await autocomplete(query);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = async (suggestion: { description: string; place_id: string }) => {
    setQuery(suggestion.description);
    setShowSuggestions(false);
    onSearch(suggestion.description);

    if (onLocationSelect) {
      const { getPlaceDetails } = await import('@/lib/googleMapsService');
      const details = await getPlaceDetails(suggestion.place_id);
      if (details) onLocationSelect(details);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center rounded-2xl bg-secondary border border-border shadow-card transition-shadow focus-within:shadow-elevated focus-within:border-primary/30">
          <Search className="absolute left-4 text-muted-foreground" size={20} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={t('search.placeholder')}
            className="w-full bg-transparent py-4 pl-12 pr-16 text-foreground placeholder:text-muted-foreground text-base font-body focus:outline-none rounded-2xl"
          />
          {isSupported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={isTranscribing}
              className="absolute right-3 flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Voice search"
            >
              <AnimatePresence>
                {isListening && (
                  <motion.span
                    className="absolute inset-0 rounded-xl bg-primary"
                    initial={{ scale: 1, opacity: 0.4 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </AnimatePresence>
              {isTranscribing ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
            </button>
          )}
        </div>
      </form>

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-elevated overflow-y-auto max-h-60"
          >
            {suggestions.map((s) => (
              <li key={s.place_id}>
                <button
                  type="button"
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <MapPin size={16} className="text-muted-foreground shrink-0" />
                  <span className="truncate">{s.description}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(isListening || isTranscribing) && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-center text-sm text-primary font-medium"
          >
            {isTranscribing ? 'Transcribing…' : t('search.voice.listening')}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
