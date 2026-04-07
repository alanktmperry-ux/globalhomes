import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mic, ArrowRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/shared/lib/i18n';

const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
const AVATAR_INITIALS = ['A', 'M', 'S', 'J', 'R'];

function usePlatformStats() {
  const [stats, setStats] = useState<{ properties: number | null; agents: number | null; searching: number }>({
    properties: null, agents: null, searching: 12,
  });

  useEffect(() => {
    async function load() {
      const [{ count: propCount }, { count: agentCount }] = await Promise.all([
        supabase.from('properties').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('agents').select('*', { count: 'exact', head: true }),
      ]);
      setStats(s => ({ ...s, properties: propCount ?? 0, agents: agentCount ?? 0 }));
    }
    load();
  }, []);

  return stats;
}

const ROTATING_WORDS = [
  { text: 'next home.', color: 'text-foreground' },
  { text: 'investment.', color: 'text-blue-500' },
  { text: 'rental.', color: 'text-cyan-500' },
  { text: 'dream home.', color: 'text-violet-500' },
];

const PLACEHOLDERS = [
  'e.g. 3 bed house in Doncaster under $1.3M',
  'e.g. apartment in Bondi under $800k',
  'e.g. rental near Melbourne CBD under $500pw',
  'e.g. family home with pool in Brisbane',
];

const AGENT_FEATURES = [
  'Pocket listings',
  'AI buyer matching',
  'Pipeline kanban',
  'Trust accounting',
  'Rent roll',
  'Voice search leads',
];

interface Props {
  onSearch: (query: string) => void;
  onListingModeChange: (mode: 'sale' | 'rent') => void;
}

