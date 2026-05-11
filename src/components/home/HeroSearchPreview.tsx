import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Seq = {
  flag: string; code: string; line: string; ph: string;
  title: string; price: string;
};

const SEQ: Seq[] = [
  { flag:'🇦🇺', code:'EN', line:'In any language.',        ph:'Suburb, postcode, or address', title:'Renovated North-Facing<br>Family Home', price:'$1,850,000' },
  { flag:'🇨🇳', code:'ZH', line:'任何语言。',                ph:'区, 邮编, 或地址',               title:'翻新北向<br>家庭住宅',                 price:'$1,850,000 AUD' },
  { flag:'🇻🇳', code:'VI', line:'Bằng bất kỳ ngôn ngữ.',   ph:'Vùng ngoại ô, mã bưu điện',    title:'Nhà gia đình<br>hướng bắc',            price:'$1,850,000 AUD' },
  { flag:'🇰🇷', code:'KO', line:'어떤 언어로든.',            ph:'교외, 우편번호, 또는 주소',     title:'북향 가족주택<br>리노베이션',           price:'$1,850,000 AUD' },
  { flag:'🇸🇦', code:'AR', line:'بأي لغة.',                ph:'الضاحية أو الرمز البريدي',     title:'منزل عائلي<br>مُجدد',                  price:'$1,850,000 AUD' },
  { flag:'🇮🇳', code:'HI', line:'किसी भी भाषा में।',        ph:'उपनगर, पिनकोड या पता',         title:'उत्तर-मुखी<br>पारिवारिक घर',           price:'$1,850,000 AUD' },
  { flag:'🇯🇵', code:'JA', line:'どんな言語でも。',          ph:'地区、郵便番号、住所',           title:'北向きの<br>ファミリーホーム',          price:'$1,850,000 AUD' },
  { flag:'🇮🇹', code:'IT', line:'In qualsiasi lingua.',    ph:'Sobborgo, CAP, o indirizzo',   title:'Casa familiare<br>esposta a nord',    price:'$1,850,000 AUD' },
];

const CHIPS = ['Melbourne', 'Sydney', 'Under $1M', '3+ bed', 'House'];

export default function HeroSearchPreview() {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [q, setQ] = useState('');
  const [heroImg, setHeroImg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const paused = useRef(false);

  const cur = SEQ[idx];

  // Cycle every 3500ms (pause on user typing)
  useEffect(() => {
    const id = window.setInterval(() => {
      if (paused.current) return;
      setIdx(i => (i + 1) % SEQ.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, []);

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

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const term = q.trim();
    if (!term) { inputRef.current?.focus(); return; }
    navigate(`/search?q=${encodeURIComponent(term)}`);
  }

  function openLangDropdown() {
    const el =
      document.querySelector<HTMLElement>('[data-language-trigger]') ||
      document.querySelector<HTMLElement>('header button[aria-haspopup="listbox"]');
    el?.click();
  }

  function startVoice() {
    // Trigger header's voice button if present; otherwise focus input.
    const el = document.querySelector<HTMLElement>('[data-voice-search-trigger]');
    if (el) { el.click(); return; }
    inputRef.current?.focus();
  }

  return (
    <section
      id="main-content"
      className="bg-white min-h-screen pt-32 pb-20"
      style={{ overflowX: 'hidden' }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 max-w-[1400px] mx-auto px-8 lg:px-12 items-center">
        {/* ── LEFT ─────────────────────────── */}
        <div className="flex flex-col">
          {/* Eyebrow pill */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#EFF6FF', borderRadius: 100,
              padding: '7px 14px',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
              textTransform: 'uppercase', color: '#1E40AF',
            }}
          >
            <span
              style={{
                width: 7, height: 7, borderRadius: '50%', background: '#2563EB',
                animation: 'hspPulse 2s ease-in-out infinite',
              }}
            />
            Australia's multilingual property platform
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
              Find your home<span style={{ color: '#2563EB' }}>.</span>
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
              {cur.line}
            </span>
          </h1>

          {/* Sub paragraph */}
          <p style={{
            marginTop: 24, marginBottom: 0,
            fontSize: 17, lineHeight: 1.55, color: '#6a6a6a',
            maxWidth: 520,
          }}>
            The only property search in Australia that speaks 24 languages.
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
                color: '#6a6a6a', marginRight: 12, flexShrink: 0,
              }}
            >
              <Mic size={20} strokeWidth={1.6} />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={cur.ph}
              aria-label="Search properties"
              style={{
                flex: 1, background: 'transparent', border: 0, outline: 0,
                padding: '14px 0', fontSize: 15, color: '#0a0f1e', fontWeight: 500,
                fontFamily: 'inherit', minWidth: 0,
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
              Search <ArrowRight size={14} />
            </button>
          </form>

          {/* Filter chips */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8,
            marginTop: 18, maxWidth: 600,
          }}>
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => navigate(`/search?q=${encodeURIComponent(c)}`)}
                style={{
                  background: '#F9FAFB', border: '1px solid #E5E7EB',
                  borderRadius: 100, padding: '7px 14px',
                  fontSize: 13, fontWeight: 600, color: '#374151',
                  cursor: 'pointer', transition: 'all .15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = 'rgba(37,99,235,.30)'; e.currentTarget.style.color = '#1E40AF'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#374151'; }}
              >
                {c}
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
            Free for buyers · No account needed
          </div>
        </div>

        {/* ── RIGHT ─────────────────────────── */}
        <div className="hsp-right relative flex justify-center">
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
              <img
                src="/hero-fallback-auburn.jpg"
                alt="Renovated north-facing family home in Auburn, NSW"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                loading="eager"
                {...({ fetchpriority: 'high' } as any)}
              />
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
                <span aria-hidden>🌐</span> 24 languages · auto-translated
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
                  Auburn · NSW
                </div>
                <div
                  id="propTitle"
                  style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15, marginBottom: 10 }}
                  dangerouslySetInnerHTML={{ __html: cur.title }}
                />
                <div id="propPrice" style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>
                  {cur.price}
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
                  New enquiry in Mandarin
                </span>
                <span style={{ fontSize: 11, color: '#6B7280' }}>
                  14 Bellevue Rd · 2 min ago
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
