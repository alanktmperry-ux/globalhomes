import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Search, Loader2, X, Keyboard, ChevronDown } from 'lucide-react';
import { SoundWaveVisualizer } from './SoundWaveVisualizer';
import { parsePropertyQuery, filtersToChips } from '@/lib/parsePropertyQuery';
import { useToast } from '@/hooks/use-toast';

type VoiceState = 'idle' | 'listening' | 'processing' | 'results';

const VOICE_LANGUAGES = [
  { code: 'en-AU', flag: '🇦🇺', label: 'English (AU)' },
  { code: 'en-US', flag: '🇺🇸', label: 'English' },
  { code: 'en-GB', flag: '🇬🇧', label: 'English (UK)' },
  { code: 'es-ES', flag: '🇪🇸', label: 'Español' },
  { code: 'es-MX', flag: '🇲🇽', label: 'Español (MX)' },
  { code: 'zh-CN', flag: '🇨🇳', label: '中文' },
  { code: 'zh-TW', flag: '🇹🇼', label: '中文 (台灣)' },
  { code: 'hi-IN', flag: '🇮🇳', label: 'हिंदी' },
  { code: 'ar-SA', flag: '🇦🇪', label: 'العربية' },
  { code: 'fr-FR', flag: '🇫🇷', label: 'Français' },
  { code: 'de-DE', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'ja-JP', flag: '🇯🇵', label: '日本語' },
  { code: 'it-IT', flag: '🇮🇹', label: 'Italiano' },
  { code: 'pt-BR', flag: '🇵🇹', label: 'Português' },
  { code: 'ru-RU', flag: '🇷🇺', label: 'Русский' },
  { code: 'ko-KR', flag: '🇰🇷', label: '한국어' },
  { code: 'th-TH', flag: '🇹🇭', label: 'ไทย' },
  { code: 'vi-VN', flag: '🇻🇳', label: 'Tiếng Việt' },
  { code: 'tr-TR', flag: '🇹🇷', label: 'Türkçe' },
  { code: 'pl-PL', flag: '🇵🇱', label: 'Polski' },
  { code: 'nl-NL', flag: '🇳🇱', label: 'Nederlands' },
  { code: 'sv-SE', flag: '🇸🇪', label: 'Svenska' },
  { code: 'el-GR', flag: '🇬🇷', label: 'Ελληνικά' },
  { code: 'id-ID', flag: '🇮🇩', label: 'Bahasa Indonesia' },
] as const;

const ROTATING_LANGUAGES = [
  '🇺🇸 English', '🇪🇸 Español', '🇨🇳 中文', '🇦🇪 العربية', '🇮🇳 हिंदी',
  '🇫🇷 Français', '🇯🇵 日本語', '🇩🇪 Deutsch', '🇮🇹 Italiano', '🇵🇹 Português',
  '🇷🇺 Русский', '🇰🇷 한국어', '🇹🇭 ไทย', '🇻🇳 Tiếng Việt', '🇹🇷 Türkçe',
  '🇵🇱 Polski', '🇳🇱 Nederlands', '🇸🇪 Svenska', '🇬🇷 Ελληνικά', '🇮🇩 Bahasa Indonesia',
];

interface VoiceSearchHeroProps {
  onSearch: (query: string) => void;
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void;
  resultCount?: number;
  isSearching?: boolean;
}

