import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAgentSearch } from '@/features/agents/hooks/useAgentSearch';
import { AgentSearchCard } from '@/features/agents/components/AgentSearchCard';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNav } from '@/shared/components/layout/BottomNav';
import { cn } from '@/lib/utils';
import type { AgentFilters } from '@/features/agents/types';

import { Users, Mic, ArrowRight } from 'lucide-react';

const SPECIALTY_CHIPS = [
  { key: 'all', label: 'All agents' },
  { key: 'buy', label: 'Buy specialists' },
  { key: 'rent', label: 'Rental specialists' },
  { key: 'multi', label: 'Multilingual' },
  { key: 'top', label: 'Top-rated' },
];

const LANG_CHIPS = [
  { key: 'zh', flag: '🇨🇳', label: 'Mandarin' },
  { key: 'yue', flag: '🇭🇰', label: 'Cantonese' },
  { key: 'vi', flag: '🇻🇳', label: 'Vietnamese' },
  { key: 'ko', flag: '🇰🇷', label: 'Korean' },
  { key: 'ar', flag: '🇸🇦', label: 'Arabic' },
  { key: 'hi', flag: '🇮🇳', label: 'Hindi' },
  { key: 'it', flag: '🇮🇹', label: 'Italian' },
  { key: 'id', flag: '🇮🇩', label: 'Indonesian' },
];

export default function FindAgentPage() {
  const [filters, setFilters] = useState<AgentFilters>({});
  const [page, setPage] = useState(0);
  const [specialty, setSpecialty] = useState('all');
  const [activeLangs, setActiveLangs] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const { results, total, loading } = useAgentSearch(filters, page);

  const onSearch = () => {
    setFilters((f) => ({ ...f, suburb: query || undefined }));
    setPage(0);
  };

  const toggleLang = (k: string) => {
    setActiveLangs((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  return (
    <>
      <Helmet>
        <title>Find a Real Estate Agent in Australia</title>
        <meta name="description" content="Compare real estate agents by reviews, sales history, and suburb expertise across Australia." />
      </Helmet>

      <div className="bg-white text-black min-h-screen">
        {/* Hero */}
        <section className="pt-[140px] pb-12 px-8 bg-white text-center">
          <div className="inline-flex items-center gap-2 bg-[#EFF6FF] text-[#2563EB] rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]">
            <Users size={14} style={{ display: 'inline-flex', flexShrink: 0 }} />
            Find an agent
          </div>
          <h1 className="text-[clamp(48px,7vw,100px)] font-extrabold leading-[0.95] tracking-[-0.05em] text-black mt-6">
            Find an agent
            <br />
            <span className="bg-gradient-to-r from-[#2563EB] to-[#60A5FA] bg-clip-text text-transparent">who speaks your language.</span>
          </h1>
          <p className="text-[18px] text-[#4a4a4a] mt-6 max-w-[620px] mx-auto leading-[1.55]">
            Search Australia's only multilingual real estate platform. Filter by suburb, language, or specialty.
          </p>

          {/* Search bar */}
          <div className="max-w-[640px] mx-auto px-8 mt-10">
            <div className="flex items-center gap-2 bg-white border-2 border-black rounded-[18px] pl-4 pr-1.5 py-1.5">
              <Mic size={18} color="#6a6a6a" style={{ display: 'inline-flex', flexShrink: 0 }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                placeholder="Search by suburb, agent name, or language…"
                className="flex-1 bg-transparent outline-none text-[15px] py-2.5"
              />
              <span className="text-xl">🇦🇺</span>
              <button
                onClick={onSearch}
                className="bg-gradient-to-r from-[#2563EB] to-[#60A5FA] text-white rounded-full px-6 py-2.5 text-[14px] font-bold inline-flex items-center gap-1.5"
              >
                Search
                <ArrowRight size={14} style={{ display: 'inline-flex', flexShrink: 0 }} />
              </button>
            </div>
          </div>
        </section>

        {/* Specialty filter chips */}
        <div className="max-w-[1200px] mx-auto px-8 mt-4 flex items-center gap-2 overflow-x-auto pb-4">
          {SPECIALTY_CHIPS.map((c) => (
            <button
              key={c.key}
              onClick={() => setSpecialty(c.key)}
              className={cn(
                'rounded-full px-4 py-2 text-[13px] whitespace-nowrap transition-colors',
                specialty === c.key
                  ? 'bg-[#0a0f1e] text-white font-bold'
                  : 'bg-white border border-[#E5E5E5] text-[#374151] font-semibold hover:border-[#2563EB]'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Language chips */}
        <div className="max-w-[1200px] mx-auto px-8 mt-3 flex items-center gap-2 flex-wrap pb-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.10em] text-[#6a6a6a] mr-2">Languages</span>
          {LANG_CHIPS.map((l) => (
            <button
              key={l.key}
              onClick={() => toggleLang(l.key)}
              title={l.label}
              className={cn(
                'w-10 h-10 rounded-xl border text-xl flex items-center justify-center cursor-pointer transition-all',
                activeLangs.has(l.key)
                  ? 'border-[#2563EB] ring-2 ring-[#2563EB] bg-[#EFF6FF]'
                  : 'border-[#E5E5E5] bg-white hover:border-[#2563EB]'
              )}
            >
              {l.flag}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="max-w-[1280px] mx-auto px-8 mt-8 pb-16">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-3xl" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-24">
              <Users size={56} color="#E5E7EB" style={{ display: 'inline-flex', flexShrink: 0 }} />
              <p className="text-[18px] font-bold text-[#0a0f1e] mt-4">No agents found</p>
              <p className="text-[14px] text-[#6a6a6a] mt-2">Try widening your search filters.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((agent) => (
                  <AgentSearchCard key={agent.agent_id} agent={agent} />
                ))}
              </div>

              {total > 24 && (
                <div className="flex justify-center items-center gap-3 mt-10">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="bg-white border border-[#E5E5E5] text-[#374151] rounded-full px-5 py-2 text-[13px] font-bold disabled:opacity-30 hover:border-[#2563EB]"
                  >
                    Previous
                  </button>
                  <span className="text-[13px] text-[#6a6a6a] font-semibold">
                    Page {page + 1} of {Math.ceil(total / 24)}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={(page + 1) * 24 >= total}
                    className="bg-[#0a0f1e] text-white rounded-full px-5 py-2 text-[13px] font-bold disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          {/* Empty-state Halo CTA */}
          {!loading && results.length > 0 && (
            <div className="mt-16 bg-[#F9FAFB] border border-[#E5E5E5] rounded-3xl p-10 text-center">
              <h3 className="text-[24px] font-extrabold text-black">Can't find the right agent?</h3>
              <p className="text-[15px] text-[#4a4a4a] mt-3 max-w-[520px] mx-auto">
                Post a Halo and let agents come to you with what they have, in your language.
              </p>
              <Link
                to="/halo/new"
                className="inline-flex items-center gap-2 bg-[#0a0f1e] text-white rounded-full px-7 py-3.5 text-[14px] font-bold mt-6 hover:bg-[#2563EB] transition-colors"
              >
                Tell agents what you want
                <ArrowRight size={14} style={{ display: 'inline-flex', flexShrink: 0 }} />
              </Link>
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </>
  );
}
