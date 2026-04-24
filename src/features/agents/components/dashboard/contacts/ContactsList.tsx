import { useState, useMemo } from 'react';
import { Flame, Thermometer, Snowflake, Search, Trash2, Phone, Mail, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Contact } from '@/features/agents/hooks/useContacts';
import CommunicationChannelChips from '@/shared/components/CommunicationPreferences/CommunicationChannelChips';
import type { CommPreference } from '@/shared/components/CommunicationPreferences/types';

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

type SortKey = 'next_action_due_at' | 'last_contacted_at' | 'name';
type SortDir = 'asc' | 'desc';

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
  onSelect: (c: Contact) => void;
  onDelete: (id: string) => void;
}

const ContactsList = ({ contacts, loading, onSelect, onDelete }: Props) => {
  const [search, setSearch] = useState('');
  const [filterRanking, setFilterRanking] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('next_action_due_at');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const filtered = useMemo(() => {
    const list = contacts.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        c.first_name.toLowerCase().includes(q) ||
        (c.last_name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.mobile || c.phone || '').includes(q) ||
        (c.suburb || '').toLowerCase().includes(q);
      const matchRanking = !filterRanking || c.ranking === filterRanking;
      const matchType = !filterType || c.contact_type === filterType;
      return matchSearch && matchRanking && matchType;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    const sortNullsLast = (a: string | null, b: string | null) => {
      if (a == null && b == null) return 0;
      if (a == null) return 1; // nulls always last regardless of dir
      if (b == null) return -1;
      return (new Date(a).getTime() - new Date(b).getTime()) * dir;
    };

    return [...list].sort((a, b) => {
      if (sortKey === 'name') {
        const an = `${a.first_name} ${a.last_name || ''}`.toLowerCase();
        const bn = `${b.first_name} ${b.last_name || ''}`.toLowerCase();
        return an.localeCompare(bn) * dir;
      }
      return sortNullsLast(a[sortKey], b[sortKey]);
    });
  }, [contacts, search, filterRanking, filterType, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'next_action_due_at' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ active }: { active: boolean }) =>
    !active ? null : sortDir === 'asc' ? <ArrowUp size={10} className="inline ml-1" /> : <ArrowDown size={10} className="inline ml-1" />;

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading contacts...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {Object.entries(RANKING_CONFIG).map(([key, cfg]) => (
            <Button
              key={key}
              size="sm"
              variant={filterRanking === key ? 'default' : 'outline'}
              onClick={() => setFilterRanking(filterRanking === key ? null : key)}
              className="h-7 px-2 gap-1 text-xs"
            >
              {cfg.icon} {cfg.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {['buyer', 'seller', 'both'].map((t) => (
            <Button
              key={t}
              size="sm"
              variant={filterType === t ? 'default' : 'outline'}
              onClick={() => setFilterType(filterType === t ? null : t)}
              className="h-7 px-2 text-xs capitalize"
            >
              {t}
            </Button>
          ))}
        </div>
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
                  <th className="text-left p-3">
                    <button onClick={() => toggleSort('name')} className="hover:text-foreground">
                      Contact <SortIcon active={sortKey === 'name'} />
                    </button>
                  </th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Ranking</th>
                  <th className="text-left p-3">
                    <button onClick={() => toggleSort('last_contacted_at')} className="hover:text-foreground">
                      Last Contacted <SortIcon active={sortKey === 'last_contacted_at'} />
                    </button>
                  </th>
                  <th className="text-left p-3">
                    <button onClick={() => toggleSort('next_action_due_at')} className="hover:text-foreground">
                      Next Action <SortIcon active={sortKey === 'next_action_due_at'} />
                    </button>
                  </th>
                  <th className="text-left p-3">Location</th>
                  <th className="text-left p-3">Contact Info</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const r = RANKING_CONFIG[c.ranking] || RANKING_CONFIG.cold;
                  const initials = `${c.first_name[0]}${(c.last_name || '')[0] || ''}`.toUpperCase();

                  // Highlight rows by next_action_due_at urgency
                  let rowHighlight = '';
                  if (c.next_action_due_at) {
                    const dueMs = new Date(c.next_action_due_at).getTime();
                    const nowMs = Date.now();
                    if (dueMs < nowMs) {
                      rowHighlight = 'bg-destructive/10 hover:bg-destructive/15';
                    } else if (dueMs - nowMs < 24 * 60 * 60 * 1000) {
                      rowHighlight = 'bg-amber-500/10 hover:bg-amber-500/15';
                    }
                  }

                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-border last:border-0 transition-colors cursor-pointer ${rowHighlight || 'hover:bg-accent/30'}`}
                      onClick={() => onSelect(c)}
                    >
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
                      <td className="p-3">
                        <span className="text-xs">{TYPE_LABELS[c.contact_type] || c.contact_type}</span>
                      </td>
                      <td className="p-3">
                        <Badge className={`${r.color} text-[10px] gap-0.5 border-0`}>
                          {r.icon} {r.label}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-muted-foreground">{relativeTime(c.last_contacted_at)}</span>
                      </td>
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
                      <td className="p-3">
                        <span className="text-xs text-muted-foreground">{[c.suburb, c.state].filter(Boolean).join(', ') || '—'}</span>
                      </td>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsList;
