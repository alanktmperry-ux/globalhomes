import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/shared/hooks/use-toast';

// ============================================================
// Wave 17 Homepage — buyer-first, multilingual, agent re-entry
// ============================================================

const TOKENS = {
  blue: '#3B7BF8',
  blueDark: '#2563eb',
  blueLight: '#eff4ff',
  navy: '#0d1b35',
  off: '#f7f8fa',
  border: '#e2e8f0',
  text: '#0d1b35',
  text2: '#4a5568',
  text3: '#8492a6',
};

type LangKey =
  | 'en' | 'zh' | 'vi' | 'ar' | 'hi' | 'ko' | 'ja' | 'el' | 'it';

const LANGUAGES: { key: LangKey; flag: string; label: string; placeholder: string; subtitleLabel: string }[] = [
  { key: 'en', flag: '🇦🇺', label: 'English', placeholder: 'Search by address, suburb or school zone…', subtitleLabel: 'English' },
  { key: 'zh', flag: '🇨🇳', label: '中文', placeholder: '搜索地址、区域或学区…', subtitleLabel: '中文' },
  { key: 'vi', flag: '🇻🇳', label: 'Tiếng Việt', placeholder: 'Tìm địa chỉ, khu vực hoặc trường học…', subtitleLabel: 'Tiếng Việt' },
  { key: 'ar', flag: '🇸🇦', label: 'العربية', placeholder: 'ابحث عن العنوان أو المنطقة…', subtitleLabel: 'العربية' },
  { key: 'hi', flag: '🇮🇳', label: 'हिंदी', placeholder: 'पता, उपनगर या स्कूल खोजें…', subtitleLabel: 'हिंदी' },
  { key: 'ko', flag: '🇰🇷', label: '한국어', placeholder: '주소, 교외 또는 학교로 검색…', subtitleLabel: '한국어' },
  { key: 'ja', flag: '🇯🇵', label: '日本語', placeholder: '住所、郊外、または学校で検索…', subtitleLabel: '日本語' },
  { key: 'el', flag: '🇬🇷', label: 'Ελληνικά', placeholder: 'Αναζήτηση διεύθυνσης, περιοχής…', subtitleLabel: 'Ελληνικά' },
  { key: 'it', flag: '🇮🇹', label: 'Italiano', placeholder: 'Cerca indirizzo, zona o scuola…', subtitleLabel: 'Italiano' },
];

const TABS = ['Buy', 'Rent', 'Sell', 'Home Value'] as const;
type Tab = typeof TABS[number];

const FILTER_CHIPS = ['Property Type', 'Price', 'Bedrooms', 'Suburb / Postcode', 'Land Size'];

const HERO_STATS = [
  { v: '50,000+', l: 'Listings across Australia' },
  { v: '20', l: 'Languages supported' },
  { v: '1.2M+', l: 'Multilingual buyers' },
  { v: 'Free', l: 'No account needed' },
];

const DIFF_CARDS = [
  {
    icon: '🌐',
    title: 'Search in your language',
    body: 'Type or speak in Mandarin, Vietnamese, Arabic, Hindi or 16 other languages. Every result, every detail — translated automatically.',
  },
  {
    icon: '💱',
    title: 'Prices in your currency',
    body: 'Every listing shows prices in CNY, VND, INR, AED and 10 more currencies with live exchange rates. Compare instantly.',
  },
  {
    icon: '🎤',
    title: 'Voice search, your language',
    body: 'Speak your search in any supported language. Our AI understands you — no translation needed on your end.',
  },
];

const AGENT_FEATURES = [
  { t: 'AI multilingual listings', d: 'list once, reach 20 language audiences automatically' },
  { t: 'Built-in trust accounting', d: 'AFA-compliant, saves ~$2,400/yr vs standalone software' },
  { t: 'Property management', d: 'tenancy, maintenance, owner statements in one platform' },
  { t: 'Halo™ buyer matching', d: 'AI connects your listings to multilingual buyers before you call them' },
  { t: 'Smart CRM & drip campaigns', d: 'multilingual buyer pipeline built in' },
];

const AGENT_STATS = [
  { v: '500+', l: 'Agencies across Australia' },
  { v: '340%', l: 'Average growth in multilingual enquiries' },
  { v: '60', l: 'Days free — no credit card' },
  { v: '$0', l: 'Per translation (vs $80–200 with a human translator)' },
];

type Listing = {
  id: string;
  title: string | null;
  address: string | null;
  suburb: string | null;
  state: string | null;
  price_formatted: string | null;
  images: string[] | null;
  image_url: string | null;
  beds: number | null;
  baths: number | null;
  parking: number | null;
  listing_type: string | null;
  translations: Record<string, { title?: string; description?: string }> | null;
};

