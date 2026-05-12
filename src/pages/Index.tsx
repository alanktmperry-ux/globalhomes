import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Mic, Search, Play, X, ArrowRight, Unlock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';
import LiveActivityTicker from '@/components/LiveActivityTicker';
import HomeCountUp from '@/components/HomeCountUp';
import FeaturedListings from '@/features/marketing/FeaturedListings';
import ReplaceFiveTools from '@/features/marketing/ReplaceFiveTools';
import VoiceListingShowcase from '@/features/marketing/VoiceListingShowcase';
import HaloBoardPreview from '@/features/marketing/HaloBoardPreview';
// PricingSection removed from homepage; lives on /for-agents/pricing
import FinalCTA from '@/features/marketing/FinalCTA';
import HeroSearchPreview from '@/components/home/HeroSearchPreview';

// ============================================================
// Wave 17 V8 — Buyer-first multilingual homepage
// Inspirations: Apple.com (clean), FlightStory.com (bold italic
// accents), PropertyGuru (functional portal).
// NOTE: SiteHeader/SiteFooter are provided by PublicLayout, so
// Section 1 (nav) and Section 10 (footer) from the brief are
// intentionally omitted here to avoid duplicate chrome.
// ============================================================

const T = {
  blue: '#2563EB',
  blueH: '#1d4ed8',
  blueL: '#EFF6FF',
  blueMid: '#DBEAFE',
  ink: '#0a0f1e',
  mid: '#374151',
  muted: '#6B7280',
  subtle: '#9CA3AF',
  border: '#E5E7EB',
  off: '#F9FAFB',
  off2: '#F3F4F6',
  green: '#10B981',
  amber: '#F59E0B',
  blueTint: '#F5F8FF',
};

// ─── Language sequence ────────────────────────────────────────
type SeqItem = {
  lang: string; flag: string; flagLabel: string;
  line1: string; line2: string; ph: string; sub: string;
  cardTitle: string; cardPrice: string; code: string; mic: string;
};
const SEQUENCE: SeqItem[] = [
  { lang:'EN',    flag:'🇦🇺', flagLabel:'English',    line1:'Find your home.',          line2:'In any language.',          ph:'Type address, suburb or school zone…',    sub:'Showing in English',           cardTitle:'Spacious family home, walk to top-ranked schools', cardPrice:'$1,250,000',      code:'en-AU', mic:'Speak in your language' },
  { lang:'中文',  flag:'🇨🇳', flagLabel:'中文',        line1:'找到您的家。',              line2:'用您的语言。',              ph:'搜索地址、区域或学区…',                  sub:'正在显示：中文结果',           cardTitle:'宽敞家庭住宅，步行可达顶级学校',                   cardPrice:'¥5,950,000',      code:'zh-CN', mic:'用您的语言说' },
  { lang:'Viet',  flag:'🇻🇳', flagLabel:'Tiếng Việt', line1:'Tìm ngôi nhà của bạn.',    line2:'Bằng ngôn ngữ của bạn.',   ph:'Tìm địa chỉ, khu vực hoặc trường học…',  sub:'Đang hiển thị: Tiếng Việt',   cardTitle:'Nhà gia đình rộng, đi bộ đến trường top',         cardPrice:'₫20.8 tỷ',        code:'vi-VN', mic:'Nói bằng ngôn ngữ của bạn' },
  { lang:'عربي',  flag:'🇸🇦', flagLabel:'العربية',    line1:'ابحث عن منزلك.',           line2:'بلغتك.',                   ph:'ابحث عن العنوان أو المنطقة…',            sub:'يتم العرض باللغة العربية',    cardTitle:'منزل عائلي فسيح، قريب من أفضل المدارس',          cardPrice:'د.إ 3,062,500',   code:'ar-SA', mic:'تحدث بلغتك' },
  { lang:'हिंदी', flag:'🇮🇳', flagLabel:'हिंदी',      line1:'अपना घर खोजें।',           line2:'अपनी भाषा में।',           ph:'पता, उपनगर या स्कूल खोजें…',            sub:'हिंदी में दिखाया जा रहा है', cardTitle:'विशाल पारिवारिक घर, शीर्ष स्कूलों तक पैदल',     cardPrice:'₹6.95 करोड़',    code:'hi-IN', mic:'अपनी भाषा में बोलें' },
  { lang:'한국어', flag:'🇰🇷', flagLabel:'한국어',      line1:'당신의 집을 찾으세요.',     line2:'당신의 언어로.',           ph:'주소, 교외 또는 학교 구역 검색…',        sub:'한국어로 표시 중',            cardTitle:'넓은 가족 주택, 상위권 학교까지 도보',            cardPrice:'$1,250,000',      code:'ko-KR', mic:'한국어로 말하세요' },
  { lang:'বাংলা', flag:'🇧🇩', flagLabel:'বাংলা',      line1:'আপনার বাড়ি খুঁজুন।',     line2:'আপনার ভাষায়।',           ph:'ঠিকানা, উপশহর বা স্কুল অঞ্চল খুঁজুন…', sub:'বাংলায় দেখানো হচ্ছে',      cardTitle:'প্রশস্ত পারিবারিক বাড়ি, শীর্ষ স্কুল পর্যন্ত হেঁটে', cardPrice:'$1,250,000', code:'bn-BD', mic:'আপনার ভাষায় কথা বলুন' },
];

const MARQUEE_LANGS = [
  ['🇦🇺','English'],['🇨🇳','中文'],['🇻🇳','Tiếng Việt'],['🇸🇦','العربية'],['🇮🇳','हिंदी'],
  ['🇰🇷','한국어'],['🇯🇵','日本語'],['🇬🇷','Ελληνικά'],['🇮🇹','Italiano'],['🇵🇹','Português'],
  ['🇪🇸','Español'],['🇵🇭','Filipino'],['🇮🇩','Bahasa'],['🇹🇭','ภาษาไทย'],['🇹🇷','Türkçe'],
  ['🇷🇺','Русский'],['🇫🇷','Français'],['🇩🇪','Deutsch'],['🇵🇰','اردو'],['🇱🇰','සිංහල'],
];

const TILE_LANGS = [
  { flag:'🇦🇺', name:'English',    native:'English',     idx:0 },
  { flag:'🇨🇳', name:'Chinese',    native:'中文',          idx:1 },
  { flag:'🇻🇳', name:'Vietnamese', native:'Tiếng Việt',  idx:2 },
  { flag:'🇸🇦', name:'Arabic',     native:'العربية',     idx:3 },
  { flag:'🇮🇳', name:'Hindi',      native:'हिंदी',        idx:4 },
  { flag:'🇰🇷', name:'Korean',     native:'한국어',         idx:-1 },
  { flag:'🇯🇵', name:'Japanese',   native:'日本語',         idx:-1 },
  { flag:'🇬🇷', name:'Greek',      native:'Ελληνικά',    idx:-1 },
  { flag:'🇮🇹', name:'Italian',    native:'Italiano',    idx:-1 },
];

// Brand-coloured gradient placeholders used when a real listing has no photo,
// and as the hero card backdrop pre-launch (zero real listings). No stock photos.
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #2563EB 0%, #1d4ed8 55%, #0a0f1e 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #1e40af 60%, #0a0f1e 100%)',
  'linear-gradient(135deg, #60a5fa 0%, #2563EB 55%, #1e3a8a 100%)',
  'linear-gradient(135deg, #1e3a8a 0%, #2563EB 50%, #60a5fa 100%)',
];
// Inline SVG house outline (data URL) — neutral placeholder image, no stock photography.
const HOUSE_PLACEHOLDER_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 180'>
      <rect width='240' height='180' fill='none'/>
      <path d='M40 100 L120 50 L200 100 L200 150 L40 150 Z' fill='none' stroke='rgba(255,255,255,0.55)' stroke-width='3' stroke-linejoin='round'/>
      <path d='M100 150 L100 110 L140 110 L140 150' fill='none' stroke='rgba(255,255,255,0.55)' stroke-width='3' stroke-linejoin='round'/>
    </svg>`
  );

// Currency-naive AU price formatter used by both the hero card and the featured grid.
function fmtPriceStatic(price?: number | null, listingType?: string | null): string {
  if (!price) return 'Price on request';
  if (listingType === 'rent' || listingType === 'rental') return `$${price.toLocaleString()}/wk`;
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(price % 1_000_000 === 0 ? 0 : 2)}M`;
  return `$${price.toLocaleString()}`;
}

