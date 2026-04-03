import { useState } from 'react';
import { useCRMLeads } from '../hooks/useCRMLeads';
import { LeadCard } from './LeadCard';
import { LeadDetailModal } from './LeadDetailModal';
import { AddLeadModal } from './AddLeadModal';
import type { CRMLead, LeadStage } from '../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const STAGES: { value: LeadStage; label: string; color: string }[] = [
  { value: 'new', label: '🆕 New', color: 'border-t-muted-foreground' },
  { value: 'contacted', label: '📞 Contacted', color: 'border-t-blue-400' },
  { value: 'qualified', label: '✅ Qualified', color: 'border-t-indigo-500' },
  { value: 'offer_stage', label: '📋 Offer Stage', color: 'border-t-amber-400' },
  { value: 'under_contract', label: '🔏 Under Contract', color: 'border-t-purple-500' },
  { value: 'settled', label: '🎉 Settled', color: 'border-t-green-500' },
];

export function PipelineBoard() {
  const { leads, loading, updateStage, createLead, fetchLeads } = useCRMLeads({ stage: 'all' });
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [showAddLead, setShowAddLead] = useState(false);

  const getStageLeads = (stage: LeadStage) =>
    leads.filter(l => l.stage === stage && l.stage !== 'lost');

  const handleDrop = (e: React.DragEvent, toStage: LeadStage) => {
    e.preventDefault();
    if (dragging) updateStage(dragging, toStage);
    setDragging(null);
  };

  if (loading) return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
      {STAGES.map(s => (
        <div key={s.value} className="flex-shrink-0 w-64 rounded-xl border border-border bg-muted/30 animate-pulse h-96" />
      ))}
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          {leads.filter(l => l.stage !== 'lost').length} active leads
        </p>
        <Button size="sm" onClick={() => setShowAddLead(true)} className="gap-1.5 h-8">
          <Plus size={13} /> Add Lead
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
        {STAGES.map(stage => {
          const stageLeads = getStageLeads(stage.value);
          return (
            <div
              key={stage.value}
              className={`flex-shrink-0 w-64 rounded-xl border border-border bg-muted/20 border-t-4 ${stage.color}`}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, stage.value)}
            >
              <div className="flex items-center justify-between p-3">
                <div>
                  <p className="text-xs font-bold text-foreground">{stage.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {stageLeads.length} lead{stageLeads.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {stageLeads.some(l => l.priority === 'high') && (
                  <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                    {stageLeads.filter(l => l.priority === 'high').length} hot
                  </Badge>
                )}
              </div>

              <div className="px-2 pb-3 space-y-2">
                {stageLeads.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-8">
                    Drop leads here
                  </p>
                )}
                {stageLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => setSelectedLead(lead)}
                    onDragStart={() => setDragging(lead.id)}
                    onDragEnd={() => setDragging(null)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={() => setSelectedLead(null)}
        />
      )}

      {showAddLead && (
        <AddLeadModal
          onClose={() => setShowAddLead(false)}
          onSave={async (data) => {
            await createLead(data);
            setShowAddLead(false);
          }}
        />
      )}
    </>
  );
}
