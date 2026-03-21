import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Search, Loader2, X, ChevronDown, MapPin } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SoundWaveVisualizer } from './SoundWaveVisualizer';
import { parsePropertyQuery, filtersToChips } from '@/features/search/lib/parsePropertyQuery';
import { useToast } from '@/shared/hooks/use-toast';
import { autocomplete, getPlaceDetails } from '@/shared/lib/googleMapsService';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { useI18n } from '@/shared/lib/i18n';

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
  onRadiusChange?: (radiusKm: number | null) => void;
  selectedRadius?: number | null;
  resultCount?: number;
  isSearching?: boolean;
}

export function VoiceSearchHero({ onSearch, onLocationSelect, onRadiusChange, selectedRadius, resultCount, isSearching }: VoiceSearchHeroProps) {
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
  const [suggestions, setSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const recognitionRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const suppressAutocompleteRef = useRef(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { listingMode, setListingMode } = useCurrency();
  const { t } = useI18n();

  const isListening = voiceState === 'listening';

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Rotating language ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setRotatingIndex(i => (i + 1) % ROTATING_LANGUAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Autocomplete for text input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (suppressAutocompleteRef.current || textQuery.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      if (suppressAutocompleteRef.current) return;
      const results = await autocomplete(textQuery);
      if (!suppressAutocompleteRef.current) {
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [textQuery]);

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

  // Update state when external search completes
  useEffect(() => {
    if (!isSearching && voiceState === 'processing') {
      setVoiceState(resultCount !== undefined ? 'results' : 'idle');
    }
  }, [isSearching, resultCount, voiceState]);

  const geocodeLocation = useCallback(async (text: string) => {
    if (!onLocationSelect) return;
    try {
      const { geocode } = await import('@/lib/googleMapsService');
      const filters = parsePropertyQuery(text);
      const locationQuery = filters.location || text;
      console.log('[GeoDebug] Geocoding:', locationQuery);
      const location = await geocode(locationQuery);
      console.log('[GeoDebug] Result:', location);
      if (location) {
        onLocationSelect({ lat: location.lat, lng: location.lng, address: locationQuery });
      } else if (filters.location && filters.location !== text) {
        const fallback = await geocode(text);
        if (fallback) {
          onLocationSelect({ lat: fallback.lat, lng: fallback.lng, address: text });
        }
      }
    } catch (err) {
      console.error('[GeoDebug] Geocode error:', err);
    }
  }, [onLocationSelect]);

  const processTranscript = useCallback((text: string) => {
    const filters = parsePropertyQuery(text);
    const chips = filtersToChips(filters);
    setFilterChips(chips);
    setEditableTranscript(text);
    setTextQuery(text);
    setVoiceState('processing');
    onSearch(text);
    geocodeLocation(text);
  }, [onSearch, geocodeLocation]);

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
          if (!transcript) setVoiceState('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setVoiceState('listening');
      setTranscript('');
      setConfidence(null);
      setFilterChips([]);
    } catch (err) {
      console.error('[VoiceSearch] Failed to start:', err);
      toast({
        title: '🎙️ Voice Unavailable',
        description: 'Voice search requires microphone access. Please use the published site in Chrome, or type your search below.',
        variant: 'destructive',
      });
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
    suppressAutocompleteRef.current = true;
    setSuggestions([]);
    setShowSuggestions(false);
    if (textQuery.trim()) {
      setTranscript(textQuery.trim());
      processTranscript(textQuery.trim());
    }
    setTimeout(() => { suppressAutocompleteRef.current = false; }, 500);
  };

  const handleSelectSuggestion = async (suggestion: { description: string; place_id: string }) => {
    suppressAutocompleteRef.current = true;
    setTextQuery(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
    setTranscript(suggestion.description);
    processTranscript(suggestion.description);
    if (onLocationSelect) {
      const details = await getPlaceDetails(suggestion.place_id);
      if (details) onLocationSelect(details);
    }
    setTimeout(() => { suppressAutocompleteRef.current = false; }, 500);
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

  const visibleLanguages = Array.from({ length: 5 }, (_, i) =>
    ROTATING_LANGUAGES[(rotatingIndex + i) % ROTATING_LANGUAGES.length]
  );

  return (
    <TooltipProvider delayDuration={400}>
      {/* SECTION 1 — Full bleed hero */}
      <div className="relative min-h-[420px] md:min-h-[480px] overflow-hidden flex flex-col">
        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1400&q=80"
          alt="Australian home"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/95 via-[#0a1628]/75 to-[#0a1628]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/90 via-transparent to-transparent" />

        {/* FLOATING NAV */}
        <div className="relative z-10 flex items-center justify-between px-4 md:px-8 py-4">
          {/* Left — Logo */}
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white text-[10px] font-extrabold tracking-tight">LHQ</span>
            </div>
            <span className="text-white font-bold text-base tracking-tight hidden sm:inline">
              ListHQ
            </span>
          </button>

          {/* Centre — Sale/Rent toggle */}
          <div className="flex bg-white/[0.12] border border-white/15 rounded-full p-1 backdrop-blur-sm">
            <button
              onClick={() => { setListingMode('sale'); window.dispatchEvent(new CustomEvent('listing-mode-changed')); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                listingMode === 'sale'
                  ? 'bg-white text-[#0a1628]'
                  : 'text-white/70 hover:text-white'
              }`}
            >For Sale</button>
            <button
              onClick={() => { setListingMode('rent'); window.dispatchEvent(new CustomEvent('listing-mode-changed')); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                listingMode === 'rent'
                  ? 'bg-white text-[#0a1628]'
                  : 'text-white/70 hover:text-white'
              }`}
            >For Rent</button>
          </div>

          {/* Right — Currency + language + sign in */}
          <div className="flex items-center gap-2 bg-white/[0.08] border border-white/[0.12] rounded-full px-3 py-1.5 backdrop-blur-sm">
            <span className="text-white/65 text-[11px]">AUD $</span>
            <span className="text-white/25 text-[11px]">|</span>
            <span className="text-white/65 text-[11px]">EN</span>
            <span className="text-white/25 text-[11px]">|</span>
            <button
              onClick={() => navigate('/auth')}
              className="text-white/65 text-[11px] hover:text-white transition-colors"
            >Sign in</button>
          </div>
        </div>

        {/* HERO CONTENT */}
        <div className="relative z-10 flex-1 flex flex-col justify-end px-4 md:px-8 pb-8 md:pb-10">
          {/* Live badge */}
          <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1 mb-4 w-fit backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/80 text-[10px] font-medium">Live listings across Australia</span>
          </div>

          {/* Headline */}
          <h1 className="font-display font-extrabold text-white leading-[1.08] tracking-tight mb-3 text-[30px] md:text-[42px]">
            Find your home.<br />
            <span className="bg-gradient-to-r from-sky-300 to-violet-300 bg-clip-text text-transparent">
              In any language.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-white/55 text-sm leading-relaxed mb-6 max-w-sm">
            AI voice search in 24 languages. Live exchange rates. Built for how the world buys Australian property.
          </p>

          {/* SEARCH CARD */}
          <div ref={wrapperRef} className="bg-white/[0.97] backdrop-blur-md rounded-2xl p-4 max-w-[500px] border border-white/30 shadow-2xl relative">
            {/* Search input row */}
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={isListening ? stopListening : startListening}
                className="w-10 h-10 rounded-xl bg-[#0a1628] flex items-center justify-center shrink-0 hover:bg-[#1a2744] transition-colors"
              >
                {isListening
                  ? <MicOff size={16} className="text-white" />
                  : <Mic size={16} className="text-white" />}
              </button>
              <input
                type="text"
                value={textQuery}
                onChange={e => setTextQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && textQuery.trim()) {
                    onSearch(textQuery.trim());
                  }
                }}
                placeholder={t('search.placeholder')}
                className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none bg-transparent"
              />
              <button
                onClick={() => {
                  if (textQuery.trim()) onSearch(textQuery.trim());
                }}
                className="bg-[#0a1628] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#1a2744] transition-colors shrink-0"
              >Search</button>
            </div>

            {/* Divider + radius/language pills */}
            <div className="border-t border-gray-100 pt-3 flex items-center gap-3 flex-wrap">
              {/* Radius pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-gray-400 mr-1">Radius:</span>
                {[null, 5, 10, 25, 50, 100].map(r => (
                  <button
                    key={r ?? 'any'}
                    onClick={() => onRadiusChange?.(r)}
                    className={`text-[10px] px-2.5 py-1 rounded-full transition-all font-medium ${
                      selectedRadius === r
                        ? 'bg-[#0a1628] text-white'
                        : 'border border-gray-200 text-gray-400 hover:border-gray-400'
                    }`}
                  >
                    {r ? `${r} km` : 'Any'}
                  </button>
                ))}
              </div>

              {/* Language pills */}
              <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                {['🇦🇺 EN', '🇨🇳 中文', '🇦🇪 عر'].map(l => (
                  <span key={l} className="text-[10px] px-2.5 py-1 rounded-full border border-gray-200 text-gray-400">
                    {l}
                  </span>
                ))}
                <span className="text-[10px] text-gray-400">+21</span>
              </div>
            </div>

            {/* Autocomplete suggestions */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 right-0 top-full z-50 mt-1 bg-popover border border-border rounded-xl shadow-elevated overflow-y-auto max-h-60"
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
          </div>

          {/* Voice listening animation */}
          <AnimatePresence>
            {voiceState === 'listening' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
              >
                <SoundWaveVisualizer isActive />
                {transcript && (
                  <p className="text-white/90 text-sm font-medium mt-2">"{transcript}"</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Processing / results state text */}
          <AnimatePresence mode="wait">
            {(voiceState === 'processing' || isSearching) && (
              <motion.p
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-white/60 text-sm font-medium mt-3 flex items-center gap-2"
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
                className="text-emerald-300 text-sm font-medium mt-3"
              >
                Found {resultCount} properties matching your search
              </motion.p>
            )}
          </AnimatePresence>

          {/* Filter chips */}
          <AnimatePresence>
            {filterChips.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-2 mt-3"
              >
                {filterChips.map(chip => (
                  <motion.button
                    key={chip.key}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => removeChip(chip.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-medium hover:bg-white/25 transition-colors backdrop-blur-sm"
                  >
                    {chip.label}
                    <X size={12} className="text-white/60" />
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SECTION 2 — Stats bar */}
      <div className="grid grid-cols-4 border-b border-border bg-background">
        {[
          { num: '24', label: 'Languages' },
          { num: 'Live', label: 'Exchange rates' },
          { num: 'AI', label: 'Voice search' },
          { num: 'Free', label: 'To search' },
        ].map((s, i) => (
          <div key={i} className={`py-4 text-center ${i < 3 ? 'border-r border-border' : ''}`}>
            <div className="text-lg font-bold text-foreground">{s.num}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </TooltipProvider>
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