const TRANSLATION_KEY: Record<LangKey, string | null> = {
  en: null,
  zh: 'zh_simplified',
  vi: 'vi',
  ar: null,
  hi: null,
  ko: null,
  ja: null,
  el: null,
  it: null,
};

function listingTitle(l: Listing, lang: LangKey): string {
  const k = TRANSLATION_KEY[lang];
  if (k && l.translations?.[k]?.title) return l.translations[k]!.title!;
  return l.title || l.address || 'Property';
}

function listingImage(l: Listing): string | null {
  if (l.images?.length) return l.images[0];
  return l.image_url ?? null;
}

const Index = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState<LangKey>('en');
  const [tab, setTab] = useState<Tab>('Buy');
  const [query, setQuery] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);

  const active = LANGUAGES.find((l) => l.key === lang) ?? LANGUAGES[0];

  useEffect(() => {
    const cols =
      'id, title, address, suburb, state, price, price_formatted, images, image_url, property_type, beds, baths, parking, listing_type, translations, is_featured, boost_tier';
    const RES = ['house', 'apartment', 'townhouse', 'unit', 'villa', 'duplex', 'studio'];
    (async () => {
      const { data: featured } = await supabase
        .from('properties')
        .select(cols)
        .eq('is_active', true)
        .eq('status', 'public')
        .in('property_type', RES)
        .or('is_featured.eq.true,boost_tier.not.is.null')
        .order('created_at', { ascending: false })
        .limit(6);
      const seen = new Set<string>();
      const out: Listing[] = [];
      for (const p of featured ?? []) {
        if (!seen.has(p.id)) { seen.add(p.id); out.push(p as Listing); }
      }
      if (out.length < 3) {
        const { data: fb } = await supabase
          .from('properties')
          .select(cols)
          .eq('is_active', true)
          .eq('status', 'public')
          .in('property_type', RES)
          .order('created_at', { ascending: false })
          .limit(6);
        for (const p of fb ?? []) {
          if (!seen.has(p.id)) { seen.add(p.id); out.push(p as Listing); }
          if (out.length >= 3) break;
        }
      }
      setListings(out.slice(0, 3));
    })();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('location', query.trim());
    if (tab === 'Rent') params.set('listingType', 'rent');
    if (tab === 'Sell') { navigate('/agents/login'); return; }
    if (tab === 'Home Value') { navigate('/valuation'); return; }
    navigate(`/?${params.toString()}`);
  };

  return (
    <>
      <Helmet>
        <title>ListHQ — Find your home, in any language</title>
        <meta
          name="description"
          content="Australia's multilingual property platform. Search 50,000+ listings in 20 languages. Free, no signup required."
        />
      </Helmet>

      {/* SECTION 2 — Hero */}
      <section
        className="relative"
        style={{
          background:
            'linear-gradient(160deg, #f0f4ff 0%, #e8f0fe 25%, #f4f6fb 65%, #fff 100%)',
          padding: '70px 16px 56px',
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(59,123,248,0.06) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative max-w-5xl mx-auto text-center">
          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-6"
            style={{
              background: '#fff',
              border: `1px solid ${TOKENS.border}`,
              borderRadius: 100,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: TOKENS.text2,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Australia's Property Platform for Every Culture
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: 'clamp(46px, 7vw, 76px)',
              fontWeight: 900,
              letterSpacing: '-2px',
              lineHeight: 1.02,
              color: TOKENS.text,
            }}
          >
            Find your home.
            <br />
            <span style={{ color: TOKENS.blue }}>In any language.</span>
          </h1>

          <p className="mt-4" style={{ fontSize: 15, fontWeight: 500, color: TOKENS.text3 }}>
            <strong style={{ color: TOKENS.text2 }}>50,000+</strong> properties ·{' '}
            <strong style={{ color: TOKENS.text2 }}>20</strong> languages ·{' '}
            <strong style={{ color: TOKENS.text2 }}>Free</strong>
          </p>

          {/* Language selector */}
          <div className="mt-10">
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: TOKENS.text3,
              }}
            >
              Select your language to begin
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
              {LANGUAGES.map((l) => {
                const isActive = l.key === lang;
                return (
                  <button
                    key={l.key}
                    onClick={() => setLang(l.key)}
                    className="flex flex-col items-center justify-center transition-all"
                    style={{
                      minWidth: 72,
                      padding: '10px 16px',
                      gap: 5,
                      borderRadius: 12,
                      background: isActive ? TOKENS.blueLight : '#fff',
                      border: `1.5px solid ${isActive ? TOKENS.blue : TOKENS.border}`,
                      boxShadow: isActive ? `0 0 0 3px rgba(59,123,248,0.1)` : 'none',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{l.flag}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: isActive ? 800 : 700,
                        color: isActive ? TOKENS.blue : TOKENS.text,
                      }}
                    >
                      {l.label}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => toast({ title: 'More languages coming soon' })}
                className="flex flex-col items-center justify-center"
                style={{
                  minWidth: 72,
                  padding: '10px 16px',
                  gap: 5,
                  borderRadius: 12,
                  background: TOKENS.off,
                  border: `1.5px dashed ${TOKENS.border}`,
                  color: TOKENS.text3,
                }}
              >
                <span style={{ fontSize: 22 }}>＋</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>11 more</span>
              </button>
            </div>
          </div>

          {/* Search card */}
          <form
            onSubmit={handleSearch}
            className="mx-auto mt-10 text-left"
            style={{
              maxWidth: 700,
              background: '#fff',
              border: `1px solid ${TOKENS.border}`,
              borderRadius: 16,
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              overflow: 'hidden',
            }}
          >
            <div className="flex items-center" style={{ borderBottom: `1px solid ${TOKENS.border}` }}>
              {TABS.map((t) => {
                const isActive = t === tab;
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTab(t)}
                    className="px-5 py-3 text-sm transition-colors"
                    style={{
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? TOKENS.blue : TOKENS.text3,
                      borderBottom: `2px solid ${isActive ? TOKENS.blue : 'transparent'}`,
                      marginBottom: -1,
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 px-4 py-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={active.placeholder}
                className="flex-1 outline-none border-0"
                style={{ fontSize: 15, color: TOKENS.text, background: 'transparent' }}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2"
                style={{
                  background: TOKENS.blue,
                  color: '#fff',
                  borderRadius: 10,
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                <Search size={16} />
                Search
              </button>
            </div>
            <div className="flex flex-wrap gap-2 px-4 pb-4">
              {FILTER_CHIPS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className="transition-colors"
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: TOKENS.text2,
                    background: TOKENS.off,
                    border: `1px solid ${TOKENS.border}`,
                    borderRadius: 100,
                    padding: '4px 12px',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </form>

          {/* Stats strip */}
          <div
            className="mx-auto mt-6 grid grid-cols-2 md:grid-cols-4"
            style={{
              maxWidth: 700,
              background: '#fff',
              border: `1px solid ${TOKENS.border}`,
              borderRadius: 12,
            }}
          >
            {HERO_STATS.map((s, i) => (
              <div
                key={s.l}
                className="px-4 py-4 text-center"
                style={{
                  borderLeft: i > 0 ? `1px solid ${TOKENS.border}` : undefined,
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 900, color: TOKENS.text }}>{s.v}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: TOKENS.text3, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — Property Listings */}
      <section style={{ background: '#fff', padding: '72px 16px 56px' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
            <div>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: TOKENS.text, letterSpacing: '-0.5px' }}>
                Properties for you
              </h2>
              <p style={{ fontSize: 13, color: TOKENS.text3, marginTop: 4 }}>
                Showing results in {active.subtitleLabel} · Switch language above
              </p>
            </div>
            <button
              onClick={() => navigate('/?listingType=sale')}
              style={{ fontSize: 14, fontWeight: 600, color: TOKENS.blue }}
            >
              View all listings →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {listings.length === 0 && (
              <>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      background: '#fff',
                      border: `1px solid ${TOKENS.border}`,
                      borderRadius: 16,
                      height: 380,
                    }}
                  />
                ))}
              </>
            )}
            {listings.map((l) => {
              const img = listingImage(l);
              const isRent = (l.listing_type ?? '').toLowerCase() === 'rent';
              return (
                <button
                  key={l.id}
                  onClick={() => navigate(`/property/${l.id}`)}
                  className="text-left group"
                  style={{
                    background: '#fff',
                    border: `1px solid ${TOKENS.border}`,
                    borderRadius: 16,
                    overflow: 'hidden',
                    transition: 'transform .2s, box-shadow .2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(13,27,53,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <div
                    className="relative"
                    style={{
                      height: 220,
                      background: img
                        ? `url(${img}) center/cover no-repeat`
                        : 'linear-gradient(135deg, #0d1b35, #1e3a8a)',
                    }}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.4) 100%)',
                      }}
                    />
                    <span
                      className="absolute top-3 left-3"
                      style={{
                        background: isRent ? 'rgba(16,185,129,0.92)' : 'rgba(59,123,248,0.92)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        padding: '4px 10px',
                        borderRadius: 100,
                      }}
                    >
                      {isRent ? 'For Rent' : 'For Sale'}
                    </span>
                    <span
                      className="absolute top-3 right-3"
                      style={{
                        background: 'rgba(13,27,53,0.7)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 100,
                      }}
                    >
                      ✦ AI Translated
                    </span>
                  </div>

                  <div className="px-4 pt-3 flex gap-1 flex-wrap" style={{ borderBottom: `1px solid ${TOKENS.border}`, paddingBottom: 10 }}>
                    {(['en', 'zh', 'vi', 'ar'] as LangKey[]).map((k) => {
                      const isA = k === lang;
                      const labels: Record<string, string> = { en: 'EN', zh: '中文', vi: 'Viet', ar: 'عربي' };
                      return (
                        <span
                          key={k}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: isA ? TOKENS.blueLight : 'transparent',
                            color: isA ? TOKENS.blue : TOKENS.text3,
                          }}
                        >
                          {labels[k]}
                        </span>
                      );
                    })}
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', color: TOKENS.text3 }}>+16</span>
                  </div>

                  <div className="p-4">
                    <div style={{ fontSize: 15, fontWeight: 700, color: TOKENS.text, lineHeight: 1.3 }}>
                      {listingTitle(l, lang)}
                    </div>
                    <div style={{ fontSize: 12, color: TOKENS.text3, marginTop: 4 }}>
                      {[l.address, l.suburb, l.state].filter(Boolean).join(', ')}
                    </div>
                    {l.price_formatted && (
                      <div style={{ fontSize: 14, fontWeight: 700, color: TOKENS.blue, marginTop: 6 }}>
                        {l.price_formatted}
                      </div>
                    )}
                    <div className="flex gap-3 mt-3" style={{ fontSize: 12, fontWeight: 500, color: TOKENS.text2 }}>
                      <span>🛏 {l.beds ?? 0}</span>
                      <span>🚿 {l.baths ?? 0}</span>
                      <span>🚗 {l.parking ?? 0}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4 — Agent re-entry hook */}
      <div
        style={{
          background: TOKENS.off,
          borderTop: `1px solid ${TOKENS.border}`,
          borderBottom: `1px solid ${TOKENS.border}`,
          padding: 14,
          textAlign: 'center',
          fontSize: 14,
        }}
      >
        <span style={{ color: TOKENS.text3 }}>Are you a real estate agent or mortgage broker? </span>
        <a href="#agents" style={{ color: TOKENS.blue, fontWeight: 600 }}>
          See how ListHQ reaches buyers REA can't →
        </a>
      </div>

      {/* SECTION 5 — Differentiator */}
      <section style={{ background: TOKENS.off, padding: '72px 16px' }}>
        <div className="max-w-5xl mx-auto text-center">
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: TOKENS.blue,
            }}
          >
            Why ListHQ is different
          </div>
          <h2
            className="mx-auto mt-3"
            style={{
              fontSize: 'clamp(26px, 3.5vw, 38px)',
              fontWeight: 900,
              letterSpacing: '-1px',
              color: TOKENS.text,
              maxWidth: 660,
              lineHeight: 1.15,
            }}
          >
            Built for the 7 million Australians who didn't find home on REA.
          </h2>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            {DIFF_CARDS.map((c) => (
              <div
                key={c.title}
                style={{
                  background: '#fff',
                  border: `1px solid ${TOKENS.border}`,
                  borderRadius: 16,
                  padding: '28px 24px',
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: TOKENS.blueLight,
                    fontSize: 22,
                  }}
                >
                  {c.icon}
                </div>
                <div className="mt-4" style={{ fontSize: 16, fontWeight: 700, color: TOKENS.text }}>
                  {c.title}
                </div>
                <p className="mt-2" style={{ fontSize: 14, lineHeight: 1.6, color: TOKENS.text2 }}>
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 — Agent section */}
      <section id="agents" style={{ background: '#0d1b35', padding: '80px 16px' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            {/* Left */}
            <div>
              <span
                className="inline-block"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: TOKENS.blue,
                  background: 'rgba(59,123,248,0.12)',
                  border: '1px solid rgba(59,123,248,0.25)',
                  padding: '5px 12px',
                  borderRadius: 100,
                }}
              >
                For real estate agents
              </span>

              <h2
                className="mt-5"
                style={{
                  fontSize: 'clamp(28px, 3.8vw, 42px)',
                  fontWeight: 900,
                  letterSpacing: '-1px',
                  color: '#fff',
                  lineHeight: 1.1,
                }}
              >
                The buyers REA misses
                <br />
                are searching <span style={{ color: TOKENS.blue }}>here.</span>
              </h2>

              <div
                className="mt-6"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderLeft: `3px solid ${TOKENS.blue}`,
                  borderRadius: 10,
                  padding: '14px 18px',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                <span style={{ color: TOKENS.blue }}>1 in 5</span>{' '}
                Australian buyers searches in a language other than English — and REA can't reach them.
              </div>

              <p className="mt-6" style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,0.6)' }}>
                ListHQ auto-translates every listing you upload into 20 languages — reaching buyers no other portal can find. Free for 60 days.
              </p>

              <ul className="mt-6 space-y-3">
                {AGENT_FEATURES.map((f) => (
                  <li key={f.t} className="flex items-start gap-3">
                    <span
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: 'rgba(59,123,248,0.15)',
                        border: `1px solid ${TOKENS.blue}`,
                        color: TOKENS.blue,
                        fontSize: 11,
                        fontWeight: 700,
                        marginTop: 2,
                      }}
                    >
                      ✓
                    </span>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
                      <strong style={{ color: '#fff' }}>{f.t}</strong> — {f.d}
                    </span>
                  </li>
                ))}
              </ul>

              <div
                className="mt-7"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderLeft: `3px solid ${TOKENS.blue}`,
                  borderRadius: 10,
                  padding: '16px 18px',
                }}
              >
                <p style={{ fontSize: 14, fontStyle: 'italic', color: 'rgba(255,255,255,0.78)', lineHeight: 1.6 }}>
                  "ListHQ is the first platform that actually speaks to my Mandarin and Vietnamese buyers without me doing any extra work. Enquiries from multicultural buyers are up 3× since we joined."
                </p>
                <p className="mt-3" style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
                  <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Sarah Chen</strong> — Principal, Sydney Metro Realty · Hurstville NSW
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/agents/login?signup=1')}
                  style={{
                    background: TOKENS.blue,
                    color: '#fff',
                    borderRadius: 10,
                    padding: '13px 24px',
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  Start free 60-day trial →
                </button>
                <button
                  onClick={() => navigate('/pricing')}
                  style={{
                    background: 'transparent',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 10,
                    padding: '13px 24px',
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  See pricing from $299/mo
                </button>
              </div>

              <p className="mt-4" style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                No credit card required · Full access · Cancel anytime
              </p>
            </div>

            {/* Right — preview */}
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: 24,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'rgba(255,255,255,0.3)',
                }}
              >
                Your listing, translated in seconds
              </div>

              {/* Card 1 */}
              <div
                className="mt-4"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  4BR Family Home — Auburn NSW
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>
                  $1,250,000 · Uploaded 2 mins ago
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {['🇦🇺 EN', '🇨🇳 中文', '🇻🇳 Viet', '🇸🇦 عربي', '🇮🇳 हिंदी', '🇰🇷 한국어', '+ 14 more'].map((c) => (
                    <span
                      key={c}
                      style={{
                        background: 'rgba(59,123,248,0.2)',
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 10,
                        fontWeight: 700,
                        borderRadius: 4,
                        padding: '3px 7px',
                      }}
                    >
                      {c} ✓
                    </span>
                  ))}
                </div>
              </div>

              {/* Halo callout */}
              <div
                className="mt-4"
                style={{
                  background: 'rgba(59,123,248,0.15)',
                  border: '1px solid rgba(59,123,248,0.25)',
                  borderRadius: 10,
                  padding: '12px 14px',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: TOKENS.blue,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  🔔 Halo™ Match
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4, lineHeight: 1.5 }}>
                  3 Mandarin-speaking buyers in your suburb are actively searching for this property type right now.
                </div>
              </div>

              {/* Card 2 */}
              <div
                className="mt-4"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: 14,
                  opacity: 0.55,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  2BR Apartment — Box Hill VIC
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  $680,000 · 20 languages live
                </div>
              </div>

              {/* Card 3 */}
              <div
                className="mt-3"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12,
                  padding: 14,
                  opacity: 0.28,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  5BR Waterfront — Mosman NSW
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  $4,200,000 · 20 languages live
                </div>
              </div>
            </div>
          </div>

          {/* Agent stats strip */}
          <div
            className="mt-15 pt-10 grid grid-cols-2 md:grid-cols-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 60, paddingTop: 40 }}
          >
            {AGENT_STATS.map((s, i) => (
              <div
                key={s.l}
                className="px-4 text-center"
                style={{
                  borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : undefined,
                }}
              >
                <div style={{ fontSize: 32, fontWeight: 900, color: TOKENS.blue }}>{s.v}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6, lineHeight: 1.4 }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Index;
