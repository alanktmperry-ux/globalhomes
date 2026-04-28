import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, Calendar, BadgeCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EnquiryModal } from '@/features/properties/components/MortgageBrokerCard';

const LANGUAGE_FLAG: Record<string, string> = {
  English: '🇦🇺',
  Mandarin: '🇨🇳',
  Cantonese: '🇭🇰',
  Vietnamese: '🇻🇳',
  Korean: '🇰🇷',
  Japanese: '🇯🇵',
  Hindi: '🇮🇳',
  Bengali: '🇧🇩',
  Arabic: '🇦🇪',
  Tamil: '🇮🇳',
  Punjabi: '🇮🇳',
};

const ALL_LANGUAGES = Object.keys(LANGUAGE_FLAG);

const SPECIALTIES = [
  'First Home Buyer',
  'Investment',
  'Refinance',
  'Self-Employed',
  'Foreign Buyer / FIRB',
  'Construction',
];

interface BrokerData {
  id: string;
  name: string;
  company: string | null;
  acl_number: string;
  photo_url: string | null;
  languages: string[];
  tagline: string | null;
  calendar_url: string | null;
  
  specialties?: string[];
  suburb?: string | null;
  state?: string | null;
}

export default function FindBrokerPage() {
  const [brokers, setBrokers] = useState<BrokerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [selectedBroker, setSelectedBroker] = useState<BrokerData | null>(null);

  useEffect(() => {
    const fetchBrokers = async () => {
      const { data } = await supabase
        .from('brokers_public_safe' as any)
        .select('id, name, company, acl_number, photo_url, languages, tagline, calendar_url, specialties, suburb, state')
        .order('name', { ascending: true });
      if (data) setBrokers(data as unknown as BrokerData[]);
      setLoading(false);
    };
    fetchBrokers();
  }, []);

  const filtered = brokers.filter((b) => {
    const q = search.toLowerCase();
    const nameMatch =
      !search ||
      b.name.toLowerCase().includes(q) ||
      (b.company ?? '').toLowerCase().includes(q) ||
      (b.suburb ?? '').toLowerCase().includes(q);
    const langMatch = !language || b.languages?.includes(language);
    const specMatch = !specialty || b.specialties?.includes(specialty);
    return nameMatch && langMatch && specMatch;
  });

  return (
    <>
      <Helmet>
        <title>Find a Mortgage Broker — ListHQ</title>
        <meta
          name="description"
          content="Licensed Australian mortgage brokers who speak your language. Filter by language, specialty, and suburb."
        />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Mortgage Brokers
          </h1>
          <p className="mt-2 text-lg font-medium text-primary">
            Find a broker who speaks your language
          </p>
          <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
            Licensed mortgage brokers across Australia. Filter by language, specialty, and suburb.
            Free service — brokers compete for your business.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-secondary text-foreground">🇨🇳 Mandarin</span>
            <span className="px-2 py-1 rounded-full bg-secondary text-foreground">🇮🇳 Hindi</span>
            <span className="px-2 py-1 rounded-full bg-secondary text-foreground">🇻🇳 Vietnamese</span>
            <span className="px-2 py-1 rounded-full bg-secondary text-foreground">🇰🇷 Korean</span>
            <span className="px-2 py-1 rounded-full bg-secondary text-foreground">🇦🇪 Arabic</span>
            <span className="px-2 py-1 rounded-full bg-secondary text-muted-foreground">+ more</span>
          </div>
        </section>

        {/* Filters */}
        <section className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or suburb..."
                className="w-full pl-9 border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none"
            >
              <option value="">Any language</option>
              {ALL_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGE_FLAG[l]} {l}
                </option>
              ))}
            </select>

            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none"
            >
              <option value="">Any specialty</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            {loading
              ? 'Loading brokers…'
              : `${filtered.length} broker${filtered.length !== 1 ? 's' : ''} found`}
          </p>
        </section>

        {/* Grid */}
        <section>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <h3 className="text-lg font-semibold text-foreground">No brokers found</h3>
              <p className="text-sm text-muted-foreground mt-1">Try clearing a filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((broker) => (
                <div
                  key={broker.id}
                  className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <img
                      src={
                        broker.photo_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(broker.name)}&background=2563EB&color=fff&size=128`
                      }
                      alt={broker.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-background shadow-sm shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(broker.name)}&background=2563EB&color=fff&size=128`;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-semibold text-foreground leading-tight">
                          {broker.name}
                        </h3>
                      </div>
                      {broker.company && (
                        <p className="text-xs text-muted-foreground truncate">{broker.company}</p>
                      )}
                      {broker.suburb && (
                        <p className="text-xs text-muted-foreground">
                          {broker.suburb}
                          {broker.state ? `, ${broker.state}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Languages */}
                  {broker.languages?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {broker.languages.map((lang) => (
                        <span
                          key={lang}
                          className="inline-flex items-center gap-1 text-[11px] font-medium bg-background border border-border rounded-full px-2 py-0.5 text-muted-foreground"
                        >
                          {LANGUAGE_FLAG[lang] ?? '🌐'} {lang}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Specialties */}
                  {broker.specialties && broker.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {broker.specialties.map((s) => (
                        <span
                          key={s}
                          className="text-[11px] font-medium bg-primary/5 text-primary border border-primary/10 rounded-full px-2 py-0.5"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tagline */}
                  {broker.tagline && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{broker.tagline}</p>
                  )}

                  {/* ACL */}
                  <p className="text-[10px] text-muted-foreground">{broker.acl_number}</p>

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto pt-1">
                    <Button
                      size="sm"
                      className="flex-1 text-sm"
                      onClick={() => setSelectedBroker(broker)}
                    >
                      Get pre-approval advice
                    </Button>
                    {broker.calendar_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-sm"
                        onClick={() => window.open(broker.calendar_url!, '_blank')}
                      >
                        <Calendar size={14} className="mr-1.5" /> Book
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Disclaimer */}
        <section className="mt-10 p-4 bg-secondary/40 rounded-xl">
          <p className="text-xs text-muted-foreground leading-relaxed text-center">
            All brokers listed are independently licensed under their own Australian Credit Licence
            (ACL). ListHQ is a referral platform only and does not provide credit assistance. ListHQ
            may receive a referral fee.
          </p>
        </section>
      </div>

      {/* Enquiry modal */}
      {selectedBroker && (
        <EnquiryModal
          broker={{ ...selectedBroker, is_founding_partner: false }}
          onClose={() => setSelectedBroker(null)}
        />
      )}
    </>
  );
}
