import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, DollarSign, Handshake, Share2, Eye, EyeOff, Phone,
  TrendingUp, CheckCircle2, XCircle, Landmark, ToggleLeft, ToggleRight,
  Loader2, MessageSquare,
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
import DashboardHeader from './DashboardHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import { toast } from 'sonner';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

interface MyOffMarketListing {
  property_id: string;
  address: string;
  suburb: string;
  state: string;
  price: number;
  status: string;
  commission_rate: number | null;
  rental_yield_pct: number | null;
  // share info
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
}

const NetworkPage = () => {
  const { user } = useAuth();
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

  // Fetch agent id
  useEffect(() => {
    if (!user) return;
    supabase.from('agents').select('id').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setAgentId(data.id); });
  }, [user]);

  // Fetch my off-market listings
  const fetchMyListings = useCallback(async () => {
    if (!agentId) return;

    // Get my off-market properties (status = 'off-market' or 'whisper')
    const { data: props } = await supabase
      .from('properties')
      .select('id, address, suburb, state, price, status, commission_rate, rental_yield_pct')
      .eq('agent_id', agentId)
      .in('status', ['off-market', 'whisper', 'coming-soon'])
      .order('created_at', { ascending: false });

    if (!props) { setMyListings([]); return; }

    // Get shares for these properties
    const propIds = props.map(p => p.id);
    const { data: shares } = await supabase
      .from('off_market_shares')
      .select('id, property_id, referral_split_pct, status, is_network_wide, shared_with_agent_id, agents!off_market_shares_shared_with_agent_id_fkey(name)')
      .eq('sharing_agent_id', agentId)
      .in('property_id', propIds);

    const shareMap: Record<string, {
      share_id: string;
      referral_split_pct: number;
      status: string;
      shared_with_names: string[];
    }> = {};

    (shares || []).forEach((s: any) => {
      const key = s.property_id;
      if (!shareMap[key]) {
        shareMap[key] = {
          share_id: s.id,
          referral_split_pct: s.referral_split_pct,
          status: s.status,
          shared_with_names: [],
        };
      }
      if (s.agents?.name) shareMap[key].shared_with_names.push(s.agents.name);
      if (s.is_network_wide && !shareMap[key].shared_with_names.includes('Network')) {
        shareMap[key].shared_with_names.unshift('Network');
      }
    });

    const mapped: MyOffMarketListing[] = props.map(p => ({
      property_id: p.id,
      address: p.address,
      suburb: p.suburb,
      state: p.state,
      price: p.price,
      status: p.status,
      commission_rate: p.commission_rate,
      rental_yield_pct: p.rental_yield_pct,
      share_id: shareMap[p.id]?.share_id || null,
      is_shared: !!shareMap[p.id],
      referral_split_pct: shareMap[p.id]?.referral_split_pct || 25,
      shared_with_names: shareMap[p.id]?.shared_with_names || [],
      share_status: shareMap[p.id]?.status || 'none',
    }));

    setMyListings(mapped);
  }, [agentId]);

  // Fetch network listings (shared with me or network-wide, not my own)
  const fetchNetworkListings = useCallback(async () => {
    if (!agentId) return;

    const { data } = await supabase
      .from('off_market_shares')
      .select(`
        id, property_id, referral_split_pct, status, contacted_at,
        sharing_agent_id,
        properties!off_market_shares_property_id_fkey(address, suburb, state, price, rental_yield_pct, commission_rate),
        agents!off_market_shares_sharing_agent_id_fkey(name, email, phone)
      `)
      .neq('sharing_agent_id', agentId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!data) { setNetworkListings([]); return; }

    const mapped: NetworkListing[] = data.map((s: any) => ({
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
    }));

    setNetworkListings(mapped);
  }, [agentId]);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    Promise.all([fetchMyListings(), fetchNetworkListings()]).then(() => setLoading(false));
  }, [agentId, fetchMyListings, fetchNetworkListings]);

  // Toggle share to network
  const toggleNetworkShare = async (listing: MyOffMarketListing) => {
    if (!agentId) return;

    if (listing.is_shared) {
      // Remove share
      if (listing.share_id) {
        await supabase.from('off_market_shares').delete().eq('id', listing.share_id);
      }
      toast.success('Removed from network');
    } else {
      // Create network-wide share
      const { error } = await supabase.from('off_market_shares').insert({
        property_id: listing.property_id,
        sharing_agent_id: agentId,
        is_network_wide: true,
        referral_split_pct: 25,
        status: 'active',
      } as any);
      if (error) { toast.error(error.message); return; }
      toast.success('Shared with Global Homes Network');
    }
    await fetchMyListings();
  };

  // Contact sharing agent
  const handleContact = async () => {
    if (!contactTarget || !agentId || !user) return;
    setContactSending(true);

    try {
      // 1. Mark the share as contacted
      await supabase
        .from('off_market_shares')
        .update({
          contacted_at: new Date().toISOString(),
          shared_with_agent_id: agentId,
        } as any)
        .eq('id', contactTarget.share_id);

      // 2. Auto-create a trust entry for referral deposit
      // Get agent's trust account (first one)
      const { data: trustAccounts } = await supabase
        .from('trust_accounts')
        .select('id')
        .limit(1);

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

      // 3. Create a notification for the sharing agent
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
        <DashboardHeader title="Off-Market Network" subtitle="Share & discover pocket listings" />
        <div className="p-6 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader title="Off-Market Network" subtitle="Share & discover pocket listings" />
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
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <Share2 size={18} className="text-green-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Shared to Network</p>
                <p className="text-lg font-bold">{myListings.filter(l => l.is_shared).length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Handshake size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Network Listings</p>
                <p className="text-lg font-bold">{networkListings.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                <DollarSign size={18} className="text-orange-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Referral Opps</p>
                <p className="text-lg font-bold">{networkListings.filter(l => !l.contacted_at).length}</p>
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
              <Users size={13} /> Network Off-Market
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
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Commission Split</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMy.map(l => (
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
                            <Switch
                              checked={l.is_shared}
                              onCheckedChange={() => toggleNetworkShare(l)}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {l.is_shared ? 'Shared' : 'Private'}
                            </span>
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
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* ── NETWORK OFF-MARKET ── */}
          <TabsContent value="network" className="mt-4 space-y-3">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2 text-xs">
              <Handshake size={14} className="text-primary shrink-0" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Co-broke opportunity:</strong> Contact the sharing agent to refer your buyer and earn a referral commission split.
              </span>
            </div>

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
                      <TableHead className="text-xs">Commission Split</TableHead>
                      <TableHead className="text-xs w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNetwork.map(l => (
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
                            <span className={l.rental_yield_pct >= 6 ? 'text-green-600 font-semibold' : ''}>
                              {l.rental_yield_pct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
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
                    ))}
                  </TableBody>
                </Table>
              </Card>
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
                    <p className="text-sm font-bold text-green-600">
                      {AUD.format(
                        (contactTarget.price * (contactTarget.commission_rate || 2) / 100) * (contactTarget.referral_split_pct / 100)
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs">Message to Agent</Label>
                <Textarea
                  value={contactMessage}
                  onChange={e => setContactMessage(e.target.value)}
                  rows={4}
                  className="text-sm"
                />
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
    </div>
  );
};

export default NetworkPage;
