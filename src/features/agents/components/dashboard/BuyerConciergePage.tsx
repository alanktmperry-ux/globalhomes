import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Loader2, Sparkles, Archive, Mail, Home, ChevronDown, ChevronRight,
  Flame, Search as SearchIcon, MapPin, ArrowUpDown, Lock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { useSubscription } from '@/features/agents/hooks/useSubscription';
import { useConciergeUsage, recordConciergeAction } from '@/features/agents/hooks/useConciergeUsage';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';
import { useNavigate } from 'react-router-dom';

interface MatchRow {
  id: string;
  listing_id: string;
  buyer_intent_id: string;
  buyer_id: string | null;
  agent_id: string;
  match_score: number | null;
  match_reasoning: string | null;
  readiness_score: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BuyerIntent {
  id: string;
  buyer_id: string | null;
  suburbs: string[] | null;
  min_price: number | null;
  max_price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_types: string[] | null;
  features: string[] | null;
  intent_summary: string | null;
  readiness_score: number | null;
  last_searched_at: string | null;
}

interface ListingLite {
  id: string;
  title: string | null;
  address: string | null;
  suburb: string | null;
  price: number | null;
  images: string[] | null;
}

interface ProfileLite {
  user_id: string;
  display_name: string | null;
  full_name: string | null;
}

type EnrichedMatch = MatchRow & {
  intent: BuyerIntent | null;
  listing: ListingLite | null;
  profile: ProfileLite | null;
};

const formatAUD = (n: number | null | undefined) => {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}m`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
};

const buyerName = (m: EnrichedMatch) => {
  const name = m.profile?.display_name || m.profile?.full_name || '';
  if (!name) return 'Anonymous buyer';
  const parts = name.trim().split(/\s+/);
  const last = parts.length > 1 ? ` ${parts[parts.length - 1][0]}.` : '';
  return `${parts[0]}${last}`;
};

const buyerSuburb = (m: EnrichedMatch) =>
  m.intent?.suburbs?.[0] || m.listing?.suburb || 'anywhere';

const wantsSummary = (i: BuyerIntent | null) => {
  if (!i) return '—';
  const parts: string[] = [];
  if (i.bedrooms) parts.push(`${i.bedrooms} bed`);
  if (i.property_types?.[0]) parts.push(i.property_types[0]);
  if (i.max_price) parts.push(`under ${formatAUD(i.max_price)}`);
  if (i.features?.length) parts.push(i.features.slice(0, 2).join(' + '));
  return parts.join(' · ') || i.intent_summary?.slice(0, 80) || '—';
};

const lastActive = (i: BuyerIntent | null) => {
  if (!i?.last_searched_at) return 'Unknown';
  return formatDistanceToNow(new Date(i.last_searched_at), { addSuffix: true });
};

const ReadinessBar = ({ score }: { score: number | null }) => {
  const s = score ?? 0;
  const colour =
    s >= 71 ? 'bg-emerald-500' : s >= 41 ? 'bg-amber-500' : 'bg-muted-foreground/40';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${colour}`} style={{ width: `${s}%` }} />
      </div>
      <span className="text-[11px] font-semibold tabular-nums w-7 text-right">{s}</span>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    new: 'bg-primary/10 text-primary border-primary/20',
    viewed: 'bg-muted text-muted-foreground',
    contacted: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    archived: 'bg-muted text-muted-foreground/60',
  };
  return (
    <Badge variant="outline" className={`text-[10px] capitalize ${styles[status] || ''}`}>
      {status}
    </Badge>
  );
};