export function VoiceSearchHero({ onSearch, onLocationSelect, resultCount, isSearching }: VoiceSearchHeroProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [editableTranscript, setEditableTranscript] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textQuery, setTextQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState('en-AU');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [filterChips, setFilterChips] = useState<{ label: string; key: string }[]>([]);
  const [rotatingIndex, setRotatingIndex] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Rotating language ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setRotatingIndex(i => (i + 1) % ROTATING_LANGUAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update state when external search completes
  useEffect(() => {
    if (!isSearching && voiceState === 'processing') {
      setVoiceState(resultCount !== undefined ? 'results' : 'idle');
    }
  }, [isSearching, resultCount, voiceState]);

  const processTranscript = useCallback(async (text: string) => {
    const filters = parsePropertyQuery(text);
    const chips = filtersToChips(filters);
    setFilterChips(chips);
    setEditableTranscript(text);
    setVoiceState('processing');
    onSearch(text);

    // Try to geocode the location to pan the map
    if (onLocationSelect) {
      try {
        const { geocode } = await import('@/lib/googleMapsService');
        const locationQuery = filters.location || text;
        console.log('[GeoDebug] Geocoding:', locationQuery);
        const location = await geocode(locationQuery);
        console.log('[GeoDebug] Result:', location);
        if (!location && filters.location && filters.location !== text) {
          const fallback = await geocode(text);
          console.log('[GeoDebug] Fallback result:', fallback);
          if (fallback) {
            onLocationSelect({ lat: fallback.lat, lng: fallback.lng, address: text });
            return;
          }
        }
        if (location) {
          onLocationSelect({ lat: location.lat, lng: location.lng, address: locationQuery });
        } else {
          console.log('[GeoDebug] No geocode result found');
        }
      } catch (err) {
        console.error('[GeoDebug] Geocode error:', err);
      }
    }
  }, [onSearch, onLocationSelect]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setShowTextInput(true);
      return;
    }

    try {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = selectedLang;

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += t;
            setConfidence(Math.round(event.results[i][0].confidence * 100));
          } else {
            interim += t;
          }
        }
        if (interim) setTranscript(interim);
        if (final) {
          setTranscript(final);
          processTranscript(final);
        }
      };

      recognition.onerror = (event: any) => {
        setVoiceState('idle');
        if (event.error === 'not-allowed') {
          toast({ title: '🎙️ Microphone Access', description: 'Please allow microphone permissions and try again.', variant: 'destructive' });
        } else if (event.error === 'no-speech') {
          toast({ title: "🎙️ I didn't catch that", description: 'Please try again and speak clearly.' });
        } else if (event.error !== 'aborted') {
          toast({ title: '🎙️ Voice Error', description: 'Try again or type your search instead.', variant: 'destructive' });
        }
      };

      recognition.onend = () => {
        if (voiceState === 'listening') {
          // If no final result was captured
          if (!transcript) setVoiceState('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setVoiceState('listening');
      setTranscript('');
      setConfidence(null);
      setFilterChips([]);
    } catch {
      setShowTextInput(true);
    }
  }, [isSupported, selectedLang, processTranscript, toast, voiceState, transcript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    if (voiceState === 'listening' && transcript) {
      processTranscript(transcript);
    } else {
      setVoiceState('idle');
    }
  }, [voiceState, transcript, processTranscript]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textQuery.trim()) {
      setTranscript(textQuery.trim());
      processTranscript(textQuery.trim());
    }
  };

  const removeChip = (key: string) => {
    setFilterChips(chips => chips.filter(c => c.key !== key));
  };

  const handleEditSubmit = () => {
    if (editableTranscript.trim()) {
      processTranscript(editableTranscript.trim());
    }
  };

  const selectedLangObj = VOICE_LANGUAGES.find(l => l.code === selectedLang) || VOICE_LANGUAGES[0];

  // Visible rotating languages (show 5 at a time)
  const visibleLanguages = Array.from({ length: 5 }, (_, i) =>
    ROTATING_LANGUAGES[(rotatingIndex + i) % ROTATING_LANGUAGES.length]
  );

  return (
    <div className="relative overflow-hidden bg-background">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-background" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 flex flex-col items-center text-center">
        {/* App title */}
        <h1 className="font-display text-2xl font-bold text-foreground mb-6 tracking-tight">
          GlobalHome
        </h1>

        {/* Transcript display area */}
        <AnimatePresence mode="wait">
          {voiceState === 'listening' && transcript && (
            <motion.p
              key="transcript"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-foreground text-lg font-medium mb-4 min-h-[28px]"
            >
              "{transcript}"
            </motion.p>
          )}
          {voiceState === 'results' && (
            <motion.div
              key="editable"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full mb-4"
            >
              <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-2">
                <input
                  type="text"
                  value={editableTranscript}
                  onChange={e => setEditableTranscript(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEditSubmit()}
                  className="flex-1 bg-transparent text-foreground text-sm focus:outline-none"
                />
                <button onClick={handleEditSubmit} className="text-primary hover:text-primary/80">
                  <Search size={16} />
                </button>
              </div>
              {confidence !== null && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className={`w-2 h-2 rounded-full ${confidence >= 80 ? 'bg-emerald-400' : confidence >= 50 ? 'bg-yellow-400' : 'bg-destructive'}`} />
                  <span className="text-xs text-muted-foreground">{confidence}% confidence</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mic button */}
        <div className="relative mb-6">
          {/* Pulsing rings */}
          {voiceState === 'idle' && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/30"
                animate={{ scale: [1, 1.3], opacity: [0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/20"
                animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
              />
            </>
          )}

          {/* Listening rings - more intense */}
          {voiceState === 'listening' && (
            <>
              <motion.div
                className="absolute inset-[-8px] rounded-full bg-primary/20"
                animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-[-4px] rounded-full bg-primary/30"
                animate={{ scale: [1, 1.2], opacity: [0.6, 0] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
              />
            </>
          )}

          {/* Gradient border */}
          <div className="p-[3px] rounded-full bg-gradient-to-br from-primary via-purple-500 to-primary">
            <motion.button
              onClick={voiceState === 'listening' ? stopListening : startListening}
              className="relative w-20 h-20 rounded-full bg-card flex items-center justify-center shadow-elevated transition-shadow"
              whileTap={{ scale: 0.95 }}
              animate={voiceState === 'listening' ? { scale: [1, 1.05, 1] } : {}}
              transition={voiceState === 'listening' ? { duration: 0.5, repeat: Infinity } : {}}
              aria-label={voiceState === 'listening' ? 'Stop listening' : 'Start voice search'}
            >
              {voiceState === 'processing' || isSearching ? (
                <Loader2 size={28} className="animate-spin text-primary" />
              ) : voiceState === 'listening' ? (
                <MicOff size={28} className="text-destructive" />
              ) : (
                <Mic size={28} className="text-primary" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Sound wave visualization */}
        <AnimatePresence>
          {voiceState === 'listening' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <SoundWaveVisualizer isActive />
            </motion.div>
          )}
        </AnimatePresence>

        {/* State-dependent text */}
        <AnimatePresence mode="wait">
          {voiceState === 'idle' && (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-foreground text-sm font-medium mb-2"
            >
              Tap and describe your dream home in any language
            </motion.p>
          )}
          {voiceState === 'listening' && (
            <motion.p
              key="listening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-primary text-sm font-medium mb-2"
            >
              Listening… speak now
            </motion.p>
          )}
          {(voiceState === 'processing' || isSearching) && (
            <motion.p
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-muted-foreground text-sm font-medium mb-2 flex items-center gap-2"
            >
              <Loader2 size={14} className="animate-spin" />
              Searching across Australia…
            </motion.p>
          )}
          {voiceState === 'results' && !isSearching && resultCount !== undefined && (
            <motion.p
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-emerald-600 text-sm font-medium mb-2"
            >
              Found {resultCount} properties matching your voice search
            </motion.p>
          )}
        </AnimatePresence>

        {/* Filter chips */}
        <AnimatePresence>
          {filterChips.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap justify-center gap-2 mb-4"
            >
              {filterChips.map(chip => (
                <motion.button
                  key={chip.key}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => removeChip(chip.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-foreground text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  {chip.label}
                  <X size={12} className="text-muted-foreground" />
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Language selector */}
        <div className="relative mb-4">
          <button
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs hover:text-foreground transition-colors"
          >
            <span>{selectedLangObj.flag} {selectedLangObj.label}</span>
            <ChevronDown size={12} />
          </button>
          <AnimatePresence>
            {showLangDropdown && (
              <>
                <motion.div
                  className="fixed inset-0 z-40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowLangDropdown(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-56 max-h-64 overflow-y-auto bg-popover border border-border rounded-xl shadow-elevated"
                >
                  {VOICE_LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { setSelectedLang(lang.code); setShowLangDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        lang.code === selectedLang
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }`}
                    >
                      {lang.flag} {lang.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Rotating language indicators */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground overflow-hidden h-5 mb-4">
          <AnimatePresence mode="popLayout">
            {visibleLanguages.map((lang, i) => (
              <motion.span
                key={`${rotatingIndex}-${i}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: i === 2 ? 1 : 0.5, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="whitespace-nowrap"
              >
                {lang}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        {/* Always-visible text search input */}
        <form
          onSubmit={handleTextSubmit}
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-2 rounded-xl bg-secondary border border-border px-4 py-3">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={textQuery}
              onChange={e => setTextQuery(e.target.value)}
              placeholder='Try "3 bed house in Berwick under $800k"'
              className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground focus:outline-none"
            />
            {textQuery.trim() && (
              <button type="submit" className="text-primary hover:text-primary/80">
                <Search size={18} />
              </button>
            )}
          </div>
        </form>

        {/* Search history pills */}
        <VoiceSearchHistory onRerun={onSearch} />
      </div>
    </div>
  );
}

function VoiceSearchHistory({ onRerun }: { onRerun: (q: string) => void }) {
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gh-search-history');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return parsed.map((h: any) => h.text || h).slice(0, 5);
    } catch { return []; }
  });

  if (history.length === 0) return null;

  return (
    <div className="mt-4 w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">Recent searches</span>
        <button
          onClick={() => { localStorage.removeItem('gh-search-history'); setHistory([]); }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {history.map((q, i) => (
          <button
            key={i}
            onClick={() => onRerun(q)}
            className="px-3 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs hover:text-foreground hover:bg-primary/10 transition-colors truncate max-w-[200px]"
          >
            🔍 {q}
          </button>
        ))}
      </div>
    </div>
  );
}
