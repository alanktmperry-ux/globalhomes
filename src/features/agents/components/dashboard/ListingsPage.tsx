import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, EyeOff, Zap, CheckCircle2, Clock, Sparkles, TrendingUp, Info, Loader2, Pencil, Globe, Home, Building, MoreHorizontal, FileBarChart2, Copy, Mail } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import { useAgentListings, type AgentListing } from '@/features/agents/hooks/useAgentListings';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';
import { PropertyDrawer } from '@/features/properties/components/PropertyDrawer';
import { Property } from '@/shared/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  pending: { icon: <Clock size={12} />, label: 'Pending', color: 'bg-amber-500/15 text-amber-600' },
  whisper: { icon: <EyeOff size={12} />, label: 'Whisper', color: 'bg-foreground/10 text-foreground' },
  'coming-soon': { icon: <Clock size={12} />, label: 'Coming Soon', color: 'bg-primary/15 text-primary' },
  public: { icon: <Zap size={12} />, label: 'Public', color: 'bg-success/15 text-success' },
  sold: { icon: <CheckCircle2 size={12} />, label: 'Sold', color: 'bg-success/15 text-success' },
  expired: { icon: <Clock size={12} />, label: 'Expired', color: 'bg-destructive/15 text-destructive' },
};

function getListingStatus(l: AgentListing): string {
  return l.status || 'public';
}

function getListingLeads(l: AgentListing): number {
  return l.contact_clicks;
}

function getListingDays(l: AgentListing): number {
  if (!l.listed_date) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(l.listed_date).getTime()) / 86400000));
}

function getListingThumb(l: AgentListing): string {
  return l.image_url || l.images?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&h=150&fit=crop';
}

function toProperty(l: AgentListing): Property {
  return {
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
  };
}

interface ListingCardProps {
  l: AgentListing & { _status: string };
  actionLoading: string | null;
  onSelect: (p: Property) => void;
  onPublish: (l: AgentListing) => void;
  onMarkSold: (l: AgentListing) => void;
  onSendReport: (l: AgentListing) => void;
  navigate: ReturnType<typeof useNavigate>;
  isRental?: boolean;
}

