import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mic, ArrowRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/shared/lib/CurrencyContext';

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
            Australia's AI-powered property platform
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.05] mb-6">
            Find your{' '}
            <span className="block">
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className={`inline-block ${ROTATING_WORDS[wordIndex].color}`}
                >
                  {ROTATING_WORDS[wordIndex].text}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-slate-500 font-normal mb-10 max-w-lg mx-auto leading-relaxed">
            Search in 24 languages. See prices in your currency. Powered by AI voice search.
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
                For Sale
              </button>
              <button
                onClick={() => handleModeChange('rent')}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  listingMode === 'rent'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                For Rent
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
              Describe what you're looking for — our AI does the rest
            </p>
          </form>

        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="relative z-10 mt-16 grid grid-cols-4 gap-px bg-slate-100 rounded-2xl overflow-hidden max-w-2xl w-full mx-auto"
        >
          {[
            { num: '24', label: 'Languages' },
            { num: 'Live', label: 'Exchange rates' },
            { num: 'AI', label: 'Voice search' },
            { num: 'Free', label: 'To search' },
          ].map(stat => (
            <div key={stat.label} className="bg-white px-6 py-5 text-center">
              <div className="text-xl font-bold text-slate-900">{stat.num}</div>
              <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
            </div>
          ))}
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
            For real estate professionals
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight mb-5">
            Built for agents<br />
            <span className="text-blue-400">who move fast.</span>
          </h2>

          <p className="text-lg text-slate-400 leading-relaxed max-w-xl mx-auto mb-10">
            Pocket listings. AI buyer concierge. Pipeline management. Trust accounting. One platform — no compromises.
          </p>

          <button
            onClick={() => navigate('/agents/login')}
            className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 rounded-full text-[15px] font-semibold transition-all duration-200 hover:scale-105 active:scale-100 shadow-lg shadow-white/10"
          >
            List your first property free
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
