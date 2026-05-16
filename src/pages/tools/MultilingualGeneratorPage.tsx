import { useState } from 'react';
import { usePageTitle } from '@/lib/usePageTitle';
import { cn } from '@/lib/utils';
import { Gift, RefreshCw, Languages, Copy, Share2, ArrowRight } from 'lucide-react';

type TranslationMap = Record<string, { title?: string; description?: string }>;

const LANGS: { key: string; flag: string; label: string; rtl?: boolean }[] = [
  { key: 'zh_simplified', flag: '🇨🇳', label: 'Mandarin' },
  { key: 'vi', flag: '🇻🇳', label: 'Vietnamese' },
  { key: 'ko', flag: '🇰🇷', label: 'Korean' },
  { key: 'ar', flag: '🇸🇦', label: 'Arabic', rtl: true },
  { key: 'hi', flag: '🇮🇳', label: 'Hindi' },
  { key: 'zh_traditional', flag: '🇭🇰', label: 'Cantonese' },
];

const PROPERTY_TYPES = ['House', 'Apartment', 'Townhouse', 'Land', 'Acreage'];

export default function MultilingualGeneratorPage() {
  usePageTitle('Free Multilingual Listing Translator');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TranslationMap | null>(null);
  const [activeTab, setActiveTab] = useState<string>('zh_simplified');
  const [listingType, setListingType] = useState<'sale' | 'rent'>('sale');
  const [propType, setPropType] = useState<string>('House');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setError(null);
    setResults(null);
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-listing-preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: '', description }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.translations) throw new Error(data?.error || 'Translation failed');
      setResults(data.translations as TranslationMap);
      const first = LANGS.find((l) => data.translations[l.key]);
      if (first) setActiveTab(first.key);
    } catch {
      setError('Translation failed. Please check your description and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!results?.[activeTab]) return;
    const text = `${results[activeTab].title || ''}\n\n${results[activeTab].description || ''}`.trim();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleShare = async () => {
    if (!results?.[activeTab]) return;
    const text = `${results[activeTab].title || ''}\n\n${results[activeTab].description || ''}`.trim();
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* ignore */ }
    } else {
      handleCopy();
    }
  };

  const active = LANGS.find((l) => l.key === activeTab);
  const activeContent = results?.[activeTab];
  const charCount = description.length;

  return (
    <div className="bg-white text-black min-h-screen">
      {/* Hero */}
      <section className="pt-[140px] pb-12 px-8 bg-white text-center">
        <div className="max-w-[920px] mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#EFF6FF] text-[#2563EB] rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]">
            <Gift size={14} style={{ display: 'inline-flex', flexShrink: 0 }} />
            Free tool · No login
          </div>
          <h1 className="text-[clamp(48px,7vw,100px)] font-extrabold leading-[0.95] tracking-[-0.05em] text-black mt-6">
            Translate any listing into
            <br />
            <span className="bg-gradient-to-r from-[#2563EB] to-[#60A5FA] bg-clip-text text-transparent">every language.</span>
          </h1>
          <p className="text-[18px] text-[#4a4a4a] mt-6 max-w-[640px] mx-auto leading-[1.55]">
            Paste your listing description. AI rewrites it in Mandarin, Vietnamese, Korean, Arabic, Hindi, and Cantonese — with Australian real-estate context. Free. No sign-up.
          </p>
        </div>
      </section>

      {/* Translator interface */}
      <section className="max-w-[1200px] mx-auto px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12">
          {/* LEFT — Input */}
          <div className="bg-white border border-[#E5E5E5] rounded-3xl p-7">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="inline-flex items-center gap-1 bg-[#F3F4F6] rounded-full p-1">
                {(['sale', 'rent'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setListingType(t)}
                    className={cn(
                      'rounded-full px-4 py-2 text-[13px] transition-colors',
                      listingType === t
                        ? 'bg-[#0a0f1e] text-white font-bold'
                        : 'text-[#374151] font-semibold'
                    )}
                  >
                    {t === 'sale' ? 'For Sale' : 'For Rent'}
                  </button>
                ))}
              </div>
              <select
                value={propType}
                onChange={(e) => setPropType(e.target.value)}
                className="bg-white border border-[#E5E5E5] rounded-full px-4 py-2 text-[13px] font-semibold text-[#374151] cursor-pointer focus:outline-none focus:border-[#2563EB]"
              >
                {PROPERTY_TYPES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>

            <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6a6a6a] block mb-2">
              Paste your listing description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Renovated 4-bedroom family home in Auburn. North-facing aspect..."
              disabled={loading}
              className="w-full min-h-[280px] bg-white border-2 border-[#E5E5E5] rounded-2xl px-5 py-4 text-[15px] text-[#0a0f1e] leading-[1.6] focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 transition-all resize-y"
            />

            <div className="flex items-center justify-between mt-4">
              <span className="text-[12px] text-[#9CA3AF]">{charCount} characters</span>
              <button
                onClick={handleGenerate}
                disabled={loading || !description.trim()}
                className="bg-black text-white rounded-full px-7 py-3.5 text-[14px] font-bold inline-flex items-center gap-2.5 hover:bg-white hover:text-black border border-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" style={{ display: 'inline-flex', flexShrink: 0 }} />
                    Translating...
                  </>
                ) : (
                  <>
                    <Languages size={16} style={{ display: 'inline-flex', flexShrink: 0 }} />
                    Translate
                  </>
                )}
              </button>
            </div>
            {error && <p className="text-sm text-red-600 text-center mt-3">{error}</p>}
          </div>

          {/* RIGHT — Output */}
          <div className="bg-white border border-[#E5E5E5] rounded-3xl p-7">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-bold text-[#0a0f1e]">Translations</h2>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.10em] bg-[#EFF6FF] text-[#2563EB]">
                AI Translated
              </span>
            </div>

            <div className="flex items-center gap-1 bg-[#F9FAFB] rounded-full p-1 mb-5 overflow-x-auto">
              {LANGS.map(l => (
                <button
                  key={l.key}
                  onClick={() => setActiveTab(l.key)}
                  className={cn(
                    'rounded-full px-4 py-2 text-[13px] whitespace-nowrap inline-flex items-center gap-1.5',
                    activeTab === l.key
                      ? 'bg-white text-[#0a0f1e] font-bold shadow-sm'
                      : 'text-[#6a6a6a] hover:text-[#374151] font-semibold'
                  )}
                >
                  <span>{l.flag}</span>
                  {l.label}
                </button>
              ))}
            </div>

            {activeContent ? (
              <div
                dir={active?.rtl ? 'rtl' : 'ltr'}
                className="min-h-[280px] text-[15px] text-[#374151] leading-[1.6] whitespace-pre-line p-5 bg-[#F9FAFB] rounded-2xl"
              >
                {activeContent.title && <div className="font-bold text-[#0a0f1e] mb-3">{activeContent.title}</div>}
                {activeContent.description}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center min-h-[280px] bg-[#F9FAFB] rounded-2xl">
                <Languages size={48} style={{ display: 'inline-flex', flexShrink: 0 }} />
                <p className="text-[14px] text-[#6a6a6a] mt-4 max-w-[280px]">
                  Paste a description and click Translate to see the output here
                </p>
              </div>
            )}

            <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
              <button
                onClick={handleCopy}
                disabled={!activeContent}
                className="text-[13px] font-semibold text-[#374151] inline-flex items-center gap-1.5 hover:text-[#2563EB] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Copy size={16} style={{ display: 'inline-flex', flexShrink: 0 }} />
                {copied ? 'Copied!' : 'Copy translation'}
              </button>
              <button
                onClick={handleShare}
                disabled={!activeContent}
                className="text-[13px] font-semibold text-[#374151] inline-flex items-center gap-1.5 hover:text-[#2563EB] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Share2 size={16} style={{ display: 'inline-flex', flexShrink: 0 }} />
                Share with team
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trojan Horse CTA */}
      <section className="bg-[#0a0f1e] text-white py-[120px] px-8">
        <div className="max-w-[1100px] mx-auto text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#93C5FD]">
            Want this on every listing?
          </div>
          <h2 className="text-[clamp(48px,6vw,88px)] font-extrabold leading-[0.95] tracking-[-0.04em] text-white mt-6">
            Auto-translate every listing
            <br />
            <span className="bg-gradient-to-r from-[#93C5FD] to-[#60A5FA] bg-clip-text text-transparent">in twenty languages.</span>
          </h2>
          <p className="text-[18px] text-white/65 mt-6 max-w-[600px] mx-auto leading-[1.55]">
            ListHQ translates your listings into any language the moment you publish — Mandarin, Vietnamese, Arabic, Hindi, and dozens more. With Australian real-estate terminology built in.
          </p>
          <div className="flex gap-3 justify-center mt-10 flex-wrap">
            <a
              href="/register?role=agent"
              className="bg-white text-[#2563EB] rounded-full px-8 py-4 font-bold text-[15px] inline-flex items-center gap-2 hover:bg-[#EFF6FF] transition-colors"
            >
              Start free trial
              <ArrowRight size={16} style={{ display: 'inline-flex', flexShrink: 0 }} />
            </a>
            <a
              href="/for-agents"
              className="border border-white/40 text-white rounded-full px-8 py-4 font-bold text-[15px] inline-flex items-center hover:bg-white/10 transition-colors"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-white py-14 px-8 border-y border-[#E5E5E5]">
        <div className="max-w-[1100px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '20', label: 'Languages' },
            { value: '45K', label: 'Agents' },
            { value: '50K', label: 'Listings' },
            { value: '60d', label: 'Free trial' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-[clamp(36px,5vw,56px)] font-extrabold leading-none tabular-nums bg-gradient-to-r from-[#2563EB] to-[#60A5FA] bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6a6a6a] mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
