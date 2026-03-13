import { useState } from 'react';
import { Flame, Thermometer, Snowflake, Search, Trash2, Phone, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Contact } from '@/hooks/useContacts';

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

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || 
      c.first_name.toLowerCase().includes(q) ||
      (c.last_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.suburb || '').toLowerCase().includes(q);
    const matchRanking = !filterRanking || c.ranking === filterRanking;
    const matchType = !filterType || c.contact_type === filterType;
    return matchSearch && matchRanking && matchType;
  });

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
                  <th className="text-left p-3">Contact</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Ranking</th>
                  <th className="text-left p-3">Location</th>
                  <th className="text-left p-3">Contact Info</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const r = RANKING_CONFIG[c.ranking] || RANKING_CONFIG.cold;
                  const initials = `${c.first_name[0]}${(c.last_name || '')[0] || ''}`.toUpperCase();
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => onSelect(c)}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{c.first_name} {c.last_name || ''}</p>
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