const BuyerConciergePage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contactMatch, setContactMatch] = useState<EnrichedMatch | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'match' | 'readiness' | 'recent'>('match');

  // Initial load
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: agent } = await supabase
        .from('agents').select('id').eq('user_id', user.id).maybeSingle();
      if (!agent) { setError('No agent profile found.'); setLoading(false); return; }
      setAgentId(agent.id);

      const { data: rows, error: mErr } = await supabase
        .from('listing_buyer_matches')
        .select('*')
        .eq('agent_id', agent.id)
        .neq('status', 'archived')
        .order('match_score', { ascending: false })
        .limit(200);
      if (mErr) throw mErr;
      const matchRows = (rows || []) as MatchRow[];

      const intentIds = [...new Set(matchRows.map(r => r.buyer_intent_id))];
      const listingIds = [...new Set(matchRows.map(r => r.listing_id))];
      const buyerIds = [...new Set(matchRows.map(r => r.buyer_id).filter(Boolean) as string[])];

      const [intentsRes, listingsRes, profilesRes] = await Promise.all([
        intentIds.length
          ? supabase.from('buyer_intent').select('id,buyer_id,suburbs,min_price,max_price,bedrooms,bathrooms,property_types,features,intent_summary,readiness_score,last_searched_at').in('id', intentIds)
          : Promise.resolve({ data: [] as BuyerIntent[] }),
        listingIds.length
          ? supabase.from('properties').select('id,title,address,suburb,price,images').in('id', listingIds)
          : Promise.resolve({ data: [] as ListingLite[] }),
        buyerIds.length
          ? supabase.from('profiles').select('user_id,display_name,full_name').in('user_id', buyerIds)
          : Promise.resolve({ data: [] as ProfileLite[] }),
      ]);

      const intents = new Map<string, BuyerIntent>(((intentsRes.data || []) as BuyerIntent[]).map(i => [i.id, i]));
      const listings = new Map<string, ListingLite>(((listingsRes.data || []) as ListingLite[]).map(l => [l.id, l]));
      const profiles = new Map<string, ProfileLite>(((profilesRes.data || []) as ProfileLite[]).map(p => [p.user_id, p]));

      setMatches(matchRows.map(r => ({
        ...r,
        intent: intents.get(r.buyer_intent_id) || null,
        listing: listings.get(r.listing_id) || null,
        profile: r.buyer_id ? profiles.get(r.buyer_id) || null : null,
      })));
    } catch (e: any) {
      setError(e?.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime
  useEffect(() => {
    if (!agentId) return;
    const channel = supabase
      .channel('listing-buyer-matches-' + agentId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listing_buyer_matches', filter: `agent_id=eq.${agentId}` },
        () => { fetchAll(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [agentId, fetchAll]);

  // Auto-filter from URL ?listing=
  const listingFilter = searchParams.get('listing');

  const setStatus = async (id: string, status: string) => {
    const { error: e } = await supabase.from('listing_buyer_matches').update({ status }).eq('id', id);
    if (e) { toast.error('Failed to update'); return; }
    setMatches(prev => prev.map(m => m.id === id ? { ...m, status } : m));
  };

  const archive = async (id: string) => {
    await setStatus(id, 'archived');
    setMatches(prev => prev.filter(m => m.id !== id));
    toast.success('Buyer archived');
  };

  const openContact = async (m: EnrichedMatch) => {
    setContactMatch(m);
    if (m.status === 'new') await setStatus(m.id, 'viewed');
  };

  // ----- Section A: Hot buyers -----
  const hotBuyers = useMemo(() => {
    return [...matches]
      .filter(m => m.status !== 'archived')
      .sort((a, b) => ((b.match_score || 0) + (b.readiness_score || 0)) - ((a.match_score || 0) + (a.readiness_score || 0)))
      .slice(0, 10);
  }, [matches]);

  // ----- Section B: Group by listing -----
  const byListing = useMemo(() => {
    const map = new Map<string, { listing: ListingLite | null; items: EnrichedMatch[] }>();
    for (const m of matches) {
      if (!map.has(m.listing_id)) map.set(m.listing_id, { listing: m.listing, items: [] });
      map.get(m.listing_id)!.items.push(m);
    }
    return [...map.entries()].sort((a, b) => b[1].items.length - a[1].items.length);
  }, [matches]);

  // ----- Section C: Filtered table -----
  const filteredTable = useMemo(() => {
    let rows = matches;
    if (listingFilter) rows = rows.filter(m => m.listing_id === listingFilter);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(m =>
        buyerName(m).toLowerCase().includes(q) ||
        (m.listing?.address || '').toLowerCase().includes(q) ||
        (m.intent?.suburbs || []).join(' ').toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) => {
      if (sortKey === 'match') return (b.match_score || 0) - (a.match_score || 0);
      if (sortKey === 'readiness') return (b.readiness_score || 0) - (a.readiness_score || 0);
      return new Date(b.intent?.last_searched_at || b.created_at).getTime() -
             new Date(a.intent?.last_searched_at || a.created_at).getTime();
    });
    return rows;
  }, [matches, search, sortKey, listingFilter]);

  const contactMessage = contactMatch
    ? `Hi ${contactMatch.profile?.display_name?.split(' ')[0] || contactMatch.profile?.full_name?.split(' ')[0] || 'there'}, I noticed you've been searching in ${buyerSuburb(contactMatch)} — I have a listing that might suit you perfectly: ${contactMatch.listing?.address || ''}. Would you like me to send through more details or arrange an inspection?\n\nBest regards`
    : '';

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  if (error) {
    return <div className="p-6"><Card><CardContent className="p-6 text-sm text-destructive">{error}</CardContent></Card></div>;
  }

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="text-primary" size={22} /> Buyer Concierge
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-matched buyers actively searching for properties like yours.
          </p>
        </div>
        {listingFilter && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/concierge">Clear listing filter</Link>
          </Button>
        )}
      </div>

      {matches.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Sparkles className="mx-auto text-muted-foreground mb-3" size={32} />
            <p className="font-medium">No matched buyers yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Once buyers search for properties matching yours, they'll appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* SECTION A — Hot buyers */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Flame size={18} className="text-amber-500" />
              <h2 className="text-lg font-semibold">Hot Buyers</h2>
              <Badge variant="secondary" className="text-[10px]">{hotBuyers.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {hotBuyers.map((m) => (
                <Card key={m.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {buyerName(m)} <span className="text-muted-foreground font-normal">— {buyerSuburb(m)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{wantsSummary(m.intent)}</p>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>

                    <ReadinessBar score={m.readiness_score} />

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Home size={12} className="shrink-0" />
                      <span className="truncate">{m.listing?.address || 'Unknown listing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{lastActive(m.intent)}</span>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => archive(m.id)}>
                          <Archive size={12} />
                        </Button>
                        <Button size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={() => openContact(m)}>
                          <Mail size={12} /> Contact
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* SECTION B — Matches by listing */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Matches by Listing</h2>
            <div className="space-y-2">
              {byListing.map(([listingId, group]) => (
                <Collapsible key={listingId} defaultOpen={false}>
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="flex flex-row items-center gap-3 py-3">
                        {group.listing?.images?.[0] ? (
                          <img src={group.listing.images[0]} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                            <Home size={18} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 text-left min-w-0">
                          <CardTitle className="text-sm font-semibold truncate">
                            {group.listing?.address || 'Unknown listing'}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">{formatAUD(group.listing?.price)}</p>
                        </div>
                        <Badge className="bg-primary/10 text-primary border-primary/20" variant="outline">
                          {group.items.length} matched
                        </Badge>
                        <ChevronDown size={16} className="text-muted-foreground" />
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-2">
                        {group.items.slice(0, 8).map((m) => (
                          <div key={m.id} className="flex items-center gap-3 py-2 border-t text-sm">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{buyerName(m)}</p>
                              <p className="text-xs text-muted-foreground truncate">{wantsSummary(m.intent)}</p>
                            </div>
                            <div className="w-32"><ReadinessBar score={m.readiness_score} /></div>
                            <Badge variant="outline" className="text-[10px]">{m.match_score ?? '—'}</Badge>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openContact(m)}>
                              Contact
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </section>

          {/* SECTION C — All matched buyers table */}
          <section>
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <h2 className="text-lg font-semibold">All Matched Buyers</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search name, address, suburb…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9 w-64 text-sm"
                  />
                </div>
                <Button
                  variant="outline" size="sm" className="gap-1.5 text-xs"
                  onClick={() => setSortKey(sortKey === 'match' ? 'readiness' : sortKey === 'readiness' ? 'recent' : 'match')}
                >
                  <ArrowUpDown size={12} /> Sort: {sortKey}
                </Button>
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Buyer</TableHead>
                      <TableHead className="w-24">Match</TableHead>
                      <TableHead className="w-32">Readiness</TableHead>
                      <TableHead>Wants</TableHead>
                      <TableHead>Listing</TableHead>
                      <TableHead className="w-32">Last active</TableHead>
                      <TableHead className="w-20">Status</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTable.map((m) => (
                      <TableRow key={m.id} className="cursor-pointer" onClick={() => openContact(m)}>
                        <TableCell>
                          <p className="font-medium text-sm">{buyerName(m)}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin size={10} /> {buyerSuburb(m)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{m.match_score ?? '—'}</Badge>
                        </TableCell>
                        <TableCell><ReadinessBar score={m.readiness_score} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">{wantsSummary(m.intent)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{m.listing?.address || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{lastActive(m.intent)}</TableCell>
                        <TableCell><StatusBadge status={m.status} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => archive(m.id)}>
                              <Archive size={12} />
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => openContact(m)}>
                              Contact
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredTable.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">No matches</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {/* Contact modal */}
      <Dialog open={!!contactMatch} onOpenChange={(o) => !o && setContactMatch(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Contact {contactMatch && buyerName(contactMatch)}</DialogTitle>
            <DialogDescription>
              Send a message via ListHQ. Buyer contact details stay private until they reply.
            </DialogDescription>
          </DialogHeader>
          {contactMatch && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                <p><span className="text-muted-foreground">Searching:</span> {buyerSuburb(contactMatch)}</p>
                <p><span className="text-muted-foreground">Wants:</span> {wantsSummary(contactMatch.intent)}</p>
                <p><span className="text-muted-foreground">Match score:</span> {contactMatch.match_score ?? '—'} · <span className="text-muted-foreground">Readiness:</span> {contactMatch.readiness_score ?? 0}</p>
                {contactMatch.match_reasoning && (
                  <p className="text-muted-foreground italic mt-2">"{contactMatch.match_reasoning}"</p>
                )}
              </div>
              <Textarea defaultValue={contactMessage} rows={6} className="text-sm" />
              <DialogFooter>
                <Button variant="outline" onClick={() => setContactMatch(null)}>Cancel</Button>
                <Button onClick={async () => {
                  await setStatus(contactMatch.id, 'contacted');
                  toast.success('Marked as contacted', { description: 'Outbound messaging launches soon.' });
                  setContactMatch(null);
                }}>
                  <Mail size={14} /> Send & mark contacted
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerConciergePage;
