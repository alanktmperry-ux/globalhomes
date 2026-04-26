import { useState, useCallback, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
// framer-motion is split into its own chunk via vite.config.ts manualChunks.
// The landing hero uses plain CSS animations to avoid loading this chunk on
// cold paint. motion is only referenced in the search-results branch (mobile
// bottom sheet drag), which loads after the user runs a search.
import { motion, useMotionValue, useSpring, type PanInfo } from 'framer-motion';
import { ArrowRight, ArrowLeft, MapPin, Sparkles, Map, List, Mic, MicOff, GripVertical, ArrowUpDown, X, Bookmark, Share2, Users, Search, Home, Check, ArrowLeftRight, UserCheck, ChevronRight, Globe } from 'lucide-react';
import { VoiceSearchHero } from '@/features/search/components/VoiceSearchHero';
import { TranslationDemoCard } from '@/features/marketing/components/TranslationDemoCard';
import { useHeroVoiceSearch } from '@/features/search/hooks/useHeroVoiceSearch';

import { MapSkeleton } from '@/features/properties/components/PropertyCardSkeleton';
// Heavy components that only render in the search-results branch (not on the
// landing hero). Lazy-loading keeps them out of the cold-paint critical path
// — they download in the background only after the user runs a search.
const VirtualizedPropertyList = lazy(() =>
  import('@/features/properties/components/VirtualizedPropertyList').then(m => ({ default: m.VirtualizedPropertyList }))
);
const PropertyDrawer = lazy(() =>
  import('@/features/properties/components/PropertyDrawer').then(m => ({ default: m.PropertyDrawer }))
);
const MapErrorBoundary = lazy(() =>
  import('@/features/properties/components/MapErrorBoundary').then(m => ({ default: m.MapErrorBoundary }))
);
import { VoiceSearchErrorBoundary } from '@/features/search/components/VoiceSearchErrorBoundary';
import { useI18n } from '@/shared/lib/i18n';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

// Lazy-load map — only initialize when needed
const LazyPropertyMap = lazy(() => import('@/features/properties/components/PropertyMap').then(m => ({ default: m.PropertyMap })));
import { useSearchHistory } from '@/features/search/hooks/useSearchHistory';
import { useSavedProperties } from '@/features/properties/hooks/useSavedProperties';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { Property } from '@/shared/lib/types';
import { useCurrency } from '@/shared/lib/CurrencyContext';
// Lazy-load FilterSidebar — it pulls in calendar/day-picker/date-fns and is
// only shown after the user opens the filters panel.
const FilterSidebar = lazy(() =>
  import('@/shared/components/FilterSidebar').then(m => ({ default: m.FilterSidebar }))
);
import { defaultFilters } from '@/shared/components/FilterSidebar.types';
import { usePropertySearch } from '@/features/properties/hooks/usePropertySearch';
import { Slider } from '@/components/ui/slider';
import { useSavedSearches } from '@/features/search/hooks/useSavedSearches';
import { useCollabSession } from '@/features/search/hooks/useCollabSession';
import { useAuth } from '@/features/auth/AuthProvider';
// Lazy — only opens after the 3rd anonymous search.
const ConsumerSignUpModal = lazy(() => import('@/features/search/components/ConsumerSignUpModal'));
import { supabase } from '@/integrations/supabase/client';
import { geocode, autocomplete } from '@/shared/lib/googleMapsService';

const HERO_ROTATING_LANGUAGES = [
  'in Mandarin.',
  'in Vietnamese.',
  'in Cantonese.',
  'in Arabic.',
  'in any language.',
];

const HERO_SUBHEADLINE_LANGUAGES = [
  '中文 (Mandarin)',
  'Tiếng Việt',
  'العربية',
  'हिन्दी',
  '한국어',
  'English',
];

// Placeholder keys — actual strings come from t() so they translate
const HERO_PLACEHOLDER_KEYS = [
  'hero.placeholder1',
  'hero.placeholder2',
  'hero.placeholder3',
  'hero.placeholder4',
] as const;

const LANG_BANNER_DISMISSED_KEY = 'lang-banner-dismissed';

function LanguageHintBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(LANG_BANNER_DISMISSED_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const dismiss = useCallback(() => {
    setVisible(false);
    try { sessionStorage.setItem(LANG_BANNER_DISMISSED_KEY, '1'); } catch { /* non-fatal */ }
  }, []);

  const openSwitcher = useCallback(() => {
    dismiss();
    // Try to click the language switcher button in the header.
    const btn = document.querySelector<HTMLButtonElement>('button[aria-label^="Change language"]');
    btn?.click();
  }, [dismiss]);

  if (!visible) return null;

  return (
    <div className="w-full bg-blue-50 border-b border-blue-100 text-blue-900">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <button
          type="button"
          onClick={openSwitcher}
          className="flex items-center gap-2 flex-1 text-left hover:text-blue-700 transition-colors"
        >
          <Globe size={16} className="shrink-0" />
          <span>{t('hero.langBannerText')}</span>
          <ChevronRight size={16} className="shrink-0" />
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="p-1 rounded hover:bg-blue-100 transition-colors"
          aria-label="Dismiss language hint"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasSearch = !!searchParams.get('location');
  // Hide the homepage hero whenever ANY query string is present.
  // Specific params (location/beds/maxPrice/type/radius) trigger results,
  // but any other params should also bypass the marketing hero.
  const hasSearchParams = Array.from(searchParams.keys()).length > 0;

  // When landing with search params, ensure the results section is visible at the top.
  useEffect(() => {
    if (hasSearchParams) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    // Run only on mount — subsequent param changes shouldn't yank scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll when search is active so inner card column captures scroll events
  useEffect(() => {
    if (hasSearch) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [hasSearch]);
  const { t: legacyT } = useI18n();
  const { t, setLanguage, language } = useTranslation();
  const { addSearch, lastSearch } = useSearchHistory();

  // Browser language auto-detection (session-only).
  // Defaults to English; if the user already chose a language this session,
  // keep their choice. Never persists across browser sessions.
  useEffect(() => {
    try {
      // If the user already chose a language (persisted in localStorage or this session), keep it.
      if (
        localStorage.getItem('listhq_language') ||
        localStorage.getItem('gh-lang') ||
        sessionStorage.getItem('listhq_language') ||
        sessionStorage.getItem('i18n-language')
      ) return;
      const nav = (navigator.language || 'en').toLowerCase();
      let detected: 'en' | 'zh-CN' | 'vi' | 'hi' | 'ar' | 'ko' | 'bn' = 'en';
      if (nav.startsWith('zh')) detected = 'zh-CN';
      else if (nav.startsWith('vi')) detected = 'vi';
      else if (nav.startsWith('hi')) detected = 'hi';
      else if (nav.startsWith('ar')) detected = 'ar';
      else if (nav.startsWith('ko')) detected = 'ko';
      else if (nav.startsWith('bn')) detected = 'bn';
      // Only auto-apply non-English on first visit; English is the safe default.
      if (detected !== 'en') setLanguage(detected);
    } catch {
      // storage unavailable — non-fatal
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { savedIds, isSaved, toggleSaved } = useSavedProperties();
  const isMobile = useIsMobile();
  const { formatPrice, listingMode, setListingMode } = useCurrency();
  const { savedSearches, saveSearch, removeSearch } = useSavedSearches();
  const { user } = useAuth();
  const {
    isCollab,
    createSession,
    toggleReaction,
    trackView,
    getPropertyReactions,
    hasPartnerViewed,
    syncSelectedProperty,
  } = useCollabSession();

  const [showConsumerModal, setShowConsumerModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const viewedPropertiesRef = useRef(new Set<string>());
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const sessionStartRef = useRef(Date.now());
  const [prefsBannerVisible, setPrefsBannerVisible] = useState(false);
  const prefsAppliedRef = useRef(false);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; key?: number | string } | null>(null);
  const [splitPercent, setSplitPercent] = useState(50);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
  const resultsRef = useRef<HTMLDivElement>(null);
  const listsPanelRef = useRef<HTMLDivElement>(null);
  const SNAP_POINTS = [0.35, 0.65, 0.85];
  const [sheetSnap, setSheetSnap] = useState(0);
  const sheetHeightMV = useMotionValue(viewportHeight * SNAP_POINTS[0]);
  const sheetHeightSpring = useSpring(sheetHeightMV, { stiffness: 300, damping: 30 });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [radiusSliderOpen, setRadiusSliderOpen] = useState(false);
  const isDragging = useRef(false);
  const cardRefs = useRef<globalThis.Map<string, HTMLDivElement>>(new globalThis.Map());

  // Hero state
  const [heroQuery, setHeroQuery] = useState('');
  const [heroLangIndex, setHeroLangIndex] = useState(0);
  const [heroSubLangIndex, setHeroSubLangIndex] = useState(0);
  const [heroSubLangVisible, setHeroSubLangVisible] = useState(true);
  const [heroPlaceholderIndex, setHeroPlaceholderIndex] = useState(0);
  const [heroPlatformStats, setHeroPlatformStats] = useState<{ properties: number | null; buyerCount: number | null }>({ properties: null, buyerCount: null });
  const [statLanguagesCount, setStatLanguagesCount] = useState(0);
  const [statToolsCount, setStatToolsCount] = useState(0);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const heroFormRef = useRef<HTMLFormElement>(null);
  const heroDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [heroSuggestions, setHeroSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [showHeroSuggestions, setShowHeroSuggestions] = useState(false);

  // Debounced Places autocomplete for hero search
  useEffect(() => {
    if (heroDebounceRef.current) clearTimeout(heroDebounceRef.current);
    if (heroQuery.length < 2) { setHeroSuggestions([]); setShowHeroSuggestions(false); return; }
    heroDebounceRef.current = setTimeout(async () => {
      const results = await autocomplete(heroQuery);
      setHeroSuggestions(results);
      setShowHeroSuggestions(results.length > 0);
    }, 300);
    return () => { if (heroDebounceRef.current) clearTimeout(heroDebounceRef.current); };
  }, [heroQuery]);

  // Close hero suggestions on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (heroFormRef.current && !heroFormRef.current.contains(e.target as Node)) {
        setShowHeroSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // Hero rotating language animation
  useEffect(() => {
    const interval = setInterval(() => setHeroLangIndex(i => (i + 1) % HERO_ROTATING_LANGUAGES.length), 2800);
    return () => clearInterval(interval);
  }, []);

  // Hero placeholder rotation
  useEffect(() => {
    const interval = setInterval(() => setHeroPlaceholderIndex(i => (i + 1) % HERO_PLACEHOLDER_KEYS.length), 3500);
    return () => clearInterval(interval);
  }, []);

  // Hero subheadline cycling language indicator (fade out → swap → fade in)
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroSubLangVisible(false);
      window.setTimeout(() => {
        setHeroSubLangIndex(i => (i + 1) % HERO_SUBHEADLINE_LANGUAGES.length);
        setHeroSubLangVisible(true);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Hero stat count-up animations (easeOut)
  useEffect(() => {
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const pLang = Math.min(elapsed / 1200, 1);
      const pTools = Math.min(elapsed / 1400, 1);
      setStatLanguagesCount(Math.round(easeOut(pLang) * 24));
      setStatToolsCount(Math.round(easeOut(pTools) * 50));
      if (pLang < 1 || pTools < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Hero platform stats
  useEffect(() => {
    (async () => {
      const { count: propCount } = await supabase
        .from('properties').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('status', 'public');
      setHeroPlatformStats({
        properties: propCount ?? 0,
        buyerCount: null,
      });
    })();
  }, []);


  const {
    filteredProperties,
    displayProperties,
    handleSearch,
    handleAreaSearch,
    setSearchCenter,
    setSearchRadius,
    clearSearchRadius,
    isSearching,
    hasSearched,
    currentQuery,
    searchRadius,
    searchCenter,
    areaSearch,
    sortBy,
    setSortBy,
    filters,
    setFilters,
    searchSummary,
  } = usePropertySearch({ addSearch });

  // Consumer sign-up modal trigger after 3rd anonymous search
  const wrappedHandleSearch = useCallback((query: string, detectedLanguage?: string) => {
    const lang = detectedLanguage || 'en';
    handleSearch(query);

    // Track search
    try {
      if (typeof window !== 'undefined' && (window as any).posthog?.capture) {
        (window as any).posthog.capture('search_performed', { query, detected_language: lang, result_count: filteredProperties?.length ?? 0 });
      }
    } catch {}

    // Fire-and-forget: log every search to voice_searches for AI Buyer Concierge pipeline
    supabase
      .from('voice_searches')
      .insert({
        transcript: query.slice(0, 200),
        user_id: user?.id ?? null,
        detected_language: lang,
        status: 'completed',
      })
      .then(() => {});

    if (!user) {
      const alreadySignedUp = localStorage.getItem('listhq_consumer_signed_up');
      if (alreadySignedUp) return;
      const dismissed = localStorage.getItem('listhq_consumer_dismissed');
      if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;
      const count = Number(localStorage.getItem('listhq_search_count') || '0') + 1;
      localStorage.setItem('listhq_search_count', String(count));
      if (count >= 3) setShowConsumerModal(true);
    }

    // Geocode the typed search text and pan the map to the result
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      const locationCandidates = Array.from(new Set([
        trimmedQuery,
        trimmedQuery
          .replace(/\b\d+\s*(?:bed(?:room)?s?|bath(?:room)?s?|car(?:space)?s?|parking)\b/gi, ' ')
          .replace(/\$\s*[\d,.]+(?:\s?[mk])?/gi, ' ')
          .replace(/\b(?:house|apartment|unit|townhouse|villa|duplex|studio|rent|rental|sale|buy|looking|for|with|under|over|between|in|near|around)\b/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      ].filter(Boolean)));

      void (async () => {
        for (const candidate of locationCandidates) {
          const locationQuery = candidate.toLowerCase().includes('australia')
            ? candidate
            : `${candidate}, Australia`;

          try {
            const coords = await geocode(locationQuery);
            if (!coords) continue;

            setSearchCenter(coords);
            setMapCenter({
              lat: coords.lat,
              lng: coords.lng,
              key: `geocode-${coords.lat}-${coords.lng}-${Date.now()}`,
            });
            setMapExpanded(false);
            return;
          } catch {
            // Try the next candidate silently
          }
        }
      })();
    }
  }, [handleSearch, setSearchCenter, user]);

  // Hero voice search
  const handleVoiceResult = useCallback((transcript: string) => {
    setHeroQuery(transcript);
    wrappedHandleSearch(transcript);
  }, [wrappedHandleSearch]);
  const { isRecording: heroMicListening, isProcessing: heroMicProcessing, statusLabel: heroMicLabel, startRecording: heroMicToggle } = useHeroVoiceSearch(handleVoiceResult);

  const initializedFromUrl = useRef(false);

  // ── Restore search state from URL on mount ───────────────────
  useEffect(() => {
    if (initializedFromUrl.current) return;
    initializedFromUrl.current = true;

    const params = new URLSearchParams(window.location.search);
    const location = params.get('location');
    const minPrice = params.get('minPrice');
    const maxPrice = params.get('maxPrice');
    const radius = params.get('radius');
    const types = params.get('type');
    const beds = params.get('beds');
    const baths = params.get('baths');
    const sort = params.get('sort');

    if (minPrice || maxPrice || types || beds || baths) {
      setFilters(prev => ({
        ...prev,
        priceRange: [
          minPrice ? Number(minPrice) : prev.priceRange[0],
          maxPrice ? Number(maxPrice) : prev.priceRange[1],
        ],
        propertyTypes: types ? types.split(',') : prev.propertyTypes,
        minBeds: beds ? Number(beds) : prev.minBeds,
        minBaths: baths ? Number(baths) : prev.minBaths,
      }));
    }
    if (sort) setSortBy(sort as typeof sortBy);
    if (radius) setSearchRadius(Number(radius));
    if (location) {
      handleSearch(location);
    }
  }, []);

  // ── Apply saved preferences for authenticated seekers ────────
  useEffect(() => {
    if (prefsAppliedRef.current) return;
    if (!user) return;
    if (hasSearchParams) return; // URL params take priority

    const dismissed = sessionStorage.getItem('listhq_prefs_banner_dismissed');
    if (dismissed) return;

    prefsAppliedRef.current = true;

    (async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('budget_max, preferred_locations, preferred_beds, seeking_type')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!data) return;
      const hasBudget = typeof data.budget_max === 'number' && data.budget_max > 0;
      const hasLocations = Array.isArray(data.preferred_locations) && data.preferred_locations.length > 0;
      const hasBeds = typeof data.preferred_beds === 'number' && data.preferred_beds > 0;

      if (!hasBudget && !hasLocations && !hasBeds) return;

      // Apply seeking_type to listing mode
      if (data.seeking_type === 'rent') {
        setListingMode('rent');
      } else {
        setListingMode('sale');
      }

      setFilters(prev => ({
        ...prev,
        ...(hasBudget ? { priceRange: [prev.priceRange[0], data.budget_max!] as [number, number] } : {}),
        ...(hasBeds ? { minBeds: data.preferred_beds! } : {}),
      }));

      if (hasLocations) {
        const firstLocation = (data.preferred_locations as string[])[0];
        handleSearch(firstLocation);
      }

      setPrefsBannerVisible(true);
    })();
  }, [user, hasSearchParams]);


  useEffect(() => {
    const handler = () => setMapCenter(null);
    window.addEventListener('listing-mode-changed', handler);
    return () => window.removeEventListener('listing-mode-changed', handler);
  }, []);

  // Auto-centre map when search resolves a location
  useEffect(() => {
    if (searchCenter) {
      setMapCenter({
        lat: searchCenter.lat,
        lng: searchCenter.lng,
        key: `search-${searchCenter.lat}-${searchCenter.lng}-${Date.now()}`,
      });
    }
  }, [searchCenter]);

  // Fetch featured/boosted listings, deduplicated, with fallback
  useEffect(() => {
    const cols = 'id, title, address, suburb, state, price, price_formatted, images, image_url, property_type, beds, baths, parking, lat, lng, boost_tier, is_featured, listing_type, translations';
    const MIN_FEATURED = 4;

    (async () => {
      const { data: featured } = await supabase
        .from('properties')
        .select(cols)
        .eq('is_active', true)
        .eq('status', 'public')
        .or('is_featured.eq.true,boost_tier.not.is.null')
        .order('created_at', { ascending: false })
        .limit(12);

      // Deduplicate by id
      const seen = new Set<string>();
      const unique = (featured ?? []).filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      if (unique.length >= MIN_FEATURED) {
        setFeaturedListings(unique.slice(0, 6));
        return;
      }

      // Fallback: fill with recent active sale listings (exclude rentals)
      const { data: fallback } = await supabase
        .from('properties')
        .select(cols)
        .eq('is_active', true)
        .eq('status', 'public')
        .or('listing_type.eq.sale,listing_type.is.null')
        .order('created_at', { ascending: false })
        .limit(12);

      for (const p of fallback ?? []) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          unique.push(p);
        }
        if (unique.length >= 6) break;
      }

      if (unique.length > 0) setFeaturedListings(unique);
    })();
  }, []);

  // ── Push search state to URL ─────────────────────────────────
  useEffect(() => {
    if (!initializedFromUrl.current) return;

    const params = new URLSearchParams();
    if (currentQuery) params.set('location', currentQuery);
    if (filters.priceRange[0] > 0) params.set('minPrice', String(filters.priceRange[0]));
    if (filters.priceRange[1] < 5_000_000) params.set('maxPrice', String(filters.priceRange[1]));
    if (filters.propertyTypes.length > 0) params.set('type', filters.propertyTypes.join(','));
    if (filters.minBeds > 0) params.set('beds', String(filters.minBeds));
    if (filters.minBaths > 0) params.set('baths', String(filters.minBaths));
    if (searchRadius) params.set('radius', String(searchRadius));
    if (sortBy !== 'default') params.set('sort', sortBy);

    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;

    if (newUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.pushState(null, '', newUrl);
    }
  }, [currentQuery, filters, searchRadius, sortBy]);

  // ── Handle browser back/forward ──────────────────────────────
  useEffect(() => {
    const onPopState = () => {
      initializedFromUrl.current = false;
      // Re-trigger the mount logic
      const params = new URLSearchParams(window.location.search);
      const location = params.get('location');
      const minPrice = params.get('minPrice');
      const maxPrice = params.get('maxPrice');
      const radius = params.get('radius');
      const types = params.get('type');
      const beds = params.get('beds');
      const baths = params.get('baths');
      const sort = params.get('sort');

      setFilters(prev => ({
        ...prev,
        priceRange: [
          minPrice ? Number(minPrice) : 0,
          maxPrice ? Number(maxPrice) : 5_000_000,
        ],
        propertyTypes: types ? types.split(',') : [],
        minBeds: beds ? Number(beds) : 0,
        minBaths: baths ? Number(baths) : 0,
      }));
      if (sort) setSortBy(sort as typeof sortBy);
      else setSortBy('default');
      if (radius) setSearchRadius(Number(radius));
      // No default radius: leave null when URL has none (matches initial state
      // in usePropertySearch). Setting a default here causes the push-to-URL
      // effect to re-stamp ?radius=5 on cold loads when popstate fires.
      if (location) handleSearch(location);

      initializedFromUrl.current = true;
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [handleSearch, setFilters, setSortBy, setSearchRadius, clearSearchRadius]);

  // ── Track property views for lead scoring ─────────────────────
  const handleSelectProperty = useCallback((p: Property | null) => {
    if (p) {
      viewedPropertiesRef.current.add(p.id);
      setViewedIds(prev => {
        if (prev.has(p.id)) return prev;
        const next = new Set(prev);
        next.add(p.id);
        return next;
      });
      trackView(p.id);
      syncSelectedProperty(p?.id ?? null);
    }
    setSelectedProperty(p);
  }, [trackView, syncSelectedProperty]);

  // ── Build search context for lead capture ────────────────────
  const searchContextForLead = useMemo(() => ({
    currentFilters: {
      priceRange: filters.priceRange as [number, number],
      propertyTypes: filters.propertyTypes,
      minBeds: filters.minBeds,
      minBaths: filters.minBaths,
    },
    currentQuery: currentQuery || undefined,
    searchRadius: searchRadius || undefined,
    savedPropertiesCount: savedIds.size,
    viewedPropertiesCount: viewedPropertiesRef.current.size,
    savedSearchesCount: savedSearches.length,
    sessionDurationMinutes: Math.round((Date.now() - sessionStartRef.current) / 60000),
  }), [filters, currentQuery, searchRadius, savedIds.size, savedSearches.length]);

  // ── Scroll to card on map click ──────────────────────────────
  const scrollToProperty = useCallback((propertyId: string) => {
    const el = cardRefs.current.get(propertyId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // ── Draggable split handle ───────────────────────────────────
  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  // Track viewport height (handles keyboard open/close on mobile)
  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);

  // Sync spring with snap point and viewport
  useEffect(() => {
    sheetHeightMV.set(viewportHeight * SNAP_POINTS[sheetSnap]);
  }, [viewportHeight, sheetSnap]);

  const handleSheetDragEnd = useCallback((_: any, info: PanInfo) => {
    const velocity = info.velocity.y;
    const currentH = sheetHeightMV.get();
    const currentPct = currentH / viewportHeight;

    // Use velocity to determine direction, then snap
    let targetIdx = sheetSnap;
    if (velocity < -300) {
      // Flick up → next larger snap
      targetIdx = Math.min(sheetSnap + 1, SNAP_POINTS.length - 1);
    } else if (velocity > 300) {
      // Flick down → next smaller snap
      targetIdx = Math.max(sheetSnap - 1, 0);
    } else {
      // Find nearest snap point
      let minDist = Infinity;
      SNAP_POINTS.forEach((sp, i) => {
        const dist = Math.abs(currentPct - sp);
        if (dist < minDist) { minDist = dist; targetIdx = i; }
      });
    }
    setSheetSnap(targetIdx);
  }, [viewportHeight, sheetSnap]);

  useEffect(() => {
    let rafId: number | null = null;
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        const pct = (e.clientX / window.innerWidth) * 100;
        setSplitPercent(Math.max(30, Math.min(70, pct)));
        rafId = null;
      });
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (isDragging.current) onUp();
    };
  }, []);

  // ── Rendering helpers ────────────────────────────────────────
  const sortOptions = [
    { value: 'default', label: t('sort.default') },
    { value: 'price-asc', label: t('sort.priceAsc') },
    { value: 'price-desc', label: t('sort.priceDesc') },
    { value: 'newest', label: t('sort.newest') },
    { value: 'beds', label: t('sort.beds') },
  ] as const;

  const pageTitle = `${currentQuery || 'Melbourne'} Property Search | ListHQ`;
  const pageDescription = `Search ${currentQuery || 'Melbourne'} properties. ${filteredProperties.length} listings. Save searches. Get investor alerts.`;

  const statusBar = (
    <>
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://globalhomes.lovable.app" />
      <meta property="og:image" content="https://globalhomes.lovable.app/listhq-og.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content="https://globalhomes.lovable.app/listhq-og.png" />
      <link rel="canonical" href="https://globalhomes.lovable.app" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "ListHQ",
        "url": "https://listhq.com.au",
        "logo": "https://listhq.com.au/favicon.ico",
        "description": "AI-powered real estate platform for Australian agents",
        "areaServed": "AU",
        "knowsAbout": ["Real Estate", "Property Listings", "Australian Property Market", "Rental Properties"],
        "sameAs": ["https://twitter.com/ListHQ"]
      })}</script>
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "ListHQ",
        "url": "https://listhq.com.au",
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://listhq.com.au/buy?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      })}</script>
    </Helmet>
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium text-foreground shrink-0">
          {t('search.propertiesCount', { count: filteredProperties.length })}
        </span>
        {hasSearched && searchSummary && (
          <span className="text-xs text-primary font-medium truncate max-w-[300px]" title={searchSummary}>
            {searchSummary}
          </span>
        )}
        {hasSearched && !searchSummary && (
          <span className="text-xs text-muted-foreground truncate">{t('search.results')}</span>
        )}
        {!hasSearched && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles size={12} className="text-primary" /> {t('search.recommended')}
          </span>
        )}
    {/* Radius pills — only when a search center is set */}
        {searchCenter && (
          <div className="flex items-center gap-1 shrink-0">
            {[
              { label: 'Any', value: null },
              { label: '5 km', value: 5 },
              { label: '10 km', value: 10 },
              { label: '25 km', value: 25 },
              { label: '50 km', value: 50 },
            ].map(({ label, value }) => {
              const isActive = value === null ? !searchRadius : searchRadius === value;
              return (
                <button
                  key={label}
                  onClick={() => value === null ? clearSearchRadius() : setSearchRadius(value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
        {areaSearch && (
          <button
            onClick={() => handleAreaSearch(null)}
            className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0 hover:bg-primary/20 transition-colors inline-flex items-center gap-1"
          >
            {areaSearch.type === 'circle' ? `${Math.round(areaSearch.radius / 1000)}km circle` : 'Custom area'}
            <X size={10} className="opacity-60" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Collab button */}
        {!isCollab && user && (
          <button
            onClick={() => createSession({
              query: currentQuery || '',
              filters: filters as Record<string, any>,
            })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <Users size={12} />
            {t('search.searchTogether')}
          </button>
        )}
        {isCollab && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary shrink-0">
            <Users size={12} />
            Collab active
          </span>
        )}
        {/* Save this search */}
        {hasSearched && (
          <button
            onClick={() => saveSearch({
              query: currentQuery,
              filters,
              radius: searchRadius ?? undefined,
              center: searchCenter ?? undefined,
            })}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Bookmark size={12} />
            {t('search.save')}
          </button>
        )}
        <Suspense fallback={null}>
          <FilterSidebar
            filters={filters}
            onChange={setFilters}
            isOpen={filtersOpen}
            onToggle={() => setFiltersOpen(o => !o)}
            totalCount={displayProperties.length}
            filteredCount={filteredProperties.length}
            listingMode={listingMode}
          />
        </Suspense>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="appearance-none pl-7 pr-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ArrowUpDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>
    </div>

    {/* Saved searches chips */}
    {savedSearches.length > 0 && (
      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider shrink-0">Saved:</span>
        {savedSearches.map((s) => (
          <div key={s.id} className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => handleSearch(s.query)}
              className="group flex items-center gap-1 px-2.5 py-1 rounded-l-full bg-secondary border border-r-0 border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Bookmark size={10} className="text-primary" />
              <span className="max-w-[120px] truncate">{s.label}</span>
              <X
                size={10}
                className="opacity-0 group-hover:opacity-60 transition-opacity"
                onClick={(e) => { e.stopPropagation(); removeSearch(s.id); }}
              />
            </button>
            <button
              onClick={() => createSession({
                query: s.query,
                filters: s.filters as Record<string, any>,
                center: s.center,
              })}
              className="px-1.5 py-1 rounded-r-full bg-secondary border border-l-0 border-border text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
              title="Share this search"
            >
              <Share2 size={10} />
            </button>
          </div>
        ))}
        {isCollab && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0 animate-fade-in">
            <Users size={12} />
            Searching together
          </div>
        )}
      </div>
    )}
  </>
  );

  const emptyPlaceholder = (
    <div
      className="flex flex-col items-center justify-center py-16 px-6 animate-in fade-in slide-in-from-bottom-3 duration-500"
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <MapPin size={28} className="text-primary" />
      </div>
      <h2 className="text-lg font-display font-bold text-foreground mb-1.5 text-center">
        {t('search.emptyTitle')}
      </h2>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        {t('search.emptyDesc')}
      </p>
    </div>
  );

  const noResultsPlaceholder = (
    <div className="flex flex-col items-center justify-center py-16 px-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Search size={28} className="text-primary" />
      </div>
      <h2 className="text-lg font-display font-bold text-foreground mb-1.5 text-center">
        No properties found{currentQuery ? ` for "${currentQuery}"` : ''}
      </h2>
      <p className="text-sm text-muted-foreground text-center max-w-xs mb-5">
        Try widening your search area, clearing filters, or browsing all properties.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => setSearchRadius(25)}
          className="px-3.5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          Widen to 25km
        </button>
        <button
          onClick={() => setFilters(defaultFilters)}
          className="px-3.5 py-2 rounded-full bg-secondary border border-border text-xs font-semibold text-foreground hover:bg-accent transition-colors"
        >
          Clear all filters
        </button>
        <button
          onClick={() => navigate('/buy')}
          className="px-3.5 py-2 rounded-full bg-secondary border border-border text-xs font-semibold text-foreground hover:bg-accent transition-colors"
        >
          Browse all properties
        </button>
      </div>
    </div>
  );

  const showEmptyState = filteredProperties.length === 0 && !isSearching && !hasSearched;
  const showNoResultsState = filteredProperties.length === 0 && !isSearching && hasSearched;
  const emptyOrNoResults = showNoResultsState ? noResultsPlaceholder : emptyPlaceholder;
  const shouldShowPlaceholder = showEmptyState || showNoResultsState;

  const propertyList = shouldShowPlaceholder ? emptyOrNoResults : (
    <Suspense fallback={<MapSkeleton />}>
      <VirtualizedPropertyList
        properties={filteredProperties}
        isSearching={isSearching}
        isMobile={isMobile}
        isSaved={isSaved}
        onToggleSave={toggleSaved}
        onSelect={(p) => {
          handleSelectProperty(p);
          if (p.lat && p.lng) setMapCenter({ lat: p.lat, lng: p.lng, key: `${p.lat}-${p.lng}` });
        }}
        cardRefs={cardRefs}
        isCollab={isCollab}
        getPropertyReactions={isCollab ? getPropertyReactions : undefined}
        onToggleReaction={isCollab ? toggleReaction : undefined}
        hasPartnerViewed={isCollab ? hasPartnerViewed : undefined}
        currentUserId={user?.id}
        areaSearch={areaSearch}
        searchRadius={searchRadius}
        onClearAreaSearch={() => handleAreaSearch(null)}
        listingMode={listingMode}
      />
    </Suspense>
  );

  const mapComponent = isSearching ? (
    <MapSkeleton />
  ) : (
    <Suspense fallback={<MapSkeleton />}>
      <MapErrorBoundary>
        <Suspense fallback={<MapSkeleton />}>
          <LazyPropertyMap
            properties={filteredProperties}
            onPropertySelect={handleSelectProperty}
            selectedPropertyId={selectedProperty?.id}
            onAreaSearch={handleAreaSearch}
            centerOn={mapCenter}
            onScrollToProperty={scrollToProperty}
            formatPrice={formatPrice}
            onMapMoved={(bounds) => {
              handleAreaSearch({
                type: 'polygon',
                coordinates: [
                  [bounds.north, bounds.west],
                  [bounds.north, bounds.east],
                  [bounds.south, bounds.east],
                  [bounds.south, bounds.west],
                  [bounds.north, bounds.west],
                ],
              });
            }}
            onGeolocate={(loc) => {
              setSearchCenter({ lat: loc.lat, lng: loc.lng });
              if (!searchRadius) setSearchRadius(10);
              setTimeout(() => {
                setMapCenter({ lat: loc.lat, lng: loc.lng, key: `geo-${Date.now()}` });
              }, 100);
            }}
          />
        </Suspense>
      </MapErrorBoundary>
    </Suspense>
  );

  // ── Auto-scroll to top when search results load ──────
  useEffect(() => {
    if (hasSearch || hasSearched) {
      window.scrollTo(0, 0);
    }
  }, [hasSearch, hasSearched]);

  // Reset listings panel scroll to top when search params change
  useEffect(() => {
    if (listsPanelRef.current) {
      listsPanelRef.current.scrollTop = 0;
    }
  }, [searchParams]);

  // ── Hero category tab (sale/rent reuse listingMode; commercial/land are search-only) ──
  const [heroCategory, setHeroCategory] = useState<'sale' | 'rent' | 'commercial' | 'land'>(
    listingMode === 'rent' ? 'rent' : 'sale'
  );

  // ── Hero submit handler ──
  const [heroDetectedLang, setHeroDetectedLang] = useState<string | null>(null);
  const [heroIsTranslating, setHeroIsTranslating] = useState(false);

  const translateAndSearch = useCallback(async (rawQuery: string) => {
    const trimmed = rawQuery.trim();
    if (!trimmed) return;
    setHeroIsTranslating(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const { data: translationResult, error: fnError } = await supabase.functions.invoke('generate-translations', {
        body: { type: 'translate_search', search_query: trimmed },
      });
      clearTimeout(timeout);

      if (!fnError && translationResult) {
        const lang = translationResult.detected_language as string | undefined;
        const englishQuery = (translationResult.english_query as string | undefined) || trimmed;
        if (lang && lang !== 'en' && lang !== 'English') {
          setHeroDetectedLang(lang);
          setTimeout(() => setHeroDetectedLang(null), 3000);
        }
        wrappedHandleSearch(englishQuery, lang || 'en');
      } else {
        wrappedHandleSearch(trimmed);
      }
    } catch {
      wrappedHandleSearch(trimmed);
    } finally {
      setHeroIsTranslating(false);
    }
  }, [wrappedHandleSearch]);

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroQuery.trim()) return;
    if (heroCategory === 'commercial' || heroCategory === 'land') {
      const params = new URLSearchParams();
      params.set('location', heroQuery.trim());
      params.set('category', heroCategory);
      navigate(`/?${params.toString()}`);
      return;
    }
    translateAndSearch(heroQuery.trim());
  };

  const handleSelectHeroSuggestion = useCallback(async (suggestion: { description: string; place_id: string }) => {
    setHeroQuery(suggestion.description);
    setShowHeroSuggestions(false);
    setHeroSuggestions([]);

    // Geocode and centre the map (same pattern as the results-page autocomplete)
    try {
      const loc = await geocode(suggestion.description);
      if (loc) {
        setSearchCenter({ lat: loc.lat, lng: loc.lng });
        setMapCenter({ lat: loc.lat, lng: loc.lng, key: `hero-${Date.now()}` });
      }
    } catch {
      /* non-fatal */
    }

    if (heroCategory === 'commercial' || heroCategory === 'land') {
      const params = new URLSearchParams();
      params.set('location', suggestion.description);
      params.set('category', heroCategory);
      navigate(`/?${params.toString()}`);
      return;
    }
    wrappedHandleSearch(suggestion.description);
  }, [heroCategory, navigate, wrappedHandleSearch, setSearchCenter]);

  const handleHeroModeChange = (mode: 'sale' | 'rent' | 'commercial' | 'land') => {
    setHeroCategory(mode);
    if (mode === 'sale' || mode === 'rent') {
      setListingMode(mode);
      window.dispatchEvent(new CustomEvent('listing-mode-changed'));
    }
  };

  // (sectionAnim removed — landing sections no longer use framer-motion to keep it off the cold-paint critical path.)

  // ── Landing hero: shown until first search, hidden if URL has params ──
  if (!hasSearchParams) {
    return (
      <div className="flex flex-col">
        <LanguageHintBanner />
        {/* ── HERO SECTION ── */}
        <section className="relative flex flex-col items-center justify-center py-12 md:py-16 bg-white overflow-hidden px-6 text-center">
          {/* Background accents */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 pointer-events-none" />
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-100/30 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-violet-100/20 blur-[100px] pointer-events-none" />

          <div
            className="relative z-10 max-w-3xl w-full animate-in fade-in slide-in-from-bottom-6 duration-700"
          >
            {/* Eyebrow */}
            <div
              className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium tracking-wide animate-in fade-in zoom-in-95 duration-500 delay-100 fill-mode-both"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {t('hero.eyebrow')}
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight text-slate-900">
              {t('hero.headline')}<br />
              <span className="text-blue-500">{t('hero.headline2')}</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-slate-500 font-medium mt-4 mb-0">
              <noscript>{t('hero.subheadline')}</noscript>
              <span>
                {t('hero.subheadlinePrefix')}{' '}
                <span
                  className={`text-blue-500 inline-block transition-opacity duration-300 ${
                    heroSubLangVisible ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {HERO_SUBHEADLINE_LANGUAGES[heroSubLangIndex]}
                </span>
              </span>
            </p>

            {/* Sale / Rent toggle */}
            <div className="flex flex-col items-center mb-6">
              <div className="inline-flex items-center bg-slate-100 rounded-full p-1 gap-1">
                <button
                  onClick={() => handleHeroModeChange('sale')}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                    heroCategory === 'sale' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-700'
                  }`}
                >
                  {t('hero.forSale')}
                </button>
                <button
                  onClick={() => handleHeroModeChange('rent')}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                    heroCategory === 'rent' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-700'
                  }`}
                >
                  {t('hero.forRent')}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Commercial &amp; land search — coming soon
              </p>
            </div>

            {/* Search bar */}
            <form ref={heroFormRef} onSubmit={handleHeroSubmit} className="relative max-w-2xl mx-auto">
              <div className="flex items-center bg-white border border-slate-200 rounded-2xl shadow-lg shadow-slate-100/80 px-4 py-2 gap-3 hover:border-slate-300 hover:shadow-xl transition-all duration-200 focus-within:border-blue-300 focus-within:shadow-blue-50/80 focus-within:shadow-xl">
                <input
                  id="search-bar"
                  ref={heroInputRef}
                  type="text"
                  value={heroQuery}
                  onChange={e => setHeroQuery(e.target.value)}
                  onFocus={() => heroSuggestions.length > 0 && setShowHeroSuggestions(true)}
                  placeholder={t(HERO_PLACEHOLDER_KEYS[heroPlaceholderIndex])}
                  aria-label={t('search.placeholder')}
                  autoComplete="off"
                  className="flex-1 bg-transparent outline-none text-slate-800 text-[15px] placeholder:text-slate-400 min-w-0"
                />
                <button
                  type="button"
                  onClick={heroMicToggle}
                  disabled={heroMicProcessing}
                  className={`shrink-0 p-2.5 min-w-[44px] min-h-[44px] rounded-full transition-all duration-200 flex items-center justify-center ${
                    heroMicListening
                      ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-300 ring-offset-1'
                      : heroMicProcessing
                        ? 'bg-blue-50 text-blue-400 cursor-wait'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}
                  title={heroMicListening ? 'Stop recording' : heroMicProcessing ? 'Transcribing...' : 'Voice search'}
                >
                  {heroMicListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0"
                >
                  <Search size={14} />
                  {t('hero.search')}
                </button>
              </div>
              {showHeroSuggestions && heroSuggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-y-auto max-h-60">
                  {heroSuggestions.map((s) => (
                    <li key={s.place_id}>
                      <button
                        type="button"
                        onClick={() => handleSelectHeroSuggestion(s)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-slate-800 hover:bg-slate-50 transition-colors"
                      >
                        <MapPin size={16} className="text-slate-400 shrink-0" />
                        <span className="truncate">{s.description}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {heroMicLabel && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${heroMicListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500 animate-pulse'}`} />
                  <span className="text-sm text-slate-500 font-medium">{heroMicLabel}</span>
                </div>
              )}
              {heroIsTranslating && (
                <p className="text-xs text-blue-500 mt-2 text-center">Translating…</p>
              )}
              {heroDetectedLang && (
                <div className="mt-2 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                    🌐 Detected {heroDetectedLang.toUpperCase()} — searching in English
                  </span>
                </div>
              )}
              <p className="text-sm text-slate-400 mt-3 text-center">
                {t('hero.searchHint')}
              </p>
            </form>

            {/* Browse CTA */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => navigate('/buy')}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-all cursor-pointer bg-white/80 backdrop-blur-sm"
              >
                🔍 {t('hero.browseProperties')}
              </button>
            </div>
          </div>

          {/* ── AUDIENCE SPLIT TILES ── */}
          <div className="relative z-10 mt-12 w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 px-2 text-left">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2">{t('hero.buyerTileTitle')}</h3>
              <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                {t('hero.buyerTileDesc')}
              </p>
              <button
                onClick={() => navigate('/buy')}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors"
              >
                {t('hero.buyerTileCta')}
              </button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2">{t('hero.agentTileTitle')}</h3>
              <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                {t('hero.agentTileDesc')}
              </p>
              <button
                onClick={() => navigate('/for-agents')}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors"
              >
                {t('hero.agentTileCta')}
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div
            className="relative z-10 mt-8 max-w-2xl w-full mx-auto animate-in fade-in duration-700 delay-500 fill-mode-both"
          >
            <p className="text-center text-lg md:text-xl font-semibold text-foreground">
              <span className="underline decoration-blue-500 decoration-2 underline-offset-4">1 in 5</span>{' '}
              Australian buyers doesn't search in English. ListHQ lists them all.
            </p>
          </div>
        </section>

        {/* ── TRANSLATION DEMO ── */}
        <TranslationDemoInline />

        {/* ── FEATURED LISTINGS ── */}
        <section id="featured-listings" className="bg-white py-12 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-baseline justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{t('hero.propertiesTitle')}</h2>
                <p className="text-sm text-slate-500 mt-1">{t('hero.propertiesSub')}</p>
              </div>
              <a href="/search" className="text-sm text-blue-600 hover:text-blue-700 font-medium">{t('hero.viewAll')} →</a>
            </div>
            {featuredListings.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {featuredListings.filter(p => p.listing_type !== 'rent' && p.listing_type !== 'rental' && !/^\s*12\s+atherton/i.test(p.address || '')).slice(0, 6).map((p) => {
                    const img = (p.images && p.images[0]) || p.image_url;
                    const hasTranslations = p.translations && Object.keys(p.translations).length > 0;
                    return (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/property/${p.id}`)}
                        className="rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="h-40 bg-slate-100 flex items-center justify-center relative">
                          {img ? (
                            <img src={img} alt={p.title || p.address} className="w-full h-full object-cover" />
                          ) : (
                            <Home size={32} className="text-slate-300" />
                          )}
                          {hasTranslations && (
                            <span className="absolute top-3 left-3 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">AI Translated</span>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="text-base font-semibold text-slate-900">{formatPrice(p.price, p.listing_type)}</div>
                          <div className="text-xs text-slate-500 mt-0.5 mb-2">{p.address || `${p.suburb}, ${p.state}`}</div>
                          <div className="flex gap-3 text-xs text-slate-400">
                            {p.beds > 0 && <span>{p.beds} {t('card.beds')}</span>}
                            {p.baths > 0 && <span>{p.baths} {t('card.bath')}</span>}
                            {p.parking > 0 && <span>{p.parking} {t('card.car')}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
               </>
             ) : null}
            <div className="mt-8 text-center">
              <button
                onClick={() => navigate('/agents')}
                className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
              >
                Looking for an agent who speaks your language? Find one →
              </button>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <HowItWorksSection t={t} />

        {/* ── AGENT CTA ── */}
        <section className="bg-slate-900 py-16 px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-white mb-3">{t('home.agentBannerHeadline')}</h2>
            <p className="text-sm text-slate-400 mb-8">{t('home.agentBannerSub')}</p>
            <button
              onClick={() => navigate('/for-agents')}
              className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 rounded-full text-[15px] font-semibold transition-all duration-200 hover:scale-105 active:scale-100 shadow-lg"
            >
              {t('home.agentBannerCta')} →
            </button>
          </div>
        </section>

        {/* ── FOR AGENTS — Compact 2-column ── */}
        <section className="bg-slate-950 py-16 px-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            {/* Left: bullets */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{t('home.agents.eyebrow')}</h2>
              <p className="text-lg text-white font-semibold mb-2">{t('home.agents.headline')}</p>
              <p className="text-sm text-slate-400 mb-6">{t('home.agents.sub')}</p>
              <ul className="space-y-4">
                {[
                  t('home.agents.feature1'),
                  t('home.agents.feature2'),
                  t('home.agents.feature3'),
                  t('home.agents.feature4'),
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-slate-300 text-sm">
                    <Check size={16} className="text-blue-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Right: founding agent card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="text-2xl font-bold text-white mb-1">{t('home.agents.founding')}</div>
              <p className="text-sm text-slate-400 mb-6">{t('home.agents.freeTagSub')}</p>
              <button
                onClick={() => navigate('/for-agents')}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full text-sm font-semibold transition-colors"
              >
                {t('home.agents.cta')}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-background ${!isMobile ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
    {/* Results header when coming from search params */}
    {hasSearch && searchParams.get('location') && (
      <div className="px-6 pt-6 pb-2">
        <p className="text-sm text-slate-500">
          Showing results for <span className="font-medium text-slate-800">"{new URLSearchParams(window.location.search).get('location')}"</span>
        </p>
      </div>
    )}
    {/* ── Top: Voice Search Bar ─────────────────────────────── */}
    <div className="shrink-0" style={{ display: searchParams.get('location') ? 'none' : undefined }}>
        <VoiceSearchErrorBoundary>
          <VoiceSearchHero
            onSearch={wrappedHandleSearch}
            onLocationSelect={(loc) => {
              setSearchCenter({ lat: loc.lat, lng: loc.lng });
              if (!searchRadius) setSearchRadius(10);
              setTimeout(() => {
                setMapCenter({ lat: loc.lat, lng: loc.lng, key: `${loc.lat}-${loc.lng}-${Date.now()}` });
              }, 300);
            }}
            onRadiusChange={setSearchRadius}
            selectedRadius={searchRadius}
            resultCount={hasSearched ? filteredProperties.length : undefined}
            isSearching={isSearching}
          />
        </VoiceSearchErrorBoundary>
      </div>

    {/* ── Desktop: Zillow-style split ────────────────────────── */}
    {!isMobile ? (
      <div
        ref={resultsRef}
        className="flex overflow-hidden flex-1 min-h-0"
      >
          {/* LEFT: fixed map panel */}
          <div
            className="relative overflow-hidden"
             style={{
               width: `${mapExpanded ? 85 : splitPercent}%`,
               transition: 'width 0.3s ease',
               overflowAnchor: 'none',
             }}
          >
            {/* Expand/collapse toggle — sits on right edge of map */}
            <button
              onClick={() => setMapExpanded(e => !e)}
              className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-elevated text-xs font-medium text-foreground hover:bg-card transition-colors"
            >
              {mapExpanded ? (
                <><ArrowRight size={12} className="rotate-180" /> Collapse</>
              ) : (
                <><ArrowRight size={12} className="rotate-0" /> Expand map</>
              )}
            </button>
            {mapComponent}
          </div>

          {/* Draggable divider */}
          {!mapExpanded && (
            <div
              className="w-1 cursor-col-resize bg-border hover:bg-primary/30 transition-colors shrink-0 flex items-center justify-center group"
              onMouseDown={handleMouseDown}
            >
              <GripVertical size={14} className="text-muted-foreground/40 group-hover:text-primary/60" />
            </div>
          )}

          {/* RIGHT: scrollable list panel */}
          <div
            ref={listsPanelRef}
           className="flex flex-col overflow-y-auto border-l border-border bg-background overscroll-contain"
              style={{
                width: `${mapExpanded ? 15 : 100 - splitPercent}%`,
                minWidth: mapExpanded ? 0 : 300,
                transition: 'width 0.3s ease',
                WebkitOverflowScrolling: 'touch',
                overflowAnchor: 'none',
              }}
           >
            {/* Featured/Boosted Listings Hero — shown only before search */}
            {!hasSearched && featuredListings.length > 0 && (
              <div className="px-4 pt-4 pb-2 shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Featured Listings</span>
                </div>
                <div className="space-y-3">
                  {featuredListings.slice(0, 3).map((prop) => {
                    const img = (prop.images && prop.images[0]) || prop.image_url;
                    const isRent = prop.listing_type === 'rent' || prop.listing_type === 'rental';
                    return (
                      <div
                        key={prop.id}
                        className="group relative rounded-xl overflow-hidden border border-border cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
                        onClick={() => navigate(`/property/${prop.id}`)}
                      >
                        <div className="relative h-40 bg-muted overflow-hidden">
                          {img ? (
                            <img src={img} alt={prop.title || prop.address} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-secondary">
                              <MapPin size={24} className="text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2 flex gap-1.5">
                            {prop.boost_tier && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide shadow-sm">Featured</span>
                            )}
                            {prop.is_featured && !prop.boost_tier && (
                              <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide shadow-sm">Premier</span>
                            )}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
                            <p className="text-white font-bold text-sm">{formatPrice(prop.price, prop.listing_type)}</p>
                            {isRent && <span className="text-white/80 text-[10px]">per week</span>}
                          </div>
                        </div>
                        <div className="px-3 py-2.5 bg-card">
                          <p className="text-sm font-semibold text-foreground truncate">{prop.title || prop.address}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{prop.suburb}{prop.state ? `, ${prop.state}` : ''}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            {prop.beds > 0 && <span>🛏 {prop.beds}</span>}
                            {prop.baths > 0 && <span>🛁 {prop.baths}</span>}
                            {prop.parking > 0 && <span>🚗 {prop.parking}</span>}
                            <span className="ml-auto text-[10px] capitalize text-muted-foreground/70">{prop.property_type}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 mb-1 border-t border-border/50" />
              </div>
            )}

            {/* Status bar + filters */}
            <div className="px-4 py-2 shrink-0">
              {statusBar}
              {prefsBannerVisible && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs text-primary">
                  <span>Showing results based on your saved preferences.</span>
                  <button
                    onClick={() => {
                      setPrefsBannerVisible(false);
                      sessionStorage.setItem('listhq_prefs_banner_dismissed', '1');
                      setFilters(prev => ({ ...prev, priceRange: [0, 5_000_000] as [number, number], minBeds: 0 }));
                      setListingMode('sale');
                    }}
                    className="font-semibold hover:underline shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            {/* Property list */}
            <div className="flex-1 px-4 pb-6">
              {shouldShowPlaceholder ? emptyOrNoResults : (
                <Suspense fallback={<MapSkeleton />}>
                  <VirtualizedPropertyList
                    properties={filteredProperties}
                    isSearching={isSearching}
                    isMobile={false}
                    isSaved={isSaved}
                    onToggleSave={toggleSaved}
                    onSelect={(p) => navigate(`/property/${p.id}`)}
                    cardRefs={cardRefs}
                    isCollab={isCollab}
                    getPropertyReactions={isCollab ? getPropertyReactions : undefined}
                    onToggleReaction={isCollab ? toggleReaction : undefined}
                    hasPartnerViewed={isCollab ? hasPartnerViewed : undefined}
                    currentUserId={user?.id}
                    areaSearch={areaSearch}
                    searchRadius={searchRadius}
                    onClearAreaSearch={() => handleAreaSearch(null)}
                    listingMode={listingMode}
                  />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── Mobile layout ────────────────────────────────────── */
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {mobileView === 'map' ? (
            <>
              <div className="absolute inset-0">{mapComponent}</div>
              <motion.div
                className="absolute bottom-0 left-0 right-0 z-20 bg-background rounded-t-2xl shadow-drawer border-t border-border"
                style={{ height: sheetHeightSpring, paddingBottom: 'env(safe-area-inset-bottom)' }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.1}
                onDrag={(_, info) => {
                  const newH = viewportHeight * SNAP_POINTS[sheetSnap] - info.offset.y;
                  sheetHeightMV.set(Math.max(viewportHeight * 0.15, Math.min(viewportHeight * 0.9, newH)));
                }}
                onDragEnd={handleSheetDragEnd}
              >
                <div className="w-full flex justify-center py-2 cursor-grab active:cursor-grabbing touch-none">
                  <div className="w-10 h-1.5 rounded-full bg-muted" />
                </div>
                <div className="px-4 pb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'}
                  </span>
                  <div className="flex items-center gap-2">
                    <Suspense fallback={null}>
                      <FilterSidebar
                        filters={filters}
                        onChange={setFilters}
                        isOpen={filtersOpen}
                        onToggle={() => setFiltersOpen(o => !o)}
                        totalCount={displayProperties.length}
                        filteredCount={filteredProperties.length}
                      />
                    </Suspense>
                    <button onClick={() => setMobileView('list')} className="text-xs text-primary font-medium">
                      View list
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" style={{ maxHeight: 'calc(100% - 3.75rem)' }}>
                  {shouldShowPlaceholder ? emptyOrNoResults : (
                    <Suspense fallback={<MapSkeleton />}>
                      <VirtualizedPropertyList
                        properties={filteredProperties}
                        isSearching={isSearching}
                        isMobile={true}
                        isSaved={isSaved}
                        onToggleSave={toggleSaved}
                        onSelect={(p) => navigate(`/property/${p.id}`)}
                        cardRefs={cardRefs}
                        isCollab={isCollab}
                        getPropertyReactions={isCollab ? getPropertyReactions : undefined}
                        onToggleReaction={isCollab ? toggleReaction : undefined}
                        hasPartnerViewed={isCollab ? hasPartnerViewed : undefined}
                        currentUserId={user?.id}
                        listingMode={listingMode}
                      />
                    </Suspense>
                  )}
                </div>
              </motion.div>
              <motion.button
                onClick={() => {
                  const hero = document.querySelector('[aria-label="Start voice search"]') as HTMLButtonElement;
                  if (hero) { window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => hero.click(), 500); }
                }}
                style={{ bottom: sheetHeightSpring, marginBottom: 20, paddingBottom: 'env(safe-area-inset-bottom)' }}
                className="absolute right-4 z-20 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-elevated flex items-center justify-center"
              >
                <Mic size={22} />
              </motion.button>
            </>
          ) : (
            <div className="p-4 overflow-y-auto flex-1 min-h-0 pb-24 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">{filteredProperties.length} properties</span>
                <div className="flex items-center gap-2">
                  <Suspense fallback={null}>
                    <FilterSidebar filters={filters} onChange={setFilters} isOpen={filtersOpen} onToggle={() => setFiltersOpen(o => !o)} totalCount={displayProperties.length} filteredCount={filteredProperties.length} />
                  </Suspense>
                  <button onClick={() => setMobileView('map')} aria-label="Show map view" className="flex items-center gap-1.5 text-xs text-primary font-medium">
                    <Map size={14} /> Show map
                  </button>
                </div>
              </div>
              {shouldShowPlaceholder ? emptyOrNoResults : (
                <Suspense fallback={<MapSkeleton />}>
                  <VirtualizedPropertyList
                    properties={filteredProperties}
                    isSearching={isSearching}
                    isMobile={true}
                    isSaved={isSaved}
                    onToggleSave={toggleSaved}
                    onSelect={(p) => navigate(`/property/${p.id}`)}
                    cardRefs={cardRefs}
                    isCollab={isCollab}
                    getPropertyReactions={isCollab ? getPropertyReactions : undefined}
                    onToggleReaction={isCollab ? toggleReaction : undefined}
                    hasPartnerViewed={isCollab ? hasPartnerViewed : undefined}
                    currentUserId={user?.id}
                    listingMode={listingMode}
                  />
                </Suspense>
              )}
            </div>
          )}
        </div>
      )}

      {/* Property drawer + modals — both lazy, so guard with Suspense */}
      <Suspense fallback={null}>
        <PropertyDrawer
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          isSaved={selectedProperty ? isSaved(selectedProperty.id) : false}
          onToggleSave={toggleSaved}
          searchContext={searchContextForLead}
        />
      </Suspense>

      {showConsumerModal && (
        <Suspense fallback={null}>
          <ConsumerSignUpModal
            open={showConsumerModal}
            onOpenChange={setShowConsumerModal}
            lastQuery={currentQuery || lastSearch?.text || ''}
          />
        </Suspense>
      )}
    </div>
  );
};

// ── How It Works section with scroll-triggered staggered fade-in ──
const HowItWorksSection = ({ t }: { t: (key: string) => string }) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const steps = [
    { num: '1', Icon: Search, title: t('home.howItWorks.step1.title'), desc: t('home.howItWorks.step1.desc') },
    { num: '2', Icon: ArrowLeftRight, title: t('home.howItWorks.step2.title'), desc: t('home.howItWorks.step2.desc') },
    { num: '3', Icon: UserCheck, title: t('home.howItWorks.step3.title'), desc: t('home.howItWorks.step3.desc') },
  ];

  return (
    <section ref={sectionRef} className="bg-gray-50 py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block bg-blue-50 text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full text-[11px] font-semibold mb-4">
            How it works
          </span>
          <h2 className="text-[28px] font-medium text-slate-900">
            The simplest way to reach every buyer
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, idx) => {
            const Icon = step.Icon;
            return (
              <div
                key={step.num}
                className="bg-white rounded-xl border border-slate-200 p-6 text-center"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.6s ease-out ${idx * 150}ms, transform 0.6s ease-out ${idx * 150}ms`,
                }}
              >
                <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                  <Icon size={22} />
                </div>
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-display font-bold text-xl flex items-center justify-center mx-auto mb-4">{step.num}</div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ── Inline Translation Demo card with language switcher ──
type DemoLang = 'zh' | 'vi' | 'ar' | 'en';

const DEMO_CONTENT: Record<DemoLang, { title: string; subtitle: string; description: string; chips: string[]; rtl?: boolean }> = {
  zh: {
    title: '宽敞的家庭住宅，步行可达优质学校',
    subtitle: '南墨尔本，维多利亚州 · ¥6,240,000',
    description: '这套精心设计的住宅融合了现代生活与传统维多利亚风格，坐落于顶级学区...',
    chips: ['近优质中学', '步行至亚洲超市', '华人社区活跃'],
  },
  vi: {
    title: 'Ngôi nhà gia đình rộng rãi, gần trường tốt',
    subtitle: 'South Melbourne, VIC · ₫ 28.5 tỷ',
    description: 'Ngôi nhà được thiết kế tinh tế này kết hợp cuộc sống hiện đại với phong cách Victoria truyền thống...',
    chips: ['Gần trường tốt', 'Cộng đồng Việt Nam', 'Chợ châu Á gần đây'],
  },
  ar: {
    title: 'منزل عائلي فسيح، قريب من المدارس الجيدة',
    subtitle: 'ساوث ملبورن، VIC · 4,200,000 د.إ',
    description: 'هذا المنزل الفاخر يجمع بين الحياة العصرية والطراز الفيكتوري الكلاسيكي...',
    chips: ['قريب من المدارس', 'مجتمع عربي نشط', 'أسواق حلال قريبة'],
    rtl: true,
  },
  en: {
    title: 'Spacious family home, walking distance to top schools',
    subtitle: 'South Melbourne VIC · $1,850,000',
    description: 'This beautifully designed home combines modern living with classic Victorian style, in a top school catchment...',
    chips: ['Top school zone', 'Near Asian grocers', 'Active community'],
  },
};

const DEMO_LANGS: { key: DemoLang; label: string }[] = [
  { key: 'zh', label: '中文' },
  { key: 'vi', label: 'Tiếng Việt' },
  { key: 'ar', label: 'العربية' },
  { key: 'en', label: 'English' },
];

const TranslationDemoInline = () => {
  const [activeLang, setActiveLang] = useState<DemoLang>('zh');
  const [cardVisible, setCardVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCardVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const data = DEMO_CONTENT[activeLang];

  return (
    <section
      ref={sectionRef}
      className={`max-w-3xl mx-auto px-4 py-12 transition-opacity duration-700 ${cardVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-slate-800 truncate">
            3 bed House · South Melbourne VIC · $1.85M
          </span>
          <span className="bg-blue-50 text-blue-600 text-xs font-medium px-3 py-1 rounded-full shrink-0">
            AI Translated
          </span>
        </div>

        {/* Language switcher */}
        <div className="px-6 py-3 border-b border-slate-100 flex gap-2 flex-wrap">
          {DEMO_LANGS.map((l) => {
            const isActive = l.key === activeLang;
            return (
              <button
                key={l.key}
                type="button"
                onClick={() => setActiveLang(l.key)}
                className={`text-sm px-4 py-1.5 rounded-full cursor-pointer transition-colors ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {l.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex gap-5" dir={data.rtl ? 'rtl' : 'ltr'}>
          <div className="w-36 h-24 rounded-xl bg-slate-100 flex-shrink-0 flex items-center justify-center text-xs text-slate-400">
            Property photo
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900">{data.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{data.subtitle}</p>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{data.description}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {data.chips.map((chip) => (
                <span key={chip} className="bg-emerald-50 text-emerald-700 text-xs px-3 py-1 rounded-full">
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            Every listing automatically translated by AI · No agent effort required
          </p>
        </div>
      </div>
    </section>
  );
};

export default Index;
