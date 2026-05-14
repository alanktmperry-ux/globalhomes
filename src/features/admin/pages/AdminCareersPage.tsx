import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Search, Loader2, X, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { CAREERS_ROLES } from '@/features/careers/data/roles';
import CareersApplicationDetail from '../components/CareersApplicationDetail';
import type { Database } from '@/integrations/supabase/types';

type Row = Database['public']['Tables']['careers_applications']['Row'];

type StatusKey = 'all' | 'new' | 'reviewing' | 'interview' | 'rejected' | 'hired';
type SortKey = 'created_at' | 'full_name' | 'status';

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-500/15 text-blue-600 border-blue-500/20',
  reviewing: 'bg-amber-500/15 text-amber-600 border-amber-500/20',
  interview: 'bg-purple-500/15 text-purple-600 border-purple-500/20',
  rejected: 'bg-muted text-muted-foreground border-border',
  hired: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20',
};

function StatusBadge({ s }: { s: string }) {
  const cls = STATUS_STYLES[s] ?? STATUS_STYLES.new;
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${cls}`}>
      {s}
    </span>
  );
}

const roleTitle = (id: string) => CAREERS_ROLES.find((r) => r.id === id)?.title ?? id;

export default function AdminCareersPage() {
  const navigate = useNavigate();
  const { id: detailIdParam } = useParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('created_at');

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('careers_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) toast.error(error.message);
    else setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    let list = rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (roleFilter !== 'all' && r.role_applied !== roleFilter) return false;
      if (q) {
        const hay = `${r.full_name} ${r.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'full_name':
          return a.full_name.localeCompare(b.full_name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return list;
  }, [rows, debouncedSearch, statusFilter, roleFilter, sortBy]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = { new: 0, reviewing: 0, interview: 0, rejected: 0, hired: 0 };
    rows.forEach((r) => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
    return counts;
  }, [rows]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setRoleFilter('all');
    setSortBy('created_at');
  };

  const filtersActive = !!debouncedSearch || statusFilter !== 'all' || roleFilter !== 'all' || sortBy !== 'created_at';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Careers Applications
          </h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} total · {stats.new ?? 0} new · {stats.reviewing ?? 0} reviewing · {stats.interview ?? 0} interview · {stats.hired ?? 0} hired
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-border bg-card p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusKey)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="reviewing">Reviewing</option>
          <option value="interview">Interview</option>
          <option value="rejected">Rejected</option>
          <option value="hired">Hired</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
        >
          <option value="all">All roles</option>
          {CAREERS_ROLES.map((r) => (
            <option key={r.id} value={r.id}>{r.title}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
        >
          <option value="created_at">Newest</option>
          <option value="full_name">Name (A–Z)</option>
          <option value="status">Status</option>
        </select>

        {filtersActive && (
          <button
            onClick={clearFilters}
            className="text-xs px-2.5 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-1"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading applications…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Briefcase size={32} className="mx-auto text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">No applications yet</p>
            <p className="text-xs text-muted-foreground">
              Share <a href="/careers" className="text-primary hover:underline">/careers</a> to start receiving them.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">No applications match your filters.</p>
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
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Name</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Role</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Location</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/admin/careers/${r.id}`)}
                    className="border-t border-border cursor-pointer hover:bg-accent/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {format(parseISO(r.created_at), 'd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{r.full_name}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-normal">
                        {roleTitle(r.role_applied)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.location}</td>
                    <td className="px-4 py-3"><StatusBadge s={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CareersApplicationDetail
        applicationId={detailIdParam ?? null}
        onClose={() => navigate('/admin/careers')}
        onUpdated={fetchAll}
      />
    </div>
  );
}
