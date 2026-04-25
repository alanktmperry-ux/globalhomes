import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, ImageOff } from 'lucide-react';
import { dispatchNotification } from '@/shared/lib/notify';

interface PendingListing {
  id: string;
  address: string;
  suburb: string;
  state: string;
  price_formatted: string;
  listing_type: string | null;
  beds: number;
  baths: number;
  images: string[] | null;
  created_at: string;
  agent_id: string;
  agents: {
    name: string;
    email: string | null;
    user_id: string;
  };
}

interface Props {
  onPendingCountChange?: (count: number) => void;
}

export default function ListingModerationQueue({ onPendingCountChange }: Props) {
  const [listings, setListings] = useState<PendingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchPending = useCallback(async () => {
    const { data, error } = await (supabase
      .from('properties')
      .select('id, address, suburb, state, price_formatted, listing_type, beds, baths, images, created_at, agent_id, agents!inner(name, email, user_id)') as any)
      .eq('moderation_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch pending listings:', error);
      toast.error('Failed to load pending listings');
    }
    const rows = (data || []) as unknown as PendingListing[];
    setListings(rows);
    onPendingCountChange?.(rows.length);
    setLoading(false);
  }, [onPendingCountChange]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleApprove = async (listing: PendingListing) => {
    setActionLoading(listing.id);
    const { error } = await supabase
      .from('properties')
      .update({ moderation_status: 'approved' } as any)
      .eq('id', listing.id);

    if (error) {
      toast.error('Failed to approve listing');
      setActionLoading(null);
      return;
    }

    await dispatchNotification({
      agent_id: listing.agent_id,
      event_key: 'listing_approved',
      title: 'Your listing has been approved',
      message: `Your listing at ${listing.address} is now live in search results.`,
    });

    toast.success('Listing approved');
    setActionLoading(null);
    fetchPending();
  };

  const handleReject = async (listing: PendingListing) => {
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }
    setActionLoading(listing.id);
    const { error } = await supabase
      .from('properties')
      .update({ moderation_status: 'rejected' } as any)
      .eq('id', listing.id);

    if (error) {
      toast.error('Failed to reject listing');
      setActionLoading(null);
      return;
    }

    await supabase.from('notifications').insert({
      agent_id: listing.agent_id,
      type: 'listing_rejected',
      title: 'Listing not approved',
      message: rejectReason.trim(),
    } as any).then(({ error: e }) => { if (e) console.error('notification insert failed:', e); });

    toast.success('Listing rejected');
    setRejectingId(null);
    setRejectReason('');
    setActionLoading(null);
    fetchPending();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-foreground">Listing Review</h2>
        <Badge variant="secondary" className="text-xs">Pending ({listings.length})</Badge>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">No listings awaiting review</div>
      ) : (
        <div className="grid gap-4">
          {listings.map((listing) => (
            <Card key={listing.id} className="overflow-hidden">
              <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                {/* Thumbnail */}
                <div className="w-full sm:w-32 h-24 flex-shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                  {listing.images && listing.images.length > 0 ? (
                    <img src={listing.images[0]} alt={listing.address} className="w-full h-full object-cover" />
                  ) : (
                    <ImageOff className="text-muted-foreground" size={24} />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-semibold text-foreground truncate">{listing.address}, {listing.suburb} {listing.state}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{listing.price_formatted || 'Price TBD'}</span>
                    <span>•</span>
                    <span className="capitalize">{listing.listing_type || 'sale'}</span>
                    <span>•</span>
                    <span>{listing.beds} bed / {listing.baths} bath</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Agent: <span className="font-medium text-foreground">{listing.agents.name}</span> ({listing.agents.email || 'N/A'})
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Submitted: {new Date(listing.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(listing)}
                    disabled={actionLoading === listing.id}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <CheckCircle2 size={14} className="mr-1" /> Approve
                  </Button>

                  {rejectingId === listing.id ? (
                    <div className="flex flex-col gap-1.5">
                      <Input
                        placeholder="Rejection reason"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="text-xs h-8"
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(listing)}
                          disabled={actionLoading === listing.id}
                          className="flex-1 h-7 text-xs"
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectingId(listing.id)}
                      disabled={actionLoading === listing.id}
                    >
                      <XCircle size={14} className="mr-1" /> Reject
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
