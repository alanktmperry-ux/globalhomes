import { useMemo } from 'react';
import { Flame, Thermometer, Snowflake, Search, Trash2, Phone, Mail, ArrowUp, ArrowDown, AlarmClock, AlertTriangle, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Contact } from '@/features/agents/hooks/useContacts';
import CommunicationChannelChips from '@/shared/components/CommunicationPreferences/CommunicationChannelChips';
import type { CommPreference } from '@/shared/components/CommunicationPreferences/types';
import type {
  ContactFilters,
  ContactSort,
  ContactColumnKey,
  ContactSortKey,
} from './savedViews/types';

const RANKING_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  hot: { icon: <Flame size={12} />, color: 'bg-destructive/15 text-destructive', label: 'Hot' },
  warm: { icon: <Thermometer size={12} />, color: 'bg-primary/15 text-primary', label: 'Warm' },
  cold: { icon: <Snowflake size={12} />, color: 'bg-muted text-muted-foreground', label: 'Cold' },
};

const TYPE_LABELS: Record<string, string> = {
  buyer: '🏠 Buyer',
  seller: '💰 Seller',
  landlord: '🏢 Landlord',
  tenant: '🔑 Tenant',
  both: '↔️ Both',
};

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}

function shortDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

interface Props {
  contacts: Contact[];
  loading: boolean;
  filters: ContactFilters;
  sort: ContactSort;
  columns: ContactColumnKey[];
  onFiltersChange: (f: ContactFilters) => void;
  onSortChange: (s: ContactSort) => void;
  onSelect: (c: Contact) => void;
  onDelete: (id: string) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

const ContactsList = ({
  contacts, loading, filters, sort, columns,
  onFiltersChange, onSortChange, onSelect, onDelete,
  hasMore, onLoadMore,
}: Props) => {
  const showCol = (k: ContactColumnKey) => columns.includes(k);

  // Derive available tags + sources from current contacts
  const allTags = useMemo(() => {
    const s = new Set<string>();
    contacts.forEach(c => c.tags?.forEach(t => s.add(t)));
    return Array.from(s).sort();
  }, [contacts]);

  const allSources = useMemo(() => {
    const s = new Set<string>();
    contacts.forEach(c => c.source && s.add(c.source));
    return Array.from(s).sort();
  }, [contacts]);

  const filtered = useMemo(() => {
    const list = contacts.filter((c) => {
      const q = filters.search.toLowerCase();
      const matchSearch = !q ||
        c.first_name.toLowerCase().includes(q) ||
        (c.last_name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.mobile || c.phone || '').includes(q) ||
        (c.suburb || '').toLowerCase().includes(q);
      const matchRanking = filters.ranking.length === 0 || filters.ranking.includes(c.ranking);
      const matchType = filters.type.length === 0 || filters.type.includes(c.contact_type);
      const matchSource = filters.source.length === 0 || (c.source && filters.source.includes(c.source));

      let matchTags = true;
      if (filters.tags.ids.length > 0) {
        const ids = filters.tags.ids;
        matchTags = filters.tags.mode === 'AND'
          ? ids.every(t => c.tags?.includes(t))
          : ids.some(t => c.tags?.includes(t));
      }

      let matchNextAction = true;
      if (filters.has_next_action === true) matchNextAction = !!c.next_action_due_at;
      if (filters.has_next_action === false) matchNextAction = !c.next_action_due_at;

      let matchOverdue = true;
      if (filters.next_action_overdue === true) {
        matchOverdue = !!c.next_action_due_at && new Date(c.next_action_due_at).getTime() < Date.now();
      }

      return matchSearch && matchRanking && matchType && matchSource && matchTags && matchNextAction && matchOverdue;
    });

    const dir = sort.dir === 'asc' ? 1 : -1;
    const sortNullsLast = (a: string | null, b: string | null) => {
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      return (new Date(a).getTime() - new Date(b).getTime()) * dir;
    };

    return [...list].sort((a, b) => {
      if (sort.key === 'name') {
        const an = `${a.first_name} ${a.last_name || ''}`.toLowerCase();
        const bn = `${b.first_name} ${b.last_name || ''}`.toLowerCase();
        return an.localeCompare(bn) * dir;
      }
      return sortNullsLast(a[sort.key], b[sort.key]);
    });
  }, [contacts, filters, sort]);

  const toggleSort = (key: ContactSortKey) => {
    if (sort.key === key) {
      onSortChange({ key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ key, dir: key === 'next_action_due_at' ? 'asc' : 'desc' });
    }
  };

  const toggleArrayItem = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  const SortIcon = ({ active }: { active: boolean }) =>
    !active ? null : sort.dir === 'asc' ? <ArrowUp size={10} className="inline ml-1" /> : <ArrowDown size={10} className="inline ml-1" />;

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading contacts...</div>;
  }

