import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAgentListings } from '@/features/agents/hooks/useAgentListings';
import PocketListingForm from '@/features/agents/components/pocket-listing/PocketListingForm';
import { toast } from 'sonner';

interface ListingMeta {
  id: string;
  address: string | null;
  status: string | null;
  agent_id: string | null;
}

const ListingEditPage = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { agentId, loading: agentLoading } = useAgentListings();

  const [listing, setListing] = useState<ListingMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!listingId || !agentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('id, address, status, agent_id')
        .eq('id', listingId)
        .eq('agent_id', agentId)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setListing(data as ListingMeta);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId, agentId]);

  if (authLoading || agentLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!agentId) return <Navigate to="/onboarding/agency" replace />;

  if (notFound) {
    toast.error('Listing not found or you do not have access.');
    return <Navigate to="/dashboard/listings" replace />;
  }

  if (loading || !listing) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const isPublished = listing.status === 'public' || listing.status === 'active';

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <Link
        to="/dashboard/listings"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft size={12} /> Back to listings
      </Link>

      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Edit listing</h1>
          <p className="text-sm text-muted-foreground mt-1">{listing.address || '—'}</p>
        </div>
        <span
          className={
            isPublished
              ? 'inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border'
          }
        >
          {isPublished ? 'Published' : listing.status === 'sold' ? 'Sold' : 'Draft'}
        </span>
      </div>

      {isPublished && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 mb-4">
          This listing is live. Changes will be visible to buyers immediately after saving.
        </div>
      )}

      <PocketListingForm
        editPropertyId={listing.id}
        onPublish={() => navigate('/dashboard/listings')}
        onCancel={() => navigate('/dashboard/listings')}
      />
    </div>
  );
};

export default ListingEditPage;
