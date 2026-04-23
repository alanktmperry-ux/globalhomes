import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Search, Loader2, X, ChevronDown, MapPin, SlidersHorizontal } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { SoundWaveVisualizer } from './SoundWaveVisualizer';
import { parsePropertyQuery, filtersToChips } from '@/features/search/lib/parsePropertyQuery';
import { useToast } from '@/shared/hooks/use-toast';
import { autocomplete, getPlaceDetails } from '@/shared/lib/googleMapsService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
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

const VOICE_LANG_TO_I18N: Record<string, string> = {
  'en-AU': 'en', 'en-US': 'en',
  'en-GB': 'en', 'zh-CN': 'zh',
  'zh-TW': 'zh', 'ko-KR': 'ko',
  'ms-MY': 'ms', 'es-ES': 'es',
  'es-MX': 'es', 'ar-SA': 'ar',
  'hi-IN': 'hi', 'fr-FR': 'fr',
  'pt-BR': 'pt', 'pt-PT': 'pt',
  'ru-RU': 'ru', 'ja-JP': 'ja',
  'de-DE': 'en', 'it-IT': 'en',
  'th-TH': 'en', 'vi-VN': 'en',
  'tr-TR': 'en', 'pl-PL': 'en',
  'bn-BD': 'bn',
};

const ROTATING_LANGUAGES = [
  '🇺🇸 English', '🇪🇸 Español', '🇨🇳 中文', '🇦🇪 العربية', '🇮🇳 हिंदी',
  '🇫🇷 Français', '🇯🇵 日本語', '🇩🇪 Deutsch', '🇮🇹 Italiano', '🇵🇹 Português',
  '🇷🇺 Русский', '🇰🇷 한국어', '🇹🇭 ไทย', '🇻🇳 Tiếng Việt', '🇹🇷 Türkçe',
  '🇵🇱 Polski', '🇳🇱 Nederlands', '🇸🇪 Svenska', '🇬🇷 Ελληνικά', '🇮🇩 Bahasa Indonesia',
];

const HEADLINE_WORDS = [
  
  { text: 'in Chinese.',      color: '#38bdf8' },
  { text: 'in Arabic.',       color: '#34d399' },
  { text: 'in Hindi.',        color: '#fbbf24' },
  { text: 'in Spanish.',      color: '#f472b6' },
  { text: 'in Japanese.',     color: '#818cf8' },
];

const SEARCH_PLACEHOLDERS_BY_LANG: Record<string, string[]> = {
  'en-AU': [
    'e.g. 3 bed house in Doncaster under $1.3M',
    'e.g. apartment in Melbourne CBD under $600k',
    'e.g. rental unit near the city under $500pw',
    'e.g. townhouse in Brisbane with 2 bathrooms',
    'e.g. house in Sydney near good schools under $900k',
    'e.g. land for sale in regional Victoria',
    'e.g. 4 bed family home in Perth with a pool',
  ],
  'en-US': [
    'e.g. 3 bed house in Doncaster under $1.3M',
    'e.g. apartment in Melbourne CBD under $600k',
    'e.g. rental unit near the city under $500pw',
    'e.g. townhouse in Brisbane with 2 bathrooms',
  ],
  'en-GB': ['e.g. 3 bed house in Brighton under $800k', 'e.g. apartment with parking under $600k'],
  'zh-CN': ['例如: 布莱顿3卧室房屋…', '例如: 80万以下带车位公寓…', '例如: 靠近好学校的2卧室…'],
  'zh-TW': ['例如: 布萊頓3臥室房屋…', '例如: 80萬以下帶車位公寓…'],
  'ar-SA': ['مثال: منزل 3 غرف في برايتون…', 'مثال: شقة بموقف بأقل من 800k…'],
  'hi-IN': ['उदा: ब्राइटन में 3 BHK घर…', 'उदा: 800k से कम पार्किंग वाला अपार्टमेंट…'],
  'es-ES': ['ej. casa de 3 hab en Brighton…', 'ej. piso con garaje bajo 800k…'],
  'es-MX': ['ej. casa de 3 rec en Brighton…', 'ej. depto con estac. bajo 800k…'],
  'fr-FR': ['ex. maison 3 ch à Brighton…', 'ex. appt avec parking sous 800k…'],
  'de-DE': ['z.B. 3-Zi-Haus in Brighton…', 'z.B. Wohnung mit Stellplatz < 800k…'],
  'ja-JP': ['例: ブライトンの3LDK…', '例: 駐車場付きマンション80万以下…'],
  'it-IT': ['es. casa 3 cam a Brighton…', 'es. appart con parcheggio < 800k…'],
  'pt-BR': ['ex. casa 3 quartos em Brighton…', 'ex. apto com vaga abaixo de 800k…'],
  'ru-RU': ['напр. 3-комн дом в Брайтоне…', 'напр. квартира с парковкой до 800k…'],
  'ko-KR': ['예: 브라이턴 3베드 주택…', '예: 주차 포함 아파트 80만 이하…'],
  'th-TH': ['เช่น บ้าน 3 ห้องในไบรตัน…', 'เช่น คอนโดมีที่จอดรถต่ำ 800k…'],
  'vi-VN': ['VD: nhà 3 phòng ở Brighton…', 'VD: căn hộ đỗ xe dưới 800k…'],
  'tr-TR': ['örn. Brighton 3 yatak oda…', 'örn. 800k altı garajlı daire…'],
  'pl-PL': ['np. dom 3-pok w Brighton…', 'np. mieszkanie z parkingiem < 800k…'],
  'nl-NL': ['bijv. 3-kamer woning Brighton…', 'bijv. appt met parkeren < 800k…'],
  'sv-SE': ['t.ex. 3-rumsbostad Brighton…', 't.ex. lägen med parkering < 800k…'],
  'el-GR': ['π.χ. σπίτι 3 δωμ Brighton…', 'π.χ. διαμ με parking < 800k…'],
  'id-ID': ['cth. rumah 3 kamar Brighton…', 'cth. apartemen parkir < 800k…'],
};
const getPlaceholders = (lang: string) =>
  SEARCH_PLACEHOLDERS_BY_LANG[lang] || SEARCH_PLACEHOLDERS_BY_LANG['en-AU'];

