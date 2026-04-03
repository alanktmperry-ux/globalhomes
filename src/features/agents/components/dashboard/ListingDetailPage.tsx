import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Zap, AlertTriangle } from 'lucide-react';
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

const ListingDetailPage = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<any>(null);
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
    </div>
  );
};

export default ListingDetailPage;
