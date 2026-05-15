import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';
import { useViewerLocale } from '@/features/auth/hooks/useViewerLocale';

type Seq = {
  flag: string; code: string; line: string; ph: string;
  title: string; price: string;
};

// 14-language cycling demo (Phase 4 expansion)
const SEQ: Seq[] = [
  { flag:'🇦🇺', code:'EN', line:'In any language.',        ph:'Suburb, postcode, or address',     title:'Renovated North-Facing<br>Family Home',     price:'$1,850,000' },
  { flag:'🇨🇳', code:'ZH', line:'任何语言。',                ph:'区, 邮编, 或地址',                  title:'翻新北向<br>家庭住宅',                       price:'$1,850,000 AUD' },
  { flag:'🇻🇳', code:'VI', line:'Bằng bất kỳ ngôn ngữ.',   ph:'Vùng ngoại ô, mã bưu điện',        title:'Nhà gia đình<br>hướng bắc',                  price:'$1,850,000 AUD' },
  { flag:'🇰🇷', code:'KO', line:'어떤 언어로든.',            ph:'교외, 우편번호, 또는 주소',         title:'북향 가족주택<br>리노베이션',                 price:'$1,850,000 AUD' },
  { flag:'🇸🇦', code:'AR', line:'بأي لغة.',                ph:'الضاحية أو الرمز البريدي',         title:'منزل عائلي<br>مُجدد',                        price:'$1,850,000 AUD' },
  { flag:'🇮🇳', code:'HI', line:'किसी भी भाषा में।',        ph:'उपनगर, पिनकोड या पता',             title:'उत्तर-मुखी<br>पारिवारिक घर',                 price:'$1,850,000 AUD' },
  { flag:'🇯🇵', code:'JA', line:'どんな言語でも。',          ph:'地区、郵便番号、住所',              title:'北向きの<br>ファミリーホーム',                price:'$1,850,000 AUD' },
  { flag:'🇮🇹', code:'IT', line:'In qualsiasi lingua.',    ph:'Sobborgo, CAP, o indirizzo',       title:'Casa familiare<br>esposta a nord',          price:'$1,850,000 AUD' },
  { flag:'🇩🇪', code:'DE', line:'In jeder Sprache.',       ph:'Vorort, PLZ oder Adresse',         title:'Renoviertes nordausgerichtetes<br>Familienhaus', price:'$1,850,000 AUD' },
  { flag:'🇹🇷', code:'TR', line:'Herhangi bir dilde.',     ph:'Mahalle, posta kodu veya adres',   title:'Yenilenmiş kuzeye bakan<br>aile evi',        price:'$1,850,000 AUD' },
  { flag:'🇬🇷', code:'EL', line:'Σε οποιαδήποτε γλώσσα.',  ph:'Προάστιο, ταχ. κώδικας ή διεύθυνση', title:'Ανακαινισμένο σπίτι<br>με βορινό προσανατολισμό', price:'$1,850,000 AUD' },
  { flag:'🇵🇱', code:'PL', line:'W dowolnym języku.',      ph:'Dzielnica, kod pocztowy lub adres', title:'Wyremontowany dom<br>rodzinny od północy',   price:'$1,850,000 AUD' },
  { flag:'🇳🇵', code:'NE', line:'कुनै पनि भाषामा।',         ph:'उपनगर, पिनकोड वा ठेगाना',          title:'नवीकृत उत्तर-मुखी<br>पारिवारिक घर',          price:'$1,850,000 AUD' },
  { flag:'🇪🇸', code:'ES', line:'En cualquier idioma.',    ph:'Barrio, código postal o dirección', title:'Casa familiar renovada<br>orientada al norte', price:'$1,850,000 AUD' },
];

const RTL_LANGS = ['ar', 'fa', 'ur', 'he'];

