import { useState, useEffect } from 'react';
import type { PropertyRow } from '@/features/agents/types/listing';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Zap, AlertTriangle, Sparkles, Eye, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardHeader from './DashboardHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ListingDetailsTab from './listing-tabs/ListingDetailsTab';
import ListingMarketingTab from './listing-tabs/ListingMarketingTab';
import ListingBuyerLeadsTab from './listing-tabs/ListingBuyerLeadsTab';
import { DocumentVault } from '@/features/documents/components/DocumentVault';
import ListingAccountingTab from './listing-tabs/ListingAccountingTab';
import ListingMarketTab from './listing-tabs/ListingMarketTab';
import MatchedBuyersWidget from './MatchedBuyersWidget';

const ListingDetailPage = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<PropertyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'details');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!listingId) return;
    const fetchListing = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', listingId)
        .single();
      if (!error && data) setListing(data);
      setLoading(false);
    };
    fetchListing();
  }, [listingId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Listing not found</p>
        <Button variant="outline" onClick={() => navigate('/dashboard/listings')} className="mt-4">Back to Listings</Button>
      </div>
    );
  }

  const isUnpublished = listing.status !== 'public' && listing.status !== 'sold';

  const handlePublish = async () => {
    setPublishing(true);
    const { error } = await supabase
      .from('properties')
      .update({ status: 'public', is_active: true } as any)
      .eq('id', listing.id);
    if (error) {
      toast.error('Failed to publish');
    } else {
      setListing({ ...listing, status: 'public', is_active: true });
      toast.success('Listing published! — Your listing is now visible to buyers.');
    }
    setPublishing(false);
  };

  return (
    <div>
      <DashboardHeader
        title={listing.title || listing.address}
        subtitle={listing.address}
        actions={
          <div className="flex gap-2">
            {isUnpublished && (
              <Button
                size="sm"
                className="gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white"
                disabled={publishing}
                onClick={handlePublish}
              >
                {publishing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                Publish Listing
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/listings')} className="gap-1.5 text-xs">
              <ArrowLeft size={14} /> Back to Listings
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 max-w-6xl">
        {(listing as any).is_exclusive && (listing as any).exclusive_end_date && new Date((listing as any).exclusive_end_date) > new Date() && (() => {
          const end = new Date((listing as any).exclusive_end_date);
          const diff = end.getTime() - Date.now();
          const days = Math.floor(diff / 86_400_000);
          const hours = Math.floor((diff % 86_400_000) / 3_600_000);
          return (
            <div className="mb-4 rounded-2xl border-2 border-red-500/30 bg-gradient-to-br from-red-500/5 via-card to-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-red-500 text-white rounded-full px-2 py-0.5">
                    <Sparkles size={10} /> Exclusive Active
                  </span>
                  <span className="text-sm font-semibold text-foreground">{days} day{days === 1 ? '' : 's'} {hours} hour{hours === 1 ? '' : 's'} remaining</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Goes public on {end.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Eye size={13} /> <strong className="text-foreground">{(listing as any).exclusive_views ?? 0}</strong> exclusive views
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MessageSquare size={13} /> <strong className="text-foreground">{(listing as any).exclusive_enquiries ?? 0}</strong> exclusive enquiries
                </span>
              </div>
            </div>
          );
        })()}
        {isUnpublished && (
          <div className="flex items-center gap-2.5 mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle size={16} className="shrink-0" />
            <span>This listing is in draft — publish it to make it visible to buyers.</span>
          </div>
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            <TabsTrigger value="marketing" className="text-xs">Marketing</TabsTrigger>
            <TabsTrigger value="buyers" className="text-xs">Buyer Leads</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
            <TabsTrigger value="accounting" className="text-xs">Accounting</TabsTrigger>
            <TabsTrigger value="market" className="text-xs">Market Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <ListingDetailsTab listing={listing} onUpdate={(updates) => {
              supabase.from('properties').update(updates as any).eq('id', listing.id).then(() => {
                setListing({ ...listing, ...updates });
              });
            }} />
          </TabsContent>

          <TabsContent value="marketing">
            <ListingMarketingTab listing={listing} onViewAllLeads={() => setActiveTab('buyers')} />
          </TabsContent>

          <TabsContent value="buyers">
            <ListingBuyerLeadsTab listing={listing} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentVault propertyId={listing.id} viewerRole="agent" canUpload={true} />
          </TabsContent>

          <TabsContent value="accounting">
            <ListingAccountingTab listing={listing} />
          </TabsContent>

          <TabsContent value="market">
            <ListingMarketTab listing={listing} />
          </TabsContent>
        </Tabs>
        </div>
        <aside className="space-y-4">
          <MatchedBuyersWidget listingId={listing.id} />
        </aside>
      </div>
    </div>
  );
};

export default ListingDetailPage;
