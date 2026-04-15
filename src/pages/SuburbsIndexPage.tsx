import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';

const STATE_ORDER = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] as const;
const STATE_NAMES: Record<string, string> = {
  NSW: 'New South Wales',
  VIC: 'Victoria',
  QLD: 'Queensland',
  SA: 'South Australia',
  WA: 'Western Australia',
  TAS: 'Tasmania',
  ACT: 'Australian Capital Territory',
  NT: 'Northern Territory',
};

interface SuburbRow {
  name: string;
  slug: string;
  state: string;
  median_price: number | null;
}

export default function SuburbsIndexPage() {
  const [suburbs, setSuburbs] = useState<SuburbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    supabase
      .from('suburbs')
      .select('name, slug, state, median_price')
      .order('state', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data }) => {
        setSuburbs((data as SuburbRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return suburbs;
    const q = filter.toLowerCase();
    return suburbs.filter((s) => s.name.toLowerCase().includes(q));
  }, [suburbs, filter]);

  const grouped = useMemo(() => {
    const map: Record<string, SuburbRow[]> = {};
    for (const s of filtered) {
      const st = s.state?.toUpperCase() ?? 'OTHER';
      if (!map[st]) map[st] = [];
      map[st].push(s);
    }
    return map;
  }, [filtered]);

  return (
    <>
      <Helmet>
        <title>Browse Australian Suburbs | ListHQ</title>
        <meta
          name="description"
          content="Browse all Australian suburbs with property data on ListHQ. Find median prices, listings, and suburb profiles across NSW, VIC, QLD, SA, WA, TAS, ACT and NT."
        />
        <link rel="canonical" href="https://listhq.com.au/suburbs" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
          Browse Australian Suburbs
        </h1>
        <p className="text-muted-foreground mt-1">
          {suburbs.length.toLocaleString()} suburbs across Australia
        </p>

        <div className="relative mt-5 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter suburbs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : suburbs.length === 0 ? (
          <p className="text-muted-foreground py-16 text-center">No suburb data available yet.</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground py-16 text-center">
            No suburbs match &lsquo;{filter}&rsquo;.
          </p>
        ) : (
          <div className="mt-8 space-y-10">
            {STATE_ORDER.filter((st) => grouped[st]?.length).map((st) => (
              <section key={st}>
                <h2 className="font-display text-lg font-semibold text-foreground sticky top-14 bg-background py-2 z-10 border-b border-border mb-3">
                  {STATE_NAMES[st]} ({st})
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {grouped[st].length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-1">
                  {grouped[st].map((s) => (
                    <Link
                      key={s.slug + s.state}
                      to={`/suburb/${s.state.toLowerCase()}/${s.slug}`}
                      className="py-1.5 text-sm text-foreground hover:text-primary transition-colors truncate"
                    >
                      {s.name}
                      {s.median_price ? (
                        <span className="text-muted-foreground ml-1.5">
                          · ${s.median_price.toLocaleString()} median
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
