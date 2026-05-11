import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Ico = ({ icon, size = 16, color }: { icon: string; size?: number; color?: string }) =>
  // @ts-expect-error iconify web component
  <iconify-icon icon={icon} width={size} height={size} style={{ color, display: 'inline-block' }} />;

type TabKey = 'tools' | 'suburb' | 'saved' | 'seller';

const TOOLS: {
  key: string;
  name: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  pill: string;
  to: string;
}[] = [
  {
    key: 'cma',
    name: 'CMA Tool',
    description: 'Generate a professional Comparative Market Analysis with comparable sales, days on market, and price-per-sqm. PDF-ready for vendor appraisals.',
    icon: 'solar:chart-square-bold',
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    pill: '30s',
    to: '/dashboard/reports',
  },
  {
    key: 'suburb',
    name: 'Suburb Report',
    description: 'Live market snapshot for any Australian suburb. Median prices, days on market, demographics, and auction clearance rates.',
    icon: 'solar:map-point-bold',
    iconBg: '#ECFDF5',
    iconColor: '#065F46',
    pill: 'Live',
    to: '#suburb',
  },
  {
    key: 'vendor',
    name: 'Vendor Performance',
    description: 'Real-time dashboard of how a listing is tracking — views, enquiries, saves, and engagement vs comparable listings.',
    icon: 'solar:graph-bold',
    iconBg: '#FFFBEB',
    iconColor: '#92400E',
    pill: 'Live',
    to: '/dashboard/analytics',
  },
  {
    key: 'seller',
    name: 'Seller Likelihood Score',
    description: 'Identify off-market and inactive properties with high motivation-to-sell signals. Generate prospecting lists in seconds.',
    icon: 'solar:target-bold',
    iconBg: '#FAF5FF',
    iconColor: '#6B21A8',
    pill: '30s',
    to: '/dashboard/opportunities',
  },
  {
    key: 'snapshot',
    name: 'Market Snapshot',
    description: 'Compare any two suburbs side-by-side. Price trends, demographics, infrastructure, schools.',
    icon: 'solar:bolt-bold',
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    pill: 'Live',
    to: '#suburb',
  },
  {
    key: 'commission',
    name: 'Commission Calculator',
    description: 'Run commission scenarios. Includes co-broke splits, referral fees, and net-to-agent.',
    icon: 'solar:wallet-bold',
    iconBg: '#ECFDF5',
    iconColor: '#065F46',
    pill: 'Instant',
    to: '/dashboard/commission',
  },
];

