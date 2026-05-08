import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  listingId: string;
  agentId: string | null;
}

interface Enquiry {
  id: string;
  user_name: string | null;
  user_email: string | null;
  created_at: string;
}

function formatTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function ListingAnalyticsTab({ listingId, agentId }: Props) {
  const [views, setViews] = useState(0);
  const [enquiries, setEnquiries] = useState(0);
  const [matches, setMatches] = useState(0);
  const [listingEnquiries, setListingEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
      const [viewsRes, enquiriesRes, matchesRes, recentRes] = await Promise.all([
        supabase
          .from('lead_events')
          .select('id', { count: 'exact', head: true })
          .eq('property_id', listingId)
          .eq('event_type', 'view')
          .gte('created_at', thirtyDaysAgo),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('property_id', listingId),
        supabase
          .from('listing_buyer_matches')
          .select('id', { count: 'exact', head: true })
          .eq('listing_id', listingId),
        supabase
          .from('leads')
          .select('id, user_name, user_email, created_at')
          .eq('property_id', listingId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      if (cancelled) return;
      setViews(viewsRes.count ?? 0);
      setEnquiries(enquiriesRes.count ?? 0);
      setMatches(matchesRes.count ?? 0);
      setListingEnquiries((recentRes.data as Enquiry[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [listingId, agentId]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <p className="text-3xl font-bold text-foreground">{loading ? '—' : views}</p>
          <p className="text-sm text-muted-foreground mt-1">Views (30 days)</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <p className="text-3xl font-bold text-foreground">{loading ? '—' : enquiries}</p>
          <p className="text-sm text-muted-foreground mt-1">Total enquiries</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <p className="text-3xl font-bold text-foreground">{loading ? '—' : matches}</p>
          <p className="text-sm text-muted-foreground mt-1">Buyer matches</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-foreground">Recent enquiries</h3>
        {!loading && listingEnquiries.length === 0 && (
          <p className="text-sm text-muted-foreground">No enquiries yet.</p>
        )}
        {listingEnquiries.slice(0, 5).map((e) => (
          <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium text-foreground">{e.user_name || 'Anonymous buyer'}</p>
              {e.user_email && <p className="text-xs text-muted-foreground">{e.user_email}</p>}
            </div>
            <p className="text-xs text-muted-foreground">{formatTimeAgo(e.created_at)}</p>
          </div>
        ))}
        {listingEnquiries.length > 5 && (
          <Link to="/dashboard/inbox" className="text-xs text-primary hover:underline">
            View all {listingEnquiries.length} enquiries →
          </Link>
        )}
      </div>
    </div>
  );
}
