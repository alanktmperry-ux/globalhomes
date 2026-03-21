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

const HEADLINE_WORDS = [
  { text: 'in any language.', color: '#a78bfa' },
  { text: 'in Chinese.',      color: '#38bdf8' },
  { text: 'in Arabic.',       color: '#34d399' },
  { text: 'in Hindi.',        color: '#fbbf24' },
  { text: 'in Spanish.',      color: '#f472b6' },
  { text: 'in Japanese.',     color: '#818cf8' },
];

const SEARCH_PLACEHOLDERS = [
  'Tap to speak, or type your search…',
  '3 bed house in Brighton…',
  'apartment with parking under $800k…',
  '2 bedroom near good schools…',
  'beachside home under $2M…',
  'townhouse with a garage…',
];

const FEATURED_PROPERTIES = [
  {
    id: '1', price: '$2,450,000',
    address: '12 Marine Parade',
    suburb: 'Brighton VIC 3186',
    beds: 4, baths: 3, cars: 2,
    tag: 'Featured',
    img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=70',
  },
  {
    id: '2', price: '$875,000',
    address: '7 Smith Street',
    suburb: 'Fitzroy VIC 3065',
    beds: 2, baths: 1, cars: 1,
    tag: 'New',
    img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&q=70',
  },
  {
    id: '3', price: '$3,100,000',
    address: '4 Orrong Road',
    suburb: 'Toorak VIC 3142',
    beds: 5, baths: 4, cars: 3,
    tag: 'Featured',
    img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=70',
  },
  {
    id: '4', price: '$1,250,000',
    address: '22 Acland Street',
    suburb: 'St Kilda VIC 3182',
    beds: 3, baths: 2, cars: 1,
    tag: 'New',
    img: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=400&q=70',
  },
  {
    id: '5', price: '$1,890,000',
    address: '15 Toorak Road',
    suburb: 'South Yarra VIC 3141',
    beds: 4, baths: 3, cars: 2,
    tag: 'Featured',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=70',
  },
  {
    id: '6', price: '$965,000',
    address: '8 Church Street',
    suburb: 'Richmond VIC 3121',
    beds: 3, baths: 2, cars: 1,
    tag: 'New',
    img: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=400&q=70',
  },
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

  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const headlineSlotRef = useRef<HTMLDivElement>(null);

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

  // Rotating headline
  useEffect(() => {
    const t = setInterval(() => {
      setHeadlineIndex(i => (i + 1) % HEADLINE_WORDS.length);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  // Animated placeholder
  useEffect(() => {
    const t = setInterval(() => {
      setPlaceholderVisible(false);
      setTimeout(() => {
        setPlaceholderIndex(i => (i + 1) % SEARCH_PLACEHOLDERS.length);
        setPlaceholderVisible(true);
      }, 300);
    }, 3000);
    return () => clearInterval(t);
  }, []);

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
    <div>
      <TooltipProvider delayDuration={400}>
        {/* ── HERO ── */}
        <div className="relative min-h-[420px] md:min-h-[480px] overflow-hidden flex flex-col">
          {/* Background photo */}
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1400&q=80"
            alt="Australian home"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/95 via-[#0a1628]/75 to-[#0a1628]/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/90 via-transparent to-transparent" />

          {/* Nav */}
          <div className="relative z-10 flex items-center justify-between px-4 md:px-8 py-4">
            <button onClick={() => navigate('/')} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-white text-[10px] font-extrabold tracking-tight">LHQ</span>
              </div>
              <span className="text-white font-bold text-base tracking-tight hidden sm:inline">
                ListHQ
              </span>
            </button>

            <div className="flex bg-white/[0.12] border border-white/15 rounded-full p-1 backdrop-blur-sm">
              <button
                onClick={() => { setListingMode('sale'); window.dispatchEvent(new CustomEvent('listing-mode-changed')); }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  listingMode === 'sale'
                    ? 'bg-white text-[#0a1628]'
                    : 'text-white/65 hover:text-white'
                }`}>For Sale</button>
              <button
                onClick={() => { setListingMode('rent'); window.dispatchEvent(new CustomEvent('listing-mode-changed')); }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  listingMode === 'rent'
                    ? 'bg-white text-[#0a1628]'
                    : 'text-white/65 hover:text-white'
                }`}>For Rent</button>
            </div>

            <div className="flex items-center gap-2 bg-white/[0.08] border border-white/[0.12] rounded-full px-3 py-1.5 backdrop-blur-sm">
              <span className="text-white/65 text-[11px]">AUD $</span>
              <span className="text-white/25 text-[11px]">|</span>
              <span className="text-white/65 text-[11px]">EN</span>
              <span className="text-white/25 text-[11px]">|</span>
              <button
                onClick={() => navigate('/login')}
                className="text-white font-semibold hover:text-white/80 transition-colors text-[11px]">
                Sign in
              </button>
            </div>
          </div>

          {/* Hero content */}
          <div className="relative z-10 flex-1 flex flex-col justify-end px-4 md:px-8 pb-8 md:pb-10">
            {/* Live badge */}
            <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1 mb-4 w-fit backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/80 text-[10px] font-medium">Now live across Australia</span>
            </div>

            {/* Headline */}
            <h1 className="font-display font-extrabold text-white leading-[1.08] tracking-tight mb-3 text-[30px] md:text-[42px]">
              <span className="block">Find your home</span>
              <div ref={headlineSlotRef} className="relative h-[1.15em] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={headlineIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.35 }}
                    className="block"
                    style={{ color: HEADLINE_WORDS[headlineIndex].color }}
                  >
                    {HEADLINE_WORDS[headlineIndex].text}
                  </motion.span>
                </AnimatePresence>
              </div>
            </h1>

            {/* Subline */}
            <p className="text-white/55 text-sm leading-relaxed mb-6 max-w-sm">
              AI voice search across Australia.
              Speak in English, Chinese, Arabic,
              Hindi — or any of 24 languages.
            </p>

            {/* Search card */}
            <div ref={wrapperRef} className="bg-white/[0.97] backdrop-blur-md rounded-2xl p-4 max-w-[500px] border border-white/30 shadow-2xl relative">
              {/* Input row */}
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={isListening ? stopListening : startListening}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                  style={{ background: '#0a1628' }}
                >
                  {voiceState === 'processing' || isSearching
                    ? <Loader2 size={16} className="text-white animate-spin" />
                    : voiceState === 'listening'
                    ? <MicOff size={16} className="text-white" />
                    : <Mic size={16} className="text-white" />}
                </button>

                <div className="flex-1 min-w-0 relative">
                  <div className="relative">
                    {voiceState === 'listening' ? (
                      <span className="text-sm text-gray-500 italic">
                        {transcript || 'Listening… speak now'}
                      </span>
                    ) : textQuery ? (
                      <input
                        type="text"
                        value={textQuery}
                        onChange={e => setTextQuery(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && textQuery.trim()) {
                            suppressAutocompleteRef.current = true;
                            processTranscript(textQuery.trim());
                            setTimeout(() => { suppressAutocompleteRef.current = false; }, 500);
                          }
                        }}
                        className="w-full text-sm text-gray-800 focus:outline-none bg-transparent"
                        autoFocus
                      />
                    ) : (
                      <>
                        <span
                          className="text-sm text-gray-400 transition-opacity duration-300 pointer-events-none"
                          style={{ opacity: placeholderVisible ? 1 : 0 }}
                        >
                          {SEARCH_PLACEHOLDERS[placeholderIndex]}
                        </span>
                        <input
                          type="text"
                          value={textQuery}
                          onChange={e => setTextQuery(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && textQuery.trim()) {
                              suppressAutocompleteRef.current = true;
                              processTranscript(textQuery.trim());
                              setTimeout(() => { suppressAutocompleteRef.current = false; }, 500);
                            }
                          }}
                          className="absolute inset-0 w-full text-sm text-gray-800 focus:outline-none bg-transparent"
                        />
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (textQuery.trim()) {
                      suppressAutocompleteRef.current = true;
                      processTranscript(textQuery.trim());
                      setTimeout(() => { suppressAutocompleteRef.current = false; }, 500);
                    }
                  }}
                  className="text-white text-xs font-bold px-4 py-2 rounded-lg shrink-0 transition-colors hover:opacity-90"
                  style={{ background: '#0a1628' }}
                >
                  Search
                </button>
              </div>

              {/* Divider + bottom row */}
              <div className="border-t border-gray-100 pt-3 flex items-center gap-3 flex-wrap">
                <span className="text-[10px] text-gray-400">Radius</span>
                {[
                  { label: 'Any', value: null as number | null },
                  { label: '5 km', value: 5 },
                  { label: '10 km', value: 10 },
                  { label: '25 km', value: 25 },
                  { label: '50 km', value: 50 },
                ].map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => onRadiusChange?.(opt.value)}
                    className="text-[10px] px-2.5 py-1 rounded-full transition-all font-medium"
                    style={selectedRadius === opt.value
                      ? { background: '#0a1628', color: '#fff', border: 'none' }
                      : { border: '1px solid #e5e7eb', color: '#9ca3af', background: 'transparent' }}
                  >
                    {opt.label}
                  </button>
                ))}
                <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                  <button
                    onClick={() => setShowLangDropdown(!showLangDropdown)}
                    className="text-[10px] px-2.5 py-1 rounded-full transition-all"
                    style={{ border: '1px solid #e5e7eb', color: '#9ca3af' }}
                  >
                    {selectedLangObj.flag} {selectedLangObj.label}
                  </button>
                  <span className="text-[10px] text-gray-400">
                    +{VOICE_LANGUAGES.length - 1}
                  </span>
                </div>
              </div>

              {/* Autocomplete dropdown */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute left-0 right-0 top-full z-50 mt-1 bg-popover border border-border rounded-xl shadow-elevated overflow-y-auto max-h-60"
                  >
                    {suggestions.map(s => (
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

              {/* Language dropdown */}
              <div className="relative">
                {showLangDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLangDropdown(false)} />
                    <div className="absolute left-0 right-0 bottom-full z-50 mb-1 bg-popover border border-border rounded-xl shadow-elevated overflow-y-auto max-h-60">
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
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Filter chips */}
            <div className="mt-3">
              {filterChips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filterChips.map(chip => (
                    <button
                      key={chip.key}
                      onClick={() => removeChip(chip.key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.25)',
                      }}
                    >
                      {chip.label}
                      <X size={12} />
                    </button>
                  ))}
                </div>
              )}
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
          </div>
        </div>

        {/* ── STATS BAR ── */}
        <div className="grid grid-cols-4 border-b border-border bg-background">
          {[
            { num: '24', lbl: 'Languages' },
            { num: 'Live', lbl: 'Exchange rates' },
            { num: 'AI', lbl: 'Voice search' },
            { num: 'Free', lbl: 'To search' },
          ].map((s, i) => (
            <div key={i} className={`py-4 text-center ${i < 3 ? 'border-r border-border' : ''}`}>
              <div className="text-lg font-bold text-foreground">{s.num}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* ── FEATURED LISTINGS ── */}
        <div className="hidden md:block bg-background px-6 pt-5 pb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Featured listings
            </span>
            <span className="text-xs text-primary font-medium cursor-pointer hover:underline">
              View all →
            </span>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: '1.65fr 1fr 1fr', gridTemplateRows: 'auto auto' }}>
            {/* Large hero card — spans 2 rows */}
            <div className="row-span-2 relative rounded-2xl overflow-hidden cursor-pointer group" style={{ minHeight: '280px' }}>
              <img src={FEATURED_PROPERTIES[0].img} alt={FEATURED_PROPERTIES[0].address} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0" style={{background: 'linear-gradient(180deg,transparent 30%,rgba(0,0,0,0.72) 100%)'}} />
              <span className="absolute top-3 left-3 text-[9px] font-bold px-2.5 py-1 rounded-full text-white" style={{background: 'rgba(10,22,40,0.82)'}}>
                {FEATURED_PROPERTIES[0].tag}
              </span>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="text-white font-extrabold text-lg leading-tight mb-0.5" style={{textShadow: '0 1px 6px rgba(0,0,0,0.4)'}}>
                  {FEATURED_PROPERTIES[0].price}
                </div>
                <div className="text-white/90 text-xs font-semibold mb-0.5">{FEATURED_PROPERTIES[0].address}</div>
                <div className="text-white/60 text-[10px] mb-2">{FEATURED_PROPERTIES[0].suburb}</div>
                <div className="flex gap-2 text-[10px] text-white/70">
                  <span>{FEATURED_PROPERTIES[0].beds} bed</span>
                  <span className="text-white/30">·</span>
                  <span>{FEATURED_PROPERTIES[0].baths} bath</span>
                  <span className="text-white/30">·</span>
                  <span>{FEATURED_PROPERTIES[0].cars} car</span>
                </div>
              </div>
            </div>
            {/* Top right card */}
            <div className="relative rounded-2xl overflow-hidden cursor-pointer group" style={{ height: '134px' }}>
              <img src={FEATURED_PROPERTIES[1].img} alt={FEATURED_PROPERTIES[1].address} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0" style={{background: 'linear-gradient(180deg,transparent 25%,rgba(0,0,0,0.65) 100%)'}} />
              <span className="absolute top-2.5 left-2.5 text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{background: 'rgba(10,22,40,0.82)'}}>
                {FEATURED_PROPERTIES[1].tag}
              </span>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="text-white font-bold text-sm leading-tight">{FEATURED_PROPERTIES[1].price}</div>
                <div className="text-white/70 text-[10px] mt-0.5">{FEATURED_PROPERTIES[1].suburb}</div>
              </div>
            </div>
            {/* Top far-right card */}
            <div className="relative rounded-2xl overflow-hidden cursor-pointer group" style={{ height: '134px' }}>
              <img src={FEATURED_PROPERTIES[2].img} alt={FEATURED_PROPERTIES[2].address} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0" style={{background: 'linear-gradient(180deg,transparent 25%,rgba(0,0,0,0.65) 100%)'}} />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="text-white font-bold text-sm leading-tight">{FEATURED_PROPERTIES[2].price}</div>
                <div className="text-white/70 text-[10px] mt-0.5">{FEATURED_PROPERTIES[2].suburb}</div>
              </div>
            </div>
            {/* Bottom right card */}
            <div className="relative rounded-2xl overflow-hidden cursor-pointer group" style={{ height: '134px' }}>
              <img src={FEATURED_PROPERTIES[3].img} alt={FEATURED_PROPERTIES[3].address} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0" style={{background: 'linear-gradient(180deg,transparent 25%,rgba(0,0,0,0.65) 100%)'}} />
              <span className="absolute top-2.5 left-2.5 text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{background: 'rgba(10,22,40,0.82)'}}>
                {FEATURED_PROPERTIES[3].tag}
              </span>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="text-white font-bold text-sm leading-tight">{FEATURED_PROPERTIES[3].price}</div>
                <div className="text-white/70 text-[10px] mt-0.5">{FEATURED_PROPERTIES[3].suburb}</div>
              </div>
            </div>
            {/* Bottom far-right card */}
            <div className="relative rounded-2xl overflow-hidden cursor-pointer group" style={{ height: '134px' }}>
              <img src={FEATURED_PROPERTIES[4].img} alt={FEATURED_PROPERTIES[4].address} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0" style={{background: 'linear-gradient(180deg,transparent 25%,rgba(0,0,0,0.65) 100%)'}} />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="text-white font-bold text-sm leading-tight">{FEATURED_PROPERTIES[4].price}</div>
                <div className="text-white/70 text-[10px] mt-0.5">{FEATURED_PROPERTIES[4].suburb}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <VoiceSearchHistory onRerun={onSearch} />
        </div>
      </TooltipProvider>

      {/* Blink keyframe */}
      <style>{`
        @keyframes blink {
          0%,100%{opacity:1}
          50%{opacity:0}
        }
        @keyframes scrollLeft {
          0%{transform:translateX(0)}
          100%{transform:translateX(-50%)}
        }
      `}</style>
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
