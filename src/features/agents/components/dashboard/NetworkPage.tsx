import { useState, useEffect, useCallback } from 'react';
import { useSubscription } from '@/features/agents/hooks/useSubscription';
import UpgradeGate from '@/features/agents/components/shared/UpgradeGate';
import {
  Users, Search, DollarSign, Handshake, Share2, Eye, EyeOff, Phone,
  TrendingUp, CheckCircle2, XCircle, Landmark, ToggleLeft, ToggleRight,
  Loader2, MessageSquare, Target, Plus, Flame, Thermometer, Snowflake,
  X, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import DashboardHeader from './DashboardHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { toast } from 'sonner';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

/* ─── Types ─── */

interface MyOffMarketListing {
  property_id: string;
  address: string;
  suburb: string;
  state: string;
  price: number;
  status: string;
  commission_rate: number | null;
  rental_yield_pct: number | null;
  property_type: string | null;
  share_id: string | null;
  is_shared: boolean;
  referral_split_pct: number;
  shared_with_names: string[];
  share_status: string;
}

interface NetworkListing {
  share_id: string;
  property_id: string;
  address: string;
  suburb: string;
  state: string;
  price: number;
  rental_yield_pct: number | null;
  commission_rate: number | null;
  referral_split_pct: number;
  sharing_agent_name: string;
  sharing_agent_id: string;
  sharing_agent_email: string | null;
  sharing_agent_phone: string | null;
  contacted_at: string | null;
  status: string;
  property_type: string | null;
}

interface BuyerBrief {
  id: string;
  agent_id: string;
  agent_name?: string;
  property_type: string;
  min_beds: number;
  max_beds: number;
  min_price: number;
  max_price: number;
  suburbs: string[];
  notes: string | null;
  urgency: string;
  is_active: boolean;
  created_at: string;
}

const URGENCY_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  hot: { icon: <Flame size={12} />, color: 'bg-destructive/15 text-destructive', label: 'Hot' },
  active: { icon: <Thermometer size={12} />, color: 'bg-primary/15 text-primary', label: 'Active' },
  passive: { icon: <Snowflake size={12} />, color: 'bg-muted text-muted-foreground', label: 'Passive' },
};

const PROPERTY_TYPES = ['House', 'Apartment', 'Townhouse', 'Land', 'Commercial'];

/* ─── Mock data for demo ─── */

const DEMO_BRIEFS: BuyerBrief[] = [
  { id: 'db1', agent_id: 'demo1', agent_name: 'Sarah Chen', property_type: 'House', min_beds: 3, max_beds: 5, min_price: 700000, max_price: 950000, suburbs: ['Berwick', 'Narre Warren', 'Officer'], notes: 'Cash buyer relocating from Sydney, pre-approved $950k. Needs pool or space for one.', urgency: 'hot', is_active: true, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'db2', agent_id: 'demo2', agent_name: 'Marcus Hill', property_type: 'Apartment', min_beds: 2, max_beds: 3, min_price: 400000, max_price: 600000, suburbs: ['South Yarra', 'Prahran', 'Richmond'], notes: 'Investor seeking 5%+ yield near train. First-home buyer grant eligible.', urgency: 'active', is_active: true, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'db3', agent_id: 'demo3', agent_name: 'Priya Sharma', property_type: 'Land', min_beds: 0, max_beds: 0, min_price: 300000, max_price: 550000, suburbs: ['Officer', 'Clyde North', 'Pakenham'], notes: 'Developer looking for 600sqm+ lots. Flexible on timing.', urgency: 'passive', is_active: true, created_at: new Date(Date.now() - 172800000).toISOString() },
];

/* ─── Matching logic ─── */

function matchBriefsToListing(listing: NetworkListing | MyOffMarketListing, briefs: BuyerBrief[]): BuyerBrief[] {
  return briefs.filter(b => {
    if (!b.is_active) return false;
    // Property type match
    const propType = ('property_type' in listing ? listing.property_type : null) || 'House';
    if (b.property_type.toLowerCase() !== propType.toLowerCase()) return false;
    // Price range overlap
    const price = listing.price;
    if (price < b.min_price || price > b.max_price) return false;
    // Suburb overlap
    if (b.suburbs.length > 0) {
      const listingSuburb = listing.suburb.toLowerCase();
      if (!b.suburbs.some(s => s.toLowerCase().trim() === listingSuburb)) return false;
    }
    return true;
  });
}

