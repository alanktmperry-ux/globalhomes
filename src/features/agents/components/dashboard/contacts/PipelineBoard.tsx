import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flame, Thermometer, Snowflake, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Contact } from '@/features/agents/hooks/useContacts';

const BUYER_STAGES = [
  { key: 'cold_lead', label: 'Cold Lead', color: 'bg-muted' },
  { key: 'active_buyer', label: 'Active Buyer', color: 'bg-blue-500/10' },
  { key: 'under_contract', label: 'Under Contract', color: 'bg-orange-500/10' },
  { key: 'settled', label: 'Settled', color: 'bg-green-500/10' },
];

const SELLER_STAGES = [
  { key: 'cold_lead', label: 'Cold Lead', color: 'bg-muted' },
  { key: 'appraisal', label: 'Appraisal', color: 'bg-purple-500/10' },
  { key: 'listing_authority', label: 'Listing Authority', color: 'bg-blue-500/10' },
  { key: 'marketing', label: 'Marketing', color: 'bg-yellow-500/10' },
  { key: 'under_contract', label: 'Under Contract', color: 'bg-orange-500/10' },
  { key: 'settled', label: 'Settled', color: 'bg-green-500/10' },
];

const RANKING_ICON: Record<string, React.ReactNode> = {
  hot: <Flame size={10} className="text-destructive" />,
  warm: <Thermometer size={10} className="text-primary" />,
  cold: <Snowflake size={10} className="text-muted-foreground" />,
};

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

interface Props {
  contacts: Contact[];
  pipelineType: 'buyer' | 'seller';
  onUpdateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
  onSelect: (c: Contact) => void;
}

const PipelineBoard = ({ contacts, pipelineType, onUpdateContact, onSelect }: Props) => {
  const stages = pipelineType === 'buyer' ? BUYER_STAGES : SELLER_STAGES;
  const stageField = pipelineType === 'buyer' ? 'buyer_pipeline_stage' : 'seller_pipeline_stage';
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [rankingFilter, setRankingFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  // Derive all unique tags from contacts
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach(c => c.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [contacts]);

  // Filter contacts relevant to this pipeline type, then apply search/filters
  const filteredContacts = useMemo(() => {
    let result = contacts.filter(c =>
      pipelineType === 'buyer'
        ? (c.contact_type === 'buyer' || c.contact_type === 'both')
        : (c.contact_type === 'seller' || c.contact_type === 'both' || c.contact_type === 'landlord')
    );

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        `${c.first_name} ${c.last_name || ''}`.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.suburb || '').toLowerCase().includes(q)
      );
    }

    if (rankingFilter !== 'all') {
      result = result.filter(c => c.ranking === rankingFilter);
    }

    if (tagFilter !== 'all') {
      result = result.filter(c => c.tags?.includes(tagFilter));
    }

    return result;
  }, [contacts, pipelineType, search, rankingFilter, tagFilter]);

  const getContactsForStage = (stageKey: string) =>
    filteredContacts.filter(c => c[stageField] === stageKey);

  const hasActiveFilters = search.trim() || rankingFilter !== 'all' || tagFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setRankingFilter('all');
    setTagFilter('all');
  };

  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    e.dataTransfer.setData('contactId', contactId);
    setDraggedId(contactId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    const contactId = e.dataTransfer.getData('contactId');
    setDraggedId(null);
    if (!contactId) return;
    await onUpdateContact(contactId, { [stageField]: stageKey } as any);
  };

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2.5">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <Select value={rankingFilter} onValueChange={setRankingFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Ranking" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rankings</SelectItem>
            <SelectItem value="hot">🔥 Hot</SelectItem>
            <SelectItem value="warm">🌡 Warm</SelectItem>
            <SelectItem value="cold">❄️ Cold</SelectItem>
          </SelectContent>
        </Select>

        {allTags.length > 0 && (
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs gap-1 text-muted-foreground">
            <X size={12} /> Clear
          </Button>
        )}

        <span className="text-[10px] text-muted-foreground ml-auto">
          {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
        {stages.map((stage) => {
          const stageContacts = getContactsForStage(stage.key);
          return (
            <div
              key={stage.key}
              className={`flex-shrink-0 w-64 rounded-xl border border-border ${stage.color} p-3`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold">{stage.label}</h3>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{stageContacts.length}</Badge>
              </div>

              <div className="space-y-2">
                {stageContacts.map((c) => {
                  const initials = `${c.first_name[0]}${(c.last_name || '')[0] || ''}`.toUpperCase();
                  return (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, c.id)}
                      onClick={() => onSelect(c)}
                      className={`bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all ${
                        draggedId === c.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium truncate flex-1">{c.first_name} {c.last_name || ''}</span>
                        {RANKING_ICON[c.ranking]}
                      </div>
                      {c.suburb && (
                        <p className="text-[10px] text-muted-foreground">📍 {c.suburb}{c.state ? `, ${c.state}` : ''}</p>
                      )}
                      {pipelineType === 'buyer' && c.budget_max && (
                        <p className="text-[10px] text-primary font-semibold mt-0.5">💰 up to {AUD.format(c.budget_max)}</p>
                      )}
                      {pipelineType === 'seller' && c.estimated_value && (
                        <p className="text-[10px] text-primary font-semibold mt-0.5">💰 {AUD.format(c.estimated_value)}</p>
                      )}
                      {c.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {c.tags.slice(0, 2).map(t => (
                            <Badge key={t} variant="outline" className="text-[8px] px-1 h-4">{t}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {stageContacts.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-6">
                    {hasActiveFilters ? 'No matches' : 'Drop contacts here'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineBoard;
