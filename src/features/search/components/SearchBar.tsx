import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Search, Mic, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/shared/lib/i18n';
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
  const [isParsing, setIsParsing] = useState(false);
  const [suggestions, setSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleVoiceResult = useCallback((text: string) => {
    setQuery(text);
    // Auto-submit voice result immediately
    if (text.trim()) {
      onSearch(text.trim());
    }
  }, [onSearch]);

  const handleVoiceError = useCallback((message: string) => {
    toast({ title: '️ Voice Search', description: message, variant: 'destructive' });
  }, [toast]);

  const { isListening, isTranscribing, startListening, stopListening, isSupported } = useVoiceSearch(handleVoiceResult, handleVoiceError);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsParsing(true);
    try {
      // Fast path: single short word — likely a suburb, skip the LLM
      const isSingleWord = !/\s/.test(trimmed) && trimmed.length < 30;
      if (isSingleWord) {
        navigate(`/buy?q=${encodeURIComponent(trimmed)}`);
        return;
      }

      const { data, error } = await supabase.functions.invoke('parse-search-query', {
        body: { query: trimmed, locale: language ?? 'en' },
      });

      if (error || !data?.parsed) {
        navigate(`/buy?q=${encodeURIComponent(trimmed)}`);
        return;
      }

      const p = data.parsed;
      const intent = p.intent === 'rent' ? 'rent' : 'buy';

      const params = new URLSearchParams();
      if (p.suburb_or_locality) params.set('suburb', p.suburb_or_locality);
      if (p.postcode) params.set('postcode', p.postcode);
      if (p.state) params.set('state', p.state);
      if (p.property_types?.length) params.set('type', p.property_types.join(','));
      if (p.beds_min != null) params.set('beds_min', String(p.beds_min));
      if (p.beds_max != null) params.set('beds_max', String(p.beds_max));
      if (p.baths_min != null) params.set('baths_min', String(p.baths_min));
      if (p.parking_min != null) params.set('parking_min', String(p.parking_min));
      if (p.min_price_aud != null) params.set('min_price', String(p.min_price_aud));
      if (p.max_price_aud != null) params.set('max_price', String(p.max_price_aud));
      if (p.features?.length) params.set('features', p.features.join(','));
      params.set('raw_q', trimmed);

      if ((p.confidence ?? 0) < 0.5) {
        params.set('q', trimmed);
        params.set('low_confidence', '1');
      }

      navigate(`/${intent}?${params.toString()}`);
    } catch (err) {
      console.error('[SearchBar] parse failed, falling back to literal:', err);
      navigate(`/buy?q=${encodeURIComponent(trimmed)}`);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center rounded-2xl bg-secondary border border-border shadow-card transition-shadow focus-within:shadow-elevated focus-within:border-primary/30">
          {isTranslating ? (
            <Loader2 className="absolute left-4 text-primary animate-spin" size={20} />
          ) : (
            <Search className="absolute left-4 text-muted-foreground" size={20} />
          )}
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

      <AnimatePresence>
        {detectedLang && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 flex justify-center"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
               Searching in English
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