const EXAMPLE_CHIPS = [
  { label: '🏠 House in Doncaster', query: 'house in Doncaster Victoria' },
  { label: '🏢 Apartment Sydney CBD', query: 'apartment in Sydney CBD under $800k' },
  { label: '🔑 Rentals under $500pw', query: 'rental property under $500 per week Melbourne' },
  { label: '🌿 4 bed family home', query: '4 bedroom family home under $1.2M' },
  { label: '🏗️ Land for sale', query: 'land for sale Victoria' },
  { label: 'Office in Sydney CBD', query: 'office in Sydney CBD' },
  { label: 'Warehouse Melbourne', query: 'warehouse in Melbourne' },
  { label: 'Land Gold Coast', query: 'vacant land Gold Coast' },
  { label: 'Retail shop Brisbane', query: 'retail shop in Brisbane' },
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
  const [showTextInput, setShowTextInput] = useState(true);
  const [textQuery, setTextQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState('en-AU');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [filterChips, setFilterChips] = useState<{ label: string; key: string }[]>([]);
  const [rotatingIndex, setRotatingIndex] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const suppressAutocompleteRef = useRef(false);
  // Refs mirror state so callbacks never capture stale values
  const voiceStateRef = useRef<VoiceState>('idle');
  const transcriptRef = useRef('');
  const syncVoiceState = (s: VoiceState) => { voiceStateRef.current = s; setVoiceState(s); };
  const syncTranscript = (t: string) => { transcriptRef.current = t; setTranscript(t); };
  const { toast } = useToast();
  const navigate = useNavigate();
  const { listingMode, setListingMode } = useCurrency();
  const { user, isAgent } = useAuth();
  const { t, language, setLanguage } = useI18n();

  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const headlineSlotRef = useRef<HTMLDivElement>(null);

  const isListening = voiceState === 'listening';

  // Sync dropdown to current i18n language on mount
  useEffect(() => {
    const match = VOICE_LANGUAGES.find(
      l => VOICE_LANG_TO_I18N[l.code] === language
    );
    if (match) {
      setSelectedLang(match.code);
    }
  }, []);

  // ── Dynamic featured listings ──
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredFallback, setFeaturedFallback] = useState(false);
  const userLocationRef = useRef<{lat:number;lng:number} | null>(null);

  const fetchFeatured = useCallback(async (lat?: number, lng?: number, mode?: 'sale' | 'rent') => {
    setFeaturedLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-featured-listings', {
        body: { lat, lng, radius_km: 100, listing_type: mode ?? listingMode },
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

  // Re-fetch featured listings whenever sale/rent mode changes
  useEffect(() => {
    fetchFeatured(
      userLocationRef.current?.lat,
      userLocationRef.current?.lng,
      listingMode,
    );
  }, [listingMode]);

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

  const displayFeatured = featuredListings.length > 0
    ? featuredListings.map((p: any) => ({
        id: p.id,
        agent_id: p.agent_id,
        price: p.price_formatted,
        address: p.address,
        suburb: `${p.suburb} ${p.state || ''}`.trim(),
        beds: p.beds,
        baths: p.baths,
        cars: p.parking,
        tag: p.boost_tier === 'premier' ? 'Premier' : 'Featured',
        img: p.image_url || p.images?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=70',
      }))
    : [];

  // One listing per agent maximum
  const seenAgents = new Set<string>();
  const dedupedFeatured = displayFeatured.filter((p: any) => {
    const agentId = p.agent_id || p.id;
    if (seenAgents.has(agentId)) return false;
    seenAgents.add(agentId);
    return true;
  });

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

  // Show confirmation text when processing
  useEffect(() => {
    if (voiceState === 'processing' && transcript) {
      syncTranscript(`Got it — searching for "${transcript}"`);  
    }
  }, [voiceState]);

  // Update state when external search completes
  useEffect(() => {
    if (!isSearching && voiceState === 'processing') {
      syncVoiceState(resultCount !== undefined ? 'results' : 'idle');
    }
  }, [isSearching, resultCount, voiceState]);

  // Rotating headline
  useEffect(() => {
    const t = setInterval(() => {
      setHeadlineIndex(i => (i + 1) % HEADLINE_WORDS.length);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  // Animated placeholder — rotate every 3.5s with fade
  useEffect(() => {
    const t = setInterval(() => {
      setPlaceholderVisible(false);
      setTimeout(() => {
        setPlaceholderIndex(i => i + 1);
        setPlaceholderVisible(true);
      }, 400);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  const [showRefine, setShowRefine] = useState(false);

  const geocodeLocation = useCallback(async (text: string) => {
    if (!onLocationSelect) return;
    try {
      const { geocode } = await import('@/lib/googleMapsService');
      const filters = parsePropertyQuery(text);
      const locationQuery = filters.location || text;
      const location = await geocode(locationQuery);
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

  const processTranscript = useCallback((text: string, serverParsedQuery?: Record<string, unknown>) => {
    const filters = serverParsedQuery
      ? {
          location: serverParsedQuery.location as string | undefined,
          priceMin: serverParsedQuery.price_min as number | undefined,
          priceMax: serverParsedQuery.price_max as number | undefined,
          propertyType: serverParsedQuery.property_type as string | undefined,
          beds: serverParsedQuery.bedrooms as number | undefined,
          features: (serverParsedQuery.features as string[]) || [],
          intent: serverParsedQuery.transaction_type as 'sale' | 'rent' | undefined,
        }
      : parsePropertyQuery(text);

    const chips = filtersToChips(filters);
    setFilterChips(chips);
    setEditableTranscript(text);
    const searchLocation = filters.location || text;
    setTextQuery(searchLocation);
    syncVoiceState('processing');

    const params = new URLSearchParams();
    if (searchLocation) params.set('q', searchLocation);
    if (filters.beds) params.set('beds', String(filters.beds));
    if (filters.priceMin) params.set('priceMin', String(filters.priceMin));
    if (filters.priceMax) params.set('priceMax', String(filters.priceMax));
    if (filters.propertyType) params.set('type', filters.propertyType);
    if (filters.intent === 'rent') {
      navigate(`/rent?${params.toString()}`);
    } else {
      navigate(`/buy?${params.toString()}`);
    }

    onSearch(searchLocation);
    geocodeLocation(searchLocation);

    // Fire-and-forget: log to voice_searches so the AI Buyer Concierge trigger fires
    supabase
      .from('voice_searches')
      .insert({
        transcript: text,
        user_id: user?.id ?? null,
        detected_language: selectedLang,
        status: 'completed',
      })
      .then(({ error }) => {
        if (error) console.warn('[VoiceSearch] Failed to log search:', error.message);
      });
  }, [onSearch, geocodeLocation, navigate, user?.id, selectedLang]);

  const startRecording = useCallback(async () => {
    if (isRecording) {
      // Stop current recording
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.stop();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))
        ? 'audio/webm;codecs=opus'
        : (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4'))
        ? 'audio/mp4'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });

        if (blob.size < 1000) {
          setIsRecording(false);
          syncVoiceState('idle');
          syncTranscript('');
          toast({ title: "🎙️ I didn't catch that", description: 'Please try again and speak clearly.' });
          return;
        }

        setIsProcessing(true);
        syncVoiceState('processing');
        syncTranscript('Transcribing...');

        try {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
          });

          const { data, error } = await supabase.functions.invoke('voice-search', {
            body: { audio: base64, mimeType },
          });

          if (error) throw error;

          if (data?.success && data.transcript) {
            syncTranscript(data.transcript);
            setTextQuery(data.transcript);
            processTranscript(data.transcript, data.parsedQuery);
          } else if (data?.error) {
            toast({ title: '🎙️ Voice Error', description: data.error, variant: 'destructive' });
            syncVoiceState('idle');
            syncTranscript('');
          } else {
            toast({ title: "🎙️ I didn't catch that", description: 'No speech detected. Please try again.' });
            syncVoiceState('idle');
            syncTranscript('');
          }
        } catch (err) {
          console.error('Voice search error:', err);
          toast({ title: '🎙️ Voice Error', description: 'Voice search failed. Please try again.', variant: 'destructive' });
          syncVoiceState('idle');
          syncTranscript('');
        } finally {
          setIsProcessing(false);
          setIsRecording(false);
        }
      };

      recorder.start(250);
      recorderRef.current = recorder;
      setIsRecording(true);
      syncVoiceState('listening');
      syncTranscript('');
      setConfidence(null);
      setFilterChips([]);
      setPermissionDenied(false);

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          recorderRef.current.stop();
        }
      }, 10000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        toast({ title: '🎙️ Microphone Access Denied', description: 'Please enable microphone access in your browser settings.', variant: 'destructive' });
      } else {
        toast({ title: '🎙️ Voice Unavailable', description: 'Could not start voice search. Please type your search instead.', variant: 'destructive' });
      }
    }
  }, [isRecording, processTranscript, toast]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

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
    syncVoiceState('processing');

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

      {/* ── HERO SPLIT ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[480px] md:min-h-[520px]">

        {/* LEFT — Headline + search */}
        <div className="flex flex-col justify-center items-center md:items-start px-6 md:px-10 py-12 md:py-14 bg-background">

          {/* Headline — compact */}
          <div className="mb-6">
            <h1 className="font-display text-[36px] md:text-[48px] font-extrabold leading-[1.05] tracking-tight text-foreground">
              Home.
            </h1>
            <div className="h-[1.1em] overflow-hidden text-[36px] md:text-[48px] font-display font-extrabold leading-[1.05]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={headlineIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="block"
                  style={{ color: HEADLINE_WORDS[headlineIndex].color }}
                >
                  {HEADLINE_WORDS[headlineIndex].text}
                </motion.span>
              </AnimatePresence>
            </div>
            <p className="text-[13px] text-muted-foreground mt-3 leading-relaxed max-w-sm">
              Australia's only property platform built for the world.
              Search in 24 languages, see prices in your currency.
            </p>
          </div>

          {/* ── SEARCH BOX — Bigger, smarter ── */}
          <div className="max-w-[760px] w-full space-y-4">

            {/* Main search bar — tall and prominent */}
            <div ref={wrapperRef} className="relative">
              <div className={`flex items-center gap-3 bg-card border-2 rounded-2xl px-4 sm:px-5 py-4 shadow-md transition-all duration-200 ${
                voiceState === 'listening'
                  ? 'border-destructive/50 shadow-destructive/10'
                  : 'border-border hover:border-primary/40 focus-within:border-primary focus-within:shadow-lg focus-within:shadow-primary/10'
              }`}>

                {/* Mic button */}
                <button
                  onClick={() => startRecording()}
                  disabled={isProcessing}
                  className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    isRecording
                      ? 'bg-destructive/10 text-destructive animate-pulse ring-2 ring-destructive/30'
                      : isProcessing
                      ? 'bg-secondary text-muted-foreground cursor-wait'
                      : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                  title={isRecording ? 'Stop recording' : isProcessing ? 'Transcribing...' : 'Voice search'}
                >
                  {isProcessing || isSearching
                    ? <Loader2 size={18} className="animate-spin" />
                    : isRecording
                    ? <MicOff size={18} />
                    : <Mic size={18} />
                  }
                </button>

                {/* Text input */}
                <div className="flex-1 min-w-0 relative">
                  {voiceState === 'listening' ? (
                    <span className="text-[15px] text-muted-foreground italic">
                      {transcript || ({
                      'zh-CN': '正在聆听…请说话', 'zh-TW': '正在聆聽…請說話',
                      'ar-SA': 'جارِ الاستماع…', 'hi-IN': 'सुन रहा हूँ…',
                      'es-ES': 'Escuchando…', 'es-MX': 'Escuchando…',
                      'fr-FR': 'Écoute en cours…', 'de-DE': 'Ich höre zu…',
                      'ja-JP': '聞いています…', 'ru-RU': 'Слушаю…',
                      'ko-KR': '듣고 있어요…', 'it-IT': 'In ascolto…',
                      'pt-BR': 'Ouvindo…', 'th-TH': 'กำลังฟัง…',
                      'vi-VN': 'Đang nghe…', 'tr-TR': 'Dinliyorum…',
                    } as Record<string, string>)[selectedLang] || 'Listening… speak now'}
                    </span>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        data-voice-fallback
                        value={textQuery}
                        onChange={e => setTextQuery(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && textQuery.trim()) {
                            suppressAutocompleteRef.current = true;
                            processTranscript(textQuery.trim());
                            setTimeout(() => { suppressAutocompleteRef.current = false; }, 500);
                          }
                        }}
                        autoFocus
                        className="w-full text-[16px] md:text-[17px] text-foreground bg-transparent focus:outline-none relative z-10"
                        placeholder=" "
                      />
                      {!textQuery && (
                        <span
                          className="absolute inset-0 text-[16px] md:text-[17px] text-muted-foreground/60 pointer-events-none flex items-center transition-opacity duration-400"
                          style={{ opacity: placeholderVisible ? 1 : 0 }}
                        >
                          {getPlaceholders(selectedLang)[placeholderIndex % getPlaceholders(selectedLang).length]}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Clear button */}
                {textQuery && (
                  <button
                    onClick={() => setTextQuery('')}
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}

                {/* Search CTA button */}
                <button
                  onClick={() => {
                    if (textQuery.trim()) {
                      suppressAutocompleteRef.current = true;
                      processTranscript(textQuery.trim());
                      setTimeout(() => { suppressAutocompleteRef.current = false; }, 500);
                    }
                  }}
                  className="shrink-0 flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-[14px] font-semibold hover:opacity-90 active:scale-95 transition-all whitespace-nowrap hidden sm:flex"
                >
                  <Search size={15} /> Search
                </button>
              </div>

              {/* Mobile full-width search button */}
              <button
                onClick={() => {
                  if (textQuery.trim()) {
                    suppressAutocompleteRef.current = true;
                    processTranscript(textQuery.trim());
                    setTimeout(() => { suppressAutocompleteRef.current = false; }, 500);
                  }
                }}
                className="sm:hidden w-full flex items-center justify-center gap-2 h-11 mt-2 rounded-xl bg-primary text-primary-foreground text-[14px] font-semibold active:scale-[0.98] transition-all"
              >
                <Search size={15} /> Search
              </button>

              {/* Autocomplete dropdown */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute left-0 right-0 top-full z-50 mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-y-auto max-h-60"
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

            {/* Hint text */}
            <p className="text-[13px] text-muted-foreground text-center">
              Describe what you're looking for in plain English — our AI does the rest
            </p>


            {/* ── Example chips ── */}
            <div className="flex gap-2 overflow-x-auto sm:flex-wrap sm:justify-center pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              {EXAMPLE_CHIPS.map((chip) => (
                <button
                  key={chip.query}
                  onClick={() => {
                    setTextQuery(chip.query);
                    suppressAutocompleteRef.current = true;
                    processTranscript(chip.query);
                    setTimeout(() => { suppressAutocompleteRef.current = false; }, 500);
                  }}
                  className="shrink-0 px-4 py-2 rounded-full text-[13px] font-medium border border-border bg-secondary text-muted-foreground hover:bg-accent hover:border-primary/30 hover:text-foreground transition-all whitespace-nowrap active:scale-95"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* ── Refine search toggle ── */}
            <div className="space-y-2">
              <button
                onClick={() => setShowRefine(!showRefine)}
                className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                <SlidersHorizontal size={14} />
                {showRefine ? 'Hide options' : 'Refine search'}
                <ChevronDown size={14} className={`transition-transform duration-200 ${showRefine ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showRefine && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-secondary/50 border border-border rounded-xl space-y-3">
                      {/* Radius row */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-[12px] text-foreground font-medium min-w-[60px]">Radius</span>
                        <div className="flex flex-wrap gap-1.5">
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
                              className={`text-[11px] px-3 py-1.5 rounded-full transition-all font-medium ${
                                selectedRadius === opt.value
                                  ? 'bg-foreground text-background'
                                  : 'border border-border text-muted-foreground hover:border-foreground/40'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Language row */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-[12px] text-foreground font-medium min-w-[60px]">Language</span>
                        <button
                          onClick={() => setShowLangDropdown(!showLangDropdown)}
                          className="text-[11px] px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-foreground/40 transition-all w-fit"
                        >
                          {selectedLangObj.flag}{' '}{selectedLangObj.label}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Language dropdown — absolute positioned */}
            <div className="relative">
              {showLangDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLangDropdown(false)} />
                  <div className="absolute left-0 right-0 bottom-full z-50 mb-1 bg-popover border border-border rounded-xl shadow-elevated overflow-y-auto max-h-60">
                    {VOICE_LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSelectedLang(lang.code);
                          const i18nCode = VOICE_LANG_TO_I18N[lang.code];
                          if (i18nCode) {
                            setLanguage(i18nCode as any);
                          }
                          setShowLangDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-[12px] transition-colors ${
                          lang.code === selectedLang
                            ? 'bg-accent text-foreground'
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

            {/* Filter chips */}
            {filterChips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filterChips.map(chip => (
                  <button
                    key={chip.key}
                    onClick={() => removeChip(chip.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {chip.label}
                    <X size={12} />
                  </button>
                ))}
              </div>
            )}

            {/* Voice state feedback */}
            <div>
              {voiceState === 'listening' && (
                <div className="mt-1">
                  <SoundWaveVisualizer isActive />
                </div>
              )}
              {(voiceState === 'processing' || isSearching) && (
                <p className="text-muted-foreground text-[12px] font-medium flex items-center gap-2 justify-center">
                  <Loader2 size={14} className="animate-spin" />
                  Searching across Australia…
                </p>
              )}
              {voiceState === 'results' && !isSearching && resultCount !== undefined && (
                <p className="text-primary text-[12px] font-medium text-center">
                  Found {resultCount} {resultCount === 1 ? 'property' : 'properties'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Photo grid */}
        <div className={`hidden md:grid gap-1.5 bg-background border-l border-border ${dedupedFeatured.length > 1 ? 'grid-rows-[1.6fr_1fr]' : 'grid-rows-1'}`}>
          {dedupedFeatured.length > 0 ? (
            <>
              {/* Top large photo */}
              <div className="relative rounded-2xl overflow-hidden group cursor-pointer">
                {featuredLoading ? (
                  <Skeleton className="absolute inset-0 w-full h-full" />
                ) : (
                  <img src={dedupedFeatured[0]?.img} alt={dedupedFeatured[0]?.address} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="eager" />
                )}
                <div className="absolute inset-0" style={{background: 'linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.7) 100%)'}} />
                <div className="absolute top-3 left-3">
                  <span className="text-[9px] font-bold px-2.5 py-1 rounded-full text-white bg-foreground/80 backdrop-blur-sm">
                    {dedupedFeatured[0]?.tag}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-white font-extrabold text-lg leading-tight">
                    {dedupedFeatured[0]?.price}
                  </div>
                  <div className="text-white/75 text-[11px] mt-0.5">
                    {dedupedFeatured[0]?.address}
                    {' · '}
                    {dedupedFeatured[0]?.suburb}
                  </div>
                </div>
              </div>

              {/* Bottom photos side by side */}
              {dedupedFeatured.length > 1 && (
                <div className={`grid gap-2 ${dedupedFeatured.length >= 3 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {dedupedFeatured.slice(1, 3).map((item, idx) => (
                    <div key={idx} className="relative rounded-2xl overflow-hidden group cursor-pointer">
                      {featuredLoading ? (
                        <Skeleton className="absolute inset-0 w-full h-full" />
                      ) : (
                        <img src={item.img} alt={item.address} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                      )}
                      <div className="absolute inset-0" style={{background: 'linear-gradient(180deg,transparent 30%,rgba(0,0,0,0.65) 100%)'}} />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white bg-foreground/80 backdrop-blur-sm">
                          {item.tag}
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="text-white font-bold text-sm leading-tight">
                          {item.price}
                        </div>
                        <div className="text-white/65 text-[10px] mt-0.5">
                          {item.suburb}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : !featuredLoading && (
            <div className="row-span-2 flex items-center justify-center p-8">
              <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-center space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Be the first agent in your area
                </p>
                <p className="text-xs text-muted-foreground">
                  List your first property free — no credit card required during your 60-day trial.
                </p>
                <button
                  onClick={() => window.location.href = '/agents/login'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                  List a property free
                </button>
              </div>
            </div>
          )}
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
      {dedupedFeatured.length > 0 ? (
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
                <img src={dedupedFeatured[3 % dedupedFeatured.length]?.img} alt={dedupedFeatured[3 % dedupedFeatured.length]?.address} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="eager" />
              )}
              <div className="absolute inset-0" style={{background: 'linear-gradient(180deg,transparent 30%,rgba(0,0,0,0.72) 100%)'}} />
              <span className="absolute top-3 left-3 text-[9px] font-bold px-2.5 py-1 rounded-full text-white bg-foreground/80">
                {dedupedFeatured[3 % dedupedFeatured.length]?.tag}
              </span>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="text-white font-extrabold text-lg leading-tight mb-0.5" style={{textShadow: '0 1px 6px rgba(0,0,0,0.4)'}}>
                  {dedupedFeatured[3 % dedupedFeatured.length]?.price}
                </div>
                <div className="text-white/90 text-xs font-semibold mb-0.5">
                  {dedupedFeatured[3 % dedupedFeatured.length]?.address}
                </div>
                <div className="text-white/60 text-[10px] mb-2">
                  {dedupedFeatured[3 % dedupedFeatured.length]?.suburb}
                </div>
                <div className="flex gap-2 text-[10px] text-white/70">
                  <span>
                    {dedupedFeatured[3 % dedupedFeatured.length]?.beds} bed
                  </span>
                  <span className="text-white/30">
                    ·
                  </span>
                  <span>
                    {dedupedFeatured[3 % dedupedFeatured.length]?.baths}
                    {' bath'}
                  </span>
                  <span className="text-white/30">
                    ·
                  </span>
                  <span>
                    {dedupedFeatured[3 % dedupedFeatured.length]?.cars}
                    {' car'}
                  </span>
                </div>
              </div>
            </div>

            {/* Four smaller cards */}
            {[4, 5, 0, 1].map((pi, i) => {
              const idx = pi % dedupedFeatured.length;
              return (
                <div key={i} className="relative rounded-2xl overflow-hidden cursor-pointer group" style={{ height: '134px' }}>
                  {featuredLoading ? (
                    <Skeleton className="absolute inset-0 w-full h-full" />
                  ) : (
                    <img src={dedupedFeatured[idx]?.img} alt={dedupedFeatured[idx]?.address} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  )}
                  <div className="absolute inset-0" style={{background: 'linear-gradient(180deg,transparent 25%,rgba(0,0,0,0.65) 100%)'}} />
                  {dedupedFeatured[idx]?.tag && (
                    <span className="absolute top-2 left-2 text-[8px] font-bold px-2 py-0.5 rounded-full text-white bg-foreground/80 backdrop-blur-sm">
                      {dedupedFeatured[idx].tag}
                    </span>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="text-white font-bold text-sm leading-tight">
                      {dedupedFeatured[idx]?.price}
                    </div>
                    <div className="text-white/70 text-[10px] mt-0.5">
                      {dedupedFeatured[idx]?.suburb}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : !featuredLoading && (
        <div className="hidden md:block bg-background px-6 pt-5 pb-6">
          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-center space-y-3">
            <p className="text-sm font-medium text-foreground">
              Be the first agent in your area
            </p>
            <p className="text-xs text-muted-foreground">
              List your first property free — no credit card required during your 60-day trial.
            </p>
            <button
              onClick={() => window.location.href = '/agents/login'}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              List a property free
            </button>
          </div>
        </div>
      )}

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