export function LandingHero({ onSearch, onListingModeChange }: Props) {
  const navigate = useNavigate();
  const { listingMode, setListingMode } = useCurrency();
  const { t } = useI18n();
  const platformStats = usePlatformStats();
  const [query, setQuery] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rotate headline word
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex(i => (i + 1) % ROTATING_WORDS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Rotate placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(i => (i + 1) % PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim());
  };

  const handleModeChange = (mode: 'sale' | 'rent') => {
    setListingMode(mode);
    onListingModeChange(mode);
    window.dispatchEvent(new CustomEvent('listing-mode-changed'));
  };

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── BUYER HERO — Light, warm, aspirational ── */}
      <section className="relative flex flex-col items-center justify-center flex-1 min-h-[92vh] bg-white overflow-hidden px-6 text-center">

        {/* Subtle warm gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 pointer-events-none" />

        {/* Soft ambient circles */}
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-100/30 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-violet-100/20 blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-3xl w-full"
        >

          {/* Eyebrow pill */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium tracking-wide"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            {t('hero.eyebrow')}
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.05] mb-6">
            {t('hero.headline')}{' '}
            <span className="block text-blue-500">{t('hero.headline2')}</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-slate-500 font-normal mb-10 max-w-lg mx-auto leading-relaxed">
            {t('hero.subheadline')}
          </p>

          {/* Sale / Rent toggle */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center bg-slate-100 rounded-full p-1 gap-1">
              <button
                onClick={() => handleModeChange('sale')}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  listingMode === 'sale'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('hero.forSale')}
              </button>
              <button
                onClick={() => handleModeChange('rent')}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  listingMode === 'rent'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('hero.forRent')}
              </button>
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
            <div className="flex items-center bg-white border border-slate-200 rounded-2xl shadow-lg shadow-slate-100/80 px-4 py-2 gap-3 hover:border-slate-300 hover:shadow-xl transition-all duration-200 focus-within:border-blue-300 focus-within:shadow-blue-50/80 focus-within:shadow-xl">
              <Mic size={18} className="text-slate-400 shrink-0" />
              <AnimatePresence mode="wait">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={PLACEHOLDERS[placeholderIndex]}
                  className="flex-1 bg-transparent outline-none text-slate-800 text-[15px] placeholder:text-slate-400 min-w-0"
                />
              </AnimatePresence>
              <button
                type="submit"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0"
              >
                <Search size={14} />
                Search
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">
              {t('hero.searchHint')}
            </p>
          </form>

        </motion.div>

        {/* Social proof strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="relative z-10 mt-16 max-w-2xl w-full mx-auto"
        >
          {/* Live badge */}
          <div className="flex justify-center mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('hero.liveData')}
            </span>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm shadow-slate-100 px-8 py-6 flex flex-wrap items-center justify-center gap-6 sm:gap-8">

            {/* Properties */}
            <div className="flex flex-col items-center gap-0.5 min-w-[72px]">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                {platformStats.properties === null ? <span className="text-slate-300">—</span> : platformStats.properties}
                <span className="text-xl font-semibold text-blue-500">+</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">{t('hero.propertiesListed')}</span>
            </div>

            <div className="w-px h-9 bg-slate-100 hidden sm:block" />

            {/* Agents */}
            <div className="flex flex-col items-center gap-0.5 min-w-[72px]">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                {platformStats.agents === null ? <span className="text-slate-300">—</span> : platformStats.agents}
                <span className="text-xl font-semibold text-blue-500">+</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">{t('hero.activeAgents')}</span>
            </div>

            <div className="w-px h-9 bg-slate-100 hidden sm:block" />

            {/* Languages */}
            <div className="flex flex-col items-center gap-0.5 min-w-[72px]">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">24</span>
              <span className="text-[11px] text-slate-400 font-medium">{t('hero.languages')}</span>
            </div>

            <div className="w-px h-9 bg-slate-100 hidden sm:block" />

            {/* Searching now — avatar stack */}
            <div className="flex items-center gap-3">
              <div className="flex">
                {AVATAR_INITIALS.map((init, i) => (
                  <div
                    key={init}
                    className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ background: AVATAR_COLORS[i], marginLeft: i === 0 ? 0 : -8 }}
                  >
                    {init}
                  </div>
                ))}
              </div>
              <span className="text-sm text-slate-500 font-medium">
                <span className="font-bold text-slate-900">{platformStats.searching}</span> {t('hero.searchingNow')}
              </span>
            </div>

          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-400"
        >
          <ChevronDown size={20} className="animate-bounce" />
        </motion.div>
      </section>

      {/* Featured Listings */}
      <section className="bg-white py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{t('hero.featuredListings')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('hero.featuredSub')}</p>
            </div>
            <a href="/search" className="text-sm text-blue-600 hover:text-blue-700 font-medium">{t('hero.viewAll')} →</a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { price: '$1,250,000', addr: '32 Harbour St, Sydney NSW', beds: 3, baths: 2, cars: 1, badge: 'AI Translated', color: 'blue' },
              { price: '$850,000', addr: '14 Chapel St, Melbourne VIC', beds: 2, baths: 1, cars: 1, badge: 'New', color: 'blue' },
              { price: '$720,000', addr: '8 Bridge Rd, Richmond VIC', beds: 2, baths: 2, cars: 0, badge: 'Hot', color: 'blue' },
            ].map((p, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                <div className="h-40 bg-blue-50 flex items-center justify-center relative">
                  <span className="absolute top-3 left-3 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">{p.badge}</span>
                  <span className="text-slate-300 text-sm">Photo</span>
                </div>
                <div className="p-4">
                  <div className="text-base font-semibold text-slate-900">{p.price}</div>
                  <div className="text-xs text-slate-500 mt-0.5 mb-2">{p.addr}</div>
                  <div className="flex gap-3 text-xs text-slate-400">
                    <span>{p.beds} bed</span><span>{p.baths} bath</span><span>{p.cars} car</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-semibold text-slate-900 mb-1">{t('hero.howItWorks')}</h2>
          <p className="text-sm text-slate-500 mb-8">{t('hero.howItWorksSub')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
                { num: '1', title: t('hero.step1Title'), desc: t('hero.step1Desc') },
                { num: '2', title: t('hero.step2Title'), desc: t('hero.step2Desc') },
                { num: '3', title: t('hero.step3Title'), desc: t('hero.step3Desc') },
            ].map((step) => (
              <div key={step.num} className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold flex items-center justify-center mx-auto mb-4">{step.num}</div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent CTA */}
      <section className="bg-slate-900 py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-white mb-3">{t('hero.agentCTA')}</h2>
          <p className="text-sm text-slate-400 mb-8">{t('hero.agentCTASub')}</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="/agents/login" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-full px-6 py-3 transition-colors">{t('hero.startTrial')}</a>
            <a href="/agents/login" className="border border-slate-600 text-slate-300 hover:text-white text-sm font-medium rounded-full px-6 py-3 transition-colors">{t('hero.seeHow')}</a>
          </div>
        </div>
      </section>

      {/* ── AGENT STRIP — Dark, premium, powerful ── */}
      <section className="relative bg-slate-950 py-24 px-6 overflow-hidden">

        {/* Ambient blue glow */}
        <div className="absolute top-0 left-1/3 w-[600px] h-[300px] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[200px] rounded-full bg-violet-600/10 blur-[80px] pointer-events-none" />

        {/* Top border gradient */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium tracking-wide">
            {t('hero.agentStrip')}
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight mb-5">
            {t('hero.builtForAgents')}<br />
            <span className="text-blue-400">{t('hero.whoMoveFast')}</span>
          </h2>

          <p className="text-lg text-slate-400 leading-relaxed max-w-xl mx-auto mb-10">
            {t('hero.agentStripSub')}
          </p>

          <button
            onClick={() => navigate('/agents/login')}
            className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 rounded-full text-[15px] font-semibold transition-all duration-200 hover:scale-105 active:scale-100 shadow-lg shadow-white/10"
          >
            {t('hero.listFree')}
            <ArrowRight size={16} />
          </button>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-12">
            {AGENT_FEATURES.map(f => (
              <div
                key={f}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-400 text-sm"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {f}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

    </div>
  );
}
