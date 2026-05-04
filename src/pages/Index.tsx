import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Mic, Search, Play, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

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

type Listing = { img: string; title: string; price: string; meta: string; };
const FEAT_LISTINGS: Listing[] = [
  { img:'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop', title:'Spacious 4-bed family home, walk to top-ranked schools', price:'$1,250,000', meta:'4 bed · 2 bath · 2 car' },
  { img:'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop', title:'Modern 3-bed townhouse near transit',                    price:'$985,000',   meta:'3 bed · 2 bath · 1 car' },
  { img:'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop', title:'Renovated 3-bed heritage home, walk to cafes',          price:'$1,580,000', meta:'3 bed · 2 bath · 1 car' },
  { img:'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop', title:'Brand new 5-bed entertainer with pool',                 price:'$2,150,000', meta:'5 bed · 3 bath · 2 car' },
  { img:'https://images.unsplash.com/photo-1598228723793-52759bba239c?w=800&h=600&fit=crop', title:'City-view 2-bed apartment with parking',                price:'$795,000',   meta:'2 bed · 1 bath · 1 car' },
  { img:'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&h=600&fit=crop', title:'Coastal 4-bed family home minutes from beach',          price:'$1,395,000', meta:'4 bed · 2 bath · 2 car' },
];

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
  const [liveCount, setLiveCount] = useState(847);
  const [enquiryCount, setEnquiryCount] = useState(3);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalQuery, setModalQuery] = useState('');
  const [propertyCount, setPropertyCount] = useState<number | null>(null);
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Front card crossfade refs
  const layerARef = useRef<HTMLDivElement>(null);
  const layerBRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);
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

  // Featured listings
  useEffect(() => {
    const cols = 'id, title, address, suburb, state, price, price_formatted, images, image_url, property_type, beds, baths, parking, listing_type, boost_tier, is_featured';
    (async () => {
      const { data: boosted } = await supabase
        .from('properties')
        .select(cols)
        .eq('is_active', true)
        .or('is_featured.eq.true,boost_tier.not.is.null')
        .order('created_at', { ascending: false })
        .limit(6);

      const seen = new Set<string>();
      const unique = (boosted ?? []).filter((p: any) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });

      if (unique.length >= 3) {
        setFeaturedListings(unique.slice(0, 6));
        return;
      }

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

      if (unique.length > 0) setFeaturedListings(unique);
    })();
  }, []);

  const fmtPrice = (price: number, listingType?: string) => {
    if (!price) return 'Price on request';
    if (listingType === 'rent' || listingType === 'rental') return `$${price.toLocaleString()}/wk`;
    if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(price % 1_000_000 === 0 ? 0 : 2)}M`;
    return `$${price.toLocaleString()}`;
  };
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
      setSeqIdx(idx !== undefined ? idx : 0);
      setSearchQuery('');
      setBlur(false);
    }, 300);
  }, [language]);

  // Language cycle (paused when user manually selected a language)
  useEffect(() => {
    const id = setInterval(() => {
      if (manualLangRef.current) return;
      setBlur(true);
      setTimeout(() => {
        setSeqIdx((i) => (i + 1) % SEQUENCE.length);
        setSearchQuery('');
        setBlur(false);
      }, 300);
    }, 4200);
    return () => clearInterval(id);
  }, [language]);

  // Card cycle — crossfade image layer + text inside the static front card
  useEffect(() => {
    const id = setInterval(() => {
      const next = (cardIdxRef.current + 1) % FEAT_LISTINGS.length;
      const listing = FEAT_LISTINGS[next];
      cardIdxRef.current = next;
      setBackCardIdx((next + 1) % FEAT_LISTINGS.length);

      // Preload next image — only swap once it's actually loaded
      const pre = new Image();
      const runSwap = () => {
        const inactive = activeLayerRef.current === 'a' ? layerBRef.current : layerARef.current;
        const active = activeLayerRef.current === 'a' ? layerARef.current : layerBRef.current;
        if (inactive) {
          inactive.style.backgroundImage = `url(${listing.img})`;
          // restart ken burns animation on the layer that's about to become active
          inactive.style.animation = 'none';
          // force reflow
          void inactive.offsetWidth;
          inactive.style.animation = '';
        }
        requestAnimationFrame(() => {
          if (inactive) inactive.classList.add('active');
          if (active) active.classList.remove('active');
          activeLayerRef.current = activeLayerRef.current === 'a' ? 'b' : 'a';
        });

        // Text fade in parallel with image crossfade
        const t = titleRef.current;
        const p = priceRef.current;
        if (t) t.classList.add('hcard-text-hidden');
        if (p) p.classList.add('hcard-text-hidden');
        window.setTimeout(() => {
          if (t) { t.textContent = listing.title; t.classList.remove('hcard-text-hidden'); }
          if (p) { p.textContent = listing.price; p.classList.remove('hcard-text-hidden'); }
        }, 200);
      };
      pre.onload = runSwap;
      pre.onerror = runSwap;
      pre.src = listing.img;
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // Live buyer count
  useEffect(() => {
    const id = setInterval(() => {
      setLiveCount((c) => {
        const delta = Math.floor(Math.random() * 27) - 11;
        return Math.max(600, Math.min(1200, c + delta));
      });
    }, 3200);
    return () => clearInterval(id);
  }, []);

  // Enquiry count
  useEffect(() => {
    const id = setInterval(() => {
      setEnquiryCount(2 + Math.floor(Math.random() * 7));
    }, 7500);
    return () => clearInterval(id);
  }, []);

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
        window.setTimeout(() => openSearch(text), 200);
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
    if (q) openSearch(q);
  };

  // Initial card content (static — JS handles all subsequent updates via refs)
  const initialFront = FEAT_LISTINGS[0];
  const [backCardIdx, setBackCardIdx] = useState(1);

  return (
    <>
      <Helmet>
        <title>ListHQ — Find your home in any language. Multilingual property search Australia</title>
        <meta name="description" content="Australia's only multilingual property platform. Search 50,000+ listings auto-translated into 20 languages. Free for buyers, always." />
        <link rel="canonical" href="https://globalhomes.lovable.app/" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,500;1,700&display=swap" rel="stylesheet" />
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
        .hero-headline { font-size: clamp(44px, 5vw, 76px); font-weight: 800; letter-spacing: -2px; line-height: 1.05; color: #0a0f1e; margin-bottom: 0; }
        .hero-headline .line1 { display: block; line-height: 1.1; }
        .hero-headline .line2 { display: block; color: #2563EB; font-style: italic; font-weight: 700; line-height: 1.15; margin-top: 6px; min-height: 1.2em; font-size: clamp(28px, 3.5vw, 58px); }
      `}</style>

      <div className="wave17">
        {/* ═══ Agent sliver bar ═══ */}
        <div style={{ background: '#EFF6FF', borderBottom: '1px solid #DBEAFE', color: '#374151', padding: '10px 16px', fontSize: 12.5, textAlign: 'center' }}>
          <span>🏆 <strong style={{ color:'#0a0f1e', fontWeight:700 }}>Real estate agents:</strong> reach 7M+ multilingual buyers no other portal can find</span>
          <span style={{ display:'inline-block', width:4, height:4, borderRadius:'50%', background:'#DBEAFE', margin:'0 10px', verticalAlign:'middle' }} />
          <span>Auto-translated listings in 20 languages</span>
          <span style={{ display:'inline-block', width:4, height:4, borderRadius:'50%', background:'#DBEAFE', margin:'0 10px', verticalAlign:'middle' }} />
          <span>From <strong style={{ color:'#2563EB', fontWeight:700 }}>$799/mo</strong></span>
          <span style={{ display:'inline-block', width:4, height:4, borderRadius:'50%', background:'#DBEAFE', margin:'0 10px', verticalAlign:'middle' }} />
          <span>60 days free</span>
          <span style={{ display:'inline-block', width:4, height:4, borderRadius:'50%', background:'#DBEAFE', margin:'0 10px', verticalAlign:'middle' }} />
          <a href="/for-agents" className="sliver-link" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 700 }}>See how it works →</a>
        </div>

        {/* ═══ SECTION 2 — Hero ═══ */}
        <section style={{ background:'#fff', padding:'72px 24px', minHeight:'calc(100vh - 68px - 50px)' }}>
          <div style={{ maxWidth: 1240, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 460px', gap:48, alignItems:'center' }} className="hero-grid">
            {/* Left */}
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px', borderRadius:100, background:T.blueL, border:`1px solid ${T.blueMid}`, color:T.blue, fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:24 }}>
                <span className="pulseDot" style={{ width:6, height:6, borderRadius:'50%', background:T.blue }} />
                {t('hero.eyebrow')}
              </div>

              <h1 className="hero-headline" style={{ margin:'0 0 12px' }}>
                <span className="line1">{seq.line1}</span>
                <span className={`line2 ${blur ? 'blur-out' : 'blur-in'}`}>{seq.line2}</span>
              </h1>

              <div className={blur ? 'blur-out' : 'blur-in'} style={{ fontSize:14, fontWeight:500, color:T.mid, marginBottom:16, display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:20, lineHeight:1 }}>{seq.flag}</span> {seq.sub} · click any language below to switch
              </div>

              {/* Search block */}
              <form onSubmit={handleSubmit} style={{ maxWidth:560, background:'#fff', border:`1.5px solid ${T.border}`, borderRadius:14, boxShadow:'0 4px 24px rgba(0,0,0,.07)', display:'grid', gridTemplateColumns:'minmax(180px, 220px) auto 1fr', alignItems:'stretch', padding:0, gap:0, overflow:'hidden' }}>
                {/* Left half — Voice */}
                <div
                  style={{
                    display:'flex', flexDirection:'row', alignItems:'center',
                    gap:12, padding:'14px 16px',
                    background: voiceState === 'listening' ? 'rgba(239,68,68,0.08)' : 'transparent',
                    transition:'background 0.2s ease',
                    cursor:'pointer', position:'relative',
                  }}
                  onClick={startVoice}
                >
                  <button
                    type="button"
                    onClick={startVoice}
                    aria-label={voiceState === 'listening' ? 'Stop listening' : 'Start voice search'}
                    style={{
                      position:'relative', width:40, height:40, borderRadius:'50%', flexShrink:0,
                      background: voiceState === 'processing' ? '#9ca3af' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                      display:'flex', alignItems:'center', justifyContent:'center', color:'#fff',
                      border:'none', cursor:'pointer', boxShadow:'0 4px 14px rgba(220,38,38,.35)',
                    }}
                  >
                    {voiceState === 'listening' && <span className="mic-ring" />}
                    {voiceState === 'processing' ? <span className="mic-spin" /> : <Mic size={18} />}
                  </button>
                  <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                    <div style={{ fontSize:13, fontWeight:600, color: voiceState === 'listening' ? '#dc2626' : T.ink, lineHeight:1.2 }}>
                      {voiceState === 'listening' ? '🎤 Listening…' : voiceState === 'processing' ? 'Processing…' : seq.mic}
                    </div>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:T.muted }}>
                      TAP TO TALK · VOICE SEARCH
                    </div>
                  </div>
                  {voiceUnsupportedTip && (
                    <span
                      role="tooltip"
                      className="voice-tip"
                      style={{
                        position:'absolute', bottom:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)',
                        background:T.ink, color:'#fff', fontSize:12, fontWeight:500, lineHeight:1.4,
                        padding:12, borderRadius:10, maxWidth:260, width:'max-content',
                        boxShadow:'0 6px 20px rgba(0,0,0,.18)', zIndex:20, textAlign:'left',
                        whiteSpace:'normal',
                      }}
                    >
                      🎤 Voice search works in Chrome and Safari. Type your search above, or switch browsers.
                    </span>
                  )}
                </div>

                {/* Divider with "or" */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 6px', position:'relative' }}>
                  <div style={{ width:1, flex:1, background:T.border }} />
                  <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:'uppercase', padding:'4px 0', background:'#fff' }}>or</div>
                  <div style={{ width:1, flex:1, background:T.border }} />
                </div>

                {/* Right half — Text */}
                <div style={{ display:'flex', alignItems:'center', padding:'6px 6px 6px 8px', gap:6 }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={seq.ph}
                    style={{ flex:1, border:'none', outline:'none', fontSize:14, padding:'12px 10px', background:'transparent', minWidth:0, color:T.ink }}
                  />
                  <button type="submit" style={{ background:T.blue, color:'#fff', border:'none', padding:'10px 18px', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>Search</button>
                </div>
              </form>

              {voiceError && (
                <div className="voice-err" style={{ marginTop:10, maxWidth:560, display:'inline-flex', alignItems:'center', gap:8, background:'rgba(220,38,38,.08)', border:'1px solid rgba(220,38,38,.25)', color:'#b91c1c', fontSize:12, fontWeight:600, padding:'8px 14px', borderRadius:100 }}>
                  ⚠ {voiceError}
                </div>
              )}

              {/* Filter chips */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, maxWidth:560, marginTop:14 }}>
                {['📍 Auburn','📍 Box Hill','📍 Hurstville','Under $1M','3+ beds','Top schools'].map((c) => (
                  <button key={c} className="chip" onClick={() => openSearch(c)}>{c}</button>
                ))}
              </div>

              {/* Live buyers pill */}
              <div style={{ marginTop:18, display:'inline-flex', alignItems:'center', gap:8, background:'rgba(22,163,74,.1)', border:'1px solid rgba(22,163,74,.25)', borderRadius:100, padding:'6px 14px', fontSize:12, fontWeight:700, color:'#16a34a' }}>
                <span className="pulseDot" style={{ width:6, height:6, borderRadius:'50%', background:'#16a34a' }} />
                <strong>{liveCount}</strong> buyers searching right now
              </div>

              <div style={{ marginTop:16, maxWidth:560, fontSize:13, color:T.muted, textAlign:'center' }}>
                🔒 Free for buyers · Always · No account needed to search
              </div>
            </div>

            {/* Right — static card stack with image + text crossfade */}
            <div style={{ position:'relative', height:560 }} className="card-stack hero-cards">
              {/* Front card — static position; image + text crossfade only */}
              <div
                className="hcard hcard-main"
                style={{
                  position:'absolute', right:0, top:30, zIndex:3,
                  width:400, height:520, transform:'none',
                  background:'#fff', borderRadius:20, boxShadow:'0 20px 60px rgba(0,0,0,.12)', overflow:'hidden',
                }}
              >
                <div className="hcard-img-wrap">
                  <div
                    ref={layerARef}
                    className="hcard-img hcard-layer hcard-layer-a active"
                    id="hcardLayerA"
                    style={{ backgroundImage:`url(${initialFront.img})` }}
                  />
                  <div
                    ref={layerBRef}
                    className="hcard-img hcard-layer hcard-layer-b"
                    id="hcardLayerB"
                  />
                </div>
                <div style={{ padding:18 }}>
                  <span style={{ display:'inline-block', background:T.blueL, color:T.blue, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:100, marginBottom:10 }}>🌐 20 languages · auto-translated</span>
                  <div ref={titleRef} className="hcard-title" id="hcardTitle" style={{ fontSize:14, fontWeight:700, color:T.ink, marginBottom:6 }}>{initialFront.title}</div>
                  <div ref={priceRef} className="hcard-price" id="hcardPrice" style={{ fontSize:22, fontWeight:800, color:T.ink, marginBottom:8 }}>{initialFront.price}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12, color:T.muted, marginBottom:12 }}>
                    <span>{initialFront.meta}</span>
                    <span style={{ background:T.blueL, color:T.blue, padding:'3px 8px', borderRadius:100, fontWeight:700 }}>🌐 20 langs</span>
                  </div>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(22,163,74,.12)', border:'1px solid rgba(22,163,74,.3)', borderRadius:100, padding:'4px 10px', fontSize:11, fontWeight:700, color:'#15803d' }}>
                    <span className="pulseDot" style={{ width:6, height:6, borderRadius:'50%', background:'#16a34a' }} />
                    <span id="enquiryCount">{enquiryCount}</span>&nbsp;people enquired in the last hour
                  </div>
                </div>
              </div>
            </div>
          </div>
          <style>{`
            @media (max-width: 960px) {
              .hero-grid { grid-template-columns: 1fr !important; }
              .card-stack { display: none; }
            }
          `}</style>
        </section>

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

        {/* ═══ SECTION 4 — Trust Strip ═══ */}
        <div style={{ background:T.off, borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, padding:'20px 16px' }}>
          <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', justifyContent:'center', alignItems:'center', flexWrap:'wrap', gap:0 }}>
            {[
              { n: propertyCount && propertyCount > 0 ? `${propertyCount.toLocaleString()}+` : '50,000+', l:'live listings' },
              { n:'20', l:'languages auto-translated' },
              { n:'7M+', l:'multilingual Australians' },
              { n:'Free', l:'for buyers · always' },
            ].map((s, i, arr) => (
              <div key={s.l} style={{ display:'flex', alignItems:'center' }}>
                <div style={{ padding:'0 32px', textAlign:'center' }}>
                  <div style={{ fontSize:22, fontWeight:800, color:T.ink, lineHeight:1 }}>{s.n}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.mid, marginTop:4 }}>{s.l}</div>
                </div>
                {i < arr.length - 1 && <div style={{ width:1, height:32, background:T.border }} />}
              </div>
            ))}
          </div>
        </div>

        {/* ═══ SECTION 4b — Featured Listings ═══ */}
        {featuredListings.length > 0 && (
          <section style={{ background: '#fff', padding: '72px 24px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.blue, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8 }}>
                    Properties on ListHQ
                  </div>
                  <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, margin: 0, color: T.ink }}>
                    Browse what's listed now
                  </h2>
                </div>
                <button
                  onClick={() => navigate('/buy')}
                  style={{ background: 'transparent', border: `1.5px solid ${T.border}`, borderRadius: 100, padding: '10px 20px', fontSize: 13, fontWeight: 700, color: T.blue, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  View all →
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="feat-grid">
                {featuredListings.map((p) => {
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
                      <div style={{ height: 180, background: T.off2, position: 'relative', overflow: 'hidden' }}>
                        {img ? (
                          <img src={img} alt={p.title || p.address} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.subtle, fontSize: 32 }}>🏠</div>
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
                  Browse all properties →
                </button>
              </div>
            </div>
            <style>{`@media (max-width: 860px) { .feat-grid { grid-template-columns: 1fr !important; } }`}</style>
          </section>
        )}

        {/* ═══ SECTION 5 — Language Proof ═══ */}
        <section style={{ background:'#fff', padding:'88px 24px' }}>
          <div style={{ maxWidth:1200, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }} className="lang-grid">
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:T.blue, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:14 }}>Why ListHQ is different</div>
              <h2 style={{ fontSize:'clamp(32px, 3.5vw, 48px)', fontWeight:800, letterSpacing:'-1.5px', lineHeight:1.1, margin:'0 0 18px' }}>
                Where multilingual Australia <em style={{ color:T.blue, fontStyle:'italic' }}>finds home.</em>
              </h2>
              <p style={{ fontSize:16, color:T.mid, lineHeight:1.7, margin:'0 0 24px' }}>
                Every listing on ListHQ is automatically translated into 20 languages — Chinese, Vietnamese, Arabic, Hindi and 16 more. No other portal does this.
              </p>
              <button onClick={() => inputRef.current?.focus()} style={{ background:T.blue, color:'#fff', border:'none', padding:'14px 28px', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                Search in your language →
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
            <div style={{ fontSize:11, fontWeight:700, color:T.blue, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:14 }}>What buyers say</div>
            <h2 style={{ fontSize:'clamp(32px, 3.5vw, 48px)', fontWeight:800, letterSpacing:'-1.5px', lineHeight:1.1, margin:'0 0 52px' }}>
              Real people. Real homes. <em style={{ color:T.blue, fontStyle:'italic' }}>In their language.</em>
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:20 }} className="how-grid">
              {[
                { i:'M', q:'I found 6 listings near my children\'s school in one afternoon. Other portals had the same listings but I couldn\'t understand anything.', n:'Mei L.', d:'Auburn, NSW · Bought a 4-bed family home' },
                { i:'T', q:'Tôi tìm thấy căn nhà lý tưởng của mình trong vài giờ. Mọi thứ đều bằng tiếng Việt — giá, trường học, mô tả.', n:'Tuan N.', d:'Box Hill, VIC · Rented a 2-bed apartment' },
                { i:'P', q:'I showed prices in INR so I can explain to my parents back home what we\'re looking at. ListHQ gets it.', n:'Priya S.', d:'Mosman, NSW · Bought a waterfront home' },
              ].map((c, i) => (
                <div key={c.n} className={`reveal reveal-d${i+1}`} style={{ background:T.off, border:`1px solid ${T.border}`, borderRadius:20, padding:32 }}>
                  <p style={{ fontSize:15, fontWeight:500, color:T.ink, fontStyle:'italic', lineHeight:1.7, margin:'0 0 24px' }}>"{c.q}"</p>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:42, height:42, borderRadius:'50%', background:T.blueL, color:T.blue, fontWeight:800, fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>{c.i}</div>
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

        {/* ═══ SECTION 9 — Pricing ═══ */}
        <PricingSection navigate={navigate} T={T} />

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
                {FEAT_LISTINGS.slice(0,4).map((l, i) => (
                  <div key={i} onClick={() => { closeModal(); navigate('/'); }} style={{ display:'flex', gap:14, padding:12, border:`1px solid ${T.border}`, borderRadius:14, cursor:'pointer' }}>
                    <div style={{ width:96, height:72, borderRadius:10, backgroundImage:`url(${l.img})`, backgroundSize:'cover', flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:T.ink, marginBottom:4 }}>{l.title}</div>
                      <div style={{ fontSize:12, color:T.muted, marginBottom:6 }}>{l.meta}</div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ background:T.blueL, color:T.blue, fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:100 }}>🌐 20 languages</span>
                        <span style={{ fontSize:14, fontWeight:800, color:T.ink }}>{l.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
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
            <div style={{ fontSize:11, fontWeight:700, color:T.blue, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:14 }}>For real estate agents</div>
            <h2 style={{ fontSize:'clamp(44px, 5vw, 72px)', fontWeight:800, color:'#fff', letterSpacing:'-2.5px', lineHeight:1, margin:'0 0 22px' }}>
              <span style={{ color:T.blue }}>1 in 5</span> Australian buyers searches in another language.
            </h2>
            <p style={{ fontSize:16, color:'rgba(255,255,255,.6)', lineHeight:1.6, margin:'0 0 22px', maxWidth:620 }}>
              Are they finding your listings? ListHQ auto-translates every property you upload into 20 languages — reaching buyers no other portal can. From <strong style={{ color:'#fff' }}>$799/mo</strong>. 60 days free.
            </p>
            <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
              {['McGrath','Belle Property','LJ Hooker','Raine & Horne'].map((b) => (
                <span key={b} style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.35)', letterSpacing:'.04em' }}>{b}</span>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <button onClick={() => navigate('/pricing')} style={{ background:'#fff', color:T.ink, border:'none', padding:'14px 28px', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer' }}>See agent pricing →</button>
            <button onClick={() => setVideoOpen(true)} style={{ background:'transparent', color:'rgba(255,255,255,.7)', border:'1px solid rgba(255,255,255,.2)', padding:'12px 24px', borderRadius:12, fontSize:14, fontWeight:600, cursor:'pointer' }}>Watch 90-sec demo</button>
          </div>
        </div>

        {/* Quote cards + demo */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 360px', gap:16, marginTop:52 }} className="agent-cards">
          {[
            { q:'ListHQ is the first platform that actually speaks to my Mandarin and Vietnamese buyers without me doing any extra work. Multilingual enquiries are up 3× since we joined.', n:'Sarah Chen', r:'Principal, Sydney Metro Realty · Hurstville NSW', s:'3× more multilingual enquiries' },
            { q:'I was sceptical about another platform fee. Six months in, I\'ve closed three deals to buyers I would have never reached — that\'s $58K in extra commission off a $799/mo subscription.', n:'Mark Thompson', r:'Director, Brisbane Metro Properties', s:'$58K extra commission' },
          ].map((c, i) => (
            <div key={c.n} className={`reveal reveal-d${i+1}`} style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.10)', borderRadius:16, padding:28 }}>
              <p style={{ fontStyle:'italic', fontSize:14.5, color:'rgba(255,255,255,.82)', lineHeight:1.6, margin:'0 0 16px' }}>"{c.q}"</p>
              <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,.45)', marginBottom:14 }}>
                <strong style={{ color:'rgba(255,255,255,.7)' }}>{c.n}</strong> — {c.r}
              </div>
              <div style={{ fontSize:22, fontWeight:800, color:T.blue }}>{c.s}</div>
            </div>
          ))}
          <div className="reveal reveal-d3" style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:20, padding:20 }}>
            <div style={{ position:'relative', height:180, borderRadius:12, backgroundImage:'url(https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop)', backgroundSize:'cover', backgroundPosition:'center', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
              <button style={{ width:54, height:54, borderRadius:'50%', background:'#fff', border:'none', cursor:'pointer', boxShadow:'0 8px 24px rgba(0,0,0,.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Play size={22} style={{ marginLeft:3 }} fill={T.ink} />
              </button>
            </div>
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>Watch · 90 seconds</div>
            <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:6 }}>From upload to 20-language listing live</div>
            <div style={{ fontSize:12.5, color:'rgba(255,255,255,.5)' }}>No signup required · See the full agent platform</div>
          </div>
        </div>

        {/* ROI slider */}
        <div className="reveal" style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.12)', borderRadius:20, padding:36, marginTop:52 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,.6)', marginBottom:20 }}>
            If you have <strong style={{ color:'#fff', fontSize:18 }}>{n}</strong> active listings on ListHQ…
          </div>
          <input type="range" min={1} max={100} value={n} onChange={(e) => setN(Number(e.target.value))}
            style={{ width:'100%', accentColor: T.blue }} />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginTop:24 }}>
            {[
              { v: buyers, l:'multilingual buyers reached / month' },
              { v: '20', l:'languages auto-translated, zero work' },
              { v: roi, l:'avg. return on $799/mo subscription' },
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
          <h3 style={{ fontSize:16, fontWeight:800, color:'#fff', margin:'0 0 6px' }}>See your listing translated — live</h3>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.5)', margin:'0 0 20px' }}>Type any property description and watch it appear in 5 languages instantly.</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:12 }} className="trans-grid">
            <input
              type="text"
              value={demoText}
              onChange={(e) => setDemoText(e.target.value)}
              placeholder="e.g. Spacious 4-bed family home near top schools…"
              style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.15)', borderRadius:10, padding:'12px 14px', color:'#fff', fontSize:13, outline:'none' }}
            />
            <select value={demoLang} onChange={(e) => setDemoLang(e.target.value as any)}
              style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.15)', borderRadius:10, padding:'12px 14px', color:'#fff', fontSize:13, outline:'none' }}>
              <option value="all">All 5 languages</option>
              <option value="zh">Chinese</option>
              <option value="vi">Vietnamese</option>
              <option value="ar">Arabic</option>
              <option value="hi">Hindi</option>
            </select>
            <button onClick={runTranslate} style={{ background:T.blue, color:'#fff', border:'none', padding:'12px 22px', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }}>Translate →</button>
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
    </section>
  );
}

type NavFn = (path: string) => void;
type Theme = { blue: string; blueL: string; blueMid: string; ink: string; mid: string; muted: string; off: string; border: string };

function PricingSection({ navigate, T }: { navigate: NavFn; T: Theme }) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

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
        '20-language auto-translation on every listing',
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
        '20-language auto-translation',
        'Priority AI matching + lead analytics',
        'Agency-branded profile page',
        'Phone & email support',
      ],
      cta: 'Book a demo →',
      sub: 'Setup included',
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
      sub: 'Custom onboarding',
      action: () => navigate('/contact'),
      style: 'ghost' as const,
      popular: false,
    },
  ];

  const fmt = (n: number) => `$${n.toLocaleString('en-US')}`;

  return (
    <section style={{ background: T.off, padding: '88px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.blue, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 14 }}>Pricing — no contracts, cancel anytime</div>
        <h2 style={{ fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.1, margin: '0 0 14px' }}>
          Built for the way <em style={{ color: T.blue, fontStyle: 'italic' }}>you work.</em>
        </h2>
        <p style={{ fontSize: 16, color: T.muted, margin: '0 auto 28px', maxWidth: 680 }}>
          All plans include 20 languages · trust accounting · AI matching
        </p>

        {/* Value prop callout */}
        <div style={{
          background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 16,
          padding: '20px 24px', maxWidth: 820, margin: '0 auto 32px', textAlign: 'left',
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, marginBottom: 6 }}>
            Why $799/mo is a no-brainer for agents
          </div>
          <p style={{ fontSize: 13.5, color: T.mid, lineHeight: 1.55, margin: 0 }}>
            REA.com.au and Domain charge $1,500–$7,000 per listing. A CRM costs $300–$600/mo. Property management software another $200–$400/mo. ListHQ replaces all three — CRM, PM platform, and multilingual listing portal — in one subscription, reaching 7M+ multilingual buyers no other portal can find.
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
              {b === 'monthly' ? 'Monthly' : 'Annual — save 20%'}
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
                borderRadius: 20, padding: '32px 28px', position: 'relative', textAlign: 'left',
                boxShadow: p.popular ? '0 8px 28px rgba(37,99,235,.12)' : 'none',
              }}>
                {p.popular && (
                  <div style={{ position: 'absolute', top: -12, right: 20, background: T.blue, color: '#fff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', padding: '5px 12px', borderRadius: 100 }}>
                    Most popular
                  </div>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>{p.name}</div>
                <div style={{ marginBottom: 6 }}>
                  {isAnnual ? (
                    <>
                      <span style={{ fontSize: 44, fontWeight: 800, color: T.ink, letterSpacing: '-1.5px' }}>{fmt(p.annualMonthly)}</span>
                      <span style={{ fontSize: 13, color: T.muted }}>/mo</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 44, fontWeight: 800, color: T.ink, letterSpacing: '-1.5px' }}>{fmt(p.monthly)}</span>
                      <span style={{ fontSize: 13, color: T.muted }}>/mo</span>
                    </>
                  )}
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 14, minHeight: 18 }}>
                  {isAnnual ? (
                    <>
                      <span style={{ textDecoration: 'line-through', marginRight: 6 }}>{fmt(p.monthly)}/mo</span>
                      · {fmt(p.annual)}/yr billed annually
                    </>
                  ) : (
                    <>or {fmt(p.annual)}/yr (save 20%)</>
                  )}
                </div>
                <p style={{ fontSize: 13, color: T.muted, margin: '0 0 22px', lineHeight: 1.5 }}>{p.desc}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
                  {p.feats.map((f) => (
                    <li key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, color: T.mid, padding: '7px 0' }}>
                      <span style={{ color: T.blue, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={p.action} style={{
                  width: '100%', padding: '12px 18px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  background: p.style === 'filled' ? T.blue : 'transparent',
                  color: p.style === 'filled' ? '#fff' : T.blue,
                  border: p.style === 'filled' ? 'none' : `1.5px solid ${T.blue}`,
                }}>{p.cta}</button>
                <p style={{ fontSize: 11.5, color: T.muted, margin: '10px 0 0', lineHeight: 1.45, textAlign: 'center' }}>{p.sub}</p>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`@media (max-width:760px){.pricing-grid{grid-template-columns:1fr !important;max-width:420px}}`}</style>
    </section>
  );
}

export default Index;