  const tagsActive = filters.tags.ids.length > 0;
  const sourceActive = filters.source.length > 0;

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Ranking chips */}
        <div className="flex gap-1">
          {Object.entries(RANKING_CONFIG).map(([key, cfg]) => {
            const active = filters.ranking.includes(key);
            return (
              <Button
                key={key}
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => onFiltersChange({ ...filters, ranking: toggleArrayItem(filters.ranking, key) })}
                className="h-7 px-2 gap-1 text-xs"
              >
                {cfg.icon} {cfg.label}
              </Button>
            );
          })}
        </div>

        {/* Type chips */}
        <div className="flex gap-1">
          {['buyer', 'seller', 'both'].map((t) => {
            const active = filters.type.includes(t);
            return (
              <Button
                key={t}
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => onFiltersChange({ ...filters, type: toggleArrayItem(filters.type, t) })}
                className="h-7 px-2 text-xs capitalize"
              >
                {t}
              </Button>
            );
          })}
        </div>

        {/* Tags filter */}
        {allTags.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant={tagsActive ? 'default' : 'outline'} className="h-7 px-2 text-xs gap-1">
                Tags{tagsActive && ` (${filters.tags.ids.length})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">Tags</span>
                <div className="flex gap-1">
                  {(['AND', 'OR'] as const).map(m => (
                    <Button
                      key={m}
                      size="sm"
                      variant={filters.tags.mode === m ? 'default' : 'outline'}
                      onClick={() => onFiltersChange({ ...filters, tags: { ...filters.tags, mode: m } })}
                      className="h-6 px-2 text-[10px]"
                    >
                      {m === 'AND' ? 'ALL' : 'ANY'}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {allTags.map(tag => {
                  const active = filters.tags.ids.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => onFiltersChange({ ...filters, tags: { ...filters.tags, ids: toggleArrayItem(filters.tags.ids, tag) } })}
                      className={`w-full text-left px-2 py-1 rounded text-xs ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              {tagsActive && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onFiltersChange({ ...filters, tags: { ...filters.tags, ids: [] } })}
                  className="w-full h-6 mt-2 text-[10px]"
                >
                  <X size={10} className="mr-1" /> Clear tags
                </Button>
              )}
            </PopoverContent>
          </Popover>
        )}

        {/* Source filter */}
        {allSources.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant={sourceActive ? 'default' : 'outline'} className="h-7 px-2 text-xs gap-1">
                Source{sourceActive && ` (${filters.source.length})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="max-h-56 overflow-y-auto space-y-1">
                {allSources.map(s => {
                  const active = filters.source.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => onFiltersChange({ ...filters, source: toggleArrayItem(filters.source, s) })}
                      className={`w-full text-left px-2 py-1 rounded text-xs capitalize ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Next action toggles */}
        <Button
          size="sm"
          variant={filters.has_next_action === true ? 'default' : 'outline'}
          onClick={() => onFiltersChange({ ...filters, has_next_action: filters.has_next_action === true ? null : true })}
          className="h-7 px-2 gap-1 text-xs"
          title="Has next action set"
        >
          <AlarmClock size={12} /> Has action
        </Button>
        <Button
          size="sm"
          variant={filters.next_action_overdue === true ? 'destructive' : 'outline'}
          onClick={() => onFiltersChange({ ...filters, next_action_overdue: filters.next_action_overdue === true ? null : true })}
          className="h-7 px-2 gap-1 text-xs"
          title="Next action is overdue"
        >
          <AlertTriangle size={12} /> Overdue
        </Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {contacts.length === 0 ? 'No contacts yet. Add your first contact!' : 'No contacts match your filters.'}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  {showCol('contact') && (
                    <th className="text-left p-3">
                      <button onClick={() => toggleSort('name')} className="hover:text-foreground">
                        Contact <SortIcon active={sort.key === 'name'} />
                      </button>
                    </th>
                  )}
                  {showCol('type') && <th className="text-left p-3">Type</th>}
                  {showCol('ranking') && <th className="text-left p-3">Ranking</th>}
                  {showCol('last_contacted') && (
                    <th className="text-left p-3">
                      <button onClick={() => toggleSort('last_contacted_at')} className="hover:text-foreground">
                        Last Contacted <SortIcon active={sort.key === 'last_contacted_at'} />
                      </button>
                    </th>
                  )}
                  {showCol('next_action') && (
                    <th className="text-left p-3">
                      <button onClick={() => toggleSort('next_action_due_at')} className="hover:text-foreground">
                        Next Action <SortIcon active={sort.key === 'next_action_due_at'} />
                      </button>
                    </th>
                  )}
                  {showCol('location') && <th className="text-left p-3">Location</th>}
                  {showCol('contact_info') && <th className="text-left p-3">Contact Info</th>}
                  {showCol('actions') && <th className="text-right p-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const r = RANKING_CONFIG[c.ranking] || RANKING_CONFIG.cold;
                  const initials = `${c.first_name[0]}${(c.last_name || '')[0] || ''}`.toUpperCase();

                  let rowHighlight = '';
                  if (c.next_action_due_at) {
                    const dueMs = new Date(c.next_action_due_at).getTime();
                    const nowMs = Date.now();
                    if (dueMs < nowMs) rowHighlight = 'bg-destructive/10 hover:bg-destructive/15';
                    else if (dueMs - nowMs < 24 * 60 * 60 * 1000) rowHighlight = 'bg-amber-500/10 hover:bg-amber-500/15';
                  }

                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-border last:border-0 transition-colors cursor-pointer ${rowHighlight || 'hover:bg-accent/30'}`}
                      onClick={() => onSelect(c)}
                    >
                      {showCol('contact') && (
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm flex items-center gap-1.5">
                                <span>{c.first_name} {c.last_name || ''}</span>
                                <CommunicationChannelChips
                                  prefs={(c.communication_preferences as unknown as CommPreference[]) || []}
                                />
                              </p>
                              {c.source && <p className="text-[10px] text-muted-foreground capitalize">{c.source}</p>}
                            </div>
                          </div>
                        </td>
                      )}
                      {showCol('type') && (
                        <td className="p-3"><span className="text-xs">{TYPE_LABELS[c.contact_type] || c.contact_type}</span></td>
                      )}
                      {showCol('ranking') && (
                        <td className="p-3">
                          <Badge className={`${r.color} text-[10px] gap-0.5 border-0`}>{r.icon} {r.label}</Badge>
                        </td>
                      )}
                      {showCol('last_contacted') && (
                        <td className="p-3"><span className="text-xs text-muted-foreground">{relativeTime(c.last_contacted_at)}</span></td>
                      )}
                      {showCol('next_action') && (
                        <td className="p-3 max-w-[180px]">
                          {c.next_action_due_at ? (
                            <div className="flex flex-col">
                              <span className="text-xs font-medium">{shortDate(c.next_action_due_at)}</span>
                              {c.next_action_note && (
                                <span className="text-[10px] text-muted-foreground truncate" title={c.next_action_note}>
                                  {c.next_action_note}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      {showCol('location') && (
                        <td className="p-3"><span className="text-xs text-muted-foreground">{[c.suburb, c.state].filter(Boolean).join(', ') || '—'}</span></td>
                      )}
                      {showCol('contact_info') && (
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {(c.mobile || c.phone) && (
                              <a href={`tel:${c.mobile || c.phone}`} onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-foreground">
                                <Phone size={14} />
                              </a>
                            )}
                            {c.email && (
                              <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-foreground">
                                <Mail size={14} />
                              </a>
                            )}
                          </div>
                        </td>
                      )}
                      {showCol('actions') && (
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {hasMore && onLoadMore && (
            <div className="flex justify-center py-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loading}>
                {loading ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContactsList;
