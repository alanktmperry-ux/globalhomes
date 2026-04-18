import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { Star, BadgeCheck, Clock, MapPin, ScrollText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import GetQuoteModal from '@/features/conveyancing/components/GetQuoteModal';

interface Conveyancer {
  id: string;
  firm_name: string;
  contact_name: string | null;
  fee_from: number | null;
  fee_to: number | null;
  suburbs_covered: string[] | null;
  turnaround_days: number | null;
  rating: number | null;
  specialties: string[] | null;
  logo_url: string | null;
}

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

const ConveyancingPage = () => {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('mode') === 'selling' ? 'selling' : 'buying') as 'buying' | 'selling';
  const [tab, setTab] = useState<'buying' | 'selling'>(initialTab);
  const [items, setItems] = useState<Conveyancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [selected, setSelected] = useState<Conveyancer | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('conveyancers' as any)
        .select('id, firm_name, contact_name, fee_from, fee_to, suburbs_covered, turnaround_days, rating, specialties, logo_url')
        .eq('is_active', true)
        .order('rating', { ascending: false });
      if (!error && data) setItems(data as any);
      setLoading(false);
    };
    load();
  }, []);

  const transactionType = useMemo<'Buying' | 'Selling'>(() => (tab === 'selling' ? 'Selling' : 'Buying'), [tab]);

  const openQuote = (c: Conveyancer | null) => {
    setSelected(c);
    setQuoteOpen(true);
  };

  return (
    <div className="bg-background">
      <Helmet>
        <title>Conveyancing Marketplace — Find a Conveyancer | ListHQ</title>
        <meta name="description" content="Fixed-fee conveyancing from licensed Australian professionals. Compare quotes, turnaround times, and specialties." />
      </Helmet>

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 text-center">
          <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground tracking-tight">
            Find a conveyancer for your property transaction
          </h1>
          <p className="mt-3 text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Fixed-fee conveyancing from licensed professionals. No hidden costs.
          </p>

          <div className="mt-6 flex justify-center">
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'buying' | 'selling')}>
              <TabsList>
                <TabsTrigger value="buying">I'm Buying</TabsTrigger>
                <TabsTrigger value="selling">I'm Selling</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Provider grid */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card h-64 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No conveyancers available right now.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((c) => (
              <article key={c.id} className="rounded-xl border border-border bg-card p-5 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold text-foreground truncate">{c.firm_name}</h3>
                    <Badge variant="secondary" className="mt-1 gap-1 text-[10px]">
                      <BadgeCheck size={11} /> Licensed Conveyancer
                    </Badge>
                  </div>
                  {c.rating != null && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-foreground shrink-0">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      {Number(c.rating).toFixed(1)}
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground flex-1">
                  {c.fee_from != null && (
                    <p className="text-foreground font-semibold text-sm">
                      From {AUD.format(Number(c.fee_from))} inc. GST
                      {c.fee_to ? <span className="font-normal text-muted-foreground"> – {AUD.format(Number(c.fee_to))}</span> : null}
                    </p>
                  )}
                  {c.turnaround_days != null && (
                    <p className="flex items-center gap-1.5">
                      <Clock size={12} /> Settlement in ~{c.turnaround_days} days
                    </p>
                  )}
                  {c.suburbs_covered && c.suburbs_covered.length > 0 && (
                    <p className="flex items-start gap-1.5">
                      <MapPin size={12} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{c.suburbs_covered.slice(0, 4).join(', ')}{c.suburbs_covered.length > 4 ? '…' : ''}</span>
                    </p>
                  )}
                  {c.specialties && c.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {c.specialties.slice(0, 3).map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] text-foreground">{s}</span>
                      ))}
                    </div>
                  )}
                </div>

                <Button size="sm" className="mt-4 w-full" onClick={() => openQuote(c)}>
                  Get a Fixed Quote
                </Button>
              </article>
            ))}
          </div>
        )}

        {/* Trust strip */}
        <div className="mt-12 rounded-2xl border border-border bg-card p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ScrollText size={18} />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-foreground">Not sure which to pick?</p>
              <p className="text-xs text-muted-foreground">Submit one quote request — multiple firms can respond.</p>
            </div>
          </div>
          <Button onClick={() => openQuote(null)} variant="outline">Get matched</Button>
        </div>
      </section>

      <GetQuoteModal
        open={quoteOpen}
        onOpenChange={setQuoteOpen}
        conveyancerId={selected?.id ?? null}
        conveyancerName={selected?.firm_name ?? null}
        defaultTransactionType={transactionType}
        source="conveyancing_page"
      />
    </div>
  );
};

export default ConveyancingPage;
