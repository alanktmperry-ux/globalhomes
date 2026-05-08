import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Props {
  agentId: string | null;
}

interface RecentEnquiry {
  id: string;
  user_name: string;
  message: string | null;
  created_at: string;
  read: boolean;
  property: { address: string | null } | null;
}

interface RecentMatch {
  id: string;
  match_score: number | null;
  created_at: string;
  property: { address: string | null; suburb: string | null } | null;
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' });
}

function StatCard({
  label, value, sublabel, href, highlight,
}: { label: string; value: number; sublabel?: string; href?: string; highlight?: boolean }) {
  const inner = (
    <div className={cn(
      'rounded-xl border bg-card p-5 space-y-1 transition-colors h-full',
      highlight ? 'border-primary bg-primary/5 hover:bg-primary/10' : 'border-border hover:bg-accent',
    )}>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm font-medium text-foreground">{label}</p>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
  return href ? <Link to={href} className="block">{inner}</Link> : inner;
}

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn('h-3 rounded bg-muted animate-pulse', className)} />;
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export default function DashboardHomeStats({ agentId }: Props) {
  const [loading, setLoading] = useState(true);
  const [listingCount, setListingCount] = useState(0);
  const [enquiryCount, setEnquiryCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentEnquiries, setRecentEnquiries] = useState<RecentEnquiry[]>([]);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);

  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      const [
        listingsRes,
        enqCountRes,
        matchCountRes,
        unreadRes,
        recentEnqRes,
        recentMatchRes,
      ] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true })
          .eq('agent_id', agentId)
          .in('status', ['public', 'active']),
        supabase.from('leads').select('id', { count: 'exact', head: true })
          .eq('agent_id', agentId),
        supabase.from('listing_buyer_matches').select('id', { count: 'exact', head: true })
          .eq('agent_id', agentId),
        supabase.from('leads').select('id', { count: 'exact', head: true })
          .eq('agent_id', agentId).eq('read', false),
        supabase.from('leads')
          .select('id, user_name, message, created_at, read, property:properties(address)')
          .eq('agent_id', agentId)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase.from('listing_buyer_matches')
          .select('id, match_score, created_at, property:properties!listing_id(address, suburb)')
          .eq('agent_id', agentId)
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      if (cancelled) return;
      setListingCount(listingsRes.count ?? 0);
      setEnquiryCount(enqCountRes.count ?? 0);
      setMatchCount(matchCountRes.count ?? 0);
      setUnreadCount(unreadRes.count ?? 0);
      setRecentEnquiries((recentEnqRes.data as any) ?? []);
      setRecentMatches((recentMatchRes.data as any) ?? []);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [agentId]);

  if (!agentId) return null;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-2">
              <SkeletonBar className="h-6 w-12" />
              <SkeletonBar className="w-24" />
              <SkeletonBar className="h-2 w-16" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Live listings" value={listingCount} href="/dashboard/listings" />
            <StatCard label="Total enquiries" value={enquiryCount} href="/dashboard/inbox" />
            <StatCard label="Buyer matches" value={matchCount} href="/dashboard/halo-board" />
            <StatCard
              label="Unread enquiries"
              value={unreadCount}
              sublabel={unreadCount ? 'Needs your attention' : 'All caught up'}
              href="/dashboard/inbox"
              highlight={unreadCount > 0}
            />
          </>
        )}
      </div>

      {/* Two-column activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent enquiries */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Recent enquiries</h2>
            <Link to="/dashboard/inbox" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <SkeletonBar key={i} className="h-10" />)}
            </div>
          ) : recentEnquiries.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No enquiries yet — buyer enquiries will appear here.
            </p>
          ) : (
            <div className="space-y-0">
              {recentEnquiries.map(e => (
                <Link
                  key={e.id}
                  to="/dashboard/inbox"
                  className="flex items-center gap-3 py-3 border-b border-border last:border-0 hover:bg-accent -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary">{initials(e.user_name || '?')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn('text-sm truncate', !e.read && 'font-semibold')}>{e.user_name}</p>
                      {!e.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {e.property?.address || 'Property enquiry'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">{formatTimeAgo(e.created_at)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent buyer matches */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Recent buyer matches</h2>
            <Link to="/dashboard/halo-board" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <SkeletonBar key={i} className="h-10" />)}
            </div>
          ) : recentMatches.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No buyer matches yet — publish a listing to start matching.
            </p>
          ) : (
            <div className="space-y-0">
              {recentMatches.map(m => (
                <div key={m.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {m.property?.address || 'Listing'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.property?.suburb ? `${m.property.suburb} · ` : ''}{formatTimeAgo(m.created_at)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary shrink-0 ml-3">
                    {m.match_score ?? 0}% match
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
