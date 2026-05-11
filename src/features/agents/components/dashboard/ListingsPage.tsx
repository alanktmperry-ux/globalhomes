import { useState, useEffect, lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, EyeOff, Zap, CheckCircle2, Clock, Sparkles, TrendingUp, Info, Loader2, Pencil, Globe, Home, Building, MoreHorizontal, FileBarChart2, Copy, Mail, List as ListIcon, Kanban, ExternalLink, ChevronDown, MessageSquare, ImageIcon, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { getListingImage, LISTING_PLACEHOLDER_CLASS } from '@/shared/lib/listingImage';
import { cn } from '@/shared/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useNavigate, useSearchParams } from 'react-router-dom';
const PipelinePage = lazy(() => import('./PipelinePage'));
import DashboardHeader from './DashboardHeader';
import { useAgentListings, type AgentListing } from '@/features/agents/hooks/useAgentListings';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';
import { useSubscription } from '@/features/agents/hooks/useSubscription';
import { PropertyDrawer } from '@/features/properties/components/PropertyDrawer';
import { Property } from '@/shared/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePageTitle } from '@/lib/usePageTitle';
import { Skeleton } from '@/components/ui/skeleton';

function ListingsSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

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

function getListingThumb(l: AgentListing): string | null {
  return getListingImage(l.image_url, l.images);
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

const STATUS_BADGE_CLASS: Record<string, string> = {
  public: 'bg-green-100 text-green-800',
  published: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  draft: 'bg-muted text-muted-foreground',
  whisper: 'bg-foreground/10 text-foreground',
  'coming-soon': 'bg-blue-100 text-blue-800',
  under_offer: 'bg-amber-100 text-amber-800',
  sold: 'bg-slate-100 text-slate-600',
  leased: 'bg-slate-100 text-slate-600',
};

const STATUS_LABEL: Record<string, string> = {
  public: 'Published',
  under_offer: 'Under offer',
  sold: 'Sold',
  leased: 'Leased',
  draft: 'Draft',
  pending: 'Pending',
  whisper: 'Whisper',
  'coming-soon': 'Coming soon',
};

function StatusMenu({
  listing,
  onStatusChange,
  onDelete,
}: {
  listing: { id: string; status: string; listing_type?: string | null };
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const isRental = listing.listing_type === 'rent';

  const allOptions = [
    { value: 'public', label: 'Published', description: 'Live in search results' },
    { value: 'under_offer', label: 'Under offer', description: 'Visible with badge, excluded from search' },
    {
      value: isRental ? 'leased' : 'sold',
      label: isRental ? 'Leased' : 'Sold',
      description: 'Hidden from all search results',
    },
    { value: 'draft', label: 'Unpublish', description: 'Revert to draft — hidden from buyers' },
  ];
  const options = allOptions.filter((o) => o.value !== listing.status);

  async function changeStatus(newStatus: string) {
    setSaving(true);
    setOpen(false);
    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'sold' || newStatus === 'leased' || newStatus === 'draft') update.is_active = false;
    if (newStatus === 'public') update.is_active = true;
    const { error } = await supabase.from('properties').update(update as any).eq('id', listing.id);
    if (error) {
      toast.error('Failed to update status');
    } else {
      onStatusChange(listing.id, newStatus);
      toast.success('Listing status updated');

      // Touch 3 — first_listing welcome (fires on first publish only)
      if (newStatus === 'public') {
        (async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: agentRow } = await supabase
              .from('agents' as any).select('id').eq('user_id', user.id).maybeSingle();
            const agentId = (agentRow as any)?.id;
            if (!agentId) return;
            const { count } = await supabase
              .from('properties').select('id', { count: 'exact', head: true })
              .eq('agent_id', agentId).eq('status', 'public');
            if (count === 1) {
              supabase.functions.invoke('send-welcome-email', {
                body: { user_id: user.id, category: 'first_listing' },
              }).catch(() => { /* non-fatal */ });
            }
          } catch { /* non-fatal */ }
        })();
      }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    setSaving(true);
    setOpen(false);
    const { error } = await supabase.from('properties').delete().eq('id', listing.id);
    if (error) {
      toast.error('Failed to delete listing');
    } else {
      onDelete(listing.id);
      toast.success('Listing deleted');
    }
    setSaving(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className={cn(
          'px-2.5 py-1 rounded-full text-[10px] font-medium border-0 cursor-pointer hover:opacity-80 transition-opacity inline-flex items-center gap-1',
          STATUS_BADGE_CLASS[listing.status] ?? STATUS_BADGE_CLASS.draft,
        )}
      >
        {saving ? 'Saving…' : STATUS_LABEL[listing.status] ?? listing.status.replace('_', ' ')}
        <ChevronDown size={10} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-56 rounded-xl border border-border bg-card shadow-lg z-30 overflow-hidden">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => changeStatus(opt.value)}
                className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors"
              >
                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </button>
            ))}
            <div className="border-t border-border">
              <button
                type="button"
                onClick={handleDelete}
                className="w-full text-left px-4 py-2.5 hover:bg-destructive/10 transition-colors text-destructive"
              >
                <p className="text-sm font-medium">Delete listing</p>
                <p className="text-xs opacity-70">Permanent — cannot be undone</p>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface ListingStatsMaps {
  views: Record<string, number>;
  enquiries: Record<string, number>;
  matches: Record<string, number>;
}