const TRANS_MAP = [
  { en:'Spacious 4-bedroom family home near top schools',
    zh:'宽敞的四居室家庭住宅，毗邻顶级学校',
    vi:'Ngôi nhà gia đình 4 phòng ngủ rộng rãi, gần các trường hàng đầu',
    ar:'منزل عائلي رحيب من أربع غرف نوم بالقرب من أفضل المدارس',
    hi:'शीर्ष स्कूलों के पास विशाल 4-बेडरूम पारिवारिक घर' },
  { en:'Modern 2-bedroom apartment with city views',
    zh:'现代双卧室公寓，享有城市景观',
    vi:'Căn hộ 2 phòng ngủ hiện đại với tầm nhìn thành phố',
    ar:'شقة عصرية من غرفتين مع إطلالات على المدينة',
    hi:'शहर के दृश्यों के साथ आधुनिक 2 बेडरूम अपार्टमेंट' },
  { en:'Renovated heritage home, walk to cafes and schools',
    zh:'翻修的历史建筑，步行可达咖啡馆和学校',
    vi:'Nhà di sản được cải tạo, đi bộ đến quán cà phê và trường học',
    ar:'منزل تراثي مجدد على مقربة من المقاهي والمدارس',
    hi:'पुनर्निर्मित विरासत घर, कैफे और स्कूलों तक पैदल' },
];

