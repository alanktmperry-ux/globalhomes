import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardHeader from './DashboardHeader';
import { supabase } from '@/integrations/supabase/client';
import ListingDetailsTab from './listing-tabs/ListingDetailsTab';
import ListingMarketingTab from './listing-tabs/ListingMarketingTab';
import ListingBuyerLeadsTab from './listing-tabs/ListingBuyerLeadsTab';
import ListingDocumentsTab from './listing-tabs/ListingDocumentsTab';
import ListingAccountingTab from './listing-tabs/ListingAccountingTab';

const ListingDetailPage = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

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

  return (
    <div>
      <DashboardHeader
        title={listing.title || listing.address}
        subtitle={listing.address}
        actions={
          <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/listings')} className="gap-1.5 text-xs">
            <ArrowLeft size={14} /> Back to Listings
          </Button>
        }
      />

      <div className="p-4 sm:p-6 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            <TabsTrigger value="marketing" className="text-xs">Marketing</TabsTrigger>
            <TabsTrigger value="buyers" className="text-xs">Buyer Leads</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
            <TabsTrigger value="accounting" className="text-xs">Accounting</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <ListingDetailsTab listing={listing} onUpdate={(updates) => {
              supabase.from('properties').update(updates as any).eq('id', listing.id).then(() => {
                setListing({ ...listing, ...updates });
              });
            }} />
          </TabsContent>

          <TabsContent value="marketing">
            <ListingMarketingTab listing={listing} />
          </TabsContent>

          <TabsContent value="buyers">
            <ListingBuyerLeadsTab listing={listing} />
          </TabsContent>

          <TabsContent value="documents">
            <ListingDocumentsTab listing={listing} />
          </TabsContent>

          <TabsContent value="accounting">
            <ListingAccountingTab listing={listing} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ListingDetailPage;
