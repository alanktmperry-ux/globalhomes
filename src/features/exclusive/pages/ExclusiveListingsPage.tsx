import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Loader2, Sparkles, MapPin, Bed, Bath, Car, Eye, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import JoinExclusiveModal from '../components/JoinExclusiveModal';
import RegisterInterestModal from '../components/RegisterInterestModal';
import ExclusiveCountdown from '../components/ExclusiveCountdown';

interface ExclusiveProperty {
  id: string;
  suburb: string;
  state: string;
  price: number | null;
  price_formatted: string | null;
  beds: number | null;
  baths: number | null;
  parking: number | null;
  property_type: string | null;
  image_url: string | null;
  exclusive_end_date: string;
  agent_id: string | null;
  exclusive_views: number | null;
}

export default function ExclusiveListingsPage() {
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState<ExclusiveProperty[]>([]);
  const [interestProperty, setInterestProperty] = useState<ExclusiveProperty | null>(null);

  // filters
  const [suburb, setSuburb] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [beds, setBeds] = useState('any');
  const [propType, setPropType] = useState('any');

  // Check membership
  useEffect(() => {
    let mounted = true;
    (async () => {
      setChecking(true);
      if (!user?.email) {
        if (mounted) { setIsMember(false); setChecking(false); }
        return;
      }
      const { data } = await supabase
        .from('exclusive_members')
        .select('id, status')
        .eq('email', user.email.toLowerCase())
        .eq('status', 'active')
        .maybeSingle();
      if (mounted) {
        setIsMember(!!data);
        setChecking(false);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  // Fetch listings (only if member)
  useEffect(() => {
    if (!isMember) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('id, suburb, state, price, price_formatted, beds, baths, parking, property_type, image_url, exclusive_end_date, agent_id, exclusive_views')
        .eq('is_exclusive', true)
        .gt('exclusive_end_date', new Date().toISOString())
        .neq('status', 'public')
        .order('exclusive_end_date', { ascending: true })
        .limit(60);
      if (!mounted) return;
      if (error) console.error(error);
      setListings((data as any) ?? []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [isMember]);

  const filtered = useMemo(() => {
    return listings.filter(l => {
      if (suburb && !(l.suburb ?? '').toLowerCase().includes(suburb.toLowerCase())) return false;
      if (minPrice && (l.price ?? 0) < Number(minPrice)) return false;
      if (maxPrice && (l.price ?? 0) > Number(maxPrice)) return false;
      if (beds !== 'any' && (l.beds ?? 0) < Number(beds)) return false;
      if (propType !== 'any' && (l.property_type ?? '').toLowerCase() !== propType.toLowerCase()) return false;
      return true;
    });
  }, [listings, suburb, minPrice, maxPrice, beds, propType]);

  if (checking) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (!isMember) {
    return (
      <>
        <Helmet>
          <title>Exclusive Listings — Members only — ListHQ</title>
          <meta name="description" content="Become a ListHQ Exclusive member to see properties 14 days before they hit REA or Domain." />
        </Helmet>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <Badge className="bg-red-500 text-white border-0 mb-4">MEMBERS ONLY</Badge>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">This content is for ListHQ Exclusive members</h1>
          <p className="text-muted-foreground mb-10">Join to see listings 14 days before they hit REA or Domain.</p>

          <div className="grid sm:grid-cols-3 gap-3 mb-10 text-left">
            <div className="bg-card border border-border rounded-2xl p-5">
              <Eye className="text-primary mb-2" size={20} />
              <p className="font-semibold text-sm mb-1">First access</p>
              <p className="text-xs text-muted-foreground">14 days before public release.</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <Users className="text-primary mb-2" size={20} />
              <p className="font-semibold text-sm mb-1">Less competition</p>
              <p className="text-xs text-muted-foreground">Fewer buyers, real negotiating power.</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <Sparkles className="text-primary mb-2" size={20} />
              <p className="font-semibold text-sm mb-1">Instant alerts</p>
              <p className="text-xs text-muted-foreground">SMS + email the moment a match drops.</p>
            </div>
          </div>

          <Button size="lg" className="gap-2" onClick={() => setJoinOpen(true)}>
            <Sparkles size={18} /> Join Now — $29/month
          </Button>
          <JoinExclusiveModal open={joinOpen} onOpenChange={setJoinOpen} onJoined={() => { setIsMember(true); }} />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Exclusive Listings — ListHQ Exclusive members</title>
        <meta name="description" content="Browse exclusive pre-market listings only visible to ListHQ Exclusive members." />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <Badge className="bg-red-500 text-white border-0 mb-2">EXCLUSIVE MEMBER</Badge>
            <h1 className="font-display text-3xl sm:text-4xl font-bold">Exclusive Listings</h1>
            <p className="text-muted-foreground text-sm mt-1">Only visible to ListHQ Exclusive members</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-2xl p-4 my-6 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input placeholder="Suburb" value={suburb} onChange={e => setSuburb(e.target.value)} />
          <Input placeholder="Min price" type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
          <Input placeholder="Max price" type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
          <Select value={beds} onValueChange={setBeds}>
            <SelectTrigger><SelectValue placeholder="Beds" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any beds</SelectItem>
              {['1', '2', '3', '4', '5'].map(n => <SelectItem key={n} value={n}>{n}+ beds</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={propType} onValueChange={setPropType}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any type</SelectItem>
              {['House', 'Apartment', 'Townhouse', 'Land'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <p className="font-display text-lg font-semibold mb-1">No exclusive listings match your criteria right now</p>
            <p className="text-sm text-muted-foreground">We'll email you the moment one drops.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(l => (
              <article key={l.id} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col group hover:shadow-lg transition-shadow">
                <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
                  {l.image_url ? (
                    <img src={l.image_url} alt={`${l.property_type ?? 'Property'} in ${l.suburb}`} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No photo</div>
                  )}
                  <Badge className="absolute top-3 left-3 bg-red-500 text-white border-0 shadow">EXCLUSIVE</Badge>
                  <div className="absolute bottom-3 right-3 bg-slate-900/85 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                    <ExclusiveCountdown endDate={l.exclusive_end_date} compact />
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <MapPin size={12} /> {l.suburb}, {l.state}
                  </p>
                  <p className="font-display text-lg font-bold mb-2">
                    {l.price_formatted || (l.price ? `$${Number(l.price).toLocaleString()}` : 'Contact agent')}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                    {l.beds != null && <span className="flex items-center gap-1"><Bed size={14} /> {l.beds}</span>}
                    {l.baths != null && <span className="flex items-center gap-1"><Bath size={14} /> {l.baths}</span>}
                    {l.parking != null && <span className="flex items-center gap-1"><Car size={14} /> {l.parking}</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-3">Full address shared after enquiry</p>
                  <Button size="sm" className="mt-auto" onClick={() => setInterestProperty(l)}>
                    Register Interest
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {interestProperty && (
        <RegisterInterestModal
          open={!!interestProperty}
          onOpenChange={(o) => !o && setInterestProperty(null)}
          propertyId={interestProperty.id}
          agentId={interestProperty.agent_id}
          propertyAddress={`${interestProperty.suburb}, ${interestProperty.state}`}
        />
      )}
    </>
  );
}
