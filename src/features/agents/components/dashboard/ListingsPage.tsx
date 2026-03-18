import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, EyeOff, Zap, CheckCircle2, Clock, Sparkles, TrendingUp, Rocket, Info, Loader2, Pencil, Globe } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import { useAgentListings, type AgentListing } from '@/features/agents/hooks/useAgentListings';
import { PropertyDrawer } from '@/features/properties/components/PropertyDrawer';
import { Property } from '@/shared/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  pending: { icon: <Clock size={12} />, label: 'Pending', color: 'bg-amber-500/15 text-amber-600' },
  whisper: { icon: <EyeOff size={12} />, label: 'Whisper', color: 'bg-foreground/10 text-foreground' },
  'coming-soon': { icon: <Clock size={12} />, label: 'Coming Soon', color: 'bg-primary/15 text-primary' },
  public: { icon: <Zap size={12} />, label: 'Public', color: 'bg-success/15 text-success' },
  sold: { icon: <CheckCircle2 size={12} />, label: 'Sold', color: 'bg-success/15 text-success' },
  expired: { icon: <Clock size={12} />, label: 'Expired', color: 'bg-destructive/15 text-destructive' },
};

function getListingStatus(l: AgentListing): string {
  if ('_mock_status' in l) return l._mock_status;
  return (l as any).status || 'public';
}

function getListingLeads(l: AgentListing): number {
  if ('_mock_leads' in l) return l._mock_leads;
  return l.contact_clicks;
}

function getListingDays(l: AgentListing): number {
  if ('_mock_days' in l) return l._mock_days;
  if (!l.listed_date) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(l.listed_date).getTime()) / 86400000));
}

function getListingThumb(l: AgentListing): string {
  return l.image_url || l.images?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&h=150&fit=crop';
}

const ListingsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const { listings, loading, isMockData, refetch } = useAgentListings();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePublish = async (l: AgentListing) => {
    if (l._source !== 'db') { toast({ title: 'Demo listing', description: 'Create a real listing first.' }); return; }
    setActionLoading(l.id);
    const { error } = await supabase.from('properties').update({ status: 'public', is_active: true } as any).eq('id', l.id);
    if (error) { toast({ title: 'Failed to publish', variant: 'destructive' }); }
    else { toast({ title: 'Your listing is now live on Global Homes!' }); refetch(); }
    setActionLoading(null);
  };

  const handleBoost = async (l: AgentListing) => {
    if (l._source !== 'db') { toast({ title: 'Demo listing', description: 'Create a real listing first.' }); return; }
    setActionLoading(l.id);
    const { error } = await supabase.from('properties').update({ status: 'public', is_active: true } as any).eq('id', l.id);
    if (error) { toast({ title: 'Failed to boost', variant: 'destructive' }); }
    else { toast({ title: 'Listing boosted!', description: 'Your listing is now public.' }); refetch(); }
    setActionLoading(null);
  };

  const handleMarkSold = async (l: AgentListing) => {
    if (l._source !== 'db') { toast({ title: 'Demo listing', description: 'Create a real listing first.' }); return; }
    setActionLoading(l.id);
    const { error } = await supabase.from('properties').update({ status: 'sold', is_active: false } as any).eq('id', l.id);
    if (error) { toast({ title: 'Failed to update', variant: 'destructive' }); }
    else { toast({ title: 'Marked as sold!', description: 'Listing has been marked as sold.' }); refetch(); }
    setActionLoading(null);
  };

  const toProperty = (l: AgentListing): Property => ({
    id: l.id,
    title: l.title,
    address: l.address,
    suburb: l.suburb,
    state: l.state,
    country: l.country,
    price: l.price,
    priceFormatted: l.price_formatted,
    beds: l.beds,
    baths: l.baths,
    parking: l.parking,
    sqm: l.sqm,
    imageUrl: l.image_url || l.images?.[0] || '',
    images: l.images || (l.image_url ? [l.image_url] : []),
    description: l.description || '',
    estimatedValue: l.estimated_value || '',
    propertyType: l.property_type || 'House',
    features: l.features || [],
    agent: { id: '', name: '', agency: '', phone: '', email: '', avatarUrl: '', isSubscribed: false },
    listedDate: l.listed_date || '',
    views: l.views,
    contactClicks: l.contact_clicks,
    status: 'listed',
  });

  const withStatus = listings.map(l => ({ ...l, _status: getListingStatus(l) }));
  const filtered = activeTab === 'all' ? withStatus : withStatus.filter(l => l._status === activeTab);
  const counts: Record<string, number> = {};
  withStatus.forEach(l => { counts[l._status] = (counts[l._status] || 0) + 1; });

  return (
    <>
      <div>
        <DashboardHeader
          title="My Listings"
          actions={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate('/')} className="gap-1.5 text-xs">
                <Globe size={14} /> Browse Market
              </Button>
              <Button size="sm" onClick={() => navigate('/pocket-listing')} className="gap-1.5 text-xs">
                <Plus size={14} /> New Listing
              </Button>
            </div>
          }
        />

        <div className="p-4 sm:p-6 max-w-5xl">
          {isMockData && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
              <Info size={14} className="text-primary shrink-0" />
              <span>Showing demo listings. Create your first listing to see real data here.</span>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-secondary mb-4 flex-wrap h-auto gap-1 p-1">
              <TooltipProvider delayDuration={300}>
              {[
                { key: 'all', label: 'All', tip: 'View all your listings' },
                { key: 'whisper', label: 'Whisper', tip: 'Private — only visible to you and your network' },
                { key: 'coming-soon', label: 'Coming Soon', tip: 'Teaser — not yet searchable by buyers' },
                { key: 'public', label: 'Public', tip: 'Live — visible in search results to everyone' },
                { key: 'sold', label: 'Sold', tip: 'Archived — hidden from public search' },
              ].map((t) => (
                <Tooltip key={t.key}>
                  <TooltipTrigger asChild>
                    <TabsTrigger value={t.key} className="text-xs gap-1">
                      {t.label}
                      {t.key !== 'all' && counts[t.key] && (
                        <Badge variant="secondary" className="text-[9px] px-1 h-4 ml-0.5">{counts[t.key]}</Badge>
                      )}
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                    {t.tip}
                  </TooltipContent>
                </Tooltip>
              ))}
              </TooltipProvider>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((l) => {
                const s = STATUS_CONFIG[l._status] || STATUS_CONFIG.public;
                const days = getListingDays(l);
                const leads = getListingLeads(l);
                const daysColor = days < 7 ? 'text-success' : days < 15 ? 'text-primary' : 'text-destructive';
                return (
                  <div key={l.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-4">
                    <img
                      src={getListingThumb(l)}
                      alt=""
                      className="w-full sm:w-28 h-20 rounded-lg object-cover shrink-0 cursor-pointer transition-transform duration-200 hover:scale-105"
                      onClick={() => setSelectedProperty(toProperty(l))}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`${s.color} text-[10px] gap-0.5 border-0`}>{s.icon} {s.label}</Badge>
                        <span className={`text-xs font-bold ${daysColor}`}>{days}d</span>
                      </div>
                      <h3 className="font-display text-sm font-bold truncate">{l.title}</h3>
                      <p className="text-xs text-muted-foreground truncate">{l.address}</p>
                      <p className="text-sm font-display font-bold text-primary mt-1">{l.price_formatted}</p>
                    </div>
                      <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye size={10} /> {l.views}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles size={10} /> {leads} leads</span>
                        <div className="flex gap-1 mt-1">
                          {l._source === 'db' && (
                            <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 gap-0.5" onClick={() => navigate(`/dashboard/listings/${l.id}`)}>
                              <Eye size={10} /> Manage
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 gap-0.5" disabled={actionLoading === l.id} onClick={() => {
                            if (l._source === 'db') navigate(`/pocket-listing?edit=${l.id}`);
                          }}>
                            <Pencil size={10} /> Edit
                          </Button>
                          {l._status !== 'public' && l._status !== 'sold' && (
                            <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 gap-0.5" disabled={actionLoading === l.id} onClick={() => handleBoost(l)}>
                              {actionLoading === l.id ? <Loader2 size={10} className="animate-spin" /> : <Rocket size={10} />} Boost
                            </Button>
                          )}
                          {l._status !== 'sold' && (
                            <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 text-success" disabled={actionLoading === l.id} onClick={() => handleMarkSold(l)}>
                              {actionLoading === l.id ? <Loader2 size={10} className="animate-spin" /> : null} Mark Sold
                            </Button>
                          )}
                        </div>
                      </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <PropertyDrawer
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
        isSaved={false}
        onToggleSave={() => {}}
      />
    </>
  );
};

export default ListingsPage;