// ─── Hooks ────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.04, rootMargin: '0px 0px 0px 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ─── Component ────────────────────────────────────────────────
const Index = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const manualLangRef = useRef(false);
  const [seqIdx, setSeqIdx] = useState(0);
  const [blur, setBlur] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalQuery, setModalQuery] = useState('');
  const [propertyCount, setPropertyCount] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Front card crossfade refs
  const layerARef = useRef<HTMLDivElement>(null);
  const layerBRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLSpanElement>(null);
  const activeLayerRef = useRef<'a' | 'b'>('a');
  const cardIdxRef = useRef(0);

  const seq = SEQUENCE[seqIdx];

  useScrollReveal();

  // Live property count
  useEffect(() => {
    supabase.from('properties').select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .then(({ count }) => setPropertyCount(count ?? null));
  }, []);

  // Featured listings — real Supabase data, no fabricated content.
  // Empty array pre-launch is fine; UI renders an empty state.
  const { data: featuredListings = [] } = useQuery({
    queryKey: ['homepage-featured-listings'],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const cols =
        'id, title, address, suburb, state, price, price_formatted, images, image_url, property_type, beds, baths, parking, listing_type, boost_tier, is_featured';

      const { data: boosted } = await supabase
        .from('properties')
        .select(cols)
        .eq('is_active', true)
        .or('is_featured.eq.true,boost_tier.not.is.null')
        .order('created_at', { ascending: false })
        .limit(6);

      const seen = new Set<string>();
      const unique: any[] = (boosted ?? []).filter((p: any) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      if (unique.length >= 3) return unique.slice(0, 6);

      const { data: fallback } = await supabase
        .from('properties')
        .select(cols)
        .eq('is_active', true)
        .or('listing_type.eq.sale,listing_type.is.null')
        .order('created_at', { ascending: false })
        .limit(6);

      for (const p of (fallback ?? []) as any[]) {
        if (!seen.has(p.id)) { seen.add(p.id); unique.push(p); }
        if (unique.length >= 6) break;
      }

      return unique;
    },
  });

  // Hero rotating card source — derived from real listings.
  // When no real listings exist yet, the card shows a single static
  // brand-gradient placeholder; the rotation simply doesn't fire.
  type HeroCard = { img: string | null; gradient: string; title: string; price: string; meta: string; };
  const heroCards: HeroCard[] = useMemo(() => {
    if (!featuredListings.length) return [];
    return featuredListings.slice(0, 6).map((p: any, i: number) => {
      const img = (p.images && p.images[0]) || p.image_url || null;
      const beds = p.beds || 0, baths = p.baths || 0, cars = p.parking || 0;
      const metaParts: string[] = [];
      if (beds) metaParts.push(`${beds} bed`);
      if (baths) metaParts.push(`${baths} bath`);
      if (cars) metaParts.push(`${cars} car`);
      return {
        img,
        gradient: FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length],
        title: p.title || p.address || `${p.suburb ?? ''}${p.state ? `, ${p.state}` : ''}`,
        price: p.price_formatted || fmtPriceStatic(p.price, p.listing_type),
        meta: metaParts.join(' · ') || (p.property_type ?? ''),
      };
    });
  }, [featuredListings]);

  const fmtPrice = (price: number, listingType?: string) => fmtPriceStatic(price, listingType);

  useEffect(() => {
    const map: Record<string, number> = {
      zh: 1, 'zh-CN': 1, 'zh-TW': 1,
      vi: 2,
      ar: 3,
      hi: 4,
      ko: 5,
      bn: 6,
    };
    const idx = map[language];
    manualLangRef.current = idx !== undefined;
    setBlur(true);
    setTimeout(() => {
      setSeqIdx(idx ?? 0);
      setSearchQuery('');
      setBlur(false);
    }, 300);
  }, [language]);

  // Language cycle (paused when user manually selected a language)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      if (manualLangRef.current || language === 'en') return;
      setBlur(true);
      setTimeout(() => {
        setSeqIdx((i) => (i + 1) % SEQUENCE.length);
        setSearchQuery('');
        setBlur(false);
      }, 300);
    }, 4200);
    return () => clearInterval(id);
  }, [language]);

  // Card cycle — crossfade image layer + text inside the static front card.
  // Only cycles when 2+ real listings are available; otherwise the static
  // initial card (gradient + empty-state copy) stays put.
  useEffect(() => {
    if (heroCards.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      const next = (cardIdxRef.current + 1) % heroCards.length;
      const listing = heroCards[next];
      cardIdxRef.current = next;
      setBackCardIdx((next + 1) % heroCards.length);

      // Preload next image (if any) — only swap once it's loaded
      const pre = new Image();
      const bg = listing.img ? `url(${listing.img})` : listing.gradient;
      const runSwap = () => {
        const inactive = activeLayerRef.current === 'a' ? layerBRef.current : layerARef.current;
        const active = activeLayerRef.current === 'a' ? layerARef.current : layerBRef.current;
        if (inactive) {
          inactive.style.backgroundImage = bg;
          inactive.style.animation = 'none';
          void inactive.offsetWidth;
          inactive.style.animation = '';
        }
        requestAnimationFrame(() => {
          if (inactive) inactive.classList.add('active');
          if (active) active.classList.remove('active');
          activeLayerRef.current = activeLayerRef.current === 'a' ? 'b' : 'a';
        });

        const t = titleRef.current;
        const p = priceRef.current;
        if (t) t.classList.add('hcard-text-hidden');
        if (p) p.classList.add('hcard-text-hidden');
        window.setTimeout(() => {
          if (t) { t.textContent = listing.title; t.classList.remove('hcard-text-hidden'); }
          if (p) { p.textContent = listing.price; p.classList.remove('hcard-text-hidden'); }
        }, 200);
        const m = metaRef.current;
        if (m) m.textContent = listing.meta;
      };
      if (listing.img) {
        pre.onload = runSwap;
        pre.onerror = runSwap;
        pre.src = listing.img;
      } else {
        runSwap();
      }
    }, 5000);
    return () => clearInterval(id);
  }, [heroCards]);


  const openSearch = useCallback((q: string) => {
    setModalQuery(q);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => setModalOpen(false), []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [modalOpen, closeModal]);

  // ── Voice search (Web Speech API) ──────────────────────────
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing'>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceUnsupportedTip, setVoiceUnsupportedTip] = useState(false);
  const recognitionRef = useRef<any>(null);
  const langCodeRef = useRef<string>(SEQUENCE[0].code);
  const errorTimerRef = useRef<number | null>(null);
  const tipTimerRef = useRef<number | null>(null);

  // Keep active language code in sync (read from ref inside callbacks)
  useEffect(() => {
    langCodeRef.current = SEQUENCE[seqIdx].code;
  }, [seqIdx]);

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current);
      try { recognitionRef.current?.stop?.(); } catch { /* noop */ }
      recognitionRef.current = null;
    };
  }, []);

  const startVoice = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceUnsupportedTip(true);
      if (tipTimerRef.current) window.clearTimeout(tipTimerRef.current);
      tipTimerRef.current = window.setTimeout(() => setVoiceUnsupportedTip(false), 4000);
      return;
    }

    // If already listening, stop
    if (voiceState === 'listening' && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* noop */ }
      return;
    }

    setVoiceError(null);

    const recognition = new SpeechRecognition();
    // Set language to currently active hero cycle language — every click
    recognition.lang = langCodeRef.current || 'en-AU';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => setVoiceState('listening');

    recognition.onresult = (e: any) => {
      const text = (e.results?.[0]?.[0]?.transcript || '').trim();
      if (text) {
        setSearchQuery(text);
        try { inputRef.current?.blur(); } catch { /* noop */ }
        window.setTimeout(() => navigate(`/buy?q=${encodeURIComponent(text)}`), 200);
      }
    };

    recognition.onend = () => {
      setVoiceState('idle');
      recognitionRef.current = null;
    };

    recognition.onerror = (e: any) => {
      setVoiceState('idle');
      recognitionRef.current = null;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setVoiceError('Microphone access denied. Please allow access in your browser settings.');
      } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
        setVoiceError('Nothing heard. Please try again.');
      }
      if (e.error && e.error !== 'aborted') {
        if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current);
        errorTimerRef.current = window.setTimeout(() => setVoiceError(null), 3000);
      }
    };

    // Must be called synchronously in the click handler (Safari requirement)
    try {
      recognition.start();
    } catch (err) {
      setVoiceState('idle');
      recognitionRef.current = null;
      setVoiceError('Could not start voice search. Please try again.');
      if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current);
      errorTimerRef.current = window.setTimeout(() => setVoiceError(null), 3000);
    }
  }, [voiceState, openSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/buy?q=${encodeURIComponent(q)}`);
  };

  // Initial card content (static — JS handles all subsequent updates via refs).
  // Falls back to a brand-gradient empty-state card pre-launch (no real listings yet).
  const EMPTY_STATE_TITLE = 'Listings coming soon';
  const EMPTY_STATE_PRICE = 'First agents are getting their pocket listings ready';
  const initialFront: { img: string | null; gradient: string; title: string; price: string; meta: string } =
    heroCards[0] ?? {
      img: null,
      gradient: FALLBACK_GRADIENTS[0],
      title: EMPTY_STATE_TITLE,
      price: EMPTY_STATE_PRICE,
      meta: '',
    };
  const [backCardIdx, setBackCardIdx] = useState(1);

  return (
    <>
      <Helmet>
        <title>ListHQ — Find your home in any language. Multilingual property search Australia</title>
        <meta name="description" content="Australia's only multilingual property platform. Listings auto-translated into any language. Free for buyers, always." />
        <link rel="canonical" href="https://listhq.com.au/" />
        
      </Helmet>

      <style>{`
        .wave17 { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: ${T.ink}; }
        .wave17 .reveal { opacity: 0; transform: translateY(36px); transition: opacity .3s ease, transform .3s ease; }
        .wave17 .reveal.in-view { opacity: 1; transform: translateY(0); }
        .wave17 .reveal-d1 { transition-delay: .1s; }
        .wave17 .reveal-d2 { transition-delay: .2s; }
        .wave17 .reveal-d3 { transition-delay: .3s; }
        .wave17 .blur-out { filter: blur(8px); opacity: 0.3; transition: filter .25s ease, opacity .25s ease; }
        .wave17 .blur-in  { filter: blur(0); opacity: 1; transition: filter .35s ease, opacity .35s ease; }
        @keyframes pulseDot { 0%,100% { opacity:1 } 50% { opacity:.3 } }
        .pulseDot { animation: pulseDot 1.6s ease-in-out infinite; }
        @keyframes marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        .marquee-track { animation: marquee 30s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
        .hcard-img-wrap { position: relative; height: 290px; overflow: hidden; }
        .hcard-layer { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0; transition: opacity 1.5s ease-in-out; transform-origin: center center; will-change: transform, opacity; }
        .hcard-layer.active { opacity: 1; animation: hcard-kenburns 5s ease-in-out forwards; }
        @keyframes hcard-kenburns { from { transform: scale(1.0); } to { transform: scale(1.06); } }
        .hcard-title { min-height: 2.8em; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; transition: opacity 0.4s ease; }
        .hcard-price { min-height: 1.4em; transition: opacity 0.4s ease; }
        .hcard-text-hidden { opacity: 0 !important; transition: opacity 0.15s ease !important; }
        .hcard-main { position: relative; }
        .hcard-main::before {
          content: '';
          position: absolute;
          inset: 0;
          background: #fff;
          border-radius: 20px;
          transform: rotate(-4deg) translate(-12px, -8px);
          box-shadow: 0 20px 60px rgba(0,0,0,.10);
          z-index: -1;
          opacity: 0.75;
        }
        .chip { background: ${T.off}; border: 1px solid ${T.border}; border-radius: 100px; padding: 6px 11px; font-size: 12px; font-weight: 600; color: ${T.mid}; cursor: pointer; transition: all .15s ease; }
        .chip:hover { background: ${T.blueL}; border-color: ${T.blueMid}; color: ${T.blue}; }
        .sliver-link:hover { text-decoration: underline; }
        @keyframes typeBlink { 50% { opacity: 0 } }
        .type-cursor::after { content:'▋'; color:${T.blue}; margin-left:2px; animation: typeBlink 1s steps(1) infinite; }
        @keyframes micRing { 0% { transform: scale(1); opacity: .55 } 100% { transform: scale(1.85); opacity: 0 } }
        .mic-ring { position:absolute; inset:0; border-radius:50%; background:#ef4444; animation: micRing 1.2s ease-out infinite; }
        @keyframes spin { to { transform: rotate(360deg) } }
        .mic-spin { width:18px; height:18px; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; border-radius:50%; animation: spin .8s linear infinite; }
        @keyframes errFade { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }
        .voice-err { animation: errFade .25s ease-out; }
        .hero-pill:focus-within { border-color: #2563EB !important; box-shadow: 0 8px 32px rgba(37,99,235,0.20), 0 0 0 4px rgba(37,99,235,0.08) !important; }
        .hero-pill input::placeholder { color: #6a6a6a; }
        .hero-headline { font-size: clamp(48px, 7vw, 110px); font-weight: 800; letter-spacing: -0.05em; line-height: 1.05; color: #000; margin-bottom: 0; max-width: 1100px; }
        .hero-headline .line1 { display: block; line-height: 1.05; color: #000; }
        .hero-headline .line2 { display: block; margin-top: 0.18em; padding-bottom: 0.08em; font-weight: 800; font-style: normal; line-height: 1.05; min-height: 1.2em; font-size: 1em; background: linear-gradient(135deg, #2563EB 0%, #4F88FF 60%, #93C5FD 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; }
        .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); border:0; }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none; }
          .pulseDot { animation: none; opacity: 1; }
          .hcard-layer { transition: none; }
          .hcard-title, .hcard-price { transition: none; }
          .reveal {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
          .reveal-d1, .reveal-d2, .reveal-d3 { transition-delay: 0s !important; }
        }
      `}</style>

      <div className="wave17">
        <a href="#main-content"
           style={{ position:'absolute', left:'-9999px', top:'auto', width:1, height:1, overflow:'hidden' }}
           onFocus={(e) => { e.currentTarget.style.left = '16px'; e.currentTarget.style.width = 'auto'; e.currentTarget.style.height = 'auto'; }}
           onBlur={(e) => { e.currentTarget.style.left = '-9999px'; e.currentTarget.style.width = '1px'; e.currentTarget.style.height = '1px'; }}>
          Skip to main content
        </a>
        {/* ═══ Agent sliver bar (rotating) ═══ */}
        <SliverBar />
        


        {/* ═══ SECTION 2 — Hero (HeroSearchPreview) ═══ */}
        <HeroSearchPreview />

        {/* ═══ Live Activity Ticker ═══ */}
        <LiveActivityTicker />

        {/* ═══ SECTION 3 — Language Marquee ═══ */}
        <div style={{ background:T.ink, padding:'14px 0', overflow:'hidden' }}>
          <div className="marquee-track" style={{ display:'flex', whiteSpace:'nowrap', width:'max-content' }}>
            {[...MARQUEE_LANGS, ...MARQUEE_LANGS].map(([flag, name], i) => (
              <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'0 32px', fontSize:13, fontWeight:700, color:'#fff', borderRight:'1px solid rgba(255,255,255,.12)' }}>
                <span style={{ fontSize:18 }}>{flag}</span>{name}
              </span>
            ))}
          </div>
        </div>

        {/* ═══ SECTION 4 — Trust Strip (count-up) ═══ */}
        <div style={{ background:'#fff', borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, padding:'72px 24px' }}>
          <div className="trust-strip" style={{ maxWidth:1280, margin:'0 auto' }}>
            {[
              { type:'count' as const, target: 50000, format: (v:number)=>v.toLocaleString(), label:'ACTIVE LISTINGS' },
              { type:'static' as const, text:'Any language',                                  label:'AUTO-TRANSLATED' },
              { type:'count' as const, target: 7,     format: (v:number)=>`${v}M+`,           label:'MULTILINGUAL BUYERS' },
              { type:'static' as const, text:'Free',                                          label:'COST FOR BUYERS' },
            ].map((s, i) => (
              <div
                key={i}
                className={`trust-cell ${s.label === 'AUTO-TRANSLATED' ? 'trust-cell--auto-translated' : ''}`}
                style={{ textAlign:'center', padding:'12px 16px' }}
              >
                <HomeCountUp
                  target={s.type === 'count' ? s.target : 0}
                  format={s.type === 'count' ? s.format : undefined}
                  staticText={s.type === 'static' ? s.text : undefined}
                  className={`${s.label === 'AUTO-TRANSLATED' ? 'trust-value--auto-translated' : 'text-[clamp(48px,6vw,88px)]'} font-extrabold tabular-nums`}
                  style={{
                    background: 'linear-gradient(135deg, #2563EB, #4F88FF, #93C5FD)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                    display: 'inline-block',
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    fontWeight: 800,
                    ...(s.label === 'AUTO-TRANSLATED'
                      ? {
                          fontSize: 'clamp(20px, 2.4vw, 36px)',
                          whiteSpace: 'nowrap',
                          lineHeight: 1,
                          letterSpacing: '-0.02em',
                          maxWidth: 'none',
                          width: 'max-content',
                          marginInline: 'auto',
                        }
                      : {
                          whiteSpace: 'nowrap',
                          lineHeight: 1,
                          letterSpacing: '-0.05em',
                        }),
                  }}
                />
                <div className="text-[13px] font-bold tracking-wider uppercase mt-3.5" style={{ color:'#4a4a4a' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <style>{`
            .trust-strip { display:grid; grid-template-columns: repeat(4, 1fr); align-items:end; gap: 24px; }
            .trust-cell--auto-translated { min-width: 0; }
            .trust-value--auto-translated {
              font-size: clamp(20px, 2.4vw, 36px) !important;
              white-space: nowrap !important;
              line-height: 1 !important;
              letter-spacing: -0.02em;
              max-width: none !important;
            }
            @media (max-width: 768px) {
              .trust-strip { grid-template-columns: repeat(2, 1fr); row-gap: 32px; }
            }
          `}</style>
        </div>

        {/* ═══ Featured in [Location] — boosted listings (static seed) ═══ */}
        <FeaturedListings />

        {/* ═══ Replace five tools with one — Bose-signature visual ═══ */}
        <ReplaceFiveTools />

        {/* ═══ Voice Listing showcase — blue gradient stage ═══ */}
        <VoiceListingShowcase />

        {/* ═══ Halo Board preview — reverse marketplace ═══ */}
        <HaloBoardPreview />

        {/* ═══ SECTION 4b — Featured Listings ═══ */}
        <section style={{ background: '#fff', padding: '72px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.blue, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8 }}>
                  {t('home.featured.eyebrow')}
                </div>
                <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, margin: 0, color: T.ink }}>
                  {t('home.featured.heading')}
                </h2>
              </div>
              {featuredListings.length > 0 && (
                <button
                  onClick={() => navigate('/buy')}
                  style={{ background: 'transparent', border: `1.5px solid ${T.border}`, borderRadius: 100, padding: '10px 20px', fontSize: 13, fontWeight: 700, color: T.blue, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {t('home.featured.viewAll')}
                </button>
              )}
            </div>

            {featuredListings.length === 0 ? (
              <div
                style={{
                  borderRadius: 20,
                  border: `1px dashed ${T.border}`,
                  background: 'linear-gradient(135deg, #F5F8FF 0%, #EFF6FF 100%)',
                  padding: '56px 24px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 72, height: 72, margin: '0 auto 18px', borderRadius: 18,
                    background: FALLBACK_GRADIENTS[0],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <img src={HOUSE_PLACEHOLDER_SVG} alt="" aria-hidden="true" style={{ width: 44, height: 44, opacity: 0.95 }} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.ink, marginBottom: 8 }}>
                  Listings coming soon
                </div>
                <div style={{ fontSize: 14, color: T.muted, maxWidth: 480, margin: '0 auto' }}>
                  First agents are getting their pocket listings ready. Check back shortly — or join early to be notified when new properties go live.
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="feat-grid">
                  {featuredListings.map((p: any) => {
                    const img = (p.images && p.images[0]) || p.image_url;
                    const isRent = p.listing_type === 'rent' || p.listing_type === 'rental';
                    return (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/property/${p.id}`)}
                        style={{ borderRadius: 16, border: `1px solid ${T.border}`, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow .2s ease' }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,.1)')}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                      >
                        <div style={{ height: 180, background: FALLBACK_GRADIENTS[0], position: 'relative', overflow: 'hidden' }}>
                          {img ? (
                            <img src={img} alt={p.title || p.address} loading="lazy" decoding="async" width={640} height={480} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <img src={HOUSE_PLACEHOLDER_SVG} alt="" aria-hidden="true" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.85 }} />
                          )}
                          {(p.boost_tier || p.is_featured) && (
                            <span style={{ position: 'absolute', top: 10, left: 10, background: p.boost_tier ? '#f59e0b' : T.blue, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                              {p.boost_tier ? 'Featured' : 'Premier'}
                            </span>
                          )}
                        </div>
                        <div style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: T.ink, marginBottom: 4 }}>
                            {fmtPrice(p.price, p.listing_type)}
                          </div>
                          <div style={{ fontSize: 13, color: T.muted, marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.address || `${p.suburb}${p.state ? `, ${p.state}` : ''}`}
                          </div>
                          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: T.subtle }}>
                            {p.beds > 0 && <span>🛏 {p.beds}</span>}
                            {p.baths > 0 && <span>🛁 {p.baths}</span>}
                            {p.parking > 0 && <span>🚗 {p.parking}</span>}
                            <span style={{ marginLeft: 'auto', textTransform: 'capitalize' }}>{p.property_type || (isRent ? 'rental' : 'sale')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ textAlign: 'center', marginTop: 32 }}>
                  <button
                    onClick={() => navigate('/buy')}
                    style={{ background: T.blue, color: '#fff', border: 'none', padding: '14px 36px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {t('home.featured.browseAll')}
                  </button>
                </div>
              </>
            )}
          </div>
          <style>{`@media (max-width: 860px) { .feat-grid { grid-template-columns: 1fr !important; } }`}</style>
        </section>

        {/* ═══ SECTION 5 — Language Proof ═══ */}
        <section style={{ background: T.blueTint, padding:'88px 24px', borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}` }}>
          <div style={{ maxWidth:1200, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }} className="lang-grid">
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:T.blue, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:14 }}>{t('home.langProof.eyebrow')}</div>
              <h2 style={{ fontSize:'clamp(32px, 3.5vw, 48px)', fontWeight:800, letterSpacing:'-1.5px', lineHeight:1.1, margin:'0 0 18px' }}>
                {t('home.langProof.heading')}
              </h2>
              <p style={{ fontSize:16, color:T.mid, lineHeight:1.7, margin:'0 0 24px' }}>
                {t('home.langProof.body')}
              </p>
              <button onClick={() => inputRef.current?.focus()} style={{ background:T.blue, color:'#fff', border:'none', padding:'14px 28px', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                {t('home.langProof.cta')}
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
              {TILE_LANGS.map((tile) => {
                const active = tile.idx === seqIdx;
                return (
                  <button
                    key={tile.name}
                    onClick={() => { if (tile.idx >= 0) { setBlur(true); setTimeout(() => { setSeqIdx(tile.idx); setBlur(false); }, 200); } }}
                    style={{
                      background: active ? T.blue : T.off,
                      border: `1px solid ${active ? T.blue : T.border}`,
                      borderRadius:14, padding:'16px 14px', cursor:'pointer',
                      display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                      transition:'all .2s ease',
                    }}
                  >
                    <span style={{ fontSize:24 }}>{tile.flag}</span>
                    <span style={{ fontSize:13, fontWeight:700, color: active ? '#fff' : T.ink }}>{tile.name}</span>
                    <span style={{ fontSize:12, color: active ? 'rgba(255,255,255,.85)' : T.muted }}>{tile.native}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <style>{`@media (max-width: 860px) { .lang-grid { grid-template-columns: 1fr !important; } }`}</style>
        </section>

        {/* ═══ SECTION 6 — How It Works ═══ */}
        <section style={{ background:T.off, padding:'88px 24px' }}>
          <div style={{ maxWidth:1200, margin:'0 auto' }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.blue, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:14 }}>{t('home.howItWorks.title')}</div>
            <h2 style={{ fontSize:'clamp(32px, 3.5vw, 48px)', fontWeight:800, letterSpacing:'-1.5px', lineHeight:1.1, margin:'0 0 52px' }}>
              {t('home.howItWorks.subtitle')}
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:24 }} className="how-grid">
              {[
                { n:'01', t: t('home.howItWorks.step1.title'), b: t('home.howItWorks.step1.desc') },
                { n:'02', t: t('home.howItWorks.step2.title'), b: t('home.howItWorks.step2.desc') },
                { n:'03', t: t('home.howItWorks.step3.title'), b: t('home.howItWorks.step3.desc') },
              ].map((s, i) => (
                <div key={s.n} className={`reveal reveal-d${i+1}`} style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:20, padding:'36px 32px' }}>
                  <div style={{ fontSize:64, fontWeight:800, color:T.off2, letterSpacing:'-3px', marginBottom:16, lineHeight:1 }}>{s.n}</div>
                  <h3 style={{ fontSize:19, fontWeight:800, color:T.ink, letterSpacing:'-.4px', margin:'0 0 10px' }}>{s.t}</h3>
                  <p style={{ fontSize:14, color:T.muted, lineHeight:1.7, margin:0 }}>{s.b}</p>
                </div>
              ))}
            </div>
          </div>
          <style>{`@media (max-width:860px){.how-grid{grid-template-columns:1fr !important}}`}</style>
        </section>

        {/* ═══ SECTION 7 — Testimonials ═══ */}
        <section style={{ background:'#fff', padding:'88px 24px' }}>
          <div style={{ maxWidth:1200, margin:'0 auto' }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.blue, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:14 }}>{t('home.testimonials.eyebrow')}</div>
            <h2 style={{ fontSize:'clamp(32px, 3.5vw, 48px)', fontWeight:800, letterSpacing:'-1.5px', lineHeight:1.1, margin:'0 0 52px' }}>
              {t('home.testimonials.heading')}
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:20 }} className="how-grid">
              {([
                { i:'M', q:'I found 6 listings near my children\'s school in one afternoon. Other portals had the same listings but I couldn\'t understand anything.', n:'Mei L.', d:'Auburn, NSW · Bought a 4-bed family home' },
                { i:'T', q:'Tôi tìm thấy căn nhà lý tưởng của mình trong vài giờ. Mọi thứ đều bằng tiếng Việt — giá, trường học, mô tả.', translation:'("I found my dream home in just a few hours. Everything was in Vietnamese — prices, schools, descriptions.")', n:'Tuan N.', d:'Box Hill, VIC · Rented a 2-bed apartment' },
                { i:'P', q:'I showed prices in INR so I can explain to my parents back home what we\'re looking at. ListHQ gets it.', n:'Priya S.', d:'Mosman, NSW · Bought a waterfront home' },
              ] as { i:string; q:string; n:string; d:string; translation?:string }[]).map((c, i) => (
                <div key={c.n} className={`reveal reveal-d${i+1}`} style={{ background:T.off, border:`1px solid ${T.border}`, borderRadius:20, padding:32 }}>
                  <p style={{ fontSize:15, fontWeight:500, color:T.ink, fontStyle:'italic', lineHeight:1.7, margin:'0 0 24px' }}>"{c.q}"</p>
                  {c.translation && (
                    <p style={{ fontSize:13, color:T.muted, fontStyle:'normal', lineHeight:1.6, margin:'-16px 0 24px', fontWeight:400 }}>
                      {c.translation}
                    </p>
                  )}
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{
                      width:42, height:42, borderRadius:'50%',
                      background: ['#FEF3C7','#ECFDF5','#EFF6FF'][i],
                      color: ['#92400E','#065F46','#1E40AF'][i],
                      fontWeight:800, fontSize:16,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      border: `2px solid ${['#FDE68A','#A7F3D0','#BFDBFE'][i]}`,
                    }}>{c.i}</div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{c.n}</div>
                      <div style={{ fontSize:12, color:T.muted }}>{c.d}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ SECTION 8 — Agent Band ═══ */}
        <AgentBand />

        <FAQSection />

        {/* Agent pricing moved to /for-agents/pricing */}

        {/* ═══ Final CTA — dark ink with blue glow ═══ */}
        <FinalCTA />

        {/* ═══ Search modal ═══ */}
        {modalOpen && (
          <div onClick={closeModal} style={{ position:'fixed', inset:0, backdropFilter:'blur(12px)', background:'rgba(0,0,0,.4)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background:'#fff', borderRadius:20, padding:28, maxWidth:680, width:'100%', maxHeight:'82vh', overflowY:'auto' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:'.08em' }}>Search results</div>
                  <h3 style={{ fontSize:20, fontWeight:800, margin:'4px 0 0', color:T.ink }}>{modalQuery}</h3>
                </div>
                <button onClick={closeModal} style={{ background:T.off, border:'none', borderRadius:'50%', width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {featuredListings.length === 0 ? (
                  <div style={{ padding:'28px 16px', textAlign:'center', border:`1px dashed ${T.border}`, borderRadius:14, background:T.off }}>
                    <div style={{ fontSize:14, fontWeight:700, color:T.ink, marginBottom:6 }}>Listings coming soon</div>
                    <div style={{ fontSize:12, color:T.muted }}>First agents are getting their pocket listings ready.</div>
                  </div>
                ) : featuredListings.slice(0, 4).map((p: any) => {
                  const img = (p.images && p.images[0]) || p.image_url;
                  const beds = p.beds || 0, baths = p.baths || 0, cars = p.parking || 0;
                  const metaParts: string[] = [];
                  if (beds) metaParts.push(`${beds} bed`);
                  if (baths) metaParts.push(`${baths} bath`);
                  if (cars) metaParts.push(`${cars} car`);
                  const meta = metaParts.join(' · ') || (p.property_type ?? '');
                  return (
                    <div key={p.id} onClick={() => { closeModal(); navigate(`/property/${p.id}`); }} style={{ display:'flex', gap:14, padding:12, border:`1px solid ${T.border}`, borderRadius:14, cursor:'pointer' }}>
                      <div style={{ width:96, height:72, borderRadius:10, background: img ? `center/cover no-repeat url(${img})` : FALLBACK_GRADIENTS[0], flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {!img && <img src={HOUSE_PLACEHOLDER_SVG} alt="" aria-hidden="true" style={{ width:48, height:48, opacity:0.9 }} />}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:T.ink, marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.title || p.address || `${p.suburb ?? ''}${p.state ? `, ${p.state}` : ''}`}</div>
                        <div style={{ fontSize:12, color:T.muted, marginBottom:6 }}>{meta}</div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ background:T.blueL, color:T.blue, fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:100 }}> any language</span>
                          <span style={{ fontSize:14, fontWeight:800, color:T.ink }}>{p.price_formatted || fmtPrice(p.price, p.listing_type)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => { const q = (modalQuery || searchQuery || '').trim(); closeModal(); navigate(q ? `/buy?q=${encodeURIComponent(q)}` : '/buy'); }} style={{ width:'100%', marginTop:16, background:T.blue, color:'#fff', border:'none', padding:'12px', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                See all results →
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ─── Agent Band ───────────────────────────────────────────────
function AgentBand() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [n, setN] = useState(25);
  const [demoText, setDemoText] = useState('');
  const [demoLang, setDemoLang] = useState<'all' | 'zh' | 'vi' | 'ar' | 'hi'>('all');
  const [results, setResults] = useState<typeof TRANS_MAP[0] | null>(null);
  const [typed, setTyped] = useState({ en:'', zh:'', vi:'', ar:'', hi:'' });
  const [videoOpen, setVideoOpen] = useState(false);

  const buyers = (n * 70).toLocaleString();
  const roi = `${Math.min(12.0, 1.8 + n * 0.1).toFixed(1)}×`;

  const runTranslate = () => {
    const input = demoText.trim().toLowerCase();
    const match = TRANS_MAP.find((m) => m.en.toLowerCase().slice(0, 12) === input.slice(0, 12)) || TRANS_MAP[0];
    setResults(match);
    setTyped({ en:'', zh:'', vi:'', ar:'', hi:'' });

    const langs: (keyof typeof match)[] = ['en','zh','vi','ar','hi'];
    langs.forEach((lk, li) => {
      setTimeout(() => {
        const full = match[lk];
        let i = 0;
        const id = setInterval(() => {
          i++;
          setTyped((t) => ({ ...t, [lk]: full.slice(0, i) }));
          if (i >= full.length) clearInterval(id);
        }, 24);
      }, li * 400);
    });
  };

  return (
    <section style={{ background:T.ink, padding:'72px 24px' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:60, alignItems:'center' }} className="agent-top">
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:T.blue, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:14 }}>{t('home.agents.eyebrow')}</div>
            <h2 style={{ fontSize:'clamp(44px, 5vw, 72px)', fontWeight:800, color:'#fff', letterSpacing:'-2.5px', lineHeight:1, margin:'0 0 22px' }}>
              {t('home.agentBannerHeadline')}
            </h2>
            <p style={{ fontSize:16, color:'rgba(255,255,255,.6)', lineHeight:1.6, margin:'0 0 22px', maxWidth:620 }}>
              {t('home.agentBand.para')}
            </p>
            <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
              {['McGrath','Belle Property','LJ Hooker','Raine & Horne'].map((b) => (
                <span key={b} style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.65)', letterSpacing:'.04em' }}>{b}</span>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <button onClick={() => navigate('/for-agents/pricing')} style={{ background:'#fff', color:T.ink, border:'none', padding:'14px 28px', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer' }}>{t('home.agents.cta')} →</button>
            <p style={{ fontSize:11, color:'rgba(255,255,255,.4)', margin:'10px 0 0', fontWeight:500 }}>
              {t('home.agentBand.finePrint')}
            </p>
            <button onClick={() => setVideoOpen(true)} style={{ background:'transparent', color:'rgba(255,255,255,.7)', border:'1px solid rgba(255,255,255,.2)', padding:'14px 28px', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer' }}>{t('home.agentBand.watchDemo')}</button>
          </div>
        </div>

        {/* Trust signal + demo */}
        <div style={{ marginTop:52, marginBottom:20, textAlign:'center' }}>
          <p style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,.55)', letterSpacing:'.04em', margin:0 }}>
            Trusted by early-access agencies across NSW and VIC
          </p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16, justifyItems:'center' }} className="agent-cards">
          <div style={{ width:'100%', maxWidth:480 }}>
          <div className="reveal reveal-d3" style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:20, padding:20 }}>
            <div style={{ position:'relative', height:180, borderRadius:12, background:'#0f1623', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
              {/* Browser chrome */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:28, background:'#1e2535', display:'flex', alignItems:'center', padding:'0 10px', gap:5 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#ff5f56', display:'inline-block' }} />
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#ffbd2e', display:'inline-block' }} />
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#27c93f', display:'inline-block' }} />
                <div style={{ flex:1, height:14, background:'rgba(255,255,255,.08)', borderRadius:100, margin:'0 8px' }} />
              </div>
              {/* Dashboard body */}
              <div style={{ position:'absolute', top:28, left:0, right:0, bottom:0, display:'flex', padding:8, gap:8 }}>
                <div style={{ width:'38%', display:'flex', flexDirection:'column', gap:5 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ background:'rgba(255,255,255,.06)', borderRadius:6, padding:'6px 8px', display:'flex', gap:6, alignItems:'center' }}>
                      <div style={{ width:32, height:24, background:'rgba(37,99,235,.3)', borderRadius:4, flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <div style={{ height:5, background:'rgba(255,255,255,.2)', borderRadius:100, marginBottom:4 }} />
                        <div style={{ height:4, width:'60%', background:'rgba(255,255,255,.1)', borderRadius:100 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ flex:1, background:'linear-gradient(135deg, #1a2540, #0f3460)', borderRadius:6, position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:18 }}></span>
                  <div style={{ position:'absolute', bottom:6, right:6, background:T.blue, color:'#fff', fontSize:8, fontWeight:700, padding:'2px 6px', borderRadius:100 }}>ANY LANG</div>
                </div>
              </div>
              <button onClick={() => setVideoOpen(true)} aria-label="Play demo video" style={{ position:'relative', zIndex:1, width:54, height:54, borderRadius:'50%', background:'#fff', border:'none', cursor:'pointer', boxShadow:'0 8px 24px rgba(0,0,0,.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Play size={22} style={{ marginLeft:3 }} fill={T.ink} />
              </button>
            </div>
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>Watch · 90 seconds</div>
            <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:6 }}>From upload to multilingual listing live</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.5)' }}>No signup required · See the full agent platform</div>
          </div>
          </div>
        </div>

        {/* ROI slider */}
        <div className="reveal" style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.12)', borderRadius:20, padding:36, marginTop:52 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,.6)', marginBottom:20 }}>
            {t('home.agentBand.roiHeading', { n: String(n) })}
          </div>
          <input type="range" min={1} max={100} value={n} onChange={(e) => setN(Number(e.target.value))}
            aria-label="Number of active listings"
            aria-valuetext={`${n} listings`}
            style={{ width:'100%', accentColor: T.blue }} />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginTop:24 }}>
            {[
              { v: buyers, l: t('home.agentBand.roiLabel1') },
              { v: 'Any', l: t('home.agentBand.roiLabel2') },
              { v: roi, l: t('home.agentBand.roiLabel3') },
            ].map((s) => (
              <div key={s.l} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:20, textAlign:'center' }}>
                <div style={{ fontSize:32, fontWeight:800, color:T.blue, lineHeight:1, marginBottom:8 }}>{s.v}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.45)' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Translation demo */}
        <div className="reveal" style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.12)', borderRadius:20, padding:36, marginTop:24 }}>
          <h3 style={{ fontSize:16, fontWeight:800, color:'#fff', margin:'0 0 6px' }}>{t('home.agentBand.demoTitle')}</h3>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.5)', margin:'0 0 20px' }}>{t('home.agentBand.demoSub')}</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:12 }} className="trans-grid">
            <input
              type="text"
              value={demoText}
              onChange={(e) => setDemoText(e.target.value)}
              placeholder={t('home.agentBand.demoPlaceholder')}
              style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.15)', borderRadius:10, padding:'12px 14px', color:'#fff', fontSize:13, outline:'none' }}
            />
            <select value={demoLang} onChange={(e) => setDemoLang(e.target.value as any)}
              style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.15)', borderRadius:10, padding:'12px 14px', color:'#fff', fontSize:13, outline:'none' }}>
              <option value="all">{t('home.agentBand.demoAll')}</option>
              <option value="zh">{t('home.agentBand.demoChinese')}</option>
              <option value="vi">{t('home.agentBand.demoVietnamese')}</option>
              <option value="ar">{t('home.agentBand.demoArabic')}</option>
              <option value="hi">{t('home.agentBand.demoHindi')}</option>
            </select>
            <button onClick={runTranslate} style={{ background:T.blue, color:'#fff', border:'none', padding:'12px 22px', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer' }}>{t('home.agentBand.translateBtn')}</button>
          </div>
          {results && (
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:18 }}>
              {[
                { k:'en', flag:'🇦🇺', label:'English (original)' },
                { k:'zh', flag:'🇨🇳', label:'Chinese · 中文' },
                { k:'vi', flag:'🇻🇳', label:'Vietnamese · Tiếng Việt' },
                { k:'ar', flag:'🇸🇦', label:'Arabic · العربية' },
                { k:'hi', flag:'🇮🇳', label:'Hindi · हिंदी' },
              ].filter((r) => demoLang === 'all' || r.k === 'en' || r.k === demoLang).map((r) => (
                <div key={r.k} style={{ display:'flex', gap:12, alignItems:'flex-start', background:'rgba(255,255,255,.03)', borderRadius:10, padding:'10px 14px' }}>
                  <span style={{ fontSize:18 }}>{r.flag}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.45)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>{r.label}</div>
                    <div className="type-cursor" style={{ fontSize:14, color:'#fff' }}>{(typed as any)[r.k]}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @media (max-width:960px){
          .agent-top{grid-template-columns:1fr !important}
          .agent-cards{grid-template-columns:1fr !important}
          .trans-grid{grid-template-columns:1fr !important}
        }
      `}</style>
      {videoOpen && (
        <div
          onClick={() => setVideoOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position:'relative', width:'100%', maxWidth:854, borderRadius:20, overflow:'hidden', background:'#000', boxShadow:'0 20px 60px rgba(0,0,0,.5)' }}>
            <button
              onClick={() => setVideoOpen(false)}
              aria-label="Close video"
              style={{ position:'absolute', top:12, right:12, width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,.6)', color:'#fff', border:'none', fontSize:20, lineHeight:1, cursor:'pointer', zIndex:2, display:'flex', alignItems:'center', justifyContent:'center' }}
            >×</button>
            <div style={{ position:'relative', width:'100%', aspectRatio:'16 / 9' }}>
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                title="ListHQ 90-second demo"
                width="854"
                height="480"
                style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:0, borderRadius:20 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

type NavFn = (path: string) => void;
type Theme = { blue: string; blueL: string; blueMid: string; ink: string; mid: string; muted: string; off: string; border: string; green: string; amber: string; blueTint: string };

function PricingSection({ navigate, T }: { navigate: NavFn; T: Theme }) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const { t } = useTranslation();

  const PLANS = [
    {
      name: 'Solo',
      monthly: 799,
      annual: 7670,
      annualMonthly: 639,
      desc: 'Independent agents running their own shop',
      feats: [
        '1 agent seat · up to 10 active listings',
        'Full CRM — pipeline, contacts, deal tracking',
        'Full trust accounting (complete ledger)',
        'multilingual auto-translation on every listing',
        'AI buyer matching + voice search',
        'Halo™ buyer matching board',
        'Email support',
      ],
      cta: 'Start 30-day free trial →',
      sub: 'No credit card required',
      action: () => navigate('/contact'),
      style: 'filled' as const,
      popular: false,
    },
    {
      name: 'Agency',
      monthly: 1999,
      annual: 19190,
      annualMonthly: 1599,
      desc: 'For growing agencies ready to scale',
      feats: [
        'Up to 5 agent seats',
        'Unlimited listings',
        'Full CRM for the whole team',
        'Full PM automation + trust accounting',
        'multilingual auto-translation',
        'Priority AI matching + lead analytics',
        'Agency-branded profile page',
        'Phone & email support',
      ],
      cta: 'Book a demo →',
      sub: 'No credit card · Setup included · Cancel anytime',
      action: () => navigate('/contact'),
      style: 'filled' as const,
      popular: true,
    },
    {
      name: 'Agency Pro',
      monthly: 3499,
      annual: 33590,
      annualMonthly: 2799,
      desc: 'Established multi-office agencies',
      feats: [
        'Up to 15 agent seats',
        'Unlimited everything',
        'Full PM automation + trust accounting',
        'Multi-branch dashboard',
        'White-label option',
        'API access + custom integrations',
        'Dedicated account manager',
      ],
      cta: 'Talk to sales →',
      sub: 'Response within 4 business hours · Custom onboarding',
      action: () => navigate('/contact'),
      style: 'ghost' as const,
      popular: false,
    },
  ];

  const fmt = (n: number) => `$${n.toLocaleString('en-US')}`;

  return (
    <section style={{ background: T.off, padding: '88px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.blue, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 14 }}>{t('home.pricing.eyebrow')}</div>
        <h2 style={{ fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.1, margin: '0 0 14px' }}>
          {t('home.pricing.heading')}
        </h2>
        <p style={{ fontSize: 16, color: T.muted, margin: '0 auto 28px', maxWidth: 680 }}>
          {t('home.pricing.subtext')}
        </p>

        {/* Value prop callout */}
        <div style={{
          background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 16,
          padding: '20px 24px', maxWidth: 820, margin: '0 auto 32px', textAlign: 'left',
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, marginBottom: 6 }}>
            {t('home.pricing.calloutTitle')}
          </div>
          <p style={{ fontSize: 14, color: T.mid, lineHeight: 1.55, margin: 0 }}>
            {t('home.pricing.calloutBody')}
          </p>
        </div>

        {/* Billing toggle */}
        <div style={{ display: 'inline-flex', background: '#fff', border: `1px solid ${T.border}`, borderRadius: 100, padding: 4, marginBottom: 36, gap: 4 }}>
          {(['monthly', 'annual'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              style={{
                padding: '8px 18px', borderRadius: 100, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                background: billing === b ? T.blue : 'transparent',
                color: billing === b ? '#fff' : T.mid,
                transition: 'all .15s',
              }}
            >
              {b === 'monthly' ? t('home.pricing.monthly') : t('home.pricing.annual')}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 1040, margin: '0 auto' }} className="pricing-grid">
          {PLANS.map((p, i) => {
            const isAnnual = billing === 'annual';
            return (
              <div key={p.name} className={`reveal reveal-d${i + 1}`} style={{
                background: p.popular ? '#F8FBFF' : '#fff',
                border: `${p.popular ? 2 : 1.5}px solid ${p.popular ? T.blue : T.border}`,
                borderRadius: 20,
                padding: '32px 28px',
                position: 'relative',
                textAlign: 'left' as const,
                boxShadow: p.popular
                  ? '0 0 0 3px rgba(37,99,235,.08), 0 16px 48px rgba(37,99,235,.18), 0 4px 12px rgba(37,99,235,.08)'
                  : 'none',
                transform: p.popular ? 'scale(1.03)' : 'none',
                zIndex: p.popular ? 1 : 0,
                marginTop: p.popular ? -12 : 0,
                marginBottom: p.popular ? -12 : 0,
                transition: 'transform .2s, box-shadow .2s',
              }}>
                {p.popular && (
                  <div style={{ position: 'absolute', top: -12, right: 20, background: T.amber, color: '#78350F', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', padding: '5px 12px', borderRadius: 100 }}>
                    {t('home.pricing.mostPopular')}
                  </div>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>{p.name}</div>
                <div style={{ marginBottom: 6 }}>
                  {isAnnual ? (
                    <>
                      <span style={{ fontSize: 44, fontWeight: 800, color: T.ink, letterSpacing: '-1.5px' }}>{fmt(p.annualMonthly)}</span>
                      <span style={{ fontSize: 13, color: T.muted }}>{t('home.pricing.perMonth')}</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 44, fontWeight: 800, color: T.ink, letterSpacing: '-1.5px' }}>{fmt(p.monthly)}</span>
                      <span style={{ fontSize: 13, color: T.muted }}>{t('home.pricing.perMonth')}</span>
                    </>
                  )}
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 14, minHeight: 18 }}>
                  {isAnnual ? (
                    <>
                      <span style={{ textDecoration: 'line-through', marginRight: 6 }}>{fmt(p.monthly)}{t('home.pricing.perMonth')}</span>
                      · {fmt(p.annual)}{t('home.pricing.billedAnnually')}
                    </>
                  ) : (
                    <>{t('home.pricing.savePercent', { price: fmt(p.annual) })}</>
                  )}
                </div>
                <p style={{ fontSize: 13, color: T.muted, margin: '0 0 22px', lineHeight: 1.5 }}>{p.desc}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
                  {p.feats.map((f) => (
                    <li key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: T.mid, padding: '7px 0' }}>
                      <span style={{ color: T.green, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={p.action} style={{
                  width: '100%', padding: '12px 18px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  background: p.style === 'filled' ? T.blue : 'transparent',
                  color: p.style === 'filled' ? '#fff' : T.blue,
                  border: p.style === 'filled' ? 'none' : `1.5px solid ${T.blue}`,
                }}>{p.cta}</button>
                <p style={{ fontSize: 12, color: T.muted, margin: '10px 0 0', lineHeight: 1.45, textAlign: 'center' }}>{p.sub}</p>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`@media (max-width:760px){.pricing-grid{grid-template-columns:1fr !important;max-width:420px}}`}</style>
    </section>
  );
}

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  const { t } = useTranslation();
  const faqs = [
    { q: t('home.faq.q1'), a: t('home.faq.a1') },
    { q: t('home.faq.q2'), a: t('home.faq.a2') },
    { q: t('home.faq.q3'), a: t('home.faq.a3') },
    { q: t('home.faq.q4'), a: t('home.faq.a4') },
    { q: t('home.faq.q5'), a: t('home.faq.a5') },
  ];
  return (
    <section style={{ background: '#F9FAFB', padding: '80px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 14, textAlign: 'center' }}>{t('home.faq.eyebrow')}</div>
        <h2 style={{ fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, margin: '0 0 40px', textAlign: 'center', color: '#0a0f1e' }}>
          {t('home.faq.heading')}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  style={{ width: '100%', minHeight: 52, textAlign: 'left', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 15, fontWeight: 700, color: '#0a0f1e', fontFamily: 'inherit', gap: 16 }}
                >
                  <span style={{ flex: 1 }}>{f.q}</span>
                  <span style={{ fontSize: 20, color: '#2563EB', transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform .2s', flexShrink: 0, lineHeight: 1 }}>+</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 20px 18px', fontSize: 15, color: '#6B7280', lineHeight: 1.65 }}>{f.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}




function ClosingCTA({ navigate, T }: { navigate: NavFn; T: Theme }) {
  const { t } = useTranslation();
  return (
    <section style={{ background: '#2563EB', padding: '88px 24px', textAlign: 'center' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 16 }}>
          {t('home.closingCta.eyebrow')}
        </div>
        <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1.1, margin: '0 0 16px' }}>
          {t('home.closingCta.heading')}
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,.7)', lineHeight: 1.6, margin: '0 auto 36px', maxWidth: 480 }}>
          {t('home.closingCta.body')}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/contact')}
            style={{ background: '#fff', color: '#0a0f1e', border: 'none', padding: '15px 32px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >
            {t('home.closingCta.primary')}
          </button>
          <button
            onClick={() => navigate('/contact')}
            style={{ background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,.4)', padding: '15px 28px', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            {t('home.closingCta.secondary')}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', margin: '20px 0 0', fontWeight: 500 }}>
          {t('home.closingCta.finePrint')}
        </p>
      </div>
    </section>
  );
}


function SliverBar() {
  const { t } = useTranslation();
  const messages = [
    ` ${t('home.sliver.agents')}`,
    ` ${t('home.sliver.translation')}`,
    `${t('home.sliver.price')} · ${t('home.sliver.free')}`,
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % messages.length), 4000);
    return () => clearInterval(id);
  }, [messages.length]);
  return (
    <div style={{ background: '#EFF6FF', borderBottom: '1px solid #DBEAFE', color: '#374151', padding: '10px 16px', fontSize: 13 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 20, textAlign: 'center', overflow: 'hidden' }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                position: i === idx ? 'relative' : 'absolute',
                inset: i === idx ? 'auto' : 0,
                opacity: i === idx ? 1 : 0,
                transition: 'opacity .5s ease',
                pointerEvents: i === idx ? 'auto' : 'none',
                fontWeight: 600,
              }}
            >
              {m}
            </div>
          ))}
        </div>
        <a href="/for-agents" className="sliver-link" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}>
          {t('home.sliver.cta')}
        </a>
      </div>
    </div>
  );
}

export default Index;

