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
  label, value, sublabel, href,
}: { label: string; value: number; sublabel?: string; href?: string; highlight?: boolean }) {
  const inner = (
    <div
      className="bg-white rounded-[12px] p-6 relative overflow-hidden flex flex-col justify-between min-h-[130px] transition-all hover:bg-[#F9FAFB]"
      style={{ border: '1px solid #E5E7EB' }}
    >
      <p
        className="text-[10px] uppercase font-semibold text-[#6B7280]"
        style={{ letterSpacing: '0.10em' }}
      >
        {label}
      </p>
      <div>
        <p className="text-5xl font-extralight text-[#0a0f1e] tabular-nums mt-3">{value}</p>
        {sublabel && (
          <p className="text-xs font-light text-[#9CA3AF] mt-1">{sublabel}</p>
        )}
      </div>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-[12px] p-6 min-h-[130px] space-y-3"
              style={{ border: '1px solid #E5E7EB' }}
            >
              <SkeletonBar className="h-2 w-20" />
              <SkeletonBar className="h-10 w-16" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="LIVE LISTINGS" value={listingCount} href="/dashboard/listings" />
            <StatCard label="TOTAL ENQUIRIES" value={enquiryCount} href="/dashboard/inbox" />
            <StatCard label="BUYER MATCHES" value={matchCount} href="/dashboard/halo-board" />
            <StatCard
              label="UNREAD ENQUIRIES"
              value={unreadCount}
              sublabel={unreadCount ? 'Needs your attention' : 'All caught up'}
              href="/dashboard/inbox"
            />
          </>
        )}
      </div>

      {/* Two-column activity — white canvas cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent enquiries */}
        <div className="bg-white rounded-[12px] p-5" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-normal" style={{ color: '#0a0f1e' }}>Recent enquiries</h2>
            <Link to="/dashboard/inbox" className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]">View all →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <SkeletonBar key={i} className="h-10" />)}
            </div>
          ) : recentEnquiries.length === 0 ? (
            <EmptyState
              variant="compact"
              icon="solar:inbox-linear"
              title="No enquiries yet"
              body="When buyers reach out about your listings, they'll appear here."
            />
          ) : (
            <div className="space-y-0">
              {recentEnquiries.map(e => (
                <Link
                  key={e.id}
                  to="/dashboard/inbox"
                  className="flex items-center gap-3 py-3 border-b last:border-0 hover:bg-[#F9FAFB] -mx-2 px-2 rounded-lg transition-colors"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  <div className="w-8 h-8 rounded-full bg-[#2563EB]/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-[#2563EB]">{initials(e.user_name || '?')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn('text-sm truncate', !e.read && 'font-semibold')} style={{ color: '#0a0f1e' }}>{e.user_name}</p>
                      {!e.read && <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" />}
                    </div>
                    <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                      {e.property?.address || 'Property enquiry'}
                    </p>
                  </div>
                  <p className="text-xs shrink-0" style={{ color: '#6B7280' }}>{formatTimeAgo(e.created_at)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent buyer matches */}
        <div className="bg-white rounded-[12px] p-5" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-normal" style={{ color: '#0a0f1e' }}>Recent buyer matches</h2>
            <Link to="/dashboard/halo-board" className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]">View all →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <SkeletonBar key={i} className="h-10" />)}
            </div>
          ) : recentMatches.length === 0 ? (
            <EmptyState
              variant="compact"
              icon="solar:users-group-rounded-linear"
              title="No buyer matches yet"
              body="Our AI will surface buyers actively searching for your listings."
            />
          ) : (
            <div className="space-y-0">
              {recentMatches.map(m => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#0a0f1e' }}>
                      {m.property?.address || 'Listing'}
                    </p>
                    <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                      {m.property?.suburb ? `${m.property.suburb} · ` : ''}{formatTimeAgo(m.created_at)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#2563EB] shrink-0 ml-3">
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