function ListingStats({ listingId, stats }: { listingId: string; stats: ListingStatsMaps }) {
  const views = stats.views[listingId] ?? 0;
  const enquiries = stats.enquiries[listingId] ?? 0;
  const matches = stats.matches[listingId] ?? 0;
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
      <span className="flex items-center gap-1"><Eye size={12} />{views} view{views !== 1 ? 's' : ''}</span>
      <span className="flex items-center gap-1"><MessageSquare size={12} />{enquiries} enquir{enquiries !== 1 ? 'ies' : 'y'}</span>
      <span className="flex items-center gap-1"><Sparkles size={12} />{matches} match{matches !== 1 ? 'es' : ''}</span>
    </div>
  );
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
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  stats: ListingStatsMaps;
}

// iconify-icon helper (script loaded in index.html)
const Ico = ({ icon, size = 16, color, className }: { icon: string; size?: number; color?: string; className?: string }) => (
  // @ts-expect-error — iconify-icon is a web component
  <iconify-icon icon={icon} class={className} style={{ fontSize: `${size}px`, color, display: 'inline-flex', lineHeight: 1 }} />
);

const STATUS_OVERLAY: Record<string, { label: string; className: string }> = {
  public: { label: 'For Sale', className: 'bg-[#0a0f1e]/85 backdrop-blur text-white' },
  rent: { label: 'For Rent', className: 'bg-[#1E40AF]/85 backdrop-blur text-white' },
  sold: { label: 'Sold', className: 'bg-[#34D399]/95 text-[#065F46]' },
  leased: { label: 'Leased', className: 'bg-[#34D399]/95 text-[#065F46]' },
  under_offer: { label: 'Under Offer', className: 'bg-[#FBBF24]/95 text-[#92400E]' },
  pending: { label: 'Pending', className: 'bg-[#FBBF24]/95 text-[#92400E]' },
  whisper: { label: 'Off-market', className: 'bg-white/95 text-[#0a0f1e] border border-[#E5E5E5]' },
  draft: { label: 'Draft', className: 'bg-white/95 text-[#0a0f1e] border border-[#E5E5E5]' },
  'coming-soon': { label: 'Coming Soon', className: 'bg-white/95 text-[#0a0f1e] border border-[#E5E5E5]' },
};

