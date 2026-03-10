import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, EyeOff, Zap, CheckCircle2, Clock, Sparkles, TrendingUp, Rocket, Info, Loader2, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import { useAgentListings, type AgentListing } from '@/hooks/useAgentListings';
import { PropertyDrawer } from '@/components/PropertyDrawer';
import { Property } from '@/lib/types';

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  whisper: { icon: <EyeOff size={12} />, label: 'Whisper', color: 'bg-foreground/10 text-foreground' },
  'coming-soon': { icon: <Clock size={12} />, label: 'Coming Soon', color: 'bg-primary/15 text-primary' },
  public: { icon: <Zap size={12} />, label: 'Public', color: 'bg-success/15 text-success' },
  sold: { icon: <CheckCircle2 size={12} />, label: 'Sold', color: 'bg-success/15 text-success' },
  expired: { icon: <Clock size={12} />, label: 'Expired', color: 'bg-destructive/15 text-destructive' },
};

function getListingStatus(l: AgentListing): string {
  if ('_mock_status' in l) return l._mock_status;
  if (!l.is_active) return 'sold';
  return 'public';
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
  const { listings, loading, isMockData } = useAgentListings();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

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
            <Button size="sm" onClick={() => navigate('/pocket-listing')} className="gap-1.5 text-xs">
              <Plus size={14} /> New Listing
            </Button>
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
              {[
                { key: 'all', label: 'All' },
                { key: 'whisper', label: 'Whisper' },
                { key: 'coming-soon', label: 'Coming Soon' },
                { key: 'public', label: 'Public' },
                { key: 'sold', label: 'Sold' },
              ].map((t) => (
                <TabsTrigger key={t.key} value={t.key} className="text-xs gap-1">
                  {t.label}
                  {t.key !== 'all' && counts[t.key] && (
                    <Badge variant="secondary" className="text-[9px] px-1 h-4 ml-0.5">{counts[t.key]}</Badge>
                  )}
                </TabsTrigger>
              ))}
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
                        <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 gap-0.5" onClick={() => {
                          if (l._source === 'db') navigate(`/pocket-listing?edit=${l.id}`);
                        }}>
                          <Pencil size={10} /> Edit
                        </Button>
                        {l._status !== 'public' && l._status !== 'sold' && (
                          <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 gap-0.5">
                            <Rocket size={10} /> Boost
                          </Button>
                        )}
                        {l._status !== 'sold' && (
                          <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 text-success">Mark Sold</Button>
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
