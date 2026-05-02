import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  Search,
  ExternalLink,
  CheckCircle2,
  Archive,
  Trash2,
  ImageOff,
  X,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AgentRef {
  name: string | null;
  email: string | null;
  agency: string | null;
}

interface ListingRow {
  id: string;
  address: string | null;
  suburb: string | null;
  state: string | null;
  property_type: string | null;
  listing_type: string | null;
  status: string | null;
  is_active: boolean | null;
  price: number | null;
  views: number | null;
  images: string[] | null;
  created_at: string;
  updated_at: string | null;
  agents: AgentRef | null;
}

type StatusKey = 'all' | 'live' | 'pending' | 'draft' | 'archived' | 'rejected' | 'no_photos';
type TypeKey = 'all' | 'sale' | 'rent';
type SortKey = 'newest' | 'oldest' | 'most_views' | 'least_views' | 'price_high' | 'price_low';

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];

const fmtPrice = (n: number | null) =>
  n == null
    ? '–'
    : new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);

function getDerivedStatus(r: ListingRow): StatusKey {
  if (r.status === 'archived') return 'archived';
  if (r.status === 'rejected') return 'rejected';
  if (r.status === 'draft') return 'draft';
  if (r.is_active && r.status === 'public') return 'live';
  return 'pending';
}

