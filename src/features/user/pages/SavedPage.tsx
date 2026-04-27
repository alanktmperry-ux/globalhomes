import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Loader2, Bell, FileText, Search, Trash2, ArrowRight, TrendingDown } from 'lucide-react';
import { BottomNav } from '@/shared/components/layout/BottomNav';
import { PropertyCard } from '@/features/properties/components/PropertyCard';
import { PropertyDrawer } from '@/features/properties/components/PropertyDrawer';
import { useI18n } from '@/shared/lib/i18n';
import { useSavedProperties } from '@/features/properties/hooks/useSavedProperties';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Property } from '@/shared/lib/types';
import { toast } from 'sonner';

type TabKey = 'saved' | 'searches' | 'applications';

const TABS: { value: TabKey; label: string; icon: React.ReactNode }[] = [
  { value: 'saved', label: 'Saved', icon: <Heart className="w-4 h-4" /> },
  { value: 'searches', label: 'Searches', icon: <Bell className="w-4 h-4" /> },
  { value: 'applications', label: 'Applications', icon: <FileText className="w-4 h-4" /> },
];

const FREQ_LABEL: Record<string, string> = {
  instant: 'Instant',
  daily: 'Daily',
  weekly: 'Weekly',
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Under Review', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  shortlisted: { label: 'Shortlisted', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Not Successful', cls: 'bg-red-100 text-red-800 border-red-200' },
  withdrawn: { label: 'Withdrawn', cls: 'bg-gray-100 text-gray-800 border-gray-200' },
};

const SavedPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as TabKey) || 'saved';
  const setTab = (next: TabKey) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('tab', next);
    setSearchParams(sp, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="font-display text-xl font-bold text-foreground">{t('saved.title')}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-2xl mb-4">
          {TABS.map((tb) => (
            <button
              key={tb.value}
              onClick={() => setTab(tb.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition ${
                tab === tb.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tb.icon}
              {tb.label}
            </button>
          ))}
        </div>

        {tab === 'saved' && <SavedTab />}
        {tab === 'searches' && <SearchesTab userId={user?.id} />}
        {tab === 'applications' && <ApplicationsTab userId={user?.id} />}
      </main>

      <BottomNav />
    </div>
  );
};

/* ─────────── Saved Properties Tab ─────────── */
function SavedTab() {
  const { savedIds, isSaved, toggleSaved } = useSavedProperties();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const idsKey = useMemo(() => Array.from(savedIds).sort().join(','), [savedIds]);

  useEffect(() => {
    let cancelled = false;
    const ids = Array.from(savedIds);
    if (ids.length === 0) {
      setProperties([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('properties')
      .select(
        'id, title, address, suburb, state, price, price_formatted, property_type, beds, baths, parking, images, image_url, slug, listing_type, price_changed_at',
      )
      .in('id', ids)
      .eq('is_active', true)
      .then(({ data }) => {
        if (cancelled) return;
        setProperties(data ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <EmptyState
        icon={<Heart size={40} strokeWidth={1.2} className="mb-3 text-border" />}
        title="No saved properties yet"
        description="Tap the heart on any listing to save it for later"
        actionLabel="Browse properties"
        onAction={() => (window.location.href = '/')}
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        {properties.map((p, i) => {
          const priceDropped =
            p.price_changed_at && new Date(p.price_changed_at).getTime() > sevenDaysAgo;
          return (
            <div key={p.id} className="relative">
              {priceDropped && (
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-green-600 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow">
                  <TrendingDown className="w-3 h-3" />
                  Price drop
                </div>
              )}
              <PropertyCard
                property={p as Property}
                onSelect={setSelectedProperty}
                isSaved={isSaved(p.id)}
                onToggleSave={toggleSaved}
                index={i}
              />
            </div>
          );
        })}
      </div>

      <PropertyDrawer
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
        isSaved={selectedProperty ? isSaved(selectedProperty.id) : false}
        onToggleSave={toggleSaved}
      />
    </>
  );
}

/* ─────────── Saved Searches Tab ─────────── */
function SearchesTab({ userId }: { userId?: string }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    supabase
      .from('saved_searches')
      .select('id, search_query, notify_frequency, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });
  }, [userId]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('saved_searches').delete().eq('id', id);
    if (error) return toast.error('Failed to delete');
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success('Search deleted');
  };

  const buildSearchUrl = (query: any): string => {
    if (!query) return '/';
    if (typeof query === 'string') return `/?location=${encodeURIComponent(query)}`;
    const params = new URLSearchParams();
    if (query.location) params.set('location', String(query.location));
    if (query.suburb) params.set('location', String(query.suburb));
    if (query.q) params.set('q', String(query.q));
    return `/?${params.toString()}`;
  };

  const renderQuery = (query: any) => {
    if (!query) return 'All properties';
    if (typeof query === 'string') return query;
    const parts: string[] = [];
    if (query.location || query.suburb) parts.push(String(query.location || query.suburb));
    if (query.beds) parts.push(`${query.beds}+ beds`);
    if (query.maxPrice) parts.push(`Up to $${Number(query.maxPrice).toLocaleString()}`);
    if (query.propertyType) parts.push(String(query.propertyType));
    return parts.length ? parts.join(' · ') : 'Saved search';
  };

  if (!userId) {
    return (
      <EmptyState
        icon={<Bell size={40} strokeWidth={1.2} className="mb-3 text-border" />}
        title="Sign in to view saved searches"
        description="Save searches to get alerts when new properties match"
        actionLabel="Sign in"
        onAction={() => navigate('/auth')}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Bell size={40} strokeWidth={1.2} className="mb-3 text-border" />}
        title="No saved searches yet"
        description="Search for properties and click Save Search"
        actionLabel="Search properties"
        onAction={() => navigate('/')}
      />
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div
          key={r.id}
          className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {renderQuery(r.search_query)}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  <Bell className="w-3 h-3" />
                  {FREQ_LABEL[r.notify_frequency] || 'Instant'}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleDelete(r.id)}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition"
              aria-label="Delete saved search"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => navigate(buildSearchUrl(r.search_query))}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:underline self-start"
          >
            <Search className="w-3.5 h-3.5" />
            Search again
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─────────── Applications Tab ─────────── */
function ApplicationsTab({ userId }: { userId?: string }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    supabase
      .from('rental_applications')
      .select(
        'id, status, created_at, reference_number, properties(address, suburb, price_formatted, images)',
      )
      .eq('applicant_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setRows((data as any[]) ?? []);
        setLoading(false);
      });
  }, [userId]);

  if (!userId) {
    return (
      <EmptyState
        icon={<FileText size={40} strokeWidth={1.2} className="mb-3 text-border" />}
        title="Sign in to view applications"
        description="Track your rental applications in one place"
        actionLabel="Sign in"
        onAction={() => navigate('/auth')}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<FileText size={40} strokeWidth={1.2} className="mb-3 text-border" />}
        title="No rental applications yet"
        description="Apply for a rental property to see it tracked here"
        actionLabel="Browse rentals"
        onAction={() => navigate('/?listing_type=rent')}
      />
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((app) => {
        const prop = app.properties;
        const status = STATUS_MAP[app.status] || {
          label: app.status,
          cls: 'bg-gray-100 text-gray-800 border-gray-200',
        };
        const img = prop?.images?.[0];
        return (
          <div
            key={app.id}
            className="rounded-2xl border border-border bg-card p-3 flex gap-3 items-start"
          >
            {img ? (
              <img
                src={img}
                alt=""
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-muted flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {prop?.address || 'Property'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {prop?.suburb} {prop?.price_formatted ? `· ${prop.price_formatted}` : ''}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.cls}`}
                >
                  {status.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(app.created_at).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                {app.reference_number && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    #{app.reference_number}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────── Empty State ─────────── */
function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      {icon}
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground mb-6 text-center max-w-[220px]">
        {description}
      </p>
      <button
        onClick={onAction}
        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        {actionLabel}
      </button>
    </div>
  );
}

export default SavedPage;