const ListingCard = ({ l, actionLoading, onSelect, onPublish, onMarkSold, onSendReport, navigate, isRental, onStatusChange, onDelete, stats }: ListingCardProps) => {
  const thumb = getListingThumb(l);
  const enquiries = stats.enquiries[l.id] ?? l.contact_clicks ?? 0;
  const views = stats.views[l.id] ?? l.views ?? 0;
  const langCount = Array.isArray(l.images) ? 20 : 20; // listings auto-translate into 20 languages
  const overlayKey = isRental && l._status === 'public' ? 'rent' : l._status;
  const overlay = STATUS_OVERLAY[overlayKey] || STATUS_OVERLAY.public;
  const isBoosted = (l as any).is_featured === true || (l as any).boost_ends_at;

  return (
    <div
      className="group bg-white rounded-3xl border border-[#E5E5E5] overflow-hidden cursor-pointer transition-all hover:border-[#2563EB]/40 hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
      onClick={() => onSelect(toProperty(l))}
    >
      {/* Image area */}
      <div className="aspect-[16/10] relative overflow-hidden bg-[#F3F4F6]">
        {thumb ? (
          <img src={thumb} alt={l.address} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#D1D5DB]">
            <Ico icon="solar:buildings-linear" size={40} />
          </div>
        )}
        {/* Status pill top-left */}
        <span className={`absolute top-3 left-3 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${overlay.className}`}>
          {overlay.label}
        </span>
        {/* Boost indicator top-right */}
        {isBoosted && (
          <div
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-[0_4px_12px_rgba(37,99,235,0.4)]"
            style={{ background: 'linear-gradient(135deg, #2563EB, #4F88FF, #93C5FD)' }}
            title="Boosted listing"
          >
            <Ico icon="solar:bolt-bold" size={16} color="#fff" />
          </div>
        )}
        {/* Language pill bottom-left */}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 bg-white/95 backdrop-blur rounded-full px-2.5 py-1 text-[11px] font-bold text-[#0a0f1e]">
          <Ico icon="solar:earth-bold" size={12} color="#2563EB" />
          {langCount} languages
        </span>
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[16px] font-bold text-[#0a0f1e] leading-tight truncate flex-1">{l.address}</h3>
          <div onClick={(e) => e.stopPropagation()} className="shrink-0 -mt-1 -mr-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-[#F3F4F6]" aria-label="More actions">
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {l._source === 'db' && (
                  <DropdownMenuItem onClick={() => navigate(`/dashboard/listings/${l.id}/edit`)} className="gap-2 text-xs cursor-pointer">
                    <Pencil size={14} /> Edit listing
                  </DropdownMenuItem>
                )}
                {l._source === 'db' && l._status === 'public' && (
                  <DropdownMenuItem onClick={() => window.open(`/property/${l.id}`, '_blank')} className="gap-2 text-xs cursor-pointer">
                    <ExternalLink size={14} /> View public page
                  </DropdownMenuItem>
                )}
                {l._source === 'db' && (
                  <DropdownMenuItem onClick={() => navigate(`/dashboard/listings/${l.id}`)} className="gap-2 text-xs cursor-pointer">
                    <Eye size={14} /> Manage
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onSendReport(l)} className="gap-2 text-xs cursor-pointer">
                  <FileBarChart2 size={14} /> Send vendor report
                </DropdownMenuItem>
                {l._status === 'pending' && (
                  <DropdownMenuItem onClick={() => onPublish(l)} disabled={actionLoading === l.id} className="gap-2 text-xs cursor-pointer">
                    <Zap size={14} /> Publish listing
                  </DropdownMenuItem>
                )}
                {l._status !== 'sold' && l._status !== 'leased' && (
                  <DropdownMenuItem onClick={() => onMarkSold(l)} disabled={actionLoading === l.id} className="gap-2 text-xs cursor-pointer">
                    <CheckCircle2 size={14} /> Mark {isRental ? 'leased' : 'sold'}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="text-[12px] text-[#6a6a6a] font-medium mt-1 truncate">{l.suburb}{l.state ? `, ${l.state}` : ''}</p>
        <p className="text-[22px] font-extrabold text-[#0a0f1e] tabular-nums mt-3">{l.price_formatted}</p>

        {/* Meta row */}
        <div className="flex items-center gap-4 mt-3 text-[12px] text-[#6a6a6a] font-medium">
          <span className="inline-flex items-center gap-1"><Ico icon="solar:bed-linear" size={14} />{l.beds ?? 0}</span>
          <span className="inline-flex items-center gap-1"><Ico icon="solar:bath-linear" size={14} />{l.baths ?? 0}</span>
          <span className="inline-flex items-center gap-1"><Ico icon="solar:car-linear" size={14} />{l.parking ?? 0}</span>
          <span className="inline-flex items-center gap-1 ml-auto"><Ico icon="solar:eye-linear" size={14} />{views}</span>
        </div>

        {/* Inline status menu (preserves existing status-change + delete mutation) */}
        {l._source === 'db' && (
          <div className="mt-4" onClick={(e) => e.stopPropagation()}>
            <StatusMenu
              listing={{ id: l.id, status: l._status, listing_type: l.listing_type }}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          </div>
        )}

        {/* Bottom action row */}
        <div className="mt-4 pt-4 border-t border-[#F3F4F6] flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#6a6a6a]">
            {enquiries} {enquiries === 1 ? 'enquiry' : 'enquiries'} · {views} {views === 1 ? 'view' : 'views'}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/listings/${l.id}?tab=marketing`); }}
            className="text-[13px] font-bold text-[#2563EB] hover:underline"
          >
            Boost →
          </button>
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
}) => {
  const items = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'whisper', label: 'Whisper' },
    { key: 'coming-soon', label: 'Coming Soon' },
    { key: 'public', label: 'Public' },
    { key: 'sold', label: 'Sold' },
  ];
  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      {items.map((t) => {
        const active = activeTab === t.key;
        const count = t.key !== 'all' ? counts[t.key] : undefined;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={
              active
                ? 'px-4 py-2 rounded-full text-sm font-semibold bg-[#2563EB] text-white transition-all'
                : 'px-4 py-2 rounded-full text-sm font-medium text-[#374151] hover:bg-[#E5E7EB] transition-all'
            }
            style={active ? undefined : { background: '#F3F4F6' }}
          >
            {t.label}
            {count ? <span className="ml-1.5 opacity-70">· {count}</span> : null}
          </button>
        );
      })}
    </div>
  );
};

const ARCHIVED_STATUSES = new Set(['sold', 'leased']);

const ListingsPage = () => {
  usePageTitle('My Listings');
  const navigate = useNavigate();
  const sub = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialView: 'list' | 'pipeline' =
    searchParams.get('view') === 'pipeline'
      ? 'pipeline'
      : (typeof window !== 'undefined' && window.localStorage.getItem('listings_view_preference') === 'pipeline')
        ? 'pipeline'
        : 'list';
  const [view, setView] = useState<'list' | 'pipeline'>(initialView);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('listings_view_preference', view);
    }
    const current = searchParams.get('view');
    if (view === 'pipeline' && current !== 'pipeline') {
      setSearchParams((p) => { p.set('view', 'pipeline'); return p; }, { replace: true });
    } else if (view === 'list' && current === 'pipeline') {
      setSearchParams((p) => { p.delete('view'); return p; }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const { agent } = useCurrentAgent();
  const [listingMode, setListingMode] = useState<'sale' | 'rent'>('sale');
  const [saleStatusTab, setSaleStatusTab] = useState('all');
  const [rentStatusTab, setRentStatusTab] = useState('all');
  const [lifecycleTab, setLifecycleTab] = useState<'active' | 'archived'>('active');
  const { listings, loading, isMockData, refetch } = useAgentListings();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reportModal, setReportModal] = useState<{ url: string; address: string; token: string; propertyId: string; agentId: string } | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<ListingStatsMaps>({ views: {}, enquiries: {}, matches: {} });

  useEffect(() => {
    if (!agent?.id) return;
    let cancelled = false;
    (async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
      const [enqRes, viewRes, matchRes] = await Promise.all([
        supabase.from('leads').select('property_id').eq('agent_id', agent.id),
        supabase.from('lead_events').select('property_id').eq('event_type', 'view').gte('created_at', thirtyDaysAgo),
        supabase.from('listing_buyer_matches').select('listing_id').eq('agent_id', agent.id),
      ]);
      if (cancelled) return;
      const buildMap = (rows: any[] | null, key: string) =>
        (rows ?? []).reduce<Record<string, number>>((acc, row) => {
          const id = row?.[key];
          if (id) acc[id] = (acc[id] ?? 0) + 1;
          return acc;
        }, {});
      setStats({
        enquiries: buildMap(enqRes.data as any[], 'property_id'),
        views: buildMap(viewRes.data as any[], 'property_id'),
        matches: buildMap(matchRes.data as any[], 'listing_id'),
      });
    })();
    return () => { cancelled = true; };
  }, [agent?.id, listings.length]);

  const handleStatusChange = (id: string, status: string) => {
    setStatusOverrides((prev) => ({ ...prev, [id]: status }));
  };
  const handleDelete = (id: string) => {
    setDeletedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleSendReport = async (l: AgentListing) => {
    if (l._source !== 'db') {
      toast.success('Demo listing — Create a real listing first.');
      return;
    }
    if (!agent?.id) {
      toast.error('Agent profile not loaded');
      return;
    }
    setActionLoading(l.id);
    try {
      let token: string | null = null;

      // Try the RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'generate_vendor_report_token' as any,
        { p_property_id: l.id, p_agent_id: agent.id } as any,
      );
      if (!rpcError && rpcData) {
        token = typeof rpcData === 'string' ? rpcData : (rpcData as any)?.token ?? null;
      }

      // Fallback: insert directly
      if (!token) {
        const newToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: insertData, error: insertError } = await supabase
          .from('vendor_report_tokens' as any)
          .insert({
            property_id: l.id,
            agent_id: agent.id,
            token: newToken,
            expires_at: expiresAt,
          } as any)
          .select('token')
          .maybeSingle();
        if (insertError) throw insertError;
        token = (insertData as any)?.token ?? newToken;
      }

      const url = `${window.location.origin}/vendor-report/${token}`;
      setReportModal({ url, address: l.address, token: token!, propertyId: l.id, agentId: agent.id });
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate report link');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async (l: AgentListing) => {
    if (l._source !== 'db') { toast.success('Demo listing — Create a real listing first.'); return; }
    setActionLoading(l.id);
    const { error } = await supabase.from('properties').update({ status: 'public', is_active: true } as any).eq('id', l.id);
    if (error) { toast.error('Failed to publish'); }
    else {
      toast.success('Your listing is now live on ListHQ!');
      // Non-blocking: trigger translations for the newly published listing
      supabase.functions.invoke('generate-translations', {
        body: { mode: 'full_listing', listing_id: l.id },
      }).catch((err) => console.warn('Translation trigger failed (non-fatal):', err));
      refetch();
    }
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

  const withStatus = listings
    .filter((l) => !deletedIds.has(l.id))
    .map((l) => {
      const overridden = statusOverrides[l.id];
      const merged = overridden ? { ...l, status: overridden } : l;
      return { ...merged, _status: overridden ?? getListingStatus(l) };
    });

  const activeWithStatus = withStatus.filter((l) => !ARCHIVED_STATUSES.has(l._status));
  const archivedWithStatus = withStatus.filter((l) => ARCHIVED_STATUSES.has(l._status));
  const lifecycleListings = lifecycleTab === 'active' ? activeWithStatus : archivedWithStatus;

  const salesListings = lifecycleListings.filter(l => l.listing_type !== 'rent');
  const rentalListings = lifecycleListings.filter(l => l.listing_type === 'rent');

  const activeStatusTab = listingMode === 'sale' ? saleStatusTab : rentStatusTab;
  const setActiveStatusTab = listingMode === 'sale' ? setSaleStatusTab : setRentStatusTab;
  const activeListings = listingMode === 'sale' ? salesListings : rentalListings;
  const filtered = activeStatusTab === 'all' ? activeListings : activeListings.filter(l => l._status === activeStatusTab);

  const counts: Record<string, number> = {};
  activeListings.forEach(l => { counts[l._status] = (counts[l._status] || 0) + 1; });

  const viewToggle = (
    <div className="flex items-center bg-white rounded-[10px] p-0.5" style={{ border: '1px solid #E5E7EB' }} role="tablist" aria-label="Listings view">
      <button
        type="button"
        role="tab"
        aria-selected={view === 'list'}
        onClick={() => setView('list')}
        className={
          view === 'list'
            ? 'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#EFF6FF] text-[#2563EB] text-xs font-medium transition-all'
            : 'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[#6B7280] hover:text-[#374151] text-xs font-medium transition-all'
        }
      >
        <ListIcon size={14} /> List
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === 'pipeline'}
        onClick={() => setView('pipeline')}
        className={
          view === 'pipeline'
            ? 'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#EFF6FF] text-[#2563EB] text-xs font-medium transition-all'
            : 'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[#6B7280] hover:text-[#374151] text-xs font-medium transition-all'
        }
      >
        <Kanban size={14} /> Pipeline
      </button>
    </div>
  );

  const portfolioHeader = (
    <div className="flex items-start justify-between gap-4 flex-wrap p-4 sm:p-6 pb-0 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-[#0a0f1e] tracking-tight">Portfolio</h1>
        <p className="text-sm font-light text-[#6B7280] mt-1 mb-8">
          {listings.length} {listings.length === 1 ? 'property' : 'properties'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {viewToggle}
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/')}
          className="gap-1.5 text-xs"
        >
          <Globe size={14} /> Browse Market
        </Button>
        <button
          type="button"
          onClick={() => navigate('/pocket-listing')}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-[10px] px-4 py-2.5 text-sm flex items-center gap-2 transition-all"
        >
          <Plus size={16} /> Add to Portfolio
        </button>
      </div>
    </div>
  );

  if (view === 'pipeline') {
    return (
      <div>
        {portfolioHeader}
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading pipeline…</div>}>
          {/* PipelinePage renders its own DashboardHeader; we hide it via wrapper */}
          <div className="[&>div>:first-child]:hidden">
            <PipelinePage />
          </div>
        </Suspense>
      </div>
    );
  }

  return (
    <>
      <div>
        {portfolioHeader}

        <div className="p-4 sm:p-6 max-w-5xl">
          {isMockData && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
              <Info size={14} className="text-primary shrink-0" />
              <span>Showing demo listings. Create your first listing to see real data here.</span>
            </div>
          )}

          {/* Solo plan listing-cap nudge — non-blocking. Triggers at >= 3 active listings on Solo,
              and stays visible until the agent upgrades. Uses the live plan limit from useSubscription. */}
          {sub.plan === 'solo' && activeListings.length >= 3 && sub.listingLimit !== Infinity && (
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700">
              <Info size={14} className="shrink-0" />
              <p className="text-xs flex-1">
                You're using <strong>{activeListings.length}/{sub.listingLimit}</strong> listings on your Solo plan. Upgrade to Pro for unlimited listings.
              </p>
              <Button size="sm" variant="default" onClick={() => navigate('/dashboard/billing')} className="text-xs h-7">
                Upgrade
              </Button>
            </div>
          )}

          {/* Active / Archived lifecycle tabs */}
          <div className="inline-flex bg-muted rounded-lg p-1 mb-4 gap-1">
            {(['active', 'archived'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setLifecycleTab(tab)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  lifecycleTab === tab
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab === 'active'
                  ? `Active (${activeWithStatus.length})`
                  : `Sold / Archived (${archivedWithStatus.length})`}
              </button>
            ))}
          </div>

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
            <ListingsSkeleton />
          ) : filtered.length === 0 ? (
            lifecycleTab === 'archived' ? (
              <EmptyState
                icon="solar:check-circle-linear"
                title="No archived listings"
                body="Listings marked as Sold or Leased will appear here."
              />
            ) : withStatus.length === 0 ? (
              <EmptyState
                icon="solar:buildings-linear"
                title="Your portfolio is empty"
                body="Add your first property to start building your portfolio. ListHQ will translate it into 6 languages automatically."
                ctaLabel="Add to Portfolio"
                onCtaClick={() => navigate('/pocket-listing')}
              />
            ) : (
              <EmptyState
                icon="solar:magnifer-linear"
                title="No listings match"
                body="Try adjusting your filters or search terms."
                ctaLabel="Clear filters"
                onCtaClick={() => { setSaleStatusTab('all'); setRentStatusTab('all'); }}
              />
            )
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
                  onSendReport={handleSendReport}
                  navigate={navigate}
                  isRental={listingMode === 'rent'}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  stats={stats}
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

      <VendorReportDialog
        open={!!reportModal}
        onClose={() => setReportModal(null)}
        url={reportModal?.url ?? ''}
        address={reportModal?.address ?? ''}
        token={reportModal?.token ?? ''}
        propertyId={reportModal?.propertyId ?? ''}
        agentId={reportModal?.agentId ?? ''}
      />
    </>
  );
};

const VendorReportDialog = ({
  open, onClose, url, address, token, propertyId, agentId,
}: { open: boolean; onClose: () => void; url: string; address: string; token: string; propertyId: string; agentId: string }) => {
  const [vendorEmail, setVendorEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Report link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleSendEmail = async () => {
    if (!vendorEmail.trim() || !vendorEmail.includes('@')) {
      toast.error('Enter a valid email address');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-vendor-report-link', {
        body: { token, vendor_email: vendorEmail.trim(), property_id: propertyId },
      });
      if (error) throw error;
      toast.success(`Report link sent to ${vendorEmail.trim()}`);
      setVendorEmail('');
    } catch {
      toast.error('Could not send email');
    } finally {
      setSending(false);
    }
  };

  // Suppress unused agentId warning — reserved for future audit logging
  void agentId;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileBarChart2 size={18} className="text-primary" />
            Send vendor report
          </DialogTitle>
          <DialogDescription className="text-xs">
            Share this private link with your vendor for {address}. Valid for 30 days.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input readOnly value={url} className="text-xs font-mono" onFocus={(e) => e.currentTarget.select()} />
          <Button onClick={handleCopy} variant="outline" className="w-full gap-1.5 text-xs">
            <Copy size={14} /> Copy link
          </Button>
          <div className="pt-2 border-t space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Send link by email</label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="vendor@example.com"
                value={vendorEmail}
                onChange={(e) => setVendorEmail(e.target.value)}
                className="text-xs"
                disabled={sending}
              />
              <Button onClick={handleSendEmail} disabled={sending} className="gap-1.5 text-xs">
                <Mail size={14} /> {sending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


export default ListingsPage;
