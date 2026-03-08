import { useState, useCallback } from 'react';
import { Search, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialValue?: string;
}

export function SearchBar({ onSearch, initialValue = '' }: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const { t } = useI18n();

  const handleVoiceResult = useCallback((text: string) => {
    setQuery(text);
    onSearch(text);
  }, [onSearch]);

  const { isListening, startListening, stopListening, isSupported } = useVoiceSearch(handleVoiceResult);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative flex items-center rounded-2xl bg-secondary border border-border shadow-card transition-shadow focus-within:shadow-elevated focus-within:border-primary/30">
        <Search className="absolute left-4 text-muted-foreground" size={20} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
          className="w-full bg-transparent py-4 pl-12 pr-16 text-foreground placeholder:text-muted-foreground text-base font-body focus:outline-none rounded-2xl"
        />
        {isSupported && (
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className="absolute right-3 flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground transition-transform active:scale-95"
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
            <Mic size={18} />
          </button>
        )}
      </div>
      <AnimatePresence>
        {isListening && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-center text-sm text-primary font-medium"
          >
            {t('search.voice.listening')}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}