function matchListingsToBriefs(brief: BuyerBrief, listings: NetworkListing[]): NetworkListing[] {
  return listings.filter(l => {
    const propType = l.property_type || 'House';
    if (brief.property_type.toLowerCase() !== propType.toLowerCase()) return false;
    if (l.price < brief.min_price || l.price > brief.max_price) return false;
    if (brief.suburbs.length > 0) {
      if (!brief.suburbs.some(s => s.toLowerCase().trim() === l.suburb.toLowerCase())) return false;
    }
    return true;
  });
}

/* ─── Component ─── */

const NetworkPage = () => {
  const { user } = useAuth();
  const { canAccessNetwork, loading: subLoading } = useSubscription();
  const [activeTab, setActiveTab] = useState('my-listings');
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);

  // My listings
  const [myListings, setMyListings] = useState<MyOffMarketListing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Network listings
  const [networkListings, setNetworkListings] = useState<NetworkListing[]>([]);
  const [networkSearch, setNetworkSearch] = useState('');

  // Contact modal
  const [showContact, setShowContact] = useState(false);
  const [contactTarget, setContactTarget] = useState<NetworkListing | null>(null);
  const [contactMessage, setContactMessage] = useState('');
  const [contactSending, setContactSending] = useState(false);

  // Buyer briefs
  const [buyerBriefs, setBuyerBriefs] = useState<BuyerBrief[]>([]);
  const [showBriefForm, setShowBriefForm] = useState(false);
  const [briefSubmitting, setBriefSubmitting] = useState(false);
  const [briefForm, setBriefForm] = useState({
    property_type: 'House',
    min_beds: 1,
    max_beds: 5,
    min_price: 400000,
    max_price: 1000000,
    suburbs: '',
    notes: '',
    urgency: 'active',
  });

  // Match modal
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchModalBriefs, setMatchModalBriefs] = useState<BuyerBrief[]>([]);
  const [matchModalProperty, setMatchModalProperty] = useState('');

  // Fetch agent id
  useEffect(() => {
    if (!user) return;
    supabase.from('agents').select('id').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setAgentId(data.id); });
  }, [user]);

  // Fetch my off-market listings
  const fetchMyListings = useCallback(async () => {
    if (!agentId) return;
    const { data: props } = await supabase
      .from('properties')
      .select('id, address, suburb, state, price, status, commission_rate, rental_yield_pct, property_type')
      .eq('agent_id', agentId)
      .in('status', ['off-market', 'whisper', 'coming-soon'])
      .order('created_at', { ascending: false });

    if (!props) { setMyListings([]); return; }

    const propIds = props.map(p => p.id);
    const { data: shares } = await supabase
      .from('off_market_shares')
      .select('id, property_id, referral_split_pct, status, is_network_wide, shared_with_agent_id, agents!off_market_shares_shared_with_agent_id_fkey(name)')
      .eq('sharing_agent_id', agentId)
      .in('property_id', propIds);

    const shareMap: Record<string, { share_id: string; referral_split_pct: number; status: string; shared_with_names: string[] }> = {};
    (shares || []).forEach((s: any) => {
      const key = s.property_id;
      if (!shareMap[key]) {
        shareMap[key] = { share_id: s.id, referral_split_pct: s.referral_split_pct, status: s.status, shared_with_names: [] };
      }
      if (s.agents?.name) shareMap[key].shared_with_names.push(s.agents.name);
      if (s.is_network_wide && !shareMap[key].shared_with_names.includes('Network')) {
        shareMap[key].shared_with_names.unshift('Network');
      }
    });

    setMyListings(props.map(p => ({
      property_id: p.id,
      address: p.address,
      suburb: p.suburb,
      state: p.state,
      price: p.price,
      status: p.status,
      commission_rate: p.commission_rate,
      rental_yield_pct: p.rental_yield_pct,
      property_type: p.property_type,
      share_id: shareMap[p.id]?.share_id || null,
      is_shared: !!shareMap[p.id],
      referral_split_pct: shareMap[p.id]?.referral_split_pct || 25,
      shared_with_names: shareMap[p.id]?.shared_with_names || [],
      share_status: shareMap[p.id]?.status || 'none',
    })));
  }, [agentId]);

  // Fetch network listings
  const fetchNetworkListings = useCallback(async () => {
    if (!agentId) return;
    const { data } = await supabase
      .from('off_market_shares')
      .select(`
        id, property_id, referral_split_pct, status, contacted_at,
        sharing_agent_id,
        properties!off_market_shares_property_id_fkey(address, suburb, state, price, rental_yield_pct, commission_rate, property_type),
        agents!off_market_shares_sharing_agent_id_fkey(name, email, phone)
      `)
      .neq('sharing_agent_id', agentId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!data) { setNetworkListings([]); return; }
    setNetworkListings(data.map((s: any) => ({
      share_id: s.id,
      property_id: s.property_id,
      address: s.properties?.address || '',
      suburb: s.properties?.suburb || '',
      state: s.properties?.state || '',
      price: s.properties?.price || 0,
      rental_yield_pct: s.properties?.rental_yield_pct,
      commission_rate: s.properties?.commission_rate,
      referral_split_pct: s.referral_split_pct,
      sharing_agent_name: s.agents?.name || 'Unknown',
      sharing_agent_id: s.sharing_agent_id,
      sharing_agent_email: s.agents?.email || null,
      sharing_agent_phone: s.agents?.phone || null,
      contacted_at: s.contacted_at,
      status: s.status,
      property_type: s.properties?.property_type || null,
    })));
  }, [agentId]);

  // Fetch buyer briefs
  const fetchBuyerBriefs = useCallback(async () => {
    if (!agentId) return;
    
    const { data } = await supabase
      .from('buyer_briefs')
      .select('*, agents!buyer_briefs_agent_id_fkey(name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!data) { setBuyerBriefs([]); return; }
    setBuyerBriefs(data.map((b: any) => ({
      ...b,
      agent_name: b.agents?.name || 'Unknown',
    })));
  }, [agentId]);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    Promise.all([fetchMyListings(), fetchNetworkListings(), fetchBuyerBriefs()])
      .then(() => setLoading(false));
  }, [agentId, fetchMyListings, fetchNetworkListings, fetchBuyerBriefs]);

  // Toggle share to network
  const toggleNetworkShare = async (listing: MyOffMarketListing) => {
    if (!agentId) return;
    if (listing.is_shared) {
      if (listing.share_id) {
        await supabase.from('off_market_shares').delete().eq('id', listing.share_id);
      }
      toast.success('Removed from network');
    } else {
      const { error } = await supabase.from('off_market_shares').insert({
        property_id: listing.property_id,
        sharing_agent_id: agentId,
        is_network_wide: true,
        referral_split_pct: 25,
        status: 'active',
      } as any);
      if (error) { toast.error(error.message); return; }
      toast.success('Shared with ListHQ Network');
    }
    await fetchMyListings();
  };

  // Contact sharing agent
  const handleContact = async () => {
    if (!contactTarget || !agentId || !user) return;
    setContactSending(true);
    try {
      await supabase.from('off_market_shares').update({
        contacted_at: new Date().toISOString(),
        shared_with_agent_id: agentId,
      } as any).eq('id', contactTarget.share_id);

      const { data: trustAccounts } = await supabase.from('trust_accounts').select('id').limit(1);
      if (trustAccounts && trustAccounts.length > 0) {
        const referralAmount = (contactTarget.price * (contactTarget.commission_rate || 2) / 100) * (contactTarget.referral_split_pct / 100);
        await supabase.from('trust_transactions').insert({
          trust_account_id: trustAccounts[0].id,
          transaction_type: 'deposit',
          category: 'commission',
          amount: referralAmount,
          gst_amount: referralAmount * 0.1,
          description: `Referral deposit – ${contactTarget.address} (via ${contactTarget.sharing_agent_name})`,
          payee_name: contactTarget.sharing_agent_name,
          property_id: contactTarget.property_id,
          status: 'pending',
          transaction_date: new Date().toISOString().split('T')[0],
          created_by: user.id,
        } as any);
        toast.success('Trust entry created for referral deposit');
      }

      await supabase.from('notifications').insert({
        agent_id: contactTarget.sharing_agent_id,
        type: 'referral',
        title: 'Referral interest received',
        message: contactMessage || `An agent is interested in your off-market listing at ${contactTarget.address}`,
        property_id: contactTarget.property_id,
      } as any);

      toast.success(`Contact request sent to ${contactTarget.sharing_agent_name}`);
      setShowContact(false);
      setContactTarget(null);
      setContactMessage('');
      await fetchNetworkListings();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setContactSending(false);
    }
  };

  // Submit buyer brief
  const handleSubmitBrief = async () => {
    if (!agentId) return;
    setBriefSubmitting(true);
    try {
      const { error } = await supabase.from('buyer_briefs').insert({
        agent_id: agentId,
        property_type: briefForm.property_type,
        min_beds: briefForm.min_beds,
        max_beds: briefForm.max_beds,
        min_price: briefForm.min_price,
        max_price: briefForm.max_price,
        suburbs: briefForm.suburbs.split(',').map(s => s.trim()).filter(Boolean),
        notes: briefForm.notes || null,
        urgency: briefForm.urgency,
      } as any);
      if (error) throw error;
      toast.success('Buyer brief posted');
      await fetchBuyerBriefs();
      setShowBriefForm(false);
      setBriefForm({ property_type: 'House', min_beds: 1, max_beds: 5, min_price: 400000, max_price: 1000000, suburbs: '', notes: '', urgency: 'active' });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBriefSubmitting(false);
    }
  };

  // Compute matches
  const myBriefs = buyerBriefs.filter(b => b.agent_id === agentId);
  const matchedForMe = networkListings.filter(l => {
        // Check if any of MY briefs match this listing
        return myBriefs.some(b => matchBriefsToListing(l, [b]).length > 0);
      });

  // Filter
  const filteredMy = searchQuery
    ? myListings.filter(l => `${l.address} ${l.suburb}`.toLowerCase().includes(searchQuery.toLowerCase()))
    : myListings;

  const filteredNetwork = networkSearch
    ? networkListings.filter(l => `${l.address} ${l.suburb} ${l.sharing_agent_name}`.toLowerCase().includes(networkSearch.toLowerCase()))
    : networkListings;

  if (loading) {
    return (
      <div>
        <DashboardHeader title="Whisper Market" subtitle="Off-market network & buyer matching" />
        <div className="p-6 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!subLoading && !canAccessNetwork) {
    return <UpgradeGate requiredPlan="Pro or above" message="The Off-Market Network is available on the Pro plan and above. Share listings privately with verified agents and receive buyer briefs before properties go public." />;
  }

  return (
    <div>
      <DashboardHeader title="Whisper Market" subtitle="Off-market network & buyer matching" />
      <div className="p-4 sm:p-6 max-w-[1400px] space-y-4">

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <EyeOff size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">My Off-Market</p>
                <p className="text-lg font-bold">{myListings.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <Share2 size={18} className="text-success" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Shared to Network</p>
                <p className="text-lg font-bold">{myListings.filter(l => l.is_shared).length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Handshake size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Network Listings</p>
                <p className="text-lg font-bold">{networkListings.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Target size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Buyer Briefs</p>
                <p className="text-lg font-bold">{buyerBriefs.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="my-listings" className="gap-1.5">
              <EyeOff size={13} /> My Off-Market
            </TabsTrigger>
            <TabsTrigger value="network" className="gap-1.5">
              <Users size={13} /> Network Listings
            </TabsTrigger>
            <TabsTrigger value="buyer-briefs" className="gap-1.5">
              🔍 Buyer Briefs
            </TabsTrigger>
          </TabsList>

          {/* ── MY OFF-MARKET LISTINGS ── */}
          <TabsContent value="my-listings" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search your off-market listings…" className="pl-9 h-9 text-sm" />
              </div>
            </div>

            {filteredMy.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                  <EyeOff size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No off-market listings yet.</p>
                  <p className="text-xs mt-1">Set a property status to "Off-Market" or "Whisper" to manage it here.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Property</TableHead>
                      <TableHead className="text-xs text-right">Price</TableHead>
                      <TableHead className="text-xs">Share with Network</TableHead>
                      <TableHead className="text-xs">Shared With</TableHead>
                      <TableHead className="text-xs">Matches</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Commission Split</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMy.map(l => {
                      const matches = matchBriefsToListing(l, buyerBriefs);
                      return (
                        <TableRow key={l.property_id}>
                          <TableCell>
                            <div>
                              <p className="text-xs font-semibold truncate max-w-[250px]">{l.address}</p>
                              <p className="text-[10px] text-muted-foreground">{l.suburb}, {l.state}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-right font-semibold">{AUD.format(l.price)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch checked={l.is_shared} onCheckedChange={() => toggleNetworkShare(l)} />
                              <span className="text-[10px] text-muted-foreground">{l.is_shared ? 'Shared' : 'Private'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {l.shared_with_names.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {l.shared_with_names.map((n, i) => (
                                  <Badge key={i} variant="secondary" className="text-[10px]">{n}</Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {matches.length > 0 ? (
                              <button
                                onClick={() => { setMatchModalBriefs(matches); setMatchModalProperty(l.address); setShowMatchModal(true); }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-semibold hover:bg-amber-500/25 transition-colors cursor-pointer"
                              >
                                🎯 {matches.length} match{matches.length !== 1 ? 'es' : ''}
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={l.status === 'off-market' ? 'outline' : l.status === 'whisper' ? 'secondary' : 'default'}
                              className="text-[10px] capitalize"
                            >
                              {l.status === 'off-market' ? 'Active' : l.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {l.is_shared ? (
                              <span className="font-semibold">{100 - l.referral_split_pct}% / {l.referral_split_pct}% referral</span>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* ── NETWORK LISTINGS ── */}
          <TabsContent value="network" className="mt-4 space-y-3">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2 text-xs">
              <Handshake size={14} className="text-primary shrink-0" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Co-broke opportunity:</strong> Contact the sharing agent to refer your buyer and earn a referral commission split.
              </span>
            </div>

            {/* Matched for You section */}
            {matchedForMe.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-success">
                  <Target size={14} /> Matched for You
                </h3>
                <div className="grid gap-2">
                  {matchedForMe.map(l => (
                    <div key={l.share_id} className="border-2 border-success/40 bg-success/5 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge className="bg-success/15 text-success text-[10px] border-0">✅ Matched</Badge>
                          <span className="text-xs font-semibold">{l.address}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{l.suburb}, {l.state} · {AUD.format(l.price)} · by {l.sharing_agent_name}</p>
                      </div>
                      <Button size="sm" className="h-7 text-[10px] gap-1" onClick={() => {
                        setContactTarget(l);
                        setContactMessage(`Hi ${l.sharing_agent_name.split(' ')[0]}, I have a qualified buyer matching your off-market listing at ${l.address}. I'd like to discuss a referral arrangement.`);
                        setShowContact(true);
                      }}>
                        <MessageSquare size={11} /> Contact
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={networkSearch} onChange={e => setNetworkSearch(e.target.value)}
                  placeholder="Search network listings…" className="pl-9 h-9 text-sm" />
              </div>
            </div>

            {filteredNetwork.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                  <Users size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No network listings available yet.</p>
                  <p className="text-xs mt-1">When other agents share their off-market listings, they'll appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Property Address</TableHead>
                      <TableHead className="text-xs">Sharing Agent</TableHead>
                      <TableHead className="text-xs text-right">Price</TableHead>
                      <TableHead className="text-xs text-right">Yield</TableHead>
                      <TableHead className="text-xs">Matches</TableHead>
                      <TableHead className="text-xs">Commission Split</TableHead>
                      <TableHead className="text-xs w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNetwork.map(l => {
                      const matches = matchBriefsToListing(l, buyerBriefs);
                      return (
                        <TableRow key={l.share_id}>
                          <TableCell>
                            <div>
                              <p className="text-xs font-semibold truncate max-w-[220px]">{l.address}</p>
                              <p className="text-[10px] text-muted-foreground">{l.suburb}, {l.state}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-medium">{l.sharing_agent_name}</TableCell>
                          <TableCell className="text-xs text-right font-semibold">{AUD.format(l.price)}</TableCell>
                          <TableCell className="text-xs text-right">
                            {l.rental_yield_pct ? (
                              <span className={l.rental_yield_pct >= 6 ? 'text-success font-semibold' : ''}>
                                {l.rental_yield_pct.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {matches.length > 0 ? (
                              <button
                                onClick={() => { setMatchModalBriefs(matches); setMatchModalProperty(l.address); setShowMatchModal(true); }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-semibold hover:bg-amber-500/25 transition-colors cursor-pointer"
                              >
                                🎯 {matches.length} match{matches.length !== 1 ? 'es' : ''}
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {l.referral_split_pct}% referral
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {l.contacted_at ? (
                              <Badge variant="secondary" className="text-[10px] gap-1">
                                <CheckCircle2 size={10} /> Contacted
                              </Badge>
                            ) : (
                              <Button size="sm" className="h-7 text-[10px] gap-1" onClick={() => {
                                setContactTarget(l);
                                setContactMessage(`Hi ${l.sharing_agent_name.split(' ')[0]}, I have a qualified buyer interested in your off-market listing at ${l.address}. I'd like to discuss a referral arrangement at the ${l.referral_split_pct}% split. Let me know a good time to connect.`);
                                setShowContact(true);
                              }}>
                                <MessageSquare size={11} /> Contact
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* ── BUYER BRIEFS ── */}
          <TabsContent value="buyer-briefs" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Active Buyer Briefs</h3>
                <p className="text-xs text-muted-foreground">Post what your buyers are looking for — get matched to off-market stock</p>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setShowBriefForm(true)}>
                <Plus size={13} /> Post Brief
              </Button>
            </div>

            {buyerBriefs.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                  <FileText size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No buyer briefs yet.</p>
                  <p className="text-xs mt-1">Post a brief to get matched with off-market listings.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {buyerBriefs.map(b => {
                  const u = URGENCY_CONFIG[b.urgency] || URGENCY_CONFIG.active;
                  const matched = matchListingsToBriefs(b, networkListings);
                  return (
                    <div
                      key={b.id}
                      className="bg-slate-900/80 dark:bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={`${u.color} text-[10px] gap-0.5 border-0`}>
                            {u.icon} {u.label}
                          </Badge>
                          <span className="text-xs font-semibold text-slate-200">{b.property_type}</span>
                          <span className="text-[10px] text-slate-400">
                            {b.min_beds}–{b.max_beds} bed · {AUD.format(b.min_price)} – {AUD.format(b.max_price)}
                          </span>
                        </div>
                        {matched.length > 0 && (
                          <Badge className="bg-success/15 text-success text-[10px] border-0 gap-1">
                            🎯 {matched.length} listing match{matched.length !== 1 ? 'es' : ''}
                          </Badge>
                        )}
                      </div>
                      {b.suburbs.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {b.suburbs.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 text-[10px]">{s}</span>
                          ))}
                        </div>
                      )}
                      {b.notes && (
                        <p className="text-xs text-slate-400 line-clamp-2">{b.notes}</p>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500">Posted by {b.agent_name} · {new Date(b.created_at).toLocaleDateString('en-AU')}</span>
                        {b.agent_id === agentId && (
                          <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">Your brief</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Contact Modal ── */}
      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact {contactTarget?.sharing_agent_name}</DialogTitle>
            <DialogDescription>
              This will send a referral request and auto-create a trust entry for the referral deposit.
            </DialogDescription>
          </DialogHeader>
          {contactTarget && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold">{contactTarget.address}</p>
                <p className="text-[10px] text-muted-foreground">{contactTarget.suburb}, {contactTarget.state}</p>
                <div className="flex gap-3 mt-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Price</p>
                    <p className="text-sm font-bold">{AUD.format(contactTarget.price)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Referral Split</p>
                    <p className="text-sm font-bold">{contactTarget.referral_split_pct}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Est. Referral Fee</p>
                    <p className="text-sm font-bold text-success">
                      {AUD.format(
                        (contactTarget.price * (contactTarget.commission_rate || 2) / 100) * (contactTarget.referral_split_pct / 100)
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs">Message to Agent</Label>
                <Textarea value={contactMessage} onChange={e => setContactMessage(e.target.value)} rows={4} className="text-sm" />
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
                <Landmark size={14} className="text-primary shrink-0 mt-0.5" />
                <span>A <strong className="text-foreground">pending trust entry</strong> for the estimated referral fee will be automatically created in your trust account.</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContact(false)}>Cancel</Button>
            <Button onClick={handleContact} disabled={contactSending} className="gap-1.5">
              {contactSending && <Loader2 size={13} className="animate-spin" />}
              Send & Create Trust Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Match Modal ── */}
      <Dialog open={showMatchModal} onOpenChange={setShowMatchModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🎯 Matching Buyer Briefs
            </DialogTitle>
            <DialogDescription>
              {matchModalBriefs.length} buyer brief{matchModalBriefs.length !== 1 ? 's' : ''} match {matchModalProperty}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {matchModalBriefs.map(b => {
              const u = URGENCY_CONFIG[b.urgency] || URGENCY_CONFIG.active;
              return (
                <div key={b.id} className="bg-slate-900/80 dark:bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge className={`${u.color} text-[10px] gap-0.5 border-0`}>{u.icon} {u.label}</Badge>
                    <span className="text-xs font-semibold text-slate-200">{b.property_type}</span>
                    <span className="text-[10px] text-slate-400">
                      {b.min_beds}–{b.max_beds} bed · {AUD.format(b.min_price)} – {AUD.format(b.max_price)}
                    </span>
                  </div>
                  {b.suburbs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {b.suburbs.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 text-[10px]">{s}</span>
                      ))}
                    </div>
                  )}
                  {b.notes && <p className="text-xs text-slate-400">{b.notes}</p>}
                  <p className="text-[10px] text-slate-500">Agent: <strong className="text-slate-300">{b.agent_name}</strong></p>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMatchModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Post Brief Modal ── */}
      <Dialog open={showBriefForm} onOpenChange={setShowBriefForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post a Buyer Brief</DialogTitle>
            <DialogDescription>Describe what your buyer is looking for. Other agents with matching off-market stock will see this.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Property Type</Label>
              <Select value={briefForm.property_type} onValueChange={v => setBriefForm(f => ({ ...f, property_type: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min Bedrooms</Label>
                <Input type="number" min={0} max={20} value={briefForm.min_beds} onChange={e => setBriefForm(f => ({ ...f, min_beds: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Max Bedrooms</Label>
                <Input type="number" min={0} max={20} value={briefForm.max_beds} onChange={e => setBriefForm(f => ({ ...f, max_beds: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min Price (AUD)</Label>
                <Input type="number" min={0} step={50000} value={briefForm.min_price} onChange={e => setBriefForm(f => ({ ...f, min_price: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Max Price (AUD)</Label>
                <Input type="number" min={0} step={50000} value={briefForm.max_price} onChange={e => setBriefForm(f => ({ ...f, max_price: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Preferred Suburbs (comma-separated)</Label>
              <Input value={briefForm.suburbs} onChange={e => setBriefForm(f => ({ ...f, suburbs: e.target.value }))} placeholder="e.g. Berwick, Narre Warren, Officer" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={briefForm.notes} onChange={e => setBriefForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any specific requirements…" rows={3} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Urgency</Label>
              <div className="flex gap-2 mt-1">
                {(['hot', 'active', 'passive'] as const).map(u => {
                  const cfg = URGENCY_CONFIG[u];
                  return (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setBriefForm(f => ({ ...f, urgency: u }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1 ${
                        briefForm.urgency === u
                          ? 'bg-primary/15 border-primary text-primary'
                          : 'bg-secondary border-border text-muted-foreground'
                      }`}
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBriefForm(false)}>Cancel</Button>
            <Button onClick={handleSubmitBrief} disabled={briefSubmitting} className="gap-1.5">
              {briefSubmitting && <Loader2 size={13} className="animate-spin" />}
              Post Brief
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NetworkPage;
