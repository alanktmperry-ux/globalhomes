import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Flame, Thermometer, Snowflake } from 'lucide-react';
import type { Contact } from '@/hooks/useContacts';

const BUYER_STAGES = [
  { key: 'cold_lead', label: 'Cold Lead', color: 'bg-muted' },
  { key: 'active_buyer', label: 'Active Buyer', color: 'bg-blue-500/10' },
  { key: 'under_contract', label: 'Under Contract', color: 'bg-orange-500/10' },
  { key: 'settled', label: 'Settled', color: 'bg-success/10' },
];

const SELLER_STAGES = [
  { key: 'cold_lead', label: 'Cold Lead', color: 'bg-muted' },
  { key: 'appraisal', label: 'Appraisal', color: 'bg-purple-500/10' },
  { key: 'listing_authority', label: 'Listing Authority', color: 'bg-blue-500/10' },
  { key: 'marketing', label: 'Marketing', color: 'bg-yellow-500/10' },
  { key: 'under_contract', label: 'Under Contract', color: 'bg-orange-500/10' },
  { key: 'settled', label: 'Settled', color: 'bg-success/10' },
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

  // Filter contacts relevant to this pipeline type
  const relevantContacts = contacts.filter(c =>
    pipelineType === 'buyer'
      ? (c.contact_type === 'buyer' || c.contact_type === 'both')
      : (c.contact_type === 'seller' || c.contact_type === 'both' || c.contact_type === 'landlord')
  );

  const getContactsForStage = (stageKey: string) =>
    relevantContacts.filter(c => c[stageField] === stageKey);

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
                <p className="text-[10px] text-muted-foreground text-center py-6">Drop contacts here</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PipelineBoard;