const ListingCard = ({ l, actionLoading, onSelect, onPublish, onMarkSold, onSendReport, navigate, isRental }: ListingCardProps) => {
  const s = STATUS_CONFIG[l._status] || STATUS_CONFIG.public;
  const days = getListingDays(l);
  const leads = getListingLeads(l);
  const daysColor = days < 7 ? 'text-success' : days < 15 ? 'text-primary' : 'text-destructive';

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-4">
      <img
        src={getListingThumb(l)}
        alt=""
        className="w-full sm:w-28 h-20 rounded-lg object-cover shrink-0 cursor-pointer transition-transform duration-200 hover:scale-105"
        onClick={() => onSelect(toProperty(l))}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge className={`${s.color} text-[10px] gap-0.5 border-0`}>{s.icon} {s.label}</Badge>
          {isRental && <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Rental</Badge>}
          <span className={`text-xs font-bold ${daysColor}`}>{days}d</span>
        </div>
        <h3 className="font-display text-sm font-bold truncate">{l.title}</h3>
        <p className="text-xs text-muted-foreground truncate">{l.address}</p>
        <p className="text-sm font-display font-bold text-primary mt-1">{l.price_formatted}</p>
      </div>
      <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 shrink-0">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/performance?listing=${l.id}`); }}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-background hover:bg-accent hover:border-primary/40 cursor-pointer transition"
          aria-label="View performance"
          title="View performance"
        >
          {l.views === 0 && leads === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            <>
              <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Eye size={10} /> {l.views} views
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs font-semibold text-primary flex items-center gap-1">
                <Sparkles size={10} /> {leads} {leads === 1 ? 'enquiry' : 'enquiries'}
              </span>
            </>
          )}
        </button>
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
          {l._status === 'pending' && (
            <Button size="sm" className="text-[10px] h-6 px-2.5 gap-0.5 bg-green-600 hover:bg-green-700 text-white" disabled={actionLoading === l.id} onClick={() => onPublish(l)}>
              {actionLoading === l.id ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />} Publish Listing
            </Button>
          )}
          {l._source === 'db' && l._status === 'public' && (
            <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 gap-0.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => navigate(`/dashboard/listings/${l.id}?tab=marketing`)}>
              <Zap size={10} /> Featured
            </Button>
          )}
          {l._status !== 'sold' && (
            <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 text-success" disabled={actionLoading === l.id} onClick={() => onMarkSold(l)}>
              {actionLoading === l.id ? <Loader2 size={10} className="animate-spin" /> : null} Mark Sold
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" aria-label="More actions">
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onSendReport(l)} className="gap-2 text-xs cursor-pointer">
                <FileBarChart2 size={14} className="text-primary" />
                Send vendor report 📊
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

const StatusTabs = ({
  activeTab,
  setActiveTab,
  counts,
}: {
  activeTab: string;
  setActiveTab: (v: string) => void;
  counts: Record<string, number>;
}) => (
  <Tabs value={activeTab} onValueChange={setActiveTab}>
    <TabsList className="bg-secondary mb-4 flex-wrap h-auto gap-1 p-1">
      <TooltipProvider delayDuration={300}>
        {[
          { key: 'all', label: 'All', tip: 'View all listings' },
          { key: 'pending', label: 'Pending', tip: 'Awaiting publish' },
          { key: 'whisper', label: 'Whisper', tip: 'Private — only visible to you and your network' },
          { key: 'coming-soon', label: 'Coming Soon', tip: 'Teaser — not yet searchable' },
          { key: 'public', label: 'Public', tip: 'Live — visible in search results' },
          { key: 'sold', label: 'Sold', tip: 'Archived' },
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
            <TooltipContent side="bottom" className="text-xs max-w-[200px]">{t.tip}</TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </TabsList>
  </Tabs>
);

const ListingsPage = () => {
  const navigate = useNavigate();
  const [listingMode, setListingMode] = useState<'sale' | 'rent'>('sale');
  const [saleStatusTab, setSaleStatusTab] = useState('all');
  const [rentStatusTab, setRentStatusTab] = useState('all');
  const { listings, loading, isMockData, refetch } = useAgentListings();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handlePublish = async (l: AgentListing) => {
    if (l._source !== 'db') { toast.success('Demo listing — Create a real listing first.'); return; }
    setActionLoading(l.id);
    const { error } = await supabase.from('properties').update({ status: 'public', is_active: true } as any).eq('id', l.id);
    if (error) { toast.error('Failed to publish'); }
    else { toast.success('Your listing is now live on ListHQ!'); refetch(); }
    setActionLoading(null);
  };

  const handleMarkSold = async (l: AgentListing) => {
    if (l._source !== 'db') { toast.success('Demo listing — Create a real listing first.'); return; }
    setActionLoading(l.id);

    // Safety check: block if active tenancy exists
    const { data: activeTenancies } = await supabase
      .from('tenancies')
      .select('id')
      .eq('property_id', l.id)
      .eq('status', 'active')
      .limit(1) as any;

    if (activeTenancies && activeTenancies.length > 0) {
      toast.error('This property has an active tenancy. End the tenancy before marking as sold.');
      setActionLoading(null);
      return;
    }

    // Warning check: pending offers
    const { data: pendingOffers } = await supabase
      .from('offers')
      .select('id')
      .eq('property_id', l.id)
      .eq('status', 'pending')
      .limit(1) as any;

    if (pendingOffers && pendingOffers.length > 0) {
      if (!confirm('This listing has pending offers. Marking as sold will close them. Continue?')) {
        setActionLoading(null);
        return;
      }
    }

    const { error } = await supabase.from('properties').update({ status: 'sold', is_active: false } as any).eq('id', l.id);
    if (error) { toast.error('Failed to update'); }
    else { toast.success('Marked as sold! — Listing has been marked as sold.'); refetch(); }
    setActionLoading(null);
  };

  const withStatus = listings.map(l => ({ ...l, _status: getListingStatus(l) }));

  const salesListings = withStatus.filter(l => l.listing_type !== 'rent');
  const rentalListings = withStatus.filter(l => l.listing_type === 'rent');

  const activeStatusTab = listingMode === 'sale' ? saleStatusTab : rentStatusTab;
  const setActiveStatusTab = listingMode === 'sale' ? setSaleStatusTab : setRentStatusTab;
  const activeListings = listingMode === 'sale' ? salesListings : rentalListings;
  const filtered = activeStatusTab === 'all' ? activeListings : activeListings.filter(l => l._status === activeStatusTab);

  const counts: Record<string, number> = {};
  activeListings.forEach(l => { counts[l._status] = (counts[l._status] || 0) + 1; });

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

          {/* Sale / Rent toggle */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              size="sm"
              variant={listingMode === 'sale' ? 'default' : 'outline'}
              onClick={() => setListingMode('sale')}
              className="gap-1.5 text-xs"
            >
              <Home size={14} />
              Sales
              <Badge variant="secondary" className="text-[9px] px-1.5 h-4 ml-1 bg-background/20">
                {salesListings.length}
              </Badge>
            </Button>
            <Button
              size="sm"
              variant={listingMode === 'rent' ? 'default' : 'outline'}
              onClick={() => setListingMode('rent')}
              className="gap-1.5 text-xs"
            >
              <Building size={14} />
              Rentals
              <Badge variant="secondary" className="text-[9px] px-1.5 h-4 ml-1 bg-background/20">
                {rentalListings.length}
              </Badge>
            </Button>
          </div>

          <StatusTabs activeTab={activeStatusTab} setActiveTab={setActiveStatusTab} counts={counts} />

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="mb-3">
                {listingMode === 'rent' ? <Building size={32} className="mx-auto opacity-40" /> : <Home size={32} className="mx-auto opacity-40" />}
              </div>
              <p className="text-sm font-medium">No {listingMode === 'rent' ? 'rental' : 'sale'} listings{activeStatusTab !== 'all' ? ` with status "${activeStatusTab}"` : ''}</p>
              <p className="text-xs mt-1">Create a new listing to get started.</p>
              <Button size="sm" className="mt-4 gap-1.5 text-xs" onClick={() => navigate('/pocket-listing')}>
                <Plus size={14} /> New {listingMode === 'rent' ? 'Rental' : 'Sale'} Listing
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((l) => (
                <ListingCard
                  key={l.id}
                  l={l}
                  actionLoading={actionLoading}
                  onSelect={setSelectedProperty}
                  onPublish={handlePublish}
                  onMarkSold={handleMarkSold}
                  navigate={navigate}
                  isRental={listingMode === 'rent'}
                />
              ))}
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
