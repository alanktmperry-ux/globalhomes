import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Search, Loader2, X, ChevronDown, MapPin } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { SoundWaveVisualizer } from './SoundWaveVisualizer';
import { parsePropertyQuery, filtersToChips } from '@/features/search/lib/parsePropertyQuery';
import { useToast } from '@/shared/hooks/use-toast';
import { autocomplete, getPlaceDetails } from '@/shared/lib/googleMapsService';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { useI18n } from '@/shared/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

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

  // ── Dynamic featured listings ──
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredFallback, setFeaturedFallback] = useState(false);
  const userLocationRef = useRef<{lat:number;lng:number} | null>(null);

  const fetchFeatured = useCallback(async (lat?: number, lng?: number) => {
    setFeaturedLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-featured-listings', {
        body: { lat, lng, radius_km: 100 },
      });
      if (error || !data) throw error;
      if (data.fallback || !data.featured?.length) {
        setFeaturedFallback(true);
        setFeaturedListings([]);
      } else {
        setFeaturedFallback(false);
        setFeaturedListings(data.featured);
      }
    } catch {
      setFeaturedFallback(true);
      setFeaturedListings([]);
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  // Fetch featured on mount with optional geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userLocationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          fetchFeatured(pos.coords.latitude, pos.coords.longitude);
        },
        () => { fetchFeatured(); },
        { timeout: 5000, maximumAge: 300000 }
      );
    } else {
      fetchFeatured();
    }
  }, [fetchFeatured]);

  // Re-fetch featured when search location changes
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.lat && e.detail?.lng) {
        fetchFeatured(e.detail.lat, e.detail.lng);
      }
    };
    window.addEventListener('search-location-confirmed', handler);
    return () => window.removeEventListener('search-location-confirmed', handler);
  }, [fetchFeatured]);

  const displayFeatured = featuredFallback || featuredListings.length === 0
    ? FEATURED_PROPERTIES
    : featuredListings.map((p: any) => ({
        id: p.id,
        price: p.price_formatted,
        address: p.address,
        suburb: `${p.suburb} ${p.state || ''}`.trim(),
        beds: p.beds,
        baths: p.baths,
        cars: p.parking,
        tag: p.boost_tier === 'premier' ? 'Premier' : 'Featured',
        img: p.image_url || p.images?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=70',
      }));

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

    // Parse filters and set chips from the text
    const filters = parsePropertyQuery(suggestion.description);
    const chips = filtersToChips(filters);
    setFilterChips(chips);
    setEditableTranscript(suggestion.description);
    setVoiceState('processing');

    // Trigger the search
    onSearch(suggestion.description);

    // Use place_id for accurate coordinates — skip geocodeLocation to avoid double call
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

      {/* ── NAV ── */}
      <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-border bg-background">
        <button onClick={() => navigate('/')} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center">
            <span className="text-background text-[9px] font-extrabold tracking-tight">LHQ</span>
          </div>
          <span className="text-foreground font-bold text-sm tracking-tight hidden sm:inline">
            ListHQ
          </span>
        </button>

        <div className="flex items-center gap-6 text-[12px] text-muted-foreground">
          <button
            onClick={() => {
              setListingMode('sale');
              window.dispatchEvent(new CustomEvent('listing-mode-changed'));
            }}
            className={`transition-colors ${
              listingMode === 'sale'
                ? 'text-foreground font-semibold'
                : 'hover:text-foreground'
            }`}>
            For Sale
          </button>
          <button
            onClick={() => {
              setListingMode('rent');
              window.dispatchEvent(new CustomEvent('listing-mode-changed'));
            }}
            className={`transition-colors ${
              listingMode === 'rent'
                ? 'text-foreground font-semibold'
                : 'hover:text-foreground'
            }`}>
            For Rent
          </button>
        </div>

        <button onClick={() => navigate('/login')} className="text-[12px] font-bold text-foreground">
          Sign in →
        </button>
      </div>

      {/* ── HERO SPLIT ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[520px] md:min-h-[560px]">

        {/* LEFT — Headline + search */}
        <div className="flex flex-col justify-between px-5 md:px-10 py-8 md:py-14 bg-background">

          {/* Counter */}
          <div className="mb-6">
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase font-medium">
              01 / 06 · Featured
            </span>
          </div>

          {/* Stacked headline */}
          <div className="mb-6">
            <h1 className="font-display text-[38px] md:text-[52px] font-extrabold leading-[1.05] tracking-tight text-foreground">
              Find
            </h1>

            {/* Rotating gradient line */}
            <div className="h-[1.15em] overflow-hidden text-[38px] md:text-[52px] font-display font-extrabold leading-[1.05]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={headlineIndex}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.35 }}
                  className="block"
                  style={{ color: HEADLINE_WORDS[headlineIndex].color }}
                >
                  {HEADLINE_WORDS[headlineIndex].text}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Ghost third line */}
            <div className="text-[30px] md:text-[42px] font-extrabold leading-[1.05] text-muted-foreground/15 select-none" aria-hidden="true">
              In any language.
            </div>
          </div>

          {/* Rule + subline + search */}
          <div className="max-w-md">

            <div className="w-10 h-[2px] bg-foreground/20 mb-5" />

            <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
              AI voice search across Australia.
              Speak in English, Chinese, Arabic,
              Hindi — or any of 24 languages.
              Live exchange rates for overseas
              buyers.
            </p>

            {/* Search bar */}
            <div ref={wrapperRef} className="flex items-center gap-3 border-b border-border pb-3 mb-3 relative">

              <button
                onClick={isListening ? stopListening : startListening}
                className="shrink-0"
              >
                {voiceState === 'processing' || isSearching
                  ? <Loader2 size={16} className="text-muted-foreground animate-spin" />
                  : voiceState === 'listening'
                  ? <MicOff size={16} className="text-foreground" />
                  : <Mic size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
                }
              </button>

              <div className="flex-1 min-w-0 relative">
                {voiceState === 'listening' ? (
                  <span className="text-[12px] text-muted-foreground italic">
                    {transcript || 'Listening… speak now'}
                  </span>
                ) : (
                  <div className="relative">
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
                      className="w-full text-[12px] text-foreground bg-transparent focus:outline-none relative z-10"
                      placeholder=""
                    />
                    {!textQuery && (
                      <span
                        className="absolute inset-0 text-[12px] text-muted-foreground pointer-events-none flex items-center transition-opacity duration-300"
                        style={{ opacity: placeholderVisible ? 1 : 0 }}
                      >
                        {SEARCH_PLACEHOLDERS[placeholderIndex]}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (textQuery.trim()) {
                    suppressAutocompleteRef.current = true;
                    processTranscript(textQuery.trim());
                    setTimeout(() => { suppressAutocompleteRef.current = false; }, 500);
                  }
                }}
                className="text-[11px] font-bold text-foreground hover:opacity-70 transition-opacity whitespace-nowrap flex-shrink-0">
                Search →
              </button>

              {/* Autocomplete */}
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
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-[13px] text-foreground hover:bg-accent transition-colors"
                        >
                          <MapPin size={14} className="text-muted-foreground shrink-0" />
                          <span className="truncate">{s.description}</span>
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            {/* Radius row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground mr-1">
                Radius
              </span>
              {[
                { label: 'Any',   value: null as number | null },
                { label: '5 km',  value: 5 },
                { label: '10 km', value: 10 },
                { label: '25 km', value: 25 },
                { label: '50 km', value: 50 },
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => onRadiusChange?.(opt.value)}
                  className={`text-[10px] px-2.5 py-1 rounded-full transition-all font-medium ${
                    selectedRadius === opt.value
                      ? 'bg-foreground text-background'
                      : 'border border-border text-muted-foreground hover:border-foreground/40'
                  }`}>
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="text-[10px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-foreground/40 transition-all ml-auto">
                {selectedLangObj.flag}{' '}{selectedLangObj.label}
              </button>
            </div>

            {/* Language dropdown */}
            <div className="relative">
              {showLangDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLangDropdown(false)} />
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 bg-popover border border-border rounded-xl shadow-elevated overflow-y-auto max-h-60">
                    {VOICE_LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => { setSelectedLang(lang.code); setShowLangDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-[12px] transition-colors ${
                          lang.code === selectedLang
                            ? 'bg-accent text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}>
                        {lang.flag} {lang.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Filter chips */}
            <div className="mt-3">
              {filterChips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filterChips.map(chip => (
                    <button
                      key={chip.key}
                      onClick={() => removeChip(chip.key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground transition-colors">
                      {chip.label}
                      <X size={12} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Voice state feedback */}
            <div className="mt-3">
              {voiceState === 'listening' && (
                <div className="mt-1">
                  <SoundWaveVisualizer isActive />
                </div>
              )}
              {(voiceState === 'processing' || isSearching) && (
                <p className="text-muted-foreground text-[12px] font-medium flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Searching across Australia…
                </p>
              )}
              {voiceState === 'results' && !isSearching && resultCount !== undefined && (
                <p className="text-primary text-[12px] font-medium">
                  Found {resultCount} properties
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Photo grid */}
        <div className="hidden md:grid grid-rows-[1.6fr_1fr] gap-1.5 bg-background border-l border-border">

          {/* Top large photo */}
          <div className="relative rounded-2xl overflow-hidden group cursor-pointer">
            {featuredLoading ? (
              <Skeleton className="absolute inset-0 w-full h-full" />
            ) : (
              <img src={displayFeatured[0]?.img} alt={displayFeatured[0]?.address} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            )}
            <div className="absolute inset-0" style={{background: 'linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.7) 100%)'}} />

            <div className="absolute top-3 left-3">
              <span className="text-[9px] font-bold px-2.5 py-1 rounded-full text-white bg-foreground/80 backdrop-blur-sm">
                {displayFeatured[0]?.tag}
              </span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="text-white font-extrabold text-lg leading-tight">
                {displayFeatured[0]?.price}
              </div>
              <div className="text-white/75 text-[11px] mt-0.5">
                {displayFeatured[0]?.address}
                {' · '}
                {displayFeatured[0]?.suburb}
              </div>
            </div>
          </div>

          {/* Bottom two photos side by side */}
          <div className="grid grid-cols-2 gap-2">
            {[1, 2].map(i => (
              <div key={i} className="relative rounded-2xl overflow-hidden group cursor-pointer">
                {featuredLoading ? (
                  <Skeleton className="absolute inset-0 w-full h-full" />
                ) : (
                  <img src={displayFeatured[i]?.img} alt={displayFeatured[i]?.address} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                )}
                <div className="absolute inset-0" style={{background: 'linear-gradient(180deg,transparent 30%,rgba(0,0,0,0.65) 100%)'}} />

                <div className="absolute top-2.5 left-2.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white bg-foreground/80 backdrop-blur-sm">
                    {displayFeatured[i]?.tag}
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="text-white font-bold text-sm leading-tight">
                    {displayFeatured[i]?.price}
                  </div>
                  <div className="text-white/65 text-[10px] mt-0.5">
                    {displayFeatured[i]?.suburb}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="hidden md:grid grid-cols-4 border-y border-border bg-background">
        {[
          { num: '24',  lbl: 'Languages' },
          { num: 'Live',lbl: 'Exchange rates' },
          { num: 'AI',  lbl: 'Voice search' },
          { num: 'Free',lbl: 'To search' },
        ].map((s, i) => (
          <div key={i} className={`py-4 text-center ${i < 3 ? 'border-r border-border' : ''}`}>
            <div className="text-lg font-bold text-foreground">
              {s.num}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {s.lbl}
            </div>
          </div>
        ))}
      </div>

      {/* ── FEATURED MASONRY ── */}
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

          {/* Large hero card */}
          <div className="row-span-2 relative rounded-2xl overflow-hidden cursor-pointer group" style={{ minHeight: '280px' }}>
            {featuredLoading ? (
              <Skeleton className="absolute inset-0 w-full h-full" />
            ) : (
              <img src={displayFeatured[3 % displayFeatured.length]?.img} alt={displayFeatured[3 % displayFeatured.length]?.address} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            )}
            <div className="absolute inset-0" style={{background: 'linear-gradient(180deg,transparent 30%,rgba(0,0,0,0.72) 100%)'}} />
            <span className="absolute top-3 left-3 text-[9px] font-bold px-2.5 py-1 rounded-full text-white bg-foreground/80">
              {displayFeatured[3 % displayFeatured.length]?.tag}
            </span>
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="text-white font-extrabold text-lg leading-tight mb-0.5" style={{textShadow: '0 1px 6px rgba(0,0,0,0.4)'}}>
                {displayFeatured[3 % displayFeatured.length]?.price}
              </div>
              <div className="text-white/90 text-xs font-semibold mb-0.5">
                {displayFeatured[3 % displayFeatured.length]?.address}
              </div>
              <div className="text-white/60 text-[10px] mb-2">
                {displayFeatured[3 % displayFeatured.length]?.suburb}
              </div>
              <div className="flex gap-2 text-[10px] text-white/70">
                <span>
                  {displayFeatured[3 % displayFeatured.length]?.beds} bed
                </span>
                <span className="text-white/30">
                  ·
                </span>
                <span>
                  {displayFeatured[3 % displayFeatured.length]?.baths}
                  {' bath'}
                </span>
                <span className="text-white/30">
                  ·
                </span>
                <span>
                  {displayFeatured[3 % displayFeatured.length]?.cars}
                  {' car'}
                </span>
              </div>
            </div>
          </div>

          {/* Four smaller cards */}
          {[4, 5, 0, 1].map((pi, i) => {
            const idx = pi % displayFeatured.length;
            return (
              <div key={i} className="relative rounded-2xl overflow-hidden cursor-pointer group" style={{ height: '134px' }}>
                {featuredLoading ? (
                  <Skeleton className="absolute inset-0 w-full h-full" />
                ) : (
                  <img src={displayFeatured[idx]?.img} alt={displayFeatured[idx]?.address} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
                <div className="absolute inset-0" style={{background: 'linear-gradient(180deg,transparent 25%,rgba(0,0,0,0.65) 100%)'}} />
                {displayFeatured[idx]?.tag && (
                  <span className="absolute top-2 left-2 text-[8px] font-bold px-2 py-0.5 rounded-full text-white bg-foreground/80 backdrop-blur-sm">
                    {displayFeatured[idx].tag}
                  </span>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="text-white font-bold text-sm leading-tight">
                    {displayFeatured[idx]?.price}
                  </div>
                  <div className="text-white/70 text-[10px] mt-0.5">
                    {displayFeatured[idx]?.suburb}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search history */}
      <div className="px-4 pb-4">
        <VoiceSearchHistory onRerun={onSearch} />
      </div>

      </TooltipProvider>

      <style>{`
        @keyframes blink {
          0%,100%{opacity:1}
          50%{opacity:0}
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