function StatusBadge({ s }: { s: StatusKey }) {
  const map: Record<string, { label: string; cls: string }> = {
    live: { label: 'Live', cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' },
    pending: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-600 border-amber-500/20' },
    draft: { label: 'Draft', cls: 'bg-secondary text-muted-foreground border-border' },
    rejected: { label: 'Rejected', cls: 'bg-red-500/15 text-red-600 border-red-500/20' },
    archived: { label: 'Archived', cls: 'bg-muted text-muted-foreground border-border' },
    no_photos: { label: 'No photos', cls: 'bg-secondary text-muted-foreground border-border' },
    all: { label: 'All', cls: '' },
  };
  const v = map[s] || map.draft;
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${v.cls}`}>
      {v.label}
    </span>
  );
}

export default function AdminListingsPage() {
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all');
  const [typeFilter, setTypeFilter] = useState<TypeKey>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<
    | { type: 'delete' | 'archive' | 'bulk_delete' | 'bulk_archive' | 'bulk_approve'; row?: ListingRow }
    | null
  >(null);

  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select(
        'id, address, suburb, state, property_type, listing_type, status, is_active, price, views, images, created_at, updated_at, agents(name, email, agency)',
      )
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      toast.error(error.message);
      setRows([]);
    } else {
      setRows((data as unknown as ListingRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    let live = 0, pending = 0, draft = 0, archived = 0, noPhotos = 0;
    for (const r of rows) {
      const s = getDerivedStatus(r);
      if (s === 'live') live++;
      else if (s === 'pending') pending++;
      else if (s === 'draft') draft++;
      else if (s === 'archived') archived++;
      if (!r.images || r.images.length === 0) noPhotos++;
    }
    return { total, live, pending, draft, archived, noPhotos };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (typeFilter !== 'all' && r.listing_type !== typeFilter) return false;
      if (stateFilter !== 'all' && r.state !== stateFilter) return false;

      const ds = getDerivedStatus(r);
      if (statusFilter === 'no_photos') {
        if (r.images && r.images.length > 0) return false;
      } else if (statusFilter === 'rejected') {
        if (r.status !== 'rejected') return false;
      } else if (statusFilter !== 'all') {
        if (ds !== statusFilter) return false;
      }

      if (q) {
        const hay = `${r.address ?? ''} ${r.suburb ?? ''} ${r.agents?.name ?? ''} ${r.agents?.email ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'most_views':
          return (b.views ?? 0) - (a.views ?? 0);
        case 'least_views':
          return (a.views ?? 0) - (b.views ?? 0);
        case 'price_high':
          return (b.price ?? 0) - (a.price ?? 0);
        case 'price_low':
          return (a.price ?? 0) - (b.price ?? 0);
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return list;
  }, [rows, search, statusFilter, typeFilter, stateFilter, sort]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setStateFilter('all');
    setSort('newest');
  };

  const approve = async (id: string) => {
    setBusy(id);
    const { error } = await supabase
      .from('properties')
      .update({ is_active: true, status: 'public' })
      .eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Listing approved');
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: true, status: 'public' } : r)));
    }
    setBusy(null);
  };

  const archive = async (id: string) => {
    setBusy(id);
    const { error } = await supabase
      .from('properties')
      .update({ is_active: false, status: 'archived' })
      .eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Listing archived');
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: false, status: 'archived' } : r)));
    }
    setBusy(null);
  };

  const remove = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Listing deleted');
      setRows((prev) => prev.filter((r) => r.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
    setBusy(null);
  };

  const bulkApprove = async () => {
    const ids = Array.from(selected);
    setBusy('bulk');
    const { error } = await supabase
      .from('properties')
      .update({ is_active: true, status: 'public' })
      .in('id', ids);
    if (error) toast.error(error.message);
    else {
      toast.success(`${ids.length} listing${ids.length === 1 ? '' : 's'} approved`);
      setRows((prev) => prev.map((r) => (selected.has(r.id) ? { ...r, is_active: true, status: 'public' } : r)));
      setSelected(new Set());
    }
    setBusy(null);
  };

  const bulkArchive = async () => {
    const ids = Array.from(selected);
    setBusy('bulk');
    const { error } = await supabase
      .from('properties')
      .update({ is_active: false, status: 'archived' })
      .in('id', ids);
    if (error) toast.error(error.message);
    else {
      toast.success(`${ids.length} listing${ids.length === 1 ? '' : 's'} archived`);
      setRows((prev) => prev.map((r) => (selected.has(r.id) ? { ...r, is_active: false, status: 'archived' } : r)));
      setSelected(new Set());
    }
    setBusy(null);
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    setBusy('bulk');
    const { error } = await supabase.from('properties').delete().in('id', ids);
    if (error) toast.error(error.message);
    else {
      toast.success(`${ids.length} listing${ids.length === 1 ? '' : 's'} deleted`);
      setRows((prev) => prev.filter((r) => !selected.has(r.id)));
      setSelected(new Set());
    }
    setBusy(null);
  };

  const KPI = ({ label, value, active, onClick }: { label: string; value: number; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-left transition-colors ${
        active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent'
      }`}
    >
      <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{label}</p>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Listings</h1>
          <p className="text-sm text-muted-foreground">Bird's-eye view of every property on the platform.</p>
        </div>
      </div>

      {/* KPI chips */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <KPI label="Total" value={stats.total} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        <KPI label="Live" value={stats.live} active={statusFilter === 'live'} onClick={() => setStatusFilter('live')} />
        <KPI label="Pending" value={stats.pending} active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')} />
        <KPI label="Draft" value={stats.draft} active={statusFilter === 'draft'} onClick={() => setStatusFilter('draft')} />
        <KPI label="Archived" value={stats.archived} active={statusFilter === 'archived'} onClick={() => setStatusFilter('archived')} />
        <KPI label="No photos" value={stats.noPhotos} active={statusFilter === 'no_photos'} onClick={() => setStatusFilter('no_photos')} />
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-border bg-card p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search address, suburb, agent…"
            className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusKey)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
        >
          <option value="all">All statuses</option>
          <option value="live">Live</option>
          <option value="pending">Pending</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
          <option value="rejected">Rejected</option>
          <option value="no_photos">No photos</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeKey)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
        >
          <option value="all">All types</option>
          <option value="sale">For Sale</option>
          <option value="rent">For Rent</option>
        </select>

        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
        >
          <option value="all">All states</option>
          {STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="most_views">Most views</option>
          <option value="least_views">Least views</option>
          <option value="price_high">Price high → low</option>
          <option value="price_low">Price low → high</option>
        </select>

        {(search || statusFilter !== 'all' || typeFilter !== 'all' || stateFilter !== 'all' || sort !== 'newest') && (
          <button
            onClick={clearFilters}
            className="text-xs px-2.5 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-1"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={busy === 'bulk'}
              onClick={() => setConfirm({ type: 'bulk_approve' })}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
            >
              Bulk Approve
            </button>
            <button
              disabled={busy === 'bulk'}
              onClick={() => setConfirm({ type: 'bulk_archive' })}
              className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              Bulk Archive
            </button>
            <button
              disabled={busy === 'bulk'}
              onClick={() => setConfirm({ type: 'bulk_delete' })}
              className="text-xs px-3 py-1.5 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors disabled:opacity-50"
            >
              Bulk Delete
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading listings…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">No listings match your filters.</p>
            <button
              onClick={clearFilters}
              className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-accent transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-3 w-8">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Listing</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Agent</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Type</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Price</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Views</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Created</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const ds = r.status === 'rejected' ? 'rejected' : getDerivedStatus(r);
                  const thumb = r.images && r.images.length > 0 ? r.images[0] : null;
                  const isPending = !r.is_active && r.status !== 'archived' && r.status !== 'rejected';
                  const rowBusy = busy === r.id;
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                      <td className="p-3 align-middle">
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggleOne(r.id)}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="p-3 align-middle">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt="Listing photo"
                              loading="lazy"
                              className="w-10 h-10 rounded-lg object-cover bg-muted shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <ImageOff size={14} className="text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <a
                              href={`/property/${r.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-foreground font-medium truncate block hover:underline"
                            >
                              {r.address || '(no address)'}
                            </a>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {[r.suburb, r.state].filter(Boolean).join(', ')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 align-middle">
                        <p className="text-foreground truncate max-w-[160px]">
                          {r.agents?.name || r.agents?.email || '—'}
                        </p>
                        {r.agents?.agency && (
                          <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{r.agents.agency}</p>
                        )}
                      </td>
                      <td className="p-3 align-middle">
                        <Badge variant="secondary" className="capitalize text-[11px]">
                          {r.listing_type === 'rent' ? 'Rent' : r.listing_type === 'sale' ? 'Sale' : '—'}
                        </Badge>
                      </td>
                      <td className="p-3 align-middle">
                        <StatusBadge s={ds} />
                      </td>
                      <td className="p-3 align-middle text-foreground">{fmtPrice(r.price)}</td>
                      <td className="p-3 align-middle text-muted-foreground">{r.views ?? 0}</td>
                      <td className="p-3 align-middle text-muted-foreground text-xs">
                        {format(parseISO(r.created_at), 'dd MMM yyyy')}
                      </td>
                      <td className="p-3 align-middle">
                        <div className="flex items-center justify-end gap-0.5">
                          <a
                            href={`/property/${r.id}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Open listing"
                            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink size={14} />
                          </a>
                          {isPending && (
                            <button
                              disabled={rowBusy}
                              onClick={() => approve(r.id)}
                              title="Approve"
                              className="p-1.5 rounded-lg hover:bg-emerald-500/15 transition-colors text-muted-foreground hover:text-emerald-600 disabled:opacity-50"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          {r.status !== 'archived' && (
                            <button
                              disabled={rowBusy}
                              onClick={() => setConfirm({ type: 'archive', row: r })}
                              title="Archive"
                              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                            >
                              <Archive size={14} />
                            </button>
                          )}
                          <button
                            disabled={rowBusy}
                            onClick={() => setConfirm({ type: 'delete', row: r })}
                            title="Delete"
                            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          {confirm && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {confirm.type === 'delete' && 'Delete listing?'}
                  {confirm.type === 'archive' && 'Archive listing?'}
                  {confirm.type === 'bulk_delete' && `Delete ${selected.size} listings?`}
                  {confirm.type === 'bulk_archive' && `Archive ${selected.size} listings?`}
                  {confirm.type === 'bulk_approve' && `Approve ${selected.size} listings?`}
                </DialogTitle>
                <DialogDescription>
                  {confirm.type === 'delete' &&
                    `Permanently delete "${confirm.row?.address ?? 'this listing'}"? This cannot be undone.`}
                  {confirm.type === 'archive' && 'Archive this listing? It will be hidden from search.'}
                  {confirm.type === 'bulk_delete' && 'These listings will be permanently deleted. This cannot be undone.'}
                  {confirm.type === 'bulk_archive' && 'These listings will be hidden from search.'}
                  {confirm.type === 'bulk_approve' && 'These listings will be set to Live and visible publicly.'}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  variant={
                    confirm.type === 'delete' || confirm.type === 'bulk_delete' ? 'destructive' : 'default'
                  }
                  onClick={async () => {
                    const c = confirm;
                    setConfirm(null);
                    if (c.type === 'delete' && c.row) await remove(c.row.id);
                    else if (c.type === 'archive' && c.row) await archive(c.row.id);
                    else if (c.type === 'bulk_delete') await bulkDelete();
                    else if (c.type === 'bulk_archive') await bulkArchive();
                    else if (c.type === 'bulk_approve') await bulkApprove();
                  }}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