export default function HeroSearchPreview() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const viewerLocale = useViewerLocale();
  const [idx, setIdx] = useState(0);
  const [q, setQ] = useState('');
  const [heroImg, setHeroImg] = useState<string | null>(null);
  const [hasExplicitLocale, setHasExplicitLocale] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('listhq.locale') !== null || localStorage.getItem('gh-lang') !== null;
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const paused = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

  async function submitQuery(term: string) {
    if (!term.trim()) return;
    setIsSearching(true);
    setAiSummary('');
    try {
      const { data, error } = await supabase.functions.invoke('parse-search-query', {
        body: { query: term, locale: viewerLocale },
      });
      if (error || !data) throw error ?? new Error('No response');
      const p = data.parsed ?? data;
      const params = new URLSearchParams();
      params.set('raw_q', term);
      if (p.suburb_or_locality) params.set('suburb', p.suburb_or_locality);
      if (p.postcode) params.set('postcode', p.postcode);
      if (p.state) params.set('state', p.state);
      if (p.beds_min != null) params.set('beds_min', String(p.beds_min));
      if (p.beds_max != null) params.set('beds_max', String(p.beds_max));
      if (p.baths_min != null) params.set('baths_min', String(p.baths_min));
      if (p.parking_min != null) params.set('parking_min', String(p.parking_min));
      if (p.min_price_aud != null) params.set('min_price_aud', String(p.min_price_aud));
      if (p.max_price_aud != null) params.set('max_price_aud', String(p.max_price_aud));
      if (p.price_period) params.set('price_period', p.price_period);
      if (p.property_types?.length) params.set('property_types', p.property_types.join(','));
      if (p.intent_summary) setAiSummary(p.intent_summary);
      const route = p.intent === 'rent' ? '/rent' : '/buy';
      navigate(`${route}?${params.toString()}`);
    } catch {
      navigate(`/buy?raw_q=${encodeURIComponent(term)}`);
    } finally {
      setIsSearching(false);
    }
  }

  // Auto-cycling runs only when viewer is on English AND has no explicit saved locale.
  const shouldAutoCycle = viewerLocale === 'en' && !hasExplicitLocale;
  const isRTL = RTL_LANGS.includes(viewerLocale);

  const cur = SEQ[idx];

  const CHIPS: Array<{ key: string; label: string }> = [
    { key: 'Melbourne', label: t('hero.chips.melbourne') },
    { key: 'Sydney', label: t('hero.chips.sydney') },
    { key: 'Under $1M', label: t('hero.chips.under1m') },
    { key: '3+ bed', label: t('hero.chips.threeBed') },
    { key: 'House', label: t('hero.chips.house') },
  ];

  // Watch localStorage for explicit-locale changes (LanguageSwitcher writes here)
  useEffect(() => {
    const sync = () => {
      const explicit = localStorage.getItem('listhq.locale') !== null || localStorage.getItem('gh-lang') !== null;
      setHasExplicitLocale(explicit);
    };
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [viewerLocale]);

  // Cycle every 3500ms — only when shouldAutoCycle is true
  useEffect(() => {
    if (!shouldAutoCycle) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    const id = window.setInterval(() => {
      if (paused.current) return;
      setIdx(i => (i + 1) % SEQ.length);
    }, 3500);
    intervalRef.current = id;
    return () => window.clearInterval(id);
  }, [shouldAutoCycle]);

  useEffect(() => { paused.current = q.length > 0; }, [q]);

  // Fetch a featured listing image from Auburn/Box Hill, fall back to placeholder.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('properties')
          .select('id, suburb, image_urls, hero_image_url')
          .in('suburb', ['Auburn', 'Box Hill'])
          .eq('is_active', true)
          .limit(1);
        if (cancelled) return;
        const row: any = data?.[0];
        const img = row?.hero_image_url ?? row?.image_urls?.[0] ?? null;
        if (img) setHeroImg(img);
      } catch { /* fallback to placeholder */ }
    })();
    return () => { cancelled = true; };
  }, []);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const term = q.trim();
    if (!term) { inputRef.current?.focus(); return; }
    await submitQuery(term);
  }

  function openLangDropdown() {
    const el =
      document.querySelector<HTMLElement>('[data-language-trigger]') ||
      document.querySelector<HTMLElement>('header button[aria-haspopup="listbox"]');
    el?.click();
  }

  function startVoice() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      inputRef.current?.focus();
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = viewerLocale === 'zh' ? 'zh-CN'
      : viewerLocale === 'vi' ? 'vi-VN'
      : viewerLocale === 'ar' ? 'ar-SA'
      : viewerLocale === 'hi' ? 'hi-IN'
      : viewerLocale === 'ko' ? 'ko-KR'
      : viewerLocale === 'ja' ? 'ja-JP'
      : 'en-AU';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (e: any) => {
      const text = (e.results?.[0]?.[0]?.transcript || '').trim();
      if (text) {
        setQ(text);
        setTimeout(() => submitQuery(text), 200);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
  }

  // Computed display values for static-mode (non-cycling) hero
  const cyclingLine = shouldAutoCycle ? cur.line : t('hero.cyclingLine');
  const searchPlaceholder = shouldAutoCycle ? cur.ph : t('hero.searchPlaceholder');
  const cardBadge = shouldAutoCycle ? 'any language · auto-translated' : t('hero.card.badge');
  const cardSuburb = t('hero.card.suburb');
  const cardTitleHtml = shouldAutoCycle ? cur.title : t('hero.card.title');
  const cardPrice = shouldAutoCycle ? cur.price : `$1,850,000 ${t('hero.card.priceSuffix')}`;

  return (
    <section
      id="main-content"
      dir={isRTL ? 'rtl' : 'ltr'}
      className="bg-white min-h-screen pt-32 pb-20"
      style={{ overflowX: 'hidden' }}
    >
      <div className={`grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 max-w-[1400px] mx-auto px-8 lg:px-12 items-center ${isRTL ? 'lg:[direction:rtl]' : ''}`}>
        {/* ── LEFT ─────────────────────────── */}
        <div className="flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Eyebrow pill */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#EFF6FF', borderRadius: 100,
              padding: '7px 14px',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
              textTransform: 'uppercase', color: '#1E40AF',
              alignSelf: 'flex-start',
            }}
          >
            <span
              style={{
                width: 7, height: 7, borderRadius: '50%', background: '#2563EB',
                animation: 'hspPulse 2s ease-in-out infinite',
              }}
            />
            {t('hero.eyebrow')}
          </div>

          {/* H1 */}
          <h1
            style={{
              fontFamily: '"Plus Jakarta Sans", Inter, system-ui, sans-serif',
              fontSize: 'clamp(56px, 7vw, 108px)',
              letterSpacing: '-0.045em',
              lineHeight: 0.98,
              margin: '28px 0 0',
              color: '#0a0f1e',
            }}
          >
            <span style={{ display: 'block', fontWeight: 800 }}>
              {t('hero.h1').replace(/[.。।]$/, '')}<span style={{ color: '#2563EB' }}>{t('hero.h1').slice(-1)}</span>
            </span>
            <span
              id="h2Cycle"
              role="button"
              tabIndex={0}
              onClick={openLangDropdown}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openLangDropdown(); }}
              style={{
                display: 'block',
                fontWeight: 600,
                fontStyle: 'italic',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #2563EB, #4F88FF, #93C5FD)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
              }}
              aria-label="Change language"
            >
              {cyclingLine}
            </span>
          </h1>

          {/* Sub paragraph */}
          <p style={{
            marginTop: 24, marginBottom: 0,
            fontSize: 17, lineHeight: 1.55, color: '#6a6a6a',
            maxWidth: 520,
          }}>
            {t('hero.sub')}
          </p>

          {/* Search bar */}
          <form
            onSubmit={submit}
            className="hsp-search"
            style={{
              marginTop: 36,
              display: 'flex', alignItems: 'center',
              width: '100%', maxWidth: 600,
              background: '#fff', border: '2px solid #0a0f1e', borderRadius: 18,
              padding: '6px 6px 6px 20px',
              transition: 'border-color .15s ease, box-shadow .15s ease',
            }}
          >
            <button
              type="button"
              onClick={startVoice}
              aria-label="Voice search"
              style={{
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 0, cursor: 'pointer',
                color: isListening ? '#ef4444' : '#6a6a6a', marginRight: 12, flexShrink: 0,
                animation: isListening ? 'hspPulse 1s ease-in-out infinite' : 'none',
              }}
            >
              <Mic size={20} strokeWidth={1.6} />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Search properties"
              dir={isRTL ? 'rtl' : 'ltr'}
              style={{
                flex: 1, background: 'transparent', border: 0, outline: 0,
                padding: '14px 0', fontSize: 15, color: '#0a0f1e', fontWeight: 500,
                fontFamily: 'inherit', minWidth: 0,
                textAlign: isRTL ? 'right' : 'left',
              }}
            />

            <button
              type="submit"
              style={{
                padding: '14px 22px', color: '#fff', fontSize: 14, fontWeight: 700,
                borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 8,
                border: 0, cursor: 'pointer',
                background: 'linear-gradient(135deg, #2563EB, #4F88FF)',
                boxShadow: '0 6px 20px rgba(37,99,235,0.30)',
                flexShrink: 0, whiteSpace: 'nowrap',
              }}
            >
              {t('hero.searchButton')} <ArrowRight size={14} />
            </button>
          </form>

          {/* Filter chips */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8,
            marginTop: 18, maxWidth: 600,
          }}>
            {CHIPS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => navigate(`/search?q=${encodeURIComponent(c.key)}`)}
                style={{
                  background: '#F9FAFB', border: '1px solid #E5E7EB',
                  borderRadius: 100, padding: '7px 14px',
                  fontSize: 13, fontWeight: 600, color: '#374151',
                  cursor: 'pointer', transition: 'all .15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = 'rgba(37,99,235,.30)'; e.currentTarget.style.color = '#1E40AF'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#374151'; }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Meta */}
          <div style={{
            marginTop: 22, display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, color: '#9CA3AF',
          }}>
            <span
              style={{
                width: 7, height: 7, borderRadius: '50%', background: '#10B981',
                animation: 'hspPulse 2s ease-in-out infinite',
              }}
            />
            {t('hero.freeForBuyers')}
          </div>
        </div>

        {/* ── RIGHT ─────────────────────────── */}
        <div className="hsp-right relative flex justify-center" dir="ltr">
          <div
            style={{
              position: 'relative',
              width: '100%', maxWidth: 420,
              borderRadius: 24, overflow: 'hidden',
              boxShadow: '0 30px 60px rgba(10,15,30,0.18)',
              animation: 'hspFloat 6s ease-in-out infinite',
              background: '#0a0f1e',
            }}
          >
            <div style={{ position: 'relative', aspectRatio: '4 / 5', width: '100%' }}>
              {heroImg ? (
                <img
                  src={heroImg}
                  alt="Renovated north-facing family home in Auburn, NSW"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  loading="eager"
                  decoding="async"
                  {...({ fetchpriority: 'high' } as any)}
                />
              ) : (
                <picture>
                  <source
                    type="image/avif"
                    srcSet="/hero/auburn-480.avif 480w, /hero/auburn-960.avif 960w, /hero/auburn-1440.avif 1440w"
                    sizes="(max-width: 768px) 100vw, 60vw"
                  />
                  <source
                    type="image/webp"
                    srcSet="/hero/auburn-480.webp 480w, /hero/auburn-960.webp 960w, /hero/auburn-1440.webp 1440w"
                    sizes="(max-width: 768px) 100vw, 60vw"
                  />
                  <img
                    src="/hero/auburn-1440.jpg"
                    alt="Renovated north-facing family home in Auburn, NSW"
                    width={1440}
                    height={1800}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    loading="eager"
                    decoding="async"
                    {...({ fetchpriority: 'high' } as any)}
                  />
                </picture>
              )}
              {/* Gradient overlay */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(to bottom, transparent 50%, rgba(10,15,30,0.65) 100%)',
              }} />

              {/* Top badge */}
              <div style={{
                position: 'absolute', top: 16, left: 16,
                background: 'rgba(255,255,255,0.95)',
                color: '#1E40AF',
                borderRadius: 100, padding: '7px 13px',
                fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <span aria-hidden>🌐</span> {cardBadge}
              </div>

              {/* Bottom overlay */}
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                padding: 24, color: '#fff',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                  color: 'rgba(255,255,255,0.78)', textTransform: 'uppercase',
                  marginBottom: 8,
                }}>
                  {cardSuburb}
                </div>
                <div
                  id="propTitle"
                  style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15, marginBottom: 10 }}
                  dangerouslySetInnerHTML={{ __html: cardTitleHtml }}
                />
                <div id="propPrice" style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>
                  {cardPrice}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>
                  🛏 4 · 🛁 3 · 🚗 2
                </div>
              </div>
            </div>

            {/* Floating live-enquiry badge */}
            <div
              className="hsp-enq"
              style={{
                position: 'absolute', top: '24%', left: -32,
                background: '#fff',
                borderRadius: 16,
                padding: '10px 14px',
                boxShadow: '0 14px 32px rgba(10,15,30,0.20)',
                display: 'flex', alignItems: 'center', gap: 10,
                animation: 'hspDrift 6s ease-in-out infinite',
                minWidth: 220,
              }}
            >
              <span style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>🇨🇳</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0a0f1e' }}>
                  {t('hero.card.liveEnquiryTitle')}
                </span>
                <span style={{ fontSize: 11, color: '#6B7280' }}>
                  {t('hero.card.liveEnquiryMeta')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes hspFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes hspDrift {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(4px, -6px); }
        }
        @keyframes hspPulse {
          0%, 100% { opacity: 1;   transform: scale(1); }
          50%      { opacity: 0.45; transform: scale(0.85); }
        }
        .hsp-search:focus-within {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 4px rgba(37,99,235,0.15), 0 8px 24px rgba(37,99,235,0.12);
        }
        @media (max-width: 1023px) {
          .hsp-enq { display: none !important; }
        }
      `}</style>
    </section>
  );
}