export default function MarketToolsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('tools');
  const [suburbSearch, setSuburbSearch] = useState('');
  const [selectedSuburb, setSelectedSuburb] = useState<string | null>(null);
  const [recentSuburbs, setRecentSuburbs] = useState<string[]>(['Bondi NSW', 'Carlton VIC', 'Toowong QLD']);

  const statCards = useMemo(() => ([
    {
      key: 'median',
      label: selectedSuburb ? `${selectedSuburb.split(' ')[0].toUpperCase()} MEDIAN` : 'TOP SUBURB MEDIAN',
      value: '—',
      sub: 'connect a suburb to populate',
      icon: 'solar:tag-bold',
      iconBg: '#EFF6FF',
      iconColor: '#2563EB',
    },
    {
      key: 'dom',
      label: 'AVG DAYS ON MARKET',
      value: '—',
      sub: "across your portfolio's suburbs",
      icon: 'solar:clock-circle-bold',
      iconBg: '#FFFBEB',
      iconColor: '#D97706',
    },
    {
      key: 'auction',
      label: 'AUCTION CLEARANCE',
      value: '—',
      sub: 'metro, last 30 days',
      icon: 'solar:hammer-bold',
      iconBg: '#EFF6FF',
      iconColor: '#2563EB',
    },
  ]), [selectedSuburb]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'tools', label: 'Tools' },
    { key: 'suburb', label: 'Suburb Intel' },
    { key: 'saved', label: 'Saved reports' },
    { key: 'seller', label: 'Seller likelihood' },
  ];

  const handleToolClick = (to: string) => {
    if (to === '#suburb') {
      setTab('suburb');
      return;
    }
    navigate(to);
  };

  const handleSuburbSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = suburbSearch.trim();
    if (!q) return;
    setSelectedSuburb(q);
    setRecentSuburbs(prev => [q, ...prev.filter(s => s !== q)].slice(0, 6));
  };

  return (
    <div className="max-w-[1480px] mx-auto px-6 md:px-10 py-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-6 flex-wrap mb-8">
        <div>
          <h1 className="font-extrabold tracking-[-0.04em] text-[#0a0f1e]" style={{ fontSize: 'clamp(32px,4vw,48px)' }}>
            Market Tools
          </h1>
          <p className="text-[14px] text-[#6a6a6a] font-medium mt-2 max-w-[640px]">
            Live suburb data, CMA reports, vendor dashboards. Win listings with intelligence agents can't get anywhere else.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setTab('saved')}
            className="inline-flex items-center gap-2 bg-white border border-[#E5E5E5] rounded-full px-4 py-2.5 text-[13px] font-bold text-[#0a0f1e] hover:border-[#0a0f1e] transition"
          >
            <Ico icon="solar:folder-bold" size={16} color="#0a0f1e" /> Saved reports
          </button>
          <button
            onClick={() => navigate('/dashboard/reports')}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:shadow-[0_8px_28px_rgba(37,99,235,0.45)] transition"
            style={{ background: 'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)' }}
          >
            <Ico icon="solar:chart-square-bold" size={16} color="#ffffff" /> Generate CMA
          </button>
        </div>
      </div>

      {/* Quick-stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {statCards.map(c => (
          <div key={c.key} className="bg-white rounded-3xl border border-[#E5E5E5] p-5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: c.iconBg }}>
              <Ico icon={c.icon} size={20} color={c.iconColor} />
            </div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-[#6a6a6a] font-bold mt-4">{c.label}</div>
            <div className="font-extrabold tabular-nums mt-2 text-[#0a0f1e]" style={{ fontSize: 36 }}>{c.value}</div>
            <div className="text-[12px] text-[#6a6a6a] mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Sub-tab pill bar */}
      <div className="mt-2 mb-6 overflow-x-auto">
        <div className="flex items-center gap-1 bg-[#F9FAFB] rounded-full p-1 w-fit">
          {tabs.map(t => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-5 py-2.5 rounded-full text-[13px] font-bold transition whitespace-nowrap ${
                  active
                    ? 'bg-white text-[#0a0f1e] shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                    : 'text-[#6a6a6a] hover:text-[#0a0f1e]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TOOLS */}
      {tab === 'tools' && (
        <div>
          <h2 className="text-[20px] font-bold text-[#0a0f1e] mb-2">Generate a report</h2>
          <p className="text-[14px] text-[#6a6a6a] mb-6">
            Pick a tool. Each generates a polished, vendor-ready output in under 30 seconds.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOOLS.map(t => (
              <button
                key={t.key}
                onClick={() => handleToolClick(t.to)}
                className="bg-white rounded-3xl border border-[#E5E5E5] p-7 transition hover:border-[#2563EB]/40 hover:shadow-[0_12px_32px_rgba(37,99,235,0.06)] hover:-translate-y-0.5 flex flex-col text-left"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: t.iconBg }}
                >
                  <Ico icon={t.icon} size={26} color={t.iconColor} />
                </div>
                <div className="text-[18px] font-extrabold text-[#0a0f1e] tracking-[-0.02em]">{t.name}</div>
                <div className="text-[13px] text-[#6a6a6a] mt-2 leading-[1.55] flex-1">{t.description}</div>
                <div className="mt-5 flex items-center justify-between">
                  <span className="bg-[#F9FAFB] rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.10em] text-[#6a6a6a]">
                    {t.pill}
                  </span>
                  <span className="text-[13px] font-bold text-[#2563EB]">Open →</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SUBURB INTEL */}
      {tab === 'suburb' && (
        <div>
          <div className="text-center max-w-[640px] mx-auto">
            <h2 className="text-[28px] font-extrabold text-[#0a0f1e] tracking-[-0.03em]">Suburb Intelligence</h2>
            <p className="text-[14px] text-[#6a6a6a] mt-2">Live medians, demographics, schools, transport, and recent sales for any Australian suburb.</p>
          </div>

          <form onSubmit={handleSuburbSubmit} className="relative max-w-[640px] mx-auto block mt-8">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
              <Ico icon="solar:map-point-bold" size={20} color="#6a6a6a" />
            </span>
            <input
              value={suburbSearch}
              onChange={e => setSuburbSearch(e.target.value)}
              placeholder="Search any Australian suburb..."
              className="w-full bg-white border border-[#E5E5E5] rounded-full pl-14 pr-6 py-4 text-[16px] text-[#0a0f1e] placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]/40 transition"
            />
          </form>

          {recentSuburbs.length > 0 && (
            <div className="flex items-center justify-center gap-2 flex-wrap mt-4">
              <span className="text-[12px] uppercase tracking-[0.12em] text-[#6a6a6a] font-bold mr-1">Recent</span>
              {recentSuburbs.map(s => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 bg-[#F9FAFB] text-[#374151] rounded-full px-3 py-1.5 text-[12px] font-semibold"
                >
                  <button onClick={() => setSelectedSuburb(s)} className="hover:text-[#0a0f1e]">{s}</button>
                  <button
                    onClick={() => setRecentSuburbs(p => p.filter(x => x !== s))}
                    className="text-[#9ca3af] hover:text-[#0a0f1e]"
                    aria-label={`Remove ${s}`}
                  >
                    <Ico icon="solar:close-circle-linear" size={14} color="currentColor" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {selectedSuburb ? (
            <div className="bg-white rounded-3xl border border-[#E5E5E5] p-8 mt-8">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[#6a6a6a] font-bold">Suburb snapshot</div>
                  <div className="text-[28px] font-extrabold text-[#0a0f1e] tracking-[-0.02em] mt-1">{selectedSuburb}</div>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_6px_20px_rgba(37,99,235,0.35)] transition"
                  style={{ background: 'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)' }}
                  onClick={() => navigate('/dashboard/reports')}
                >
                  <Ico icon="solar:document-add-bold" size={16} color="#ffffff" /> Save report
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {[
                  { title: 'Pricing', icon: 'solar:tag-bold', items: [['Median sale price', '—'], ['Price / sqm', '—'], ['12-month growth', '—']] },
                  { title: 'Market velocity', icon: 'solar:clock-circle-bold', items: [['Days on market', '—'], ['Auction clearance', '—'], ['Active listings', '—']] },
                  { title: 'Demographics', icon: 'solar:users-group-rounded-bold', items: [['Median age', '—'], ['Owner-occupier %', '—'], ['Household income', '—']] },
                  { title: 'Recent sales', icon: 'solar:home-2-bold', items: [['Last 30 days', '—'], ['Top sale', '—'], ['Bottom sale', '—']] },
                ].map(card => (
                  <div key={card.title} className="bg-[#F9FAFB] rounded-2xl p-5">
                    <div className="flex items-center gap-2">
                      <Ico icon={card.icon} size={16} color="#6a6a6a" />
                      <div className="text-[12px] uppercase tracking-[0.12em] text-[#6a6a6a] font-bold">{card.title}</div>
                    </div>
                    <div className="mt-3 divide-y divide-[#E5E7EB]">
                      {card.items.map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between py-2 text-[13px]">
                          <span className="text-[#6a6a6a]">{label}</span>
                          <span className="font-bold text-[#0a0f1e] tabular-nums">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[12px] text-[#6a6a6a] mt-6 text-center">
                Live data wiring is in progress. Search a suburb to bookmark it; figures will populate once the suburb feed is connected.
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#E5E5E5] py-20 px-8 text-center mt-8">
              <div className="flex justify-center"><Ico icon="solar:map-point-linear" size={56} color="#E5E7EB" /></div>
              <h3 className="text-[22px] font-bold text-[#0a0f1e] mt-6">Search a suburb to begin</h3>
              <p className="text-[14px] text-[#6a6a6a] max-w-[460px] mx-auto leading-[1.55] mt-3">
                Type any Australian suburb above and we'll pull medians, days on market, demographics, and auction clearance.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SAVED REPORTS */}
      {tab === 'saved' && (
        <div className="bg-white rounded-3xl border border-[#E5E5E5] py-20 px-8 text-center">
          <div className="flex justify-center"><Ico icon="solar:folder-with-files-linear" size={56} color="#E5E7EB" /></div>
          <h3 className="text-[22px] font-bold text-[#0a0f1e] mt-6">No saved reports yet</h3>
          <p className="text-[14px] text-[#6a6a6a] max-w-[460px] mx-auto leading-[1.55] mt-3">
            Generate your first report — CMAs, suburb snapshots, and vendor dashboards are saved here for re-use.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setTab('tools')}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:shadow-[0_8px_28px_rgba(37,99,235,0.45)] transition"
              style={{ background: 'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)' }}
            >
              <Ico icon="solar:chart-square-bold" size={16} color="#ffffff" /> Generate a report
            </button>
          </div>
        </div>
      )}

      {/* SELLER LIKELIHOOD */}
      {tab === 'seller' && (
        <div className="bg-white rounded-3xl border border-[#E5E5E5] overflow-hidden">
          <div className="grid grid-cols-[1.4fr_0.9fr_1fr_1.2fr_0.9fr_0.7fr] gap-3 bg-[#F9FAFB] px-6 py-3 text-[11px] uppercase tracking-[0.12em] text-[#6a6a6a] font-bold">
            <div>Address</div>
            <div>Suburb</div>
            <div>Score</div>
            <div>Signals</div>
            <div>Last update</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="px-6 py-14 text-center">
            <div className="flex justify-center"><Ico icon="solar:target-linear" size={48} color="#E5E7EB" /></div>
            <h3 className="text-[18px] font-bold text-[#0a0f1e] mt-5">No scored properties yet</h3>
            <p className="text-[14px] text-[#6a6a6a] max-w-[460px] mx-auto leading-[1.55] mt-2">
              Open the full Seller Likelihood workspace to surface motivated vendors and draft outreach in seconds.
            </p>
            <div className="mt-5">
              <Link
                to="/dashboard/opportunities"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:shadow-[0_8px_28px_rgba(37,99,235,0.45)] transition"
                style={{ background: 'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)' }}
              >
                <Ico icon="solar:target-bold" size={16} color="#ffffff" /> Open Seller Likelihood
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
